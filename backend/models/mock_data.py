# Phase 2: Shipments are now mutable dicts so the simulation engine can update them
# in-place without Pydantic immutability issues. They get serialised to Shipment
# objects on the way out to clients.

import math, random
from datetime import datetime, timedelta

def haversine_km(lat1, lng1, lat2, lng2):
    """Great-circle distance in km between two lat/lng points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def _eta_from_now(minutes: int) -> str:
    return (datetime.utcnow() + timedelta(minutes=minutes)).strftime("%Y-%m-%dT%H:%M:%S")

# Each entry is a plain dict — the simulation engine mutates these directly.
# Fields match the Shipment Pydantic model exactly.
LIVE_SHIPMENTS: list[dict] = [
    {
        "id": "SHP-001",
        "origin":      {"lat": 28.6139, "lng": 77.2090, "city": "Delhi"},
        "destination": {"lat": 19.0760, "lng": 72.8777, "city": "Mumbai"},
        "current_location": {"lat": 26.4499, "lng": 74.6399, "city": "Near Ajmer"},
        "status": "In Transit",
        "eta": _eta_from_now(420),
        "cargo": "Electronics",
        "carrier": "BlueDart Logistics",
        "risk_score": 30,
        "progress": 0.32,
        "speed_kmh": 72.0,
        "prediction": None,
    },
    {
        "id": "SHP-002",
        "origin":      {"lat": 12.9716, "lng": 77.5946, "city": "Bangalore"},
        "destination": {"lat": 17.3850, "lng": 78.4867, "city": "Hyderabad"},
        "current_location": {"lat": 14.4673, "lng": 78.8242, "city": "Near Kadapa"},
        "status": "Delayed",
        "eta": _eta_from_now(180),
        "cargo": "Pharmaceuticals",
        "carrier": "DTDC Express",
        "risk_score": 78,
        "progress": 0.48,
        "speed_kmh": 28.0,
        "prediction": None,
    },
    {
        "id": "SHP-003",
        "origin":      {"lat": 22.5726, "lng": 88.3639, "city": "Kolkata"},
        "destination": {"lat": 21.1458, "lng": 79.0882, "city": "Nagpur"},
        "current_location": {"lat": 21.1458, "lng": 79.0882, "city": "Nagpur"},
        "status": "Delivered",
        "eta": _eta_from_now(-30),
        "cargo": "Textiles",
        "carrier": "Gati Logistics",
        "risk_score": 5,
        "progress": 1.0,
        "speed_kmh": 0.0,
        "prediction": None,
    },
    {
        "id": "SHP-004",
        "origin":      {"lat": 26.8467, "lng": 80.9462, "city": "Lucknow"},
        "destination": {"lat": 23.0225, "lng": 72.5714, "city": "Ahmedabad"},
        "current_location": {"lat": 26.9124, "lng": 75.7873, "city": "Near Jaipur"},
        "status": "In Transit",
        "eta": _eta_from_now(310),
        "cargo": "Auto Parts",
        "carrier": "Mahindra Logistics",
        "risk_score": 45,
        "progress": 0.41,
        "speed_kmh": 65.0,
        "prediction": None,
    },
    {
        "id": "SHP-005",
        "origin":      {"lat": 13.0827, "lng": 80.2707, "city": "Chennai"},
        "destination": {"lat": 9.9312,  "lng": 76.2673, "city": "Kochi"},
        "current_location": {"lat": 10.7867, "lng": 76.6548, "city": "Near Thrissur"},
        "status": "Delayed",
        "eta": _eta_from_now(240),
        "cargo": "Food & Beverages",
        "carrier": "VRL Logistics",
        "risk_score": 85,
        "progress": 0.70,
        "speed_kmh": 18.0,
        "prediction": None,
    },
    {
        "id": "SHP-006",
        "origin":      {"lat": 27.1767, "lng": 78.0081, "city": "Agra"},
        "destination": {"lat": 25.3176, "lng": 82.9739, "city": "Varanasi"},
        "current_location": {"lat": 25.4358, "lng": 81.8463, "city": "Near Allahabad"},
        "status": "In Transit",
        "eta": _eta_from_now(90),
        "cargo": "Handicrafts",
        "carrier": "Delhivery",
        "risk_score": 20,
        "progress": 0.82,
        "speed_kmh": 78.0,
        "prediction": None,
    },
    {
        "id": "SHP-007",
        "origin":      {"lat": 30.7333, "lng": 76.7794, "city": "Chandigarh"},
        "destination": {"lat": 28.7041, "lng": 77.1025, "city": "Delhi"},
        "current_location": {"lat": 29.3909, "lng": 76.9635, "city": "Near Panipat"},
        "status": "In Transit",
        "eta": _eta_from_now(75),
        "cargo": "Dairy Products",
        "carrier": "Blue Express",
        "risk_score": 15,
        "progress": 0.65,
        "speed_kmh": 82.0,
        "prediction": None,
    },
    {
        "id": "SHP-008",
        "origin":      {"lat": 21.2514, "lng": 81.6296, "city": "Raipur"},
        "destination": {"lat": 20.2961, "lng": 85.8245, "city": "Bhubaneswar"},
        "current_location": {"lat": 20.9374, "lng": 84.8033, "city": "Near Sambalpur"},
        "status": "Delayed",
        "eta": _eta_from_now(200),
        "cargo": "Steel Products",
        "carrier": "TCI Freight",
        "risk_score": 70,
        "progress": 0.55,
        "speed_kmh": 35.0,
        "prediction": None,
    },
]
