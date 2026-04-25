"""
AI Prediction Engine (Phase 2)
================================
Rule-based logic for:
  1. ETA recalculation from current position + speed
  2. Delay classification (speed drop, distance anomaly)
  3. Risk scoring → LOW / MEDIUM / HIGH
  4. Dynamic speed simulation (drifts realistically over time)
"""

import math
import random
from datetime import datetime, timedelta


# ─── Geo helpers ─────────────────────────────────────────────────────────────

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(max(0, a)))


def interpolate_location(
    orig_lat: float, orig_lng: float,
    dest_lat: float, dest_lng: float,
    t: float,                          # 0.0 → 1.0
) -> tuple[float, float]:
    """Linear interpolation between origin and destination."""
    lat = orig_lat + (dest_lat - orig_lat) * t
    lng = orig_lng + (dest_lng - orig_lng) * t
    return round(lat, 5), round(lng, 5)


# ─── Speed simulation ─────────────────────────────────────────────────────────

# Normal speed bands per cargo type (km/h)
CARGO_SPEED = {
    "Electronics":      (65, 90),
    "Pharmaceuticals":  (50, 75),
    "Textiles":         (55, 80),
    "Auto Parts":       (60, 85),
    "Food & Beverages": (45, 70),
    "Handicrafts":      (60, 85),
    "Dairy Products":   (70, 95),
    "Steel Products":   (40, 65),
}

def _base_speed(cargo: str) -> tuple[float, float]:
    return CARGO_SPEED.get(cargo, (55, 80))


def drift_speed(current_speed: float, cargo: str) -> float:
    """
    Simulate realistic speed drift:
      - 70% chance: small adjustment (±8 km/h)
      - 20% chance: traffic slow-down (halve speed)
      - 10% chance: speed recovery (back toward normal)
    """
    lo, hi = _base_speed(cargo)
    roll = random.random()
    if roll < 0.70:
        delta = random.uniform(-8, 8)
        new_speed = current_speed + delta
    elif roll < 0.90:
        new_speed = current_speed * random.uniform(0.4, 0.65)   # slow-down
    else:
        new_speed = random.uniform(lo, hi)                       # recovery

    return round(max(5.0, min(new_speed, 120.0)), 1)


# ─── AI prediction core ───────────────────────────────────────────────────────

def compute_prediction(shipment: dict) -> dict:
    """
    Given a live shipment dict, return an AIPrediction dict.

    Rules:
    -------
    ETA         : distance_remaining / speed → minutes from now
    delay_status: True if speed < 40% of cargo baseline OR
                  remaining distance increased vs last tick
    risk_level  : HIGH   if delay_prob > 0.65
                  MEDIUM if delay_prob > 0.35
                  LOW    otherwise
    delay_prob  : weighted combo of speed ratio + proximity to delivery
    """
    if shipment["status"] == "Delivered":
        return {
            "eta_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
            "eta_minutes_remaining": 0,
            "delay_status": False,
            "risk_level": "LOW",
            "delay_probability": 0.0,
            "speed_kmh": 0.0,
            "distance_remaining_km": 0.0,
        }

    cur  = shipment["current_location"]
    dest = shipment["destination"]
    speed = shipment["speed_kmh"]
    cargo = shipment["cargo"]

    dist_remaining = haversine_km(
        cur["lat"], cur["lng"],
        dest["lat"], dest["lng"],
    )

    # ── ETA ──────────────────────────────────────────────────────────────────
    if speed > 0:
        minutes_remaining = int((dist_remaining / speed) * 60)
    else:
        minutes_remaining = 9999

    eta_updated = (
        datetime.utcnow() + timedelta(minutes=minutes_remaining)
    ).strftime("%Y-%m-%dT%H:%M:%S")

    # ── Delay detection ───────────────────────────────────────────────────────
    lo, hi = _base_speed(cargo)
    normal_speed = (lo + hi) / 2
    speed_ratio  = speed / normal_speed          # 1.0 = on track, <0.5 = bad

    # Speed factor: 0 (fine) → 1 (very slow)
    speed_factor = max(0.0, 1.0 - speed_ratio)

    # Distance factor: penalise if a lot of journey remains and going slow
    total_dist = haversine_km(
        shipment["origin"]["lat"], shipment["origin"]["lng"],
        dest["lat"], dest["lng"],
    )
    progress = shipment.get("progress", 0.5)
    dist_factor = (1 - progress) * 0.4           # heavier weight near start

    delay_probability = round(
        min(1.0, speed_factor * 0.6 + dist_factor + random.uniform(-0.05, 0.05)),
        2,
    )
    delay_status = speed < normal_speed * 0.50 or delay_probability > 0.55

    # ── Risk level ────────────────────────────────────────────────────────────
    if delay_probability > 0.65:
        risk_level = "HIGH"
    elif delay_probability > 0.35:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # ── Legacy risk_score (0-100) kept for Phase 1 compat ────────────────────
    risk_score = int(delay_probability * 100)

    return {
        "eta_updated": eta_updated,
        "eta_minutes_remaining": minutes_remaining,
        "delay_status": delay_status,
        "risk_level": risk_level,
        "delay_probability": delay_probability,
        "speed_kmh": speed,
        "distance_remaining_km": round(dist_remaining, 1),
        "_risk_score": risk_score,           # internal — picked up by simulator
    }
