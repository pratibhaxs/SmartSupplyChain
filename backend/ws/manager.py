"""
WebSocket Manager
==================
Keeps a registry of active WebSocket connections.
`broadcast()` sends a JSON string to every connected client,
silently dropping any that have disconnected.
"""

import logging
from fastapi import WebSocket

log = logging.getLogger("ws_manager")


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        log.info(f"WS connected — total clients: {len(self.active)}")

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
        log.info(f"WS disconnected — total clients: {len(self.active)}")

    async def broadcast(self, message: str):
        """Send message to every live client; prune dead ones."""
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


# Singleton instance shared across the app
manager = ConnectionManager()
