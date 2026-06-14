export default function MapPlaceholder() {
  return (
    <div className="flex-1 relative overflow-hidden rounded-xl m-1 border border-border-default bg-bg-secondary/50">
      {/* Grid background */}
      <div className="absolute inset-0 grid-bg" />

      {/* Scan line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent scan-line" />
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Animated radar circles */}
        <div className="relative w-48 h-48 mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border border-neon-cyan/10 animate-ping" style={{ animationDuration: '3s' }} />
          {/* Middle ring */}
          <div className="absolute inset-6 rounded-full border border-neon-cyan/15 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
          {/* Inner ring */}
          <div className="absolute inset-12 rounded-full border border-neon-cyan/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />

          {/* Static rings */}
          <div className="absolute inset-0 rounded-full border border-border-default" />
          <div className="absolute inset-6 rounded-full border border-border-default/60" />
          <div className="absolute inset-12 rounded-full border border-border-default/30" />

          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-neon-cyan shadow-[0_0_20px_rgba(0,212,255,0.5)]" />

          {/* Simulated nodes */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-neon-green/60 animate-pulse" />
          <div className="absolute bottom-8 left-8 w-2 h-2 rounded-full bg-neon-magenta/60 animate-pulse" style={{ animationDelay: '0.3s' }} />
          <div className="absolute top-1/3 right-6 w-2 h-2 rounded-full bg-neon-amber/60 animate-pulse" style={{ animationDelay: '0.7s' }} />
          <div className="absolute bottom-12 right-12 w-1.5 h-1.5 rounded-full bg-neon-purple/60 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-4 w-1.5 h-1.5 rounded-full bg-neon-cyan/40 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Text */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">
            Network Topology Map
          </h2>
          <p className="text-sm text-text-secondary mb-1">
            Initializing PixiJS renderer...
          </p>
          <p className="text-xs text-text-muted">
            Phase 2 will render live packet animations here
          </p>
        </div>

        {/* Fake loading bar */}
        <div className="mt-6 w-48 h-1 bg-bg-primary/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-green rounded-full"
            style={{
              width: '45%',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-neon-cyan/30" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-neon-cyan/30" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-neon-cyan/30" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-neon-cyan/30" />

      {/* Coordinate overlay */}
      <div className="absolute top-3 left-10 text-[9px] font-mono text-text-muted/40">
        X: 0.000 | Y: 0.000 | ZOOM: 1.0x
      </div>
      <div className="absolute bottom-3 right-10 text-[9px] font-mono text-text-muted/40">
        RENDERER: WebGPU | FPS: --
      </div>
    </div>
  );
}
