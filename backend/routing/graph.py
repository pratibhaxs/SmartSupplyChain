"""
routing/graph.py
=================
Defines the Indian highway network as a weighted directed graph.

Nodes  = major logistics hubs (city, lat, lng)
Edges  = highway segments with 4 weights:
            distance_km  — great-circle distance
            time_hr      — base travel time (distance / base_speed)
            cost_inr     — fuel + toll estimate per km
            risk         — 0.0 – 1.0 baseline disruption probability

Dynamic weights (traffic + weather) are layered on top at query time
by the ConditionEngine — this file only stores the static topology.
"""

from __future__ import annotations
import math
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

# ─── Node ────────────────────────────────────────────────────────────────────

@dataclass
class Node:
    id: str
    city: str
    lat: float
    lng: float
    hub_type: str = "road"   # road | rail | air  (multi-modal Phase 3 extension)


# ─── Edge ────────────────────────────────────────────────────────────────────

@dataclass
class Edge:
    from_node: str
    to_node: str
    highway: str           # road name / NH number
    distance_km: float
    base_speed_kmh: float  # nominal highway speed
    toll_inr_per_km: float = 2.5
    base_risk: float = 0.1  # 0–1 static risk

    # Computed at init
    base_time_hr: float = field(init=False)
    base_cost_inr: float = field(init=False)

    def __post_init__(self):
        self.base_time_hr  = round(self.distance_km / self.base_speed_kmh, 3)
        self.base_cost_inr = round(self.distance_km * self.toll_inr_per_km, 1)


# ─── Geo helper ──────────────────────────────────────────────────────────────

def _dist(n1: Node, n2: Node) -> float:
    R = 6371
    dlat = math.radians(n2.lat - n1.lat)
    dlng = math.radians(n2.lng - n1.lng)
    a = (math.sin(dlat/2)**2
         + math.cos(math.radians(n1.lat))
         * math.cos(math.radians(n2.lat))
         * math.sin(dlng/2)**2)
    return round(R * 2 * math.asin(math.sqrt(max(0, a))), 1)


# ─── Graph definition ────────────────────────────────────────────────────────

# 18 major Indian logistics hubs
NODES: Dict[str, Node] = {n.id: n for n in [
    Node("DEL", "Delhi",       28.6139, 77.2090),
    Node("MUM", "Mumbai",      19.0760, 72.8777),
    Node("BLR", "Bangalore",   12.9716, 77.5946),
    Node("HYD", "Hyderabad",   17.3850, 78.4867),
    Node("CHN", "Chennai",     13.0827, 80.2707),
    Node("KOL", "Kolkata",     22.5726, 88.3639),
    Node("NGP", "Nagpur",      21.1458, 79.0882),
    Node("AHM", "Ahmedabad",   23.0225, 72.5714),
    Node("JAI", "Jaipur",      26.9124, 75.7873),
    Node("LKO", "Lucknow",     26.8467, 80.9462),
    Node("AGR", "Agra",        27.1767, 78.0081),
    Node("VNS", "Varanasi",    25.3176, 82.9739),
    Node("PNE", "Pune",        18.5204, 73.8567),
    Node("SUR", "Surat",       21.1702, 72.8311),
    Node("KOC", "Kochi",        9.9312, 76.2673),
    Node("CHG", "Chandigarh",  30.7333, 76.7794),
    Node("RPR", "Raipur",      21.2514, 81.6296),
    Node("BHU", "Bhubaneswar", 20.2961, 85.8245),
]}

def _e(f, t, hw, spd=75, toll=2.5, risk=0.10):
    dist = _dist(NODES[f], NODES[t])
    return Edge(f, t, hw, dist, spd, toll, risk)

