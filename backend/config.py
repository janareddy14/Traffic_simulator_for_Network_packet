"""
Application configuration for Traffic Map backend.

All thresholds, intervals, and tunables are centralised here so the
rest of the codebase never hard-codes magic numbers.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CaptureConfig:
    """Knobs for the mock / live packet generator."""

    # How often the mock generator emits a packet (seconds).
    emit_interval_s: float = 0.20

    # Probability buckets for packet outcomes (must sum to ≤ 1.0).
    drop_rate: float = 0.05
    retransmit_rate: float = 0.03
    block_rate: float = 0.02

    # Latency range for simulated round-trips (milliseconds).
    latency_min_ms: int = 20
    latency_max_ms: int = 500

    # Size threshold that promotes a packet to "heavy_truck" (bytes).
    heavy_truck_threshold: int = 10_240  # 10 KB


@dataclass(frozen=True)
class ServerConfig:
    """Web-server / Socket.IO settings."""

    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )


@dataclass(frozen=True)
class AppConfig:
    """Top-level config that aggregates sub-configs."""

    capture: CaptureConfig = field(default_factory=CaptureConfig)
    server: ServerConfig = field(default_factory=ServerConfig)


# Module-level singleton — import this wherever config is needed.
settings = AppConfig()
