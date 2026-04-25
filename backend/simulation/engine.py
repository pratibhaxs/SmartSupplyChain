"""
Simulation Engine (Phase 2)
============================
Runs as a background asyncio task.
Every TICK_SECONDS it:
  1. Advances each non-delivered shipment along its route
  2. Drifts speed realistically
  3. Runs the AI predictor
  4. Updates status (In Transit / Delayed / Delivered)
  5. Broadcasts the full snapshot to all WebSocket clients
"""

import asyncio
import json
import logging
from copy import deepcopy
from datetime import datetime

from models.mock_data import LIVE_SHIPMENTS
from ai.predictor import (
    drift_speed,
    interpolate_location,
    compute_prediction,
    haversine_km,
)

log = logging.getLogger("simulator")

TICK_SECONDS = 4          # how often we update (seconds)
PROGRESS_PER_TICK = 0.004 # how much of the route is covered each tick (~0.4%)

# WebSocket manager is injected at startup so we don't have circular imports
_ws_manager = None

def set_ws_manager(manager):
    global _ws_manager
    _ws_manager = manager


def _advance_shipment(s: dict) -> dict:
    """Mutate one shipment dict for this tick and return it."""
    if s["status"] == "Delivered":
        return s

    # ── 1. Move progress forward ───────────────────────────────────────────
    speed_factor = s["speed_kmh"] / 70.0          # normalise around 70 km/h
    step = PROGRESS_PER_TICK * speed_factor
    s["progress"] = round(min(1.0, s["progress"] + step), 4)

    # ── 2. Interpolate current_location ───────────────────────────────────
    orig = s["origin"]
    dest = s["destination"]
    lat, lng = interpolate_location(
        orig["lat"], orig["lng"],
        dest["lat"], dest["lng"],
        s["progress"],
    )
    # Derive a readable city label from progress brackets
    s["current_location"] = {
        "lat": lat,
        "lng": lng,
        "city": _city_label(s),
    }

    # ── 3. Drift speed ─────────────────────────────────────────────────────
    s["speed_kmh"] = drift_speed(s["speed_kmh"], s["cargo"])

    # ── 4. Run AI prediction ───────────────────────────────────────────────
    pred = compute_prediction(s)
    s["prediction"] = {k: v for k, v in pred.items() if not k.startswith("_")}
    s["risk_score"]  = pred.get("_risk_score", s["risk_score"])

    # ── 5. Update status ───────────────────────────────────────────────────
    if s["progress"] >= 1.0:
        s["status"] = "Delivered"
        s["speed_kmh"] = 0.0
        s["current_location"] = {**dest, "city": dest["city"]}
        s["prediction"]["delay_status"] = False
        s["prediction"]["risk_level"] = "LOW"
        s["prediction"]["eta_minutes_remaining"] = 0
    elif pred["delay_status"]:
        s["status"] = "Delayed"
    else:
        s["status"] = "In Transit"

    return s


def _city_label(s: dict) -> str:
    """Simple label based on progress quartile."""
    p = s["progress"]
    origin  = s["origin"]["city"]
    dest    = s["destination"]["city"]
    if p < 0.25:
        return f"Near {origin}"
    elif p < 0.50:
        return f"Midway to {dest}"
    elif p < 0.75:
        return f"Approaching {dest}"
    elif p < 0.95:
        return f"Near {dest}"
    else:
        return dest


async def simulation_loop():
    """Background task — runs forever, ticking every TICK_SECONDS."""
    log.info("Simulation engine started")
    while True:
        await asyncio.sleep(TICK_SECONDS)

        for shipment in LIVE_SHIPMENTS:
            _advance_shipment(shipment)

        if _ws_manager:
            snapshot = {
                "type": "shipment_update",
                "timestamp": datetime.utcnow().isoformat(),
                "shipments": LIVE_SHIPMENTS,
            }
            await _ws_manager.broadcast(json.dumps(snapshot))
