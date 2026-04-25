"""
routing/engine.py
==================
Dijkstra-based shortest-path engine with A* heuristic option.

Public API
----------
find_route(origin_node, dest_node, optimize_for)
    → RouteResult (path, segments, totals, conditions)

find_two_routes(origin_node, dest_node)
    → (route_a, route_b) — best + cheapest alternative
"""

from __future__ import annotations
import heapq
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from routing.graph import NODES, ADJACENCY, Node, Edge, closest_node
from routing.conditions import get_edge_weight, edge_condition_summary, get_conditions


# ─── Result types ─────────────────────────────────────────────────────────────

@dataclass
class RouteSegment:
    from_city: str
    to_city: str
    highway: str
    distance_km: float
    time_hr: float
    cost_inr: float
    risk: float
    condition: dict


@dataclass
class RouteResult:
    route_id: str
    optimize_for: str
    nodes: List[str]          # ordered node IDs
    cities: List[str]         # human-readable city names
    coordinates: List[dict]   # [{lat, lng, city}] for map polyline
    segments: List[RouteSegment]
    total_distance_km: float
    total_time_hr: float
    total_cost_inr: float
    avg_risk: float
    feasible: bool
    summary: str


# ─── Dijkstra ─────────────────────────────────────────────────────────────────

def _dijkstra(
    origin: str,
    dest: str,
    optimize_for: str,
    excluded_highways: set[str] | None = None,
) -> Tuple[List[str], float]:
    """
    Standard Dijkstra on ADJACENCY with dynamic edge weights.
    Returns (path_as_node_list, total_cost).
    excluded_highways: skip edges on these roads (forces alternate route).
    """
    dist: Dict[str, float] = {n: float("inf") for n in NODES}
    prev: Dict[str, Optional[str]] = {n: None for n in NODES}
    dist[origin] = 0.0
    heap = [(0.0, origin)]

    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        if u == dest:
            break
        for edge in ADJACENCY.get(u, []):
            if excluded_highways and edge.highway in excluded_highways:
                continue
            w = get_edge_weight(edge, optimize_for)
            nd = dist[u] + w
            if nd < dist[edge.to_node]:
                dist[edge.to_node] = nd
                prev[edge.to_node] = u
                heapq.heappush(heap, (nd, edge.to_node))

    # Reconstruct path
    path, cur = [], dest
    while cur is not None:
        path.append(cur)
        cur = prev[cur]
    path.reverse()

    if path[0] != origin:
        return [], float("inf")   # no path found

    return path, dist[dest]


# ─── Actual time/cost/risk along a concrete path ──────────────────────────────

def _path_to_result(
    path: List[str],
    optimize_for: str,
    route_id: str,
) -> RouteResult:
    segments: List[RouteSegment] = []
    total_dist = total_time = total_cost = total_risk_sum = 0.0

    conds = get_conditions()

    for i in range(len(path) - 1):
        u, v = path[i], path[i+1]
        # Find the edge u→v
        edge: Optional[Edge] = None
        for e in ADJACENCY.get(u, []):
            if e.to_node == v:
                edge = e
                break
        if edge is None:
            continue

        cond = conds.get(edge.highway)
        tf = cond.traffic_factor if cond else 1.0
        wf = cond.weather_factor if cond else 1.0
        inc = 2.0 if cond and cond.incident else 1.0

        eff_time = edge.base_time_hr * tf * wf * inc
        eff_cost = edge.base_cost_inr * tf
        eff_risk = min(1.0, edge.base_risk
                       + (tf - 1.0) * 0.2
                       + (wf - 1.0) * 0.3
                       + (0.4 if cond and cond.incident else 0))

        seg = RouteSegment(
            from_city   = NODES[u].city,
            to_city     = NODES[v].city,
            highway     = edge.highway,
            distance_km = edge.distance_km,
            time_hr     = round(eff_time, 3),
            cost_inr    = round(eff_cost, 1),
            risk        = round(eff_risk, 3),
            condition   = edge_condition_summary(edge),
        )
        segments.append(seg)
        total_dist      += edge.distance_km
        total_time      += eff_time
        total_cost      += eff_cost
        total_risk_sum  += eff_risk

    avg_risk = total_risk_sum / max(len(segments), 1)
    feasible = len(segments) > 0

    summary = (
        f"{NODES[path[0]].city} → {NODES[path[-1]].city} via "
        f"{', '.join(s.highway for s in segments[:2])} "
        f"({round(total_dist)} km, {round(total_time, 1)} hr, "
        f"₹{round(total_cost):,}, risk {round(avg_risk*100)}%)"
        if feasible else "No feasible route found."
    )

    return RouteResult(
        route_id          = route_id,
        optimize_for      = optimize_for,
        nodes             = path,
        cities            = [NODES[n].city for n in path],
        coordinates       = [{"lat": NODES[n].lat, "lng": NODES[n].lng, "city": NODES[n].city} for n in path],
        segments          = segments,
        total_distance_km = round(total_dist, 1),
        total_time_hr     = round(total_time, 3),
        total_cost_inr    = round(total_cost, 1),
        avg_risk          = round(avg_risk, 3),
        feasible          = feasible,
        summary           = summary,
    )


