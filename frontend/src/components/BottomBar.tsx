import { usePacketStore } from '../hooks/usePacketStore';
import { PROTOCOL_COLORS } from '../lib/constants';
import type { Protocol } from '../types/packet';

const protocols: Protocol[] = ['DNS', 'TCP', 'HTTPS', 'UDP'];

export default function BottomBar() {
  const { stats, packets } = usePacketStore();

  /* Mini sparkline data: last 20 packets' latencies */
  const sparklineData = packets.slice(-20).map((p) => p.latency_ms);
  const maxLatency = Math.max(...sparklineData, 1);

  return (
    <footer className="glass-panel-strong flex items-center gap-3 px-4 py-2.5 m-2 mt-0">
      {/* Protocol distribution mini-bars */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Protocol
        </span>
        <div className="flex items-end gap-0.5 h-6">
          {protocols.map((p) => {
            const count = stats.protocolBreakdown[p];
            const total = Object.values(stats.protocolBreakdown).reduce(
              (a, b) => a + b,
              0
            );
            const height = total > 0 ? (count / total) * 100 : 5;

            return (
              <div
                key={p}
                className="w-4 rounded-t-sm transition-all duration-500"
                style={{
                  height: `${Math.max(height, 5)}%`,
                  backgroundColor: PROTOCOL_COLORS[p],
                  opacity: 0.8,
                }}
                title={`${p}: ${count}`}
              />
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border-default" />

      {/* Latency sparkline */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Latency
        </span>
        <div className="flex items-end gap-px h-5">
          {sparklineData.length > 0 ? (
            sparklineData.map((val, i) => (
              <div
                key={i}
                className="w-1 rounded-t-sm transition-all duration-300"
                style={{
                  height: `${Math.max((val / maxLatency) * 100, 8)}%`,
                  backgroundColor:
                    val > 100
                      ? '#ff006e'
                      : val > 50
                        ? '#ffb800'
                        : '#00ff88',
                }}
              />
            ))
          ) : (
            <span className="text-[10px] text-text-muted">—</span>
          )}
        </div>
        <span className="text-[10px] font-mono text-text-secondary">
          avg {stats.avgLatency}ms
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border-default" />

      {/* Quick stats */}
      <div className="flex items-center gap-4">
        <MiniStat
          label="PPS"
          value={stats.pps.toString()}
          color="text-neon-cyan"
        />
        <MiniStat
          label="DROP"
          value={stats.droppedCount.toString()}
          color={stats.droppedCount > 0 ? 'text-neon-magenta' : 'text-text-muted'}
        />
        <MiniStat
          label="CONN"
          value={stats.activeConnections.toString()}
          color="text-neon-green"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Recharts placeholder badges */}
      <div className="flex items-center gap-2">
        <ChartBadge label="Timeline" icon="chart-bar" />
        <ChartBadge label="Geo View" icon="globe" />
        <ChartBadge label="Flows" icon="flow" />
      </div>
    </footer>
  );
}

/* ─── Mini stat chip ─── */
interface MiniStatProps {
  label: string;
  value: string;
  color: string;
}

function MiniStat({ label, value, color }: MiniStatProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-bold uppercase text-text-muted">
        {label}
      </span>
      <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

/* ─── Chart placeholder badge ─── */
interface ChartBadgeProps {
  label: string;
  icon: string;
}

function ChartBadge({ label, icon }: ChartBadgeProps) {
  const iconPath =
    icon === 'chart-bar'
      ? 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z'
      : icon === 'globe'
        ? 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418'
        : 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5';

  return (
    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-primary/30 border border-border-default text-text-muted hover:text-neon-cyan hover:border-neon-cyan/30 transition-all duration-200 cursor-pointer">
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
      </svg>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
