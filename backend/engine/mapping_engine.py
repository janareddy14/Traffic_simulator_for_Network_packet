"""
Mapping Engine (§8 of the spec).

Translates *raw* packet dicts (from the mock generator or a live Scapy
capture) into canonical ``Packet`` model instances, applying:

 • Protocol detection  (DNS, HTTPS, TCP, UDP)
 • Vehicle-type assignment  (armored_truck, courier_van, …)
 • Route generation  (ordered list of map hops)
 • Status overrides  (firewall blocks, retransmissions)

The engine is a pure, stateless transformer — no I/O, no side effects —
which makes it trivially testable.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from config import settings
from models.packet import Direction, Packet, PacketStatus, VehicleType

logger = logging.getLogger(__name__)

# ── route templates ──────────────────────────────────────────────────

_ROUTE_HTTPS = [
    "house", "signal_1", "toll_gate", "isp_highway",
    "warehouse_cdn", "destination",
]
_ROUTE_DNS = [
    "house", "signal_1", "isp_highway", "address_office",
]
_ROUTE_TCP = [
    "house", "signal_1", "toll_gate", "isp_highway", "destination",
]
_ROUTE_UDP = [
    "house", "signal_1", "isp_highway", "destination",
]
_ROUTE_HANDSHAKE = [
    "house", "signal_1", "toll_gate", "destination",
]


# ── public API ───────────────────────────────────────────────────────


class MappingEngine:
    """Stateless translator: raw dict → ``Packet``."""

    def map(self, raw: dict) -> Packet:
        """Convert a single raw packet dict into a canonical Packet model.

        Parameters
        ----------
        raw:
            A dict as produced by ``MockPacketGenerator`` or a Scapy
            dissection helper.  Expected keys are documented in
            ``MockPacketGenerator._dns_exchange``.

        Returns
        -------
        Packet
            Fully populated canonical packet model.
        """
        protocol = self._detect_protocol(raw)
        vehicle = self._assign_vehicle(raw, protocol)
        route = self._build_route(raw, protocol, vehicle)
        status = self._resolve_status(raw)

        return Packet(
            id=raw["id"],
            timestamp=self._parse_timestamp(raw.get("timestamp")),
            direction=Direction(raw.get("direction", "request")),
            source_ip=raw.get("source_ip", "0.0.0.0"),
            destination_ip=raw.get("destination_ip", "0.0.0.0"),
            domain=raw.get("domain"),
            protocol=protocol,
            port=int(raw.get("dst_port", 0)),
            size=int(raw.get("size", 0)),
            ttl=int(raw.get("ttl", 64)),
            latency_ms=raw.get("latency_ms"),
            status=status,
            vehicle_type=vehicle,
            route=route,
            tcp_flags=raw.get("tcp_flags"),
            session_id=raw.get("session_id"),
        )

    def map_many(self, raws: list[dict]) -> list[Packet]:
        """Convenience batch mapper."""
        return [self.map(r) for r in raws]

    # ── protocol detection ────────────────────────────────────────────

    @staticmethod
    def _detect_protocol(raw: dict) -> str:
        transport: str = raw.get("transport", "TCP").upper()
        dst_port: int = int(raw.get("dst_port", 0))
        tcp_flags: Optional[str] = raw.get("tcp_flags")

        # DNS — UDP port 53
        if transport == "UDP" and dst_port == 53:
            return "DNS"

        # HTTPS — TCP port 443
        if dst_port == 443 and transport == "TCP":
            # Handshake packets are still "HTTPS-level" but flagged via tcp_flags.
            return "HTTPS"

        # HTTP — TCP port 80
        if dst_port == 80 and transport == "TCP":
            return "HTTP"

        # Fall through to transport layer name.
        return transport

    # ── vehicle assignment (§6 rules) ─────────────────────────────────

    def _assign_vehicle(self, raw: dict, protocol: str) -> VehicleType:
        tcp_flags: Optional[str] = raw.get("tcp_flags")
        size: int = int(raw.get("size", 0))

        # TCP handshake packets → motorbike
        if tcp_flags in ("SYN", "SYN-ACK", "ACK") and size == 0:
            return VehicleType.MOTORBIKE

        # DNS → courier_van
        if protocol == "DNS":
            return VehicleType.COURIER_VAN

        # Large downloads → heavy_truck (overrides HTTPS/TCP)
        if size >= settings.capture.heavy_truck_threshold:
            return VehicleType.HEAVY_TRUCK

        # HTTPS → armored_truck
        if protocol == "HTTPS":
            return VehicleType.ARMORED_TRUCK

        # Generic TCP → bus
        transport: str = raw.get("transport", "TCP").upper()
        if transport == "TCP":
            return VehicleType.BUS

        # UDP (non-DNS) → bike
        return VehicleType.BIKE

    # ── route building ────────────────────────────────────────────────

    @staticmethod
    def _build_route(
        raw: dict, protocol: str, vehicle: VehicleType
    ) -> list[str]:
        if vehicle == VehicleType.MOTORBIKE:
            route = list(_ROUTE_HANDSHAKE)
        elif protocol == "DNS":
            route = list(_ROUTE_DNS)
        elif protocol in ("HTTPS", "HTTP"):
            route = list(_ROUTE_HTTPS)
        else:
            transport = raw.get("transport", "TCP").upper()
            if transport == "TCP":
                route = list(_ROUTE_TCP)
            else:
                route = list(_ROUTE_UDP)
                
        if raw.get("direction") == "response":
            route.reverse()
            
        return route

    # ── status resolution ─────────────────────────────────────────────

    @staticmethod
    def _resolve_status(raw: dict) -> PacketStatus:
        raw_status = raw.get("status", "delivered")
        try:
            return PacketStatus(raw_status)
        except ValueError:
            logger.warning("Unknown status '%s', defaulting to DELIVERED", raw_status)
            return PacketStatus.DELIVERED

    # ── timestamp parsing ─────────────────────────────────────────────

    @staticmethod
    def _parse_timestamp(value: str | datetime | None) -> datetime:
        if value is None:
            return datetime.now(timezone.utc)
        if isinstance(value, datetime):
            return value
        # ISO-8601 string
        return datetime.fromisoformat(value)
