"""
ai/explainer.py
================
Generates natural-language explanations for routing decisions.
Uses a rich rule-based template engine (no external LLM required —
but structured so you can drop in Gemma/OpenAI later).

The explanation reads like a logistics analyst wrote it:
  - States what happened and why
  - Quantifies the trade-offs
  - Gives an actionable recommendation
"""

from __future__ import annotations
from typing import Optional
from routing.engine import RouteResult
from decision.engine import DecisionResult


def _cond_narrative(segments: list) -> str:
    """Summarise worst conditions across all segments."""
    incidents = [s for s in segments if s.condition.get("incident")]
    congested = [s for s in segments if s.condition.get("traffic_factor", 1) > 1.6]
    rainy     = [s for s in segments if s.condition.get("weather_factor", 1) > 1.25]

    parts = []
    if incidents:
        roads = ", ".join(s.highway for s in incidents[:2])
        parts.append(f"active incidents on {roads}")
    if congested:
        roads = ", ".join(s.highway for s in congested[:2])
        tf    = max(s.condition.get("traffic_factor", 1) for s in congested)
        parts.append(f"heavy congestion on {roads} (traffic factor {tf:.1f}×)")
    if rainy:
        roads = ", ".join(s.highway for s in rainy[:2])
        wf    = max(s.condition.get("weather_factor", 1) for s in rainy)
        parts.append(f"adverse weather on {roads} (delay factor {wf:.1f}×)")
    if not parts:
        parts.append("normal operating conditions")
    return "; ".join(parts)


def _improvement_text(a: RouteResult, b: RouteResult) -> str:
    """Describe measurable improvement from A → B."""
    time_saved = round((a.total_time_hr - b.total_time_hr) * 60)
    risk_red   = round((a.avg_risk - b.avg_risk) * 100, 1)
    cost_delta = round(b.total_cost_inr - a.total_cost_inr)

    parts = []
    if time_saved > 0:
        parts.append(f"saves approximately {time_saved} minutes")
    elif time_saved < 0:
        parts.append(f"adds {abs(time_saved)} minutes but significantly reduces risk")
    if risk_red > 0:
        parts.append(f"reduces disruption risk by {risk_red}%")
    if cost_delta < 0:
        parts.append(f"cuts cost by ₹{abs(cost_delta):,}")
    elif cost_delta > 0:
        parts.append(f"costs ₹{cost_delta:,} more")
    return ", ".join(parts) if parts else "offers a comparable overall profile"


def generate_explanation(
    shipment: dict,
    route_a: RouteResult,
    route_b: RouteResult,
    decision: DecisionResult,
    optimize_for: str = "balanced",
) -> str:
    """
    Build a full natural-language explanation paragraph.
    """
    sid    = shipment.get("id", "unknown")
    cargo  = shipment.get("cargo", "cargo")
    origin = route_a.cities[0]  if route_a.cities else shipment.get("origin", {}).get("city", "origin")
    dest   = route_a.cities[-1] if route_a.cities else shipment.get("destination", {}).get("city", "destination")

    pred = shipment.get("prediction") or {}
    delay_pct = round(pred.get("delay_probability", 0) * 100)
    speed     = shipment.get("speed_kmh", 0)

    a_cond = _cond_narrative(route_a.segments)
    b_cond = _cond_narrative(route_b.segments)
    improvement = _improvement_text(route_a, route_b) if route_b.feasible else ""

    # ── Branch on action ────────────────────────────────────────────────────

    if decision.action == "REROUTE" and decision.rerouted:
        explanation = (
            f"🔄 **Reroute Triggered for {sid}**\n\n"
            f"Shipment carrying {cargo} from {origin} to {dest} has been automatically rerouted. "
            f"Analysis of the current route ({route_a.route_id}) identified {a_cond}. "
            f"The AI decision engine flagged this because: {decision.triggered_rule.lower()}. "
            f"Current delay probability stands at {delay_pct}% with the vehicle moving at {speed} km/h.\n\n"
            f"**Route A** ({route_a.route_id}): "
            f"{route_a.total_distance_km} km · {round(route_a.total_time_hr, 1)} hr · "
            f"₹{round(route_a.total_cost_inr):,} · Risk {round(route_a.avg_risk*100)}% — "
            f"Conditions: {a_cond}.\n\n"
            f"**Route B** ({route_b.route_id}): "
            f"{route_b.total_distance_km} km · {round(route_b.total_time_hr, 1)} hr · "
            f"₹{round(route_b.total_cost_inr):,} · Risk {round(route_b.avg_risk*100)}% — "
            f"Conditions: {b_cond}.\n\n"
            f"Route B was selected because it {improvement}. "
            f"Optimization objective: **{optimize_for.upper()}**. "
            f"The driver has been notified with the updated itinerary."
        )

    elif decision.action == "REROUTE" and not decision.rerouted:
        explanation = (
            f"⚠️ **Reroute Evaluated but Not Applied for {sid}**\n\n"
            f"Disruption detected on the current route: {a_cond}. "
            f"Rule fired: {decision.triggered_rule.lower()}. "
            f"However, Route B does not offer a measurable improvement "
            f"(risk: {round(route_b.avg_risk*100)}% vs {round(route_a.avg_risk*100)}%), "
            f"so the shipment will continue on Route A while conditions are monitored."
        )

    else:  # KEEP
        explanation = (
            f"✅ **Route Confirmed for {sid}**\n\n"
            f"Shipment carrying {cargo} from {origin} to {dest} is proceeding on the optimal route. "
            f"Current route ({route_a.route_id}) spans "
            f"{route_a.total_distance_km} km with an estimated travel time of "
            f"{round(route_a.total_time_hr, 1)} hr and cost of ₹{round(route_a.total_cost_inr):,}. "
            f"Route conditions: {a_cond}. "
            f"Delay probability is {delay_pct}% — within acceptable limits. "
            f"No reroute is required at this time. "
            f"The system will continue monitoring conditions and will alert you if the situation changes."
        )

    return explanation


def generate_comparison_explanation(
    route_a: RouteResult,
    route_b: RouteResult,
    optimize_for: str,
) -> str:
    """Short comparison snippet for the Route Comparison panel."""
    faster = route_a if route_a.total_time_hr <= route_b.total_time_hr else route_b
    cheaper = route_a if route_a.total_cost_inr <= route_b.total_cost_inr else route_b
    safer   = route_a if route_a.avg_risk <= route_b.avg_risk else route_b

    time_diff = abs(round((route_a.total_time_hr - route_b.total_time_hr) * 60))
    cost_diff = abs(round(route_a.total_cost_inr - route_b.total_cost_inr))
    risk_diff = abs(round((route_a.avg_risk - route_b.avg_risk) * 100, 1))

    lines = [
        f"Optimizing for **{optimize_for.upper()}**:",
        f"• {faster.route_id} is {time_diff} min faster.",
        f"• {cheaper.route_id} is ₹{cost_diff:,} cheaper.",
        f"• {safer.route_id} has {risk_diff}% lower disruption risk.",
    ]
    return "\n".join(lines)
