"""
decision/engine.py
===================
Evaluates live shipment state against decision rules and recommends
or auto-triggers a reroute.

Decision Rules (priority order)
---------------------------------
1. REROUTE if any segment has an active incident
2. REROUTE if delay_probability > 0.60 (from Phase 2 predictor)
3. REROUTE if prediction.risk_level == "HIGH"
4. REROUTE if current route avg_risk > 0.55
5. REROUTE if shipment is Delayed AND speed < 35 km/h
6. KEEP    otherwise
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
from routing.engine import RouteResult


# ─── Decision result ─────────────────────────────────────────────────────────

@dataclass
class DecisionResult:
    action: str                  # "REROUTE" | "KEEP"
    triggered_rule: str          # which rule fired
    confidence: float            # 0.0 – 1.0
    rerouted: bool               # True if auto-reroute was applied
    chosen_route_id: str         # which route was selected
    reason_short: str            # one-liner for UI badge
    reason_detail: str           # paragraph for AI explanation panel


# ─── Rules ───────────────────────────────────────────────────────────────────

def _rule_incident(route_a: RouteResult) -> Optional[str]:
    for seg in route_a.segments:
        if seg.condition.get("incident"):
            return f"Active incident on {seg.highway} ({seg.from_city}→{seg.to_city})"
    return None

def _rule_delay_probability(shipment: dict) -> Optional[str]:
    prob = (shipment.get("prediction") or {}).get("delay_probability", 0.0)
    if prob > 0.60:
        return f"Delay probability {round(prob*100)}% exceeds 60% threshold"
    return None

def _rule_high_risk_prediction(shipment: dict) -> Optional[str]:
    level = (shipment.get("prediction") or {}).get("risk_level", "LOW")
    if level == "HIGH":
        return "AI risk level classified as HIGH"
    return None

def _rule_route_risk(route_a: RouteResult) -> Optional[str]:
    if route_a.avg_risk > 0.55:
        return f"Route average risk {round(route_a.avg_risk*100)}% exceeds 55% threshold"
    return None

def _rule_delayed_slow(shipment: dict) -> Optional[str]:
    if shipment.get("status") == "Delayed" and shipment.get("speed_kmh", 99) < 35:
        return f"Shipment is Delayed and moving at only {shipment['speed_kmh']} km/h"
    return None


# ─── Main decision function ───────────────────────────────────────────────────

def make_decision(
    shipment: dict,
    route_a: RouteResult,
    route_b: RouteResult,
) -> DecisionResult:
    """
    Run all rules against the current shipment + route state.
    Returns a DecisionResult with action, rule, and rich explanation.
    """

    # Evaluate rules in priority order
    triggered = (
        _rule_incident(route_a)         or
        _rule_delay_probability(shipment) or
        _rule_high_risk_prediction(shipment) or
        _rule_route_risk(route_a)       or
        _rule_delayed_slow(shipment)
    )

    if triggered:
        # Only actually reroute if route_b is strictly better
        b_better = (
            route_b.feasible
            and route_b.route_id != route_a.route_id
            and route_b.avg_risk < route_a.avg_risk
        )
        chosen_id = route_b.route_id if b_better else route_a.route_id
        rerouted  = b_better

        improvement = ""
        if b_better:
            time_diff = round((route_a.total_time_hr - route_b.total_time_hr) * 60)
            risk_diff = round((route_a.avg_risk      - route_b.avg_risk) * 100)
            cost_diff = round(route_a.total_cost_inr - route_b.total_cost_inr)
            improvement = (
                f" Route B saves {time_diff} min, reduces risk by {risk_diff}%, "
                f"and {'saves' if cost_diff > 0 else 'adds'} ₹{abs(cost_diff)} in cost."
            )

        detail = (
            f"Decision Engine triggered a REROUTE for shipment {shipment['id']}. "
            f"Rule: {triggered}. "
            f"Current route ({route_a.route_id}) has avg risk "
            f"{round(route_a.avg_risk*100)}% and estimated time "
            f"{round(route_a.total_time_hr, 1)} hr.{improvement}"
        )

        return DecisionResult(
            action         = "REROUTE",
            triggered_rule = triggered,
            confidence     = min(1.0, round(route_a.avg_risk + 0.2, 2)),
            rerouted       = rerouted,
            chosen_route_id= chosen_id,
            reason_short   = triggered[:80],
            reason_detail  = detail,
        )

    # No rule triggered → keep current route
    return DecisionResult(
        action          = "KEEP",
        triggered_rule  = "No rule triggered",
        confidence      = round(1.0 - route_a.avg_risk, 2),
        rerouted        = False,
        chosen_route_id = route_a.route_id,
        reason_short    = "All conditions within acceptable thresholds",
        reason_detail   = (
            f"Shipment {shipment['id']} is proceeding normally. "
            f"Route avg risk is {round(route_a.avg_risk*100)}%, "
            f"delay probability is "
            f"{round((shipment.get('prediction') or {}).get('delay_probability', 0) * 100)}%, "
            f"and no incidents are reported on the current route. No reroute required."
        ),
    )
