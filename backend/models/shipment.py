from pydantic import BaseModel
from typing import Optional

class Location(BaseModel):
    lat: float
    lng: float
    city: str

class AIPrediction(BaseModel):
    eta_updated: str              # ISO timestamp recomputed from current position
    eta_minutes_remaining: int    # minutes until arrival
    delay_status: bool            # True if classified as delayed
    risk_level: str               # "LOW" | "MEDIUM" | "HIGH"
    delay_probability: float      # 0.0 – 1.0
    speed_kmh: float              # current simulated speed
    distance_remaining_km: float

class Shipment(BaseModel):
    id: str
    origin: Location
    destination: Location
    current_location: Location
    status: str                   # "In Transit" | "Delayed" | "Delivered"
    eta: str                      # original static ETA
    cargo: str
    carrier: str
    risk_score: int               # 0-100 legacy field
    progress: float               # 0.0 → 1.0 route completion
    speed_kmh: float              # current speed
    prediction: Optional[AIPrediction] = None