# Bidirectional edges — each highway defined once, reversed automatically
_RAW_EDGES: List[Edge] = [
    # NH 48: Delhi – Jaipur – Ahmedabad – Mumbai
    _e("DEL", "JAI", "NH-48",  spd=90, toll=3.0, risk=0.10),
    _e("JAI", "AHM", "NH-48",  spd=85, toll=2.8, risk=0.12),
    _e("AHM", "SUR", "NH-48",  spd=88, toll=2.5, risk=0.08),
    _e("SUR", "MUM", "NH-48",  spd=80, toll=3.5, risk=0.15),

    # NH 44: Delhi – Agra – Nagpur – Hyderabad – Bangalore – Chennai
    _e("DEL", "AGR", "NH-44",  spd=95, toll=3.2, risk=0.08),
    _e("AGR", "LKO", "NH-44",  spd=80, toll=2.5, risk=0.12),
    _e("AGR", "NGP", "NH-44",  spd=75, toll=2.5, risk=0.15),
    _e("NGP", "HYD", "NH-44",  spd=78, toll=2.8, risk=0.12),
    _e("HYD", "BLR", "NH-44",  spd=80, toll=3.0, risk=0.10),
    _e("BLR", "CHN", "NH-44",  spd=85, toll=2.5, risk=0.08),

    # NH 19: Delhi – Lucknow – Varanasi – Kolkata
    _e("DEL", "LKO", "NH-19",  spd=88, toll=2.8, risk=0.10),
    _e("LKO", "VNS", "NH-19",  spd=75, toll=2.5, risk=0.14),
    _e("VNS", "KOL", "NH-19",  spd=70, toll=2.2, risk=0.18),

    # NH 27: Mumbai – Nagpur – Raipur – Kolkata
    _e("MUM", "NGP", "NH-27",  spd=75, toll=2.5, risk=0.15),
    _e("NGP", "RPR", "NH-27",  spd=72, toll=2.2, risk=0.18),
    _e("RPR", "BHU", "NH-27",  spd=70, toll=2.0, risk=0.20),
    _e("BHU", "KOL", "NH-27",  spd=75, toll=2.2, risk=0.15),

    # NH 65: Hyderabad – Pune – Mumbai
    _e("HYD", "PNE", "NH-65",  spd=78, toll=3.0, risk=0.12),
    _e("PNE", "MUM", "NH-65",  spd=80, toll=3.5, risk=0.14),

    # NH 66: Mumbai – Bangalore – Kochi – Chennai
    _e("MUM", "PNE", "NH-66",  spd=82, toll=3.2, risk=0.10),
    _e("BLR", "CHN", "NH-66",  spd=83, toll=2.8, risk=0.10),
    _e("BLR", "KOC", "NH-66",  spd=75, toll=2.5, risk=0.15),
    _e("CHN", "KOC", "NH-66",  spd=70, toll=2.2, risk=0.18),

    # NH 58 / NH 334: Delhi – Chandigarh
    _e("DEL", "CHG", "NH-334", spd=95, toll=3.5, risk=0.07),

    # Cross links
    _e("KOL", "BHU", "NH-16",  spd=75, toll=2.2, risk=0.18),
    _e("NGP", "BLR", "NH-361", spd=72, toll=2.3, risk=0.16),
    _e("HYD", "CHN", "NH-65",  spd=80, toll=2.8, risk=0.12),
    _e("AHM", "MUM", "NH-48B", spd=85, toll=3.0, risk=0.10),
    _e("JAI", "LKO", "NH-21",  spd=78, toll=2.5, risk=0.14),
    _e("LKO", "NGP", "NH-30",  spd=70, toll=2.2, risk=0.18),
    _e("VNS", "RPR", "NH-30",  spd=68, toll=2.0, risk=0.20),
    _e("PNE", "HYD", "NH-65",  spd=78, toll=2.8, risk=0.12),
]

# Build adjacency list (bidirectional)
ADJACENCY: Dict[str, List[Edge]] = {nid: [] for nid in NODES}
for edge in _RAW_EDGES:
    ADJACENCY[edge.from_node].append(edge)
    # Reverse edge
    rev = Edge(edge.to_node, edge.from_node, edge.highway,
               edge.distance_km, edge.base_speed_kmh,
               edge.toll_inr_per_km, edge.base_risk)
    ADJACENCY[edge.to_node].append(rev)


def closest_node(lat: float, lng: float) -> str:
    """Return the node ID of the nearest hub to a lat/lng coordinate."""
    best, best_dist = None, float("inf")
    for nid, node in NODES.items():
        d = _dist(Node("_", "_", lat, lng), node)
        if d < best_dist:
            best_dist, best = d, nid
    return best
