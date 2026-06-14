"""
Realistic mock packet generator for the Traffic Map visualizer.

Generates correlated traffic patterns that mirror real network behaviour:
 • DNS lookup → TCP handshake → HTTPS data transfer (same session)
 • Request / response pairs with realistic latencies
 • Occasional anomalies: drops, retransmissions, firewall blocks

Every call to `generate()` yields one or more *raw* packet dicts (not
yet Packet models) — the mapping engine is responsible for promotion.
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator

from config import settings

logger = logging.getLogger(__name__)

# ── realistic look-up tables ──────────────────────────────────────────

DOMAINS: list[dict] = [
    {"domain": "google.com",    "ip": "142.250.183.78",  "category": "search"},
    {"domain": "youtube.com",   "ip": "142.250.183.110", "category": "video"},
    {"domain": "github.com",    "ip": "140.82.121.4",    "category": "dev"},
    {"domain": "netflix.com",   "ip": "54.237.226.164",  "category": "video"},
    {"domain": "cloudflare.com","ip": "104.16.132.229",  "category": "cdn"},
    {"domain": "amazon.com",    "ip": "176.32.103.205",  "category": "shopping"},
    {"domain": "reddit.com",    "ip": "151.101.1.140",   "category": "social"},
    {"domain": "stackoverflow.com", "ip": "151.101.1.69", "category": "dev"},
    {"domain": "twitch.tv",     "ip": "151.101.66.167",  "category": "video"},
    {"domain": "spotify.com",   "ip": "35.186.224.25",   "category": "music"},
    {"domain": "discord.com",   "ip": "162.159.135.232", "category": "social"},
    {"domain": "openai.com",    "ip": "13.107.238.51",   "category": "ai"},
]

LOCAL_SUBNETS = ["192.168.1", "192.168.0", "10.0.0"]

# Firewall-blocked domains (simulated corporate filter).
BLOCKED_DOMAINS = {"twitch.tv", "reddit.com"}

# ── helpers ───────────────────────────────────────────────────────────


def _local_ip() -> str:
    subnet = random.choice(LOCAL_SUBNETS)
    host = random.randint(2, 254)
    return f"{subnet}.{host}"


def _pkt_id() -> str:
    return f"pkt_{int(time.monotonic_ns() // 1_000) & 0xFFFFFFFF}"


def _session_id() -> str:
    return f"sess_{uuid.uuid4().hex[:12]}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _random_ttl() -> int:
    return random.choice([32, 64, 128, 255])


def _random_status(domain: str | None = None) -> str:
    """Pick a status respecting configured probability buckets."""
    cfg = settings.capture
    # Blocked domains always get blocked.
    if domain and domain in BLOCKED_DOMAINS:
        if random.random() < 0.6:  # 60 % of traffic to blocked sites
            return "blocked"
    roll = random.random()
    if roll < cfg.drop_rate:
        return "dropped"
    if roll < cfg.drop_rate + cfg.retransmit_rate:
        return "retransmitted"
    if roll < cfg.drop_rate + cfg.retransmit_rate + cfg.block_rate:
        return "blocked"
    return "delivered"


def _latency() -> float:
    cfg = settings.capture
    return round(random.uniform(cfg.latency_min_ms, cfg.latency_max_ms), 1)


# ── generator class ──────────────────────────────────────────────────


class MockPacketGenerator:
    """Async generator that yields raw packet dicts at a configurable rate."""

    def __init__(self) -> None:
        self._running = False
        self._seq = 0

    # ── public API ────────────────────────────────────────────────────

    def start(self) -> None:
        self._running = True
        logger.info("MockPacketGenerator started")

    def stop(self) -> None:
        self._running = False
        logger.info("MockPacketGenerator stopped")

    @property
    def is_running(self) -> bool:
        return self._running

    async def stream(self) -> AsyncIterator[dict]:
        """Infinite async iterator of raw packet dicts."""
        while self._running:
            for pkt in self._generate_burst():
                yield pkt
            await asyncio.sleep(settings.capture.emit_interval_s)

    # ── internal generation logic ─────────────────────────────────────

    def _next_id(self) -> str:
        self._seq += 1
        return f"pkt_{self._seq}"

    def _generate_burst(self) -> list[dict]:
        """
        Produce a *burst* of related packets that model a single
        logical interaction (e.g. DNS → handshake → HTTPS data).
        """
        target = random.choice(DOMAINS)
        session = _session_id()
        src_ip = _local_ip()
        dst_ip = target["ip"]
        domain = target["domain"]

        packets: list[dict] = []

        # ① DNS look-up  (≈ 70 % of sessions start with an explicit DNS query)
        if random.random() < 0.70:
            packets.extend(self._dns_exchange(src_ip, dst_ip, domain, session))

        # ② TCP three-way handshake  (≈ 80 % of the time)
        if random.random() < 0.80:
            packets.extend(self._tcp_handshake(src_ip, dst_ip, domain, session))

        # ③ Data packets — HTTPS or plain TCP/UDP
        packets.extend(self._data_packets(src_ip, dst_ip, domain, session, target))

        return packets

    # ── sub-generators ────────────────────────────────────────────────

    def _dns_exchange(
        self, src: str, dst: str, domain: str, session: str
    ) -> list[dict]:
        """DNS query → DNS response pair (UDP port 53)."""
        query = {
            "id": self._next_id(),
            "timestamp": _now(),
            "direction": "request",
            "source_ip": src,
            "destination_ip": "8.8.8.8",  # Google Public DNS
            "domain": domain,
            "transport": "UDP",
            "src_port": random.randint(49152, 65535),
            "dst_port": 53,
            "size": random.randint(40, 80),
            "ttl": _random_ttl(),
            "latency_ms": round(random.uniform(5, 30), 1),
            "tcp_flags": None,
            "session_id": session,
            "status": "delivered",
        }
        response = {
            **query,
            "id": self._next_id(),
            "direction": "response",
            "source_ip": "8.8.8.8",
            "destination_ip": src,
            "size": random.randint(60, 512),
        }
        return [query, response]

    def _tcp_handshake(
        self, src: str, dst: str, domain: str, session: str
    ) -> list[dict]:
        """SYN → SYN-ACK → ACK three-way handshake."""
        base = {
            "domain": domain,
            "transport": "TCP",
            "dst_port": 443,
            "size": 0,
            "ttl": _random_ttl(),
            "latency_ms": round(random.uniform(10, 60), 1),
            "session_id": session,
            "status": "delivered",
        }
        syn = {
            **base,
            "id": self._next_id(),
            "timestamp": _now(),
            "direction": "request",
            "source_ip": src,
            "destination_ip": dst,
            "src_port": random.randint(49152, 65535),
            "tcp_flags": "SYN",
        }
        syn_ack = {
            **base,
            "id": self._next_id(),
            "timestamp": _now(),
            "direction": "response",
            "source_ip": dst,
            "destination_ip": src,
            "src_port": 443,
            "tcp_flags": "SYN-ACK",
        }
        ack = {
            **base,
            "id": self._next_id(),
            "timestamp": _now(),
            "direction": "request",
            "source_ip": src,
            "destination_ip": dst,
            "src_port": syn["src_port"],
            "tcp_flags": "ACK",
        }
        return [syn, syn_ack, ack]

    def _data_packets(
        self,
        src: str,
        dst: str,
        domain: str,
        session: str,
        target: dict,
    ) -> list[dict]:
        """Main data transfer — request + response pair."""
        is_large = target["category"] in ("video", "music") and random.random() < 0.40
        req_size = random.randint(200, 1500)
        resp_size = (
            random.randint(10_240, 65_000) if is_large else random.randint(500, 9_000)
        )
        status = _random_status(domain)
        latency = _latency()

        request = {
            "id": self._next_id(),
            "timestamp": _now(),
            "direction": "request",
            "source_ip": src,
            "destination_ip": dst,
            "domain": domain,
            "transport": "TCP",
            "src_port": random.randint(49152, 65535),
            "dst_port": 443,
            "size": req_size,
            "ttl": _random_ttl(),
            "latency_ms": latency,
            "tcp_flags": "PSH-ACK",
            "session_id": session,
            "status": status,
        }

        # If request was dropped/blocked, no response comes back.
        if status in ("dropped", "blocked"):
            return [request]

        response = {
            "id": self._next_id(),
            "timestamp": _now(),
            "direction": "response",
            "source_ip": dst,
            "destination_ip": src,
            "domain": domain,
            "transport": "TCP",
            "src_port": 443,
            "dst_port": request["src_port"],
            "size": resp_size,
            "ttl": _random_ttl(),
            "latency_ms": latency,
            "tcp_flags": "PSH-ACK",
            "session_id": session,
            "status": "delivered",
        }

        # Occasional retransmission of the response.
        pkts = [request, response]
        if status == "retransmitted":
            retransmit = {**response, "id": self._next_id(), "status": "retransmitted"}
            pkts.append(retransmit)

        return pkts
