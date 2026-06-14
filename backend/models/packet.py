"""
Canonical Packet model (§4 of the spec).

Every packet — whether sourced from the mock generator, a live Scapy
capture, or a PCAP replay — is normalised into this schema before it
reaches the frontend via Socket.IO.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Direction(str, Enum):
    REQUEST = "request"
    RESPONSE = "response"


class PacketStatus(str, Enum):
    DELIVERED = "delivered"
    DROPPED = "dropped"
    RETRANSMITTED = "retransmitted"
    BLOCKED = "blocked"


class VehicleType(str, Enum):
    ARMORED_TRUCK = "armored_truck"
    COURIER_VAN = "courier_van"
    BUS = "bus"
    BIKE = "bike"
    HEAVY_TRUCK = "heavy_truck"
    MOTORBIKE = "motorbike"


class Packet(BaseModel):
    """The single source of truth for every packet crossing the map."""

    id: str = Field(..., examples=["pkt_1024"])
    timestamp: datetime
    direction: Direction
    source_ip: str
    destination_ip: str
    domain: Optional[str] = None
    protocol: str = Field(..., examples=["HTTPS", "DNS", "TCP", "UDP"])
    port: int = Field(..., ge=0, le=65535)
    size: int = Field(..., ge=0, description="Payload size in bytes")
    ttl: int = Field(64, ge=0, le=255)
    latency_ms: Optional[float] = None
    status: PacketStatus = PacketStatus.DELIVERED
    vehicle_type: VehicleType
    route: list[str] = Field(
        default_factory=list,
        description="Ordered list of hops the vehicle follows on the map",
    )
    tcp_flags: Optional[str] = None
    session_id: Optional[str] = None
    anomaly_type: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "pkt_1024",
                    "timestamp": "2026-06-14T12:45:10.123Z",
                    "direction": "request",
                    "source_ip": "192.168.1.5",
                    "destination_ip": "142.250.183.78",
                    "domain": "youtube.com",
                    "protocol": "HTTPS",
                    "port": 443,
                    "size": 1480,
                    "ttl": 64,
                    "latency_ms": 82,
                    "status": "delivered",
                    "vehicle_type": "armored_truck",
                    "route": [
                        "house",
                        "signal_1",
                        "toll_gate",
                        "isp_highway",
                        "warehouse_cdn",
                        "destination",
                    ],
                    "tcp_flags": None,
                    "session_id": "sess_abc123",
                }
            ]
        }
    }
