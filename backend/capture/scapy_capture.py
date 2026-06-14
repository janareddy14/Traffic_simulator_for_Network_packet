import asyncio
import logging
import time
from typing import AsyncIterator

try:
    from scapy.all import AsyncSniffer, IP, TCP, UDP, DNS
    import scapy.error
except ImportError:
    AsyncSniffer = None

logger = logging.getLogger(__name__)

class ScapyPacketGenerator:
    """Live packet capture using Scapy."""

    def __init__(self) -> None:
        self._running = False
        self._queue: asyncio.Queue | None = None
        self._sniffer = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._seq = 0
        self._has_permissions = self._check_permissions()

    def _check_permissions(self) -> bool:
        if AsyncSniffer is None:
            logger.error("Scapy is not installed or available.")
            return False
        try:
            # Try a quick mock sniff to see if we have permissions/Npcap installed
            tester = AsyncSniffer(count=1, timeout=0.1)
            tester.start()
            tester.join()
            return True
        except (PermissionError, Exception) as e:
            logger.warning(
                "Insufficient permissions for live capture (or Npcap missing). "
                f"Details: {e}"
            )
            return False

    @property
    def has_permissions(self) -> bool:
        return self._has_permissions

    def start(self) -> None:
        if not self.has_permissions:
            logger.error("Cannot start Scapy capture: no permissions.")
            return

        self._running = True
        self._queue = asyncio.Queue()
        self._loop = asyncio.get_running_loop()

        # BPF Filter to ignore our own web traffic
        bpf_filter = "not (tcp port 8000 or tcp port 5173)"

        self._sniffer = AsyncSniffer(
            filter=bpf_filter,
            prn=self._packet_callback,
            store=False
        )
        self._sniffer.start()
        logger.info("ScapyPacketGenerator started")

    def stop(self) -> None:
        self._running = False
        if self._sniffer:
            self._sniffer.stop()
            self._sniffer = None
        logger.info("ScapyPacketGenerator stopped")

    @property
    def is_running(self) -> bool:
        return self._running

    def _packet_callback(self, packet) -> None:
        if not self._running or not self._loop or not self._queue:
            return

        try:
            raw_dict = self._parse_packet(packet)
            if raw_dict:
                self._loop.call_soon_threadsafe(self._queue.put_nowait, raw_dict)
        except Exception as e:
            # Log at debug so we don't spam on malformed packets
            logger.debug("Error parsing packet: %s", e)

    def _parse_packet(self, packet) -> dict | None:
        """Translates a scapy packet object to the raw dict expected by MappingEngine."""
        if not packet.haslayer(IP):
            return None

        ip_layer = packet[IP]
        src_ip = ip_layer.src
        dst_ip = ip_layer.dst

        self._seq += 1
        pkt_id = f"live_{int(time.time() * 1000)}_{self._seq}"

        raw = {
            "id": pkt_id,
            "timestamp": None,
            "source_ip": src_ip,
            "destination_ip": dst_ip,
            "size": len(packet),
            "ttl": ip_layer.ttl,
            "latency_ms": 20.0,  # difficult to calculate single-way without stream tracking
            "status": "delivered",
            "session_id": f"sess_{src_ip}_{dst_ip}"
        }

        if packet.haslayer(TCP):
            tcp = packet[TCP]
            raw["transport"] = "TCP"
            raw["src_port"] = tcp.sport
            raw["dst_port"] = tcp.dport
            raw["tcp_flags"] = str(tcp.flags)
        elif packet.haslayer(UDP):
            udp = packet[UDP]
            raw["transport"] = "UDP"
            raw["src_port"] = udp.sport
            raw["dst_port"] = udp.dport
            if packet.haslayer(DNS):
                dns = packet[DNS]
                # Try to extract the queried domain
                if dns.qd and hasattr(dns.qd, "qname"):
                    try:
                        domain = dns.qd.qname.decode('utf-8').rstrip('.')
                        raw["domain"] = domain
                    except UnicodeDecodeError:
                        pass
        else:
            return None

        return raw

    async def stream(self) -> AsyncIterator[dict]:
        while self._running and self._queue is not None:
            try:
                raw = await asyncio.wait_for(self._queue.get(), timeout=0.5)
                yield raw
                self._queue.task_done()
            except asyncio.TimeoutError:
                continue
