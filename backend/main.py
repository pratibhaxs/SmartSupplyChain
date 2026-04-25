import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.shipments import router as shipments_router
from ws.routes import ws_router
from ws.manager import manager
from simulation.engine import simulation_loop, set_ws_manager

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Smart Supply Chain API",
    description="Phase 2 - Real-time simulation + AI predictions via WebSocket",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(shipments_router)
app.include_router(ws_router)


@app.on_event("startup")
async def startup():
    # Wire the WS manager into the simulation engine, then launch the loop
    set_ws_manager(manager)
    asyncio.create_task(simulation_loop())


@app.get("/")
def root():
    return {"message": "Smart Supply Chain API v2 running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
