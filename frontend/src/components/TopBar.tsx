import { useState, useEffect } from 'react';
import { usePacketStore } from '../hooks/usePacketStore';
import type { ConnectionStatus } from '../hooks/useSocket';
import ReplayControls from './ReplayControls';

interface TopBarProps {
  connectionStatus: ConnectionStatus;
}

export default function TopBar({ connectionStatus }: TopBarProps) {
  const { filters, setFilter, isCapturing, toggleCapture, packets } =
    usePacketStore();

  const statusColor =
    connectionStatus === 'connected'
      ? 'bg-neon-green'
      : connectionStatus === 'connecting'
        ? 'bg-neon-amber'
        : 'bg-neon-magenta';

  const statusLabel =
    connectionStatus === 'connected'
      ? 'LIVE'
      : connectionStatus === 'connecting'
        ? 'CONNECTING'
        : 'OFFLINE';

  const [mode, setMode] = useState<'mock' | 'live'>('mock');

  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then((res) => res.json())
      .then((data) => setMode(data.mode))
      .catch(console.error);
  }, []);

  const toggleMode = async () => {
    const newMode = mode === 'mock' ? 'live' : 'mock';
    try {
      const res = await fetch(`http://localhost:8000/api/capture/mode?mode=${newMode}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setMode(data.mode);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to switch mode. Is the backend running?');
    }
  };

  return (
    <header className="glass-panel-strong flex items-center gap-4 px-5 py-3 m-2 mb-0">
      {/* Logo / title */}
      <div className="flex items-center gap-3 mr-2">
        <div className="relative w-8 h-8">
          {/* Radar icon */}
          <div className="absolute inset-0 rounded-full border-2 border-neon-cyan opacity-60" />
          <div className="absolute inset-1 rounded-full border border-neon-cyan opacity-30" />
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-cyan animate-pulse-glow" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-text-primary leading-none">
            TRAFFIC MAP
          </h1>
          <p className="text-[10px] font-medium text-text-muted tracking-widest uppercase">
            Network Visualizer
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-border-default" />

      {/* Connection status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse-glow`} />
        <span className="text-xs font-mono font-medium text-text-secondary">
          {statusLabel}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-border-default" />

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={filters.domain}
          onChange={(e) => setFilter('domain', e.target.value)}
          placeholder="Search domain..."
          className="w-full bg-bg-primary/60 border border-border-default rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all duration-300"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Packet counter */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-primary/40 border border-border-default">
        <svg
          className="w-4 h-4 text-neon-cyan"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
          />
        </svg>
        <span className="text-xs font-mono text-text-secondary">
          {packets.length.toLocaleString()}
        </span>
      </div>

      {/* Mode toggle */}
      <button
        onClick={toggleMode}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer border
          ${
            mode === 'live'
              ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30 hover:bg-neon-cyan/25 shadow-[0_0_15px_rgba(0,212,255,0.1)]'
              : 'bg-text-muted/15 text-text-secondary border-text-muted/30 hover:bg-text-muted/25'
          }
        `}
        title="Toggle Live / Mock Capture Mode"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
        </svg>
        {mode === 'live' ? 'Live Mode' : 'Mock Mode'}
      </button>

      {/* Capture toggle */}
      <button
        onClick={toggleCapture}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer
          ${
            isCapturing
              ? 'bg-neon-green/15 text-neon-green border border-neon-green/30 hover:bg-neon-green/25 shadow-[0_0_15px_rgba(0,255,136,0.1)]'
              : 'bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30 hover:bg-neon-magenta/25 shadow-[0_0_15px_rgba(255,0,110,0.1)]'
          }
        `}
      >
        {isCapturing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="6" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
          </svg>
        )}
        {isCapturing ? 'Capturing' : 'Paused'}
      </button>

      {/* Replay placeholder */}
      <ReplayControls />
    </header>
  );
}
