"""
Traffic Map — FastAPI + Socket.IO backend entry-point.

Run with:
    uvicorn main:socket_app --reload

The ASGI application exposed as ``socket_app`` is a Socket.IO ASGIApp
that wraps the FastAPI instance, giving us both REST endpoints *and*
real-time WebSocket channels on the same port.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from capture.mock_generator import MockPacketGenerator
from capture.scapy_capture import ScapyPacketGenerator
from config import settings
from engine.mapping_engine import MappingEngine
from storage import session_store

# ── logging ───────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
)
logger = logging.getLogger("traffic_map")

# ── Socket.IO server ─────────────────────────────────────────────────

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

# ── application state ────────────────────────────────────────────────

mock_generator = MockPacketGenerator()
live_generator = ScapyPacketGenerator()
engine = MappingEngine()
_capture_task: asyncio.Task | None = None
_mode: str = "mock"  # "mock" | "live"

def _get_active_generator():
    return live_generator if _mode == "live" else mock_generator

# ── background pipeline ──────────────────────────────────────────────

async def _packet_pipeline() -> None:
    """
    Core loop: pull raw packets from the active generator, translate them
    through the mapping engine, and emit each canonical packet to
    every connected Socket.IO client. Also persists to SQLite.
    """
    logger.info("Packet pipeline started (mode=%s)", _mode)
    active_gen = _get_active_generator()
    try:
        async for raw in active_gen.stream():
            try:
                packet = engine.map(raw)
                
                # Apply Phase 9 Anomaly Heuristics
                if packet.latency_ms is not None and packet.latency_ms > 500:
                    packet.anomaly_type = "latency"
                elif packet.size > 10000:
                    packet.anomaly_type = "size"
                elif packet.status in ["blocked", "dropped", "retransmitted"]:
                    packet.anomaly_type = packet.status
                
                packet_dict = packet.model_dump(mode="json")
                
                # Emit to clients
                await sio.emit("packet", packet_dict)
                
                # Persist to database in background
                asyncio.create_task(session_store.insert_packet(packet_dict))
            except Exception:
                logger.exception("Failed to map/emit packet: %s", raw.get("id"))
    except asyncio.CancelledError:
        logger.info("Packet pipeline cancelled")
    except Exception:
        logger.exception("Packet pipeline crashed")


def _start_pipeline() -> None:
    global _capture_task
    if _capture_task and not _capture_task.done():
        logger.warning("Pipeline already running — ignoring start request")
        return
    active_gen = _get_active_generator()
    active_gen.start()
    _capture_task = asyncio.create_task(_packet_pipeline(), name="packet_pipeline")


def _stop_pipeline() -> None:
    global _capture_task
    mock_generator.stop()
    live_generator.stop()
    if _capture_task and not _capture_task.done():
        _capture_task.cancel()
    _capture_task = None


# ── FastAPI lifespan ──────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Start the mock pipeline on boot; tear it down on shutdown."""
    await session_store.init_db()
    _start_pipeline()
    logger.info("Traffic Map backend is live on port %s", settings.server.port)
    yield
    _stop_pipeline()
    logger.info("Traffic Map backend shutting down")


# ── FastAPI application ──────────────────────────────────────────────

app = FastAPI(
    title="Traffic Map Backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.server.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST endpoints ────────────────────────────────────────────────────


@app.get("/health")
async def health() -> dict:
    active_gen = _get_active_generator()
    return {
        "status": "ok",
        "mode": _mode,
        "capturing": active_gen.is_running,
        "has_live_permissions": live_generator.has_permissions
    }


@app.post("/api/capture/start")
async def capture_start() -> dict:
    _start_pipeline()
    return {"status": "started", "mode": _mode}


@app.post("/api/capture/stop")
async def capture_stop() -> dict:
    _stop_pipeline()
    return {"status": "stopped"}


@app.post("/api/capture/mode")
async def capture_mode(mode: str = "mock") -> dict:
    """Toggle between ``mock`` and ``live`` capture modes."""
    global _mode
    if mode not in ("mock", "live"):
        return {"error": f"Unknown mode: {mode}"}
        
    if mode == "live" and not live_generator.has_permissions:
        return {"error": "Insufficient permissions for live capture. Please run as Administrator or install Npcap."}

    was_running = (_capture_task is not None and not _capture_task.done())
    
    if was_running:
        _stop_pipeline()
        
    _mode = mode
    logger.info("Capture mode set to %s", _mode)
    
    if was_running:
        _start_pipeline()
        
    return {"mode": _mode}


@app.get("/api/replay")
async def replay_packets(limit: int = 1000):
    """Fetch recent historical packets from SQLite for replay."""
    packets = await session_store.get_recent_packets(limit)
    return {"packets": packets}


# ── Socket.IO event handlers ─────────────────────────────────────────


@sio.event
async def connect(sid: str, environ: dict) -> None:
    logger.info("Client connected: %s", sid)


@sio.event
async def disconnect(sid: str) -> None:
    logger.info("Client disconnected: %s", sid)


# ── ASGI app (Socket.IO wrapping FastAPI) ─────────────────────────────

socket_app = socketio.ASGIApp(sio, app)
