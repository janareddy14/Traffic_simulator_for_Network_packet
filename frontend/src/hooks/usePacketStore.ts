import { create } from 'zustand';
import type { Packet, PacketFilters, PacketStats, Protocol } from '../types/packet';
import { MAX_PACKETS } from '../lib/constants';

interface PacketStore {
  /* State */
  packets: Packet[];
  anomalies: Packet[];
  selectedPacket: Packet | null;
  filters: PacketFilters;
  stats: PacketStats;
  isCapturing: boolean;

  /* Actions */
  addPacket: (packet: Packet, force?: boolean) => void;
  selectPacket: (packet: Packet) => void;
  clearSelection: () => void;
  setFilter: <K extends keyof PacketFilters>(key: K, value: PacketFilters[K]) => void;
  clearFilters: () => void;
  toggleCapture: () => void;
  clearPackets: () => void;
}

const initialFilters: PacketFilters = {
  domain: '',
  protocol: '',
  sourceIp: '',
  destIp: '',
  status: '',
};

const initialStats: PacketStats = {
  pps: 0,
  topDomains: [],
  protocolBreakdown: { DNS: 0, TCP: 0, HTTPS: 0, UDP: 0 },
  avgLatency: 0,
  droppedCount: 0,
  activeConnections: 0,
};

function computeStats(packets: Packet[]): PacketStats {
  if (packets.length === 0) return initialStats;

  /* Protocol breakdown */
  const protocolBreakdown: Record<Protocol, number> = { DNS: 0, TCP: 0, HTTPS: 0, UDP: 0 };
  const domainCounts = new Map<string, number>();
  const sessions = new Set<string>();
  let totalLatency = 0;
  let droppedCount = 0;

  for (const p of packets) {
    protocolBreakdown[p.protocol]++;

    if (p.domain) {
      domainCounts.set(p.domain, (domainCounts.get(p.domain) ?? 0) + 1);
    }

    totalLatency += p.latency_ms;
    if (p.status === 'dropped') droppedCount++;
    sessions.add(p.session_id);
  }

  /* Top domains — sorted descending by count, top 5 */
  const topDomains = [...domainCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  /* PPS approximation: count packets from the last second */
  const now = Date.now();
  const oneSecondAgo = now - 1000;
  const pps = packets.filter((p) => new Date(p.timestamp).getTime() > oneSecondAgo).length;

  return {
    pps,
    topDomains,
    protocolBreakdown,
    avgLatency: Math.round(totalLatency / packets.length),
    droppedCount,
    activeConnections: sessions.size,
  };
}

export const usePacketStore = create<PacketStore>((set, get) => ({
  packets: [],
  anomalies: [],
  selectedPacket: null,
  filters: initialFilters,
  stats: initialStats,
  isCapturing: true,

  addPacket: (packet, force) => {
    const { isCapturing } = get();
    if (!isCapturing && !force) return;

    set((state) => {
      const updated = [...state.packets, packet];
      /* Rolling buffer — keep only the last MAX_PACKETS */
      const trimmed = updated.length > MAX_PACKETS ? updated.slice(-MAX_PACKETS) : updated;
      
      let newAnomalies = state.anomalies;
      if (packet.anomaly_type) {
         newAnomalies = [packet, ...state.anomalies];
         if (newAnomalies.length > 50) newAnomalies.pop();
      }

      return {
        packets: trimmed,
        stats: computeStats(trimmed),
        anomalies: newAnomalies,
      };
    });
  },

  selectPacket: (packet) => set({ selectedPacket: packet }),
  clearSelection: () => set({ selectedPacket: null }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  clearFilters: () => set({ filters: initialFilters }),

  toggleCapture: () => set((state) => ({ isCapturing: !state.isCapturing })),

  clearPackets: () => set({ packets: [], anomalies: [], stats: initialStats, selectedPacket: null }),
}));
