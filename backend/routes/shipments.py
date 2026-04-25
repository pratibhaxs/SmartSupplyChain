from fastapi import APIRouter, HTTPException
from models.mock_data import LIVE_SHIPMENTS

router = APIRouter(prefix="/shipments", tags=["shipments"])

@router.get("/")
def get_all_shipments():
    return {"count": len(LIVE_SHIPMENTS), "shipments": LIVE_SHIPMENTS}

@router.get("/stats/summary")
def get_stats():
    total      = len(LIVE_SHIPMENTS)
    in_transit = sum(1 for s in LIVE_SHIPMENTS if s["status"] == "In Transit")
    delayed    = sum(1 for s in LIVE_SHIPMENTS if s["status"] == "Delayed")
    delivered  = sum(1 for s in LIVE_SHIPMENTS if s["status"] == "Delivered")
    high_risk  = sum(1 for s in LIVE_SHIPMENTS
                     if s.get("prediction", {}) and
                        s["prediction"].get("risk_level") == "HIGH")
    return {
        "total": total,
        "in_transit": in_transit,
        "delayed": delayed,
        "delivered": delivered,
        "high_risk": high_risk,
    }

@router.get("/{shipment_id}")
def get_shipment(shipment_id: str):
    for s in LIVE_SHIPMENTS:
        if s["id"] == shipment_id:
            return s
    raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
