"""
routing/conditions.py
======================
Simulates dynamic traffic and weather conditions that mutate edge weights.

Every REFRESH_SECONDS the engine re-rolls conditions for each highway segment.
External callers call `get_edge_weight(edge, optimize_for)` to get the
composite weight used by Dijkstra.

Condition model
---------------
traffic_factor : 1.0 = free flow → 2.5 = gridlock  (multiplies time)
weather_factor : 1.0 = clear     → 1.6 = heavy rain (multiplies time + risk)
incident       : bool — major incident on this segment
"""

from __future__ import annotations
import random
import time
from dataclasses import dataclass
from typing import Dict

from routing.graph import Edge, _RAW_EDGES, ADJACENCY

REFRESH_SECONDS = 15   # how often conditions are re-rolled

# ─── Condition snapshot per highway ──────────────────────────────────────────

@dataclass
class SegmentCondition:
    highway: str
    traffic_factor: float   # 1.0 – 2.5
    weather_factor: float   # 1.0 – 1.6
    incident: bool
    condition_label: str    # "Clear" | "Congested" | "Heavy Rain" | "Incident"
    updated_at: float       # epoch seconds


# Singleton store  {highway_name: SegmentCondition}
_CONDITIONS: Dict[str, SegmentCondition] = {}
_last_refresh: float = 0.0


def _label(traffic: float, weather: float, incident: bool) -> str:
    if incident:         return "Incident"
    if traffic > 1.8:   return "Congested"
    if weather > 1.3:   return "Heavy Rain"
    if traffic > 1.4:   return "Moderate Traffic"
    return "Clear"


def _roll_conditions() -> None:
    global _last_refresh
    now = time.time()
    highways = {e.highway for e in _RAW_EDGES}
    for hw in highways:
        # 70 % chance: normal; 20 % congested; 7 % rain; 3 % incident
        roll = random.random()
        if roll < 0.70:
            traffic = random.uniform(1.0, 1.3)
            weather = random.uniform(1.0, 1.1)
            incident = False
        elif roll < 0.90:
            traffic = random.uniform(1.4, 2.2)
            weather = random.uniform(1.0, 1.2)
            incident = False
        elif roll < 0.97:
            traffic = random.uniform(1.1, 1.5)
            weather = random.uniform(1.3, 1.6)
            incident = False
        else:
            traffic = random.uniform(1.8, 2.5)
            weather = random.uniform(1.1, 1.4)
            incident = True

        _CONDITIONS[hw] = SegmentCondition(
            highway=hw,
            traffic_factor=round(traffic, 2),
            weather_factor=round(weather, 2),
            incident=incident,
            condition_label=_label(traffic, weather, incident),
            updated_at=now,
        )
    _last_refresh = now


def get_conditions() -> Dict[str, SegmentCondition]:
    """Return current conditions, refreshing if stale."""
    if not _CONDITIONS or (time.time() - _last_refresh) > REFRESH_SECONDS:
        _roll_conditions()
    return _CONDITIONS


def get_edge_weight(edge: Edge, optimize_for: str = "balanced") -> float:
    """
    Return a scalar weight for Dijkstra given the optimization objective.

    optimize_for:
        "time"     → weighted by effective travel time (hr)
        "cost"     → weighted by cost (INR)
        "balanced" → 0.5 * norm_time + 0.3 * norm_cost + 0.2 * norm_risk
    """
    cond = get_conditions().get(edge.highway)
    if cond:
        tf = cond.traffic_factor
        wf = cond.weather_factor
        inc_penalty = 2.0 if cond.incident else 1.0
    else:
        tf = wf = inc_penalty = 1.0

    eff_time = edge.base_time_hr * tf * wf * inc_penalty
    eff_risk = min(1.0, edge.base_risk + (tf - 1.0) * 0.2 + (wf - 1.0) * 0.3
                   + (0.4 if cond and cond.incident else 0))

    if optimize_for == "time":
        return eff_time

    if optimize_for == "cost":
        # Slow traffic → drivers idle longer → more fuel
        return edge.base_cost_inr * tf

    # balanced: normalise each dimension roughly to [0,1] scale
    norm_time = eff_time / 20.0     # 20 hr ≈ max realistic leg
    norm_cost = edge.base_cost_inr / 5000.0
    norm_risk = eff_risk
    return 0.5 * norm_time + 0.3 * norm_cost + 0.2 * norm_risk


def edge_condition_summary(edge: Edge) -> dict:
    """Return a JSON-safe summary of conditions on an edge."""
    cond = get_conditions().get(edge.highway)
    if not cond:
        return {"highway": edge.highway, "label": "Unknown", "traffic_factor": 1.0,
                "weather_factor": 1.0, "incident": False}
    return {
        "highway": edge.highway,
        "label": cond.condition_label,
        "traffic_factor": cond.traffic_factor,
        "weather_factor": cond.weather_factor,
        "incident": cond.incident,
    }