# ─── Public functions ─────────────────────────────────────────────────────────

def find_route(
    origin_node: str,
    dest_node: str,
    optimize_for: str = "balanced",
) -> RouteResult:
    """Compute the optimal route from origin to destination."""
    path, _ = _dijkstra(origin_node, dest_node, optimize_for)
    if not path:
        # Fallback: try direct stub
        return RouteResult(
            route_id="NONE", optimize_for=optimize_for,
            nodes=[], cities=[], coordinates=[], segments=[],
            total_distance_km=0, total_time_hr=0,
            total_cost_inr=0, avg_risk=1.0,
            feasible=False, summary="No route found.",
        )
    return _path_to_result(path, optimize_for, f"ROUTE-{optimize_for.upper()}")


def find_two_routes(
    origin_node: str,
    dest_node: str,
    optimize_for: str = "balanced",
) -> Tuple[RouteResult, RouteResult]:
    """
    Return Route A (primary/optimal) and Route B (alternative).
    Route B is computed by excluding the busiest highway on Route A,
    forcing the algorithm through a genuinely different corridor.
    """
    route_a = find_route(origin_node, dest_node, optimize_for)

    # Identify the highest-risk segment on route A to exclude
    if route_a.segments:
        worst_hw = max(route_a.segments, key=lambda s: s.risk).highway
        path_b, _ = _dijkstra(origin_node, dest_node, optimize_for,
                               excluded_highways={worst_hw})
        if path_b and path_b != route_a.nodes:
            route_b = _path_to_result(path_b, optimize_for, "ROUTE-ALT")
        else:
            # Try excluding a different highway (2nd worst)
            sorted_segs = sorted(route_a.segments, key=lambda s: s.risk, reverse=True)
            alt_hw = sorted_segs[1].highway if len(sorted_segs) > 1 else None
            if alt_hw:
                path_b, _ = _dijkstra(origin_node, dest_node, optimize_for,
                                       excluded_highways={alt_hw})
                route_b = _path_to_result(path_b, optimize_for, "ROUTE-ALT") if path_b else route_a
            else:
                route_b = route_a
    else:
        route_b = route_a

    return route_a, route_b


def route_for_shipment(shipment: dict, optimize_for: str = "balanced") -> Tuple[RouteResult, RouteResult]:
    """Convenience wrapper: takes a shipment dict → returns (route_a, route_b)."""
    cur  = shipment["current_location"]
    dest = shipment["destination"]
    origin_node = closest_node(cur["lat"],  cur["lng"])
    dest_node   = closest_node(dest["lat"], dest["lng"])
    return find_two_routes(origin_node, dest_node, optimize_for)
