"""
WebSocket endpoint: /ws/shipments
===================================
- On connect: immediately sends the current snapshot so the UI
  doesn't wait for the first tick.
- Then stays open receiving pings (optional) until client disconnects.
- The simulation engine broadcasts updates to all connected clients
  independently via the shared ConnectionManager.
"""

import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ws.manager import manager
from models.mock_data import LIVE_SHIPMENTS

ws_router = APIRouter()


@ws_router.websocket("/ws/shipments")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    # Send immediate snapshot so UI populates instantly
    snapshot = {
        "type": "shipment_update",
        "timestamp": datetime.utcnow().isoformat(),
        "shipments": LIVE_SHIPMENTS,
    }
    await websocket.send_text(json.dumps(snapshot))

    try:
        while True:
            # Keep connection alive; optionally handle client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
