"""
routes/routing_api.py
======================
FastAPI router for Phase 3 endpoints:

GET  /routes/{shipment_id}          → best route for a shipment
POST /routes/optimize               → optimize with custom objective
POST /decision/reroute              → run decision engine for a shipment
POST /ai/explain-route              → generate NL explanation
GET  /routes/conditions             → current highway conditions snapshot
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import dataclasses

from models.mock_data import LIVE_SHIPMENTS
from routing.engine import route_for_shipment, find_two_routes, RouteResult
from routing.graph import closest_node, NODES
from routing.conditions import get_conditions
from decision.engine import make_decision
from ai.explainer import generate_explanation, generate_comparison_explanation

router = APIRouter(tags=["Phase 3 - Routing & Decision"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _find_shipment(sid: str) -> dict:
    for s in LIVE_SHIPMENTS:
        if s["id"] == sid:
            return s
    raise HTTPException(404, f"Shipment {sid} not found")

def _route_to_dict(r: RouteResult) -> dict:
    d = dataclasses.asdict(r)
    # Convert nested RouteSegment dataclasses
    d["segments"] = [dataclasses.asdict(s) for s in r.segments]
    return d


# ─── Input schemas ────────────────────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    shipment_id: str
    optimize_for: str = "balanced"   # time | cost | balanced

class RerouteRequest(BaseModel):
    shipment_id: str
    optimize_for: str = "balanced"

class ExplainRequest(BaseModel):
    shipment_id: str
    optimize_for: str = "balanced"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/routes/{shipment_id}")
def get_route(shipment_id: str, optimize_for: str = "balanced"):
    """Return the optimal + alternative route for a shipment."""
    s = _find_shipment(shipment_id)
    if s["status"] == "Delivered":
        raise HTTPException(400, "Shipment already delivered — no routing needed.")

    route_a, route_b = route_for_shipment(s, optimize_for)
    return {
        "shipment_id": shipment_id,
        "optimize_for": optimize_for,
        "current_location": s["current_location"],
        "destination": s["destination"],
        "route_a": _route_to_dict(route_a),
        "route_b": _route_to_dict(route_b),
        "comparison": generate_comparison_explanation(route_a, route_b, optimize_for),
    }


@router.post("/routes/optimize")
def optimize_route(req: OptimizeRequest):
    """Compute route with explicit optimization objective."""
    s = _find_shipment(req.shipment_id)
    if s["status"] == "Delivered":
        raise HTTPException(400, "Shipment already delivered.")

    route_a, route_b = route_for_shipment(s, req.optimize_for)
    decision = make_decision(s, route_a, route_b)

    return {
        "shipment_id": req.shipment_id,
        "optimize_for": req.optimize_for,
        "route_a": _route_to_dict(route_a),
        "route_b": _route_to_dict(route_b),
        "decision": dataclasses.asdict(decision),
        "comparison": generate_comparison_explanation(route_a, route_b, req.optimize_for),
    }


@router.post("/decision/reroute")
def trigger_reroute(req: RerouteRequest):
    """Run the decision engine; auto-reroute if conditions warrant it."""
    s = _find_shipment(req.shipment_id)
    if s["status"] == "Delivered":
        raise HTTPException(400, "Shipment already delivered.")

    route_a, route_b = route_for_shipment(s, req.optimize_for)
    decision = make_decision(s, route_a, route_b)

    chosen_route = route_b if decision.rerouted else route_a

    return {
        "shipment_id": req.shipment_id,
        "decision": dataclasses.asdict(decision),
        "active_route": _route_to_dict(chosen_route),
        "alternative_route": _route_to_dict(route_b if not decision.rerouted else route_a),
    }


@router.post("/ai/explain-route")
def explain_route(req: ExplainRequest):
    """Generate a natural-language explanation for the routing decision."""
    s = _find_shipment(req.shipment_id)
    if s["status"] == "Delivered":
        return {"explanation": f"Shipment {req.shipment_id} has been successfully delivered. No routing action required."}

    route_a, route_b = route_for_shipment(s, req.optimize_for)
    decision = make_decision(s, route_a, route_b)
    explanation = generate_explanation(s, route_a, route_b, decision, req.optimize_for)

    return {
        "shipment_id": req.shipment_id,
        "optimize_for": req.optimize_for,
        "decision_action": decision.action,
        "explanation": explanation,
        "route_a_summary": route_a.summary,
        "route_b_summary": route_b.summary,
    }


@router.get("/routes/conditions/live")
def get_live_conditions():
    """Return current traffic/weather conditions for all highway segments."""
    conds = get_conditions()
    return {
        "total_segments": len(conds),
        "incidents": sum(1 for c in conds.values() if c.incident),
        "congested": sum(1 for c in conds.values() if c.traffic_factor > 1.6),
        "conditions": {
            hw: {
                "label": c.condition_label,
                "traffic_factor": c.traffic_factor,
                "weather_factor": c.weather_factor,
                "incident": c.incident,
            }
            for hw, c in conds.items()
        }
    }


@router.get("/routes/nodes/list")
def list_nodes():
    """Return all graph nodes (for frontend map rendering)."""
    return {
        "nodes": [
            {"id": n.id, "city": n.city, "lat": n.lat, "lng": n.lng}
            for n in NODES.values()
        ]
    }
