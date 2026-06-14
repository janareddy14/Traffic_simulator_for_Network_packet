import { usePacketStore } from '../hooks/usePacketStore';
import {
  PROTOCOL_COLORS,
  STATUS_COLORS,
  VEHICLE_LABELS,
  VEHICLE_COLORS,
  PROTOCOL_METAPHORS,
} from '../lib/constants';

export default function RightPanel() {
  const { selectedPacket, clearSelection } = usePacketStore();

  if (!selectedPacket) {
    return (
      <aside className="w-80 flex flex-col p-2 gap-2 h-full">
        <div className="glass-panel flex-none flex flex-col items-center justify-center p-6 text-center h-48">
          {/* Empty state icon */}
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-xl border border-border-default bg-bg-primary/30 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"
                />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-neon-cyan/20 border border-neon-cyan/30 animate-pulse-glow" />
          </div>
          <h3 className="text-sm font-semibold text-text-secondary mb-1">
            No Packet Selected
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Click a packet on the map or in the feed to inspect its details
          </p>
        </div>
        <AlertFeed />
      </aside>
    );
  }

  const p = selectedPacket;

  return (
    <aside className="w-80 flex flex-col gap-2 p-2 overflow-y-auto">
      {/* Header */}
      <div className="glass-panel-strong p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Packet Inspector
          </h2>
          <button
            onClick={clearSelection}
            className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Protocol badge + status */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="px-2.5 py-1 rounded-md text-xs font-mono font-bold border"
            style={{
              color: PROTOCOL_COLORS[p.protocol],
              borderColor: `${PROTOCOL_COLORS[p.protocol]}40`,
              backgroundColor: `${PROTOCOL_COLORS[p.protocol]}15`,
            }}
          >
            {p.protocol}
          </span>
          <span className="text-[10px] text-text-muted">
            {PROTOCOL_METAPHORS[p.protocol]}
          </span>
          <div className="flex-1" />
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border"
            style={{
              color: STATUS_COLORS[p.status],
              borderColor: `${STATUS_COLORS[p.status]}40`,
              backgroundColor: `${STATUS_COLORS[p.status]}10`,
            }}
          >
            {p.status}
          </span>
        </div>

        {/* Direction */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              p.direction === 'request'
                ? 'text-neon-cyan bg-neon-cyan/10'
                : 'text-neon-purple bg-neon-purple/10'
            }`}
          >
            {p.direction}
          </span>
        </div>
      </div>

      {/* Vehicle / Metaphor */}
      <div className="glass-panel p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
          Transport Vehicle
        </h3>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center border"
            style={{
              borderColor: `${VEHICLE_COLORS[p.vehicle_type]}40`,
              backgroundColor: `${VEHICLE_COLORS[p.vehicle_type]}10`,
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke={VEHICLE_COLORS[p.vehicle_type]}
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
              />
            </svg>
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: VEHICLE_COLORS[p.vehicle_type] }}
            >
              {VEHICLE_LABELS[p.vehicle_type]}
            </p>
            <p className="text-[10px] text-text-muted">{p.size} bytes payload</p>
          </div>
        </div>
      </div>

      {/* Network details */}
      <div className="glass-panel p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
          Network Details
        </h3>
        <div className="space-y-2">
          <DetailRow label="Source" value={p.source_ip} mono />
          <DetailRow label="Destination" value={p.destination_ip} mono />
          <DetailRow label="Domain" value={p.domain ?? '—'} mono />
          <DetailRow label="Port" value={p.port.toString()} mono />
          <DetailRow label="TTL" value={p.ttl.toString()} />
          <DetailRow label="Latency" value={`${p.latency_ms}ms`} highlight />
          <DetailRow label="Session" value={p.session_id.slice(0, 12) + '…'} mono />
          {p.tcp_flags && (
            <DetailRow label="TCP Flags" value={p.tcp_flags} mono />
          )}
        </div>
      </div>

      {/* Route */}
      <div className="glass-panel p-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
          Route ({p.route.length} hops)
        </h3>
        <div className="flex flex-col gap-1">
          {p.route.map((hop, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className={`w-2 h-2 rounded-full ${
                    i === 0
                      ? 'bg-neon-green'
                      : i === p.route.length - 1
                        ? 'bg-neon-magenta'
                        : 'bg-neon-cyan/60'
                  }`}
                />
                {i < p.route.length - 1 && (
                  <div className="w-px h-4 bg-border-default" />
                )}
              </div>
              <span className="text-xs font-mono text-text-secondary">
                {hop}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Timestamp */}
      <div className="glass-panel p-3 flex-none">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">Timestamp</span>
          <span className="text-[10px] font-mono text-text-secondary">
            {new Date(p.timestamp).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-text-muted">Packet ID</span>
          <span className="text-[10px] font-mono text-text-secondary">
            {p.id.slice(0, 16)}…
          </span>
        </div>
      </div>
      <AlertFeed />
    </aside>
  );
}

/* ─── Detail row subcomponent ─── */
interface DetailRowProps {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}

function DetailRow({ label, value, mono, highlight }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border-default/50 last:border-0">
      <span className="text-[11px] text-text-muted">{label}</span>
      <span
        className={`text-xs ${mono ? 'font-mono' : ''} ${
          highlight ? 'text-neon-amber font-semibold' : 'text-text-primary'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function AlertFeed() {
  const { anomalies, selectPacket } = usePacketStore();
  
  if (anomalies.length === 0) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 glass-panel overflow-hidden">
      <div className="p-3 border-b border-border-default bg-bg-primary/50 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-neon-magenta animate-pulse-glow" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
          Alert Feed
        </h3>
        <span className="ml-auto text-[10px] bg-neon-magenta/20 text-neon-magenta px-1.5 py-0.5 rounded">
          {anomalies.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {anomalies.map((p) => {
          const isLatency = p.anomaly_type === 'latency';
          const isSize = p.anomaly_type === 'size';
          const isBlocked = p.status === 'blocked';
          const isDropped = p.status === 'dropped';
          
          let color = 'text-neon-magenta';
          let bg = 'bg-neon-magenta/10';
          let border = 'border-neon-magenta/30';
          let label = 'Unknown Anomaly';
          
          if (isLatency) {
             color = 'text-neon-amber'; bg = 'bg-neon-amber/10'; border = 'border-neon-amber/30'; label = 'High Latency';
          } else if (isSize) {
             color = 'text-neon-cyan'; bg = 'bg-neon-cyan/10'; border = 'border-neon-cyan/30'; label = 'Large Payload';
          } else if (isBlocked) {
             color = 'text-neon-magenta'; bg = 'bg-neon-magenta/10'; border = 'border-neon-magenta/30'; label = 'Connection Blocked';
          } else if (isDropped) {
             color = 'text-neon-magenta'; bg = 'bg-neon-magenta/10'; border = 'border-neon-magenta/30'; label = 'Packet Dropped';
          } else if (p.anomaly_type === 'retransmitted') {
             color = 'text-neon-amber'; bg = 'bg-neon-amber/10'; border = 'border-neon-amber/30'; label = 'Retransmission';
          }

          return (
            <div 
              key={p.id}
              onClick={() => selectPacket(p)}
              className={`p-2 rounded border ${bg} ${border} cursor-pointer hover:bg-opacity-20 transition-all`}
            >
              <div className="flex items-center justify-between mb-1">
                 <span className={`text-[10px] font-bold uppercase ${color}`}>{label}</span>
                 <span className="text-[9px] text-text-muted font-mono">{new Date(p.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="text-[10px] text-text-secondary truncate">
                 {p.source_ip} → {p.destination_ip}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
