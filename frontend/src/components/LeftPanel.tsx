import { usePacketStore } from '../hooks/usePacketStore';
import { PROTOCOL_COLORS, STATUS_COLORS, CONGESTION } from '../lib/constants';
import type { Protocol, PacketStatus } from '../types/packet';

const protocols: Protocol[] = ['DNS', 'TCP', 'HTTPS', 'UDP'];
const statuses: PacketStatus[] = ['delivered', 'dropped', 'retransmitted', 'blocked'];

export default function LeftPanel() {
  const { filters, setFilter, clearFilters, stats } = usePacketStore();

  const congestionLevel =
    stats.pps < CONGESTION.LOW
      ? 'Low'
      : stats.pps < CONGESTION.MEDIUM
        ? 'Medium'
        : 'High';

  const congestionColor =
    stats.pps < CONGESTION.LOW
      ? 'text-neon-green'
      : stats.pps < CONGESTION.MEDIUM
        ? 'text-neon-amber'
        : 'text-neon-magenta';

  return (
    <aside className="w-72 flex flex-col gap-2 p-2 overflow-y-auto">
      {/* ─── Filters Section ─── */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Filters
          </h2>
          <button
            onClick={clearFilters}
            className="text-[10px] font-medium text-neon-cyan hover:text-neon-cyan/80 transition-colors cursor-pointer"
          >
            Clear All
          </button>
        </div>

        {/* Protocol filter */}
        <div className="mb-4">
          <label className="text-[11px] font-medium text-text-secondary mb-2 block">
            Protocol
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {protocols.map((p) => (
              <button
                key={p}
                onClick={() =>
                  setFilter('protocol', filters.protocol === p ? '' : p)
                }
                className={`
                  px-2.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all duration-200 cursor-pointer border
                  ${
                    filters.protocol === p
                      ? 'border-current bg-current/10'
                      : 'border-border-default bg-bg-primary/30 hover:border-current/30'
                  }
                `}
                style={{ color: PROTOCOL_COLORS[p] }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div className="mb-4">
          <label className="text-[11px] font-medium text-text-secondary mb-2 block">
            Status
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() =>
                  setFilter('status', filters.status === s ? '' : s)
                }
                className={`
                  px-2.5 py-1.5 rounded-md text-xs font-medium capitalize transition-all duration-200 cursor-pointer border
                  ${
                    filters.status === s
                      ? 'border-current bg-current/10'
                      : 'border-border-default bg-bg-primary/30 hover:border-current/30'
                  }
                `}
                style={{ color: STATUS_COLORS[s] }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* IP Filters */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-text-secondary mb-1.5 block">
              Source IP
            </label>
            <input
              type="text"
              value={filters.sourceIp}
              onChange={(e) => setFilter('sourceIp', e.target.value)}
              placeholder="e.g. 192.168.1.1"
              className="w-full bg-bg-primary/40 border border-border-default rounded-md px-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-cyan/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-text-secondary mb-1.5 block">
              Destination IP
            </label>
            <input
              type="text"
              value={filters.destIp}
              onChange={(e) => setFilter('destIp', e.target.value)}
              placeholder="e.g. 10.0.0.1"
              className="w-full bg-bg-primary/40 border border-border-default rounded-md px-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-cyan/40 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ─── Live Stats Section ─── */}
      <div className="glass-panel p-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
          Live Stats
        </h2>

        {/* Stat cards grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCard
            label="Packets/s"
            value={stats.pps.toString()}
            color="text-neon-cyan"
            glowClass="glow-cyan"
          />
          <StatCard
            label="Avg Latency"
            value={`${stats.avgLatency}ms`}
            color="text-neon-amber"
          />
          <StatCard
            label="Dropped"
            value={stats.droppedCount.toString()}
            color="text-neon-magenta"
            glowClass={stats.droppedCount > 0 ? 'glow-magenta' : ''}
          />
          <StatCard
            label="Sessions"
            value={stats.activeConnections.toString()}
            color="text-neon-green"
          />
        </div>

        {/* Congestion indicator */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-primary/30 border border-border-default">
          <span className="text-[11px] text-text-muted">Congestion</span>
          <span className={`text-xs font-bold ${congestionColor}`}>
            {congestionLevel}
          </span>
        </div>
      </div>

      {/* ─── Protocol Breakdown ─── */}
      <div className="glass-panel p-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          Protocol Mix
        </h2>
        <div className="space-y-2.5">
          {protocols.map((p) => {
            const count = stats.protocolBreakdown[p];
            const total = Object.values(stats.protocolBreakdown).reduce(
              (a, b) => a + b,
              0
            );
            const pct = total > 0 ? (count / total) * 100 : 0;

            return (
              <div key={p}>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-mono font-medium"
                    style={{ color: PROTOCOL_COLORS[p] }}
                  >
                    {p}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-1.5 bg-bg-primary/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: PROTOCOL_COLORS[p],
                      boxShadow: `0 0 8px ${PROTOCOL_COLORS[p]}40`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Top Domains ─── */}
      <div className="glass-panel p-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
          Top Domains
        </h2>
        {stats.topDomains.length > 0 ? (
          <div className="space-y-2">
            {stats.topDomains.map((d, i) => (
              <div
                key={d.domain}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-bg-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-text-muted w-4">
                    {i + 1}
                  </span>
                  <span className="text-xs font-mono text-text-primary truncate max-w-[140px]">
                    {d.domain}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neon-cyan">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted italic">No data yet</p>
        )}
      </div>
    </aside>
  );
}

/* ─── Stat card subcomponent ─── */
interface StatCardProps {
  label: string;
  value: string;
  color: string;
  glowClass?: string;
}

function StatCard({ label, value, color, glowClass = '' }: StatCardProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-bg-primary/30 border border-border-default ${glowClass}`}
    >
      <span className={`text-lg font-bold font-mono ${color}`}>{value}</span>
      <span className="text-[10px] text-text-muted mt-0.5">{label}</span>
    </div>
  );
}
