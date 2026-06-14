import { useState, useRef, useEffect } from 'react';
import { usePacketStore } from '../hooks/usePacketStore';
import type { Packet } from '../types/packet';

export default function ReplayControls() {
  const { isCapturing, toggleCapture, addPacket, clearPackets } = usePacketStore();
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [progress, setProgress] = useState(0);
  
  const historicalPacketsRef = useRef<Packet[]>([]);
  const currentIndexRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const animationRef = useRef<number | undefined>(undefined);

  const startReplayMode = async () => {
    // Pause live capture if currently running
    if (isCapturing) {
      toggleCapture();
    }
    
    try {
      const res = await fetch('http://localhost:8000/api/replay?limit=1000');
      const data = await res.json();
      historicalPacketsRef.current = data.packets || [];
      currentIndexRef.current = 0;
      setProgress(0);
      setIsReplayMode(true);
      clearPackets(); // Wipe map
      setIsPlaying(true);
    } catch (e) {
      console.error('Failed to fetch replay data:', e);
      alert('Failed to start replay. Is the backend running?');
    }
  };

  const stopReplayMode = () => {
    setIsPlaying(false);
    setIsReplayMode(false);
    historicalPacketsRef.current = [];
    currentIndexRef.current = 0;
    setProgress(0);
    clearPackets();
  };

  // Replay loop
  useEffect(() => {
    if (!isPlaying || !isReplayMode) return;

    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = time - lastTimeRef.current;
      
      const targetInterval = 200 / speed; 
      
      if (dt > targetInterval) {
         if (currentIndexRef.current < historicalPacketsRef.current.length) {
            addPacket(historicalPacketsRef.current[currentIndexRef.current], true);
            currentIndexRef.current++;
            setProgress(currentIndexRef.current / historicalPacketsRef.current.length);
            lastTimeRef.current = time;
         } else {
            setIsPlaying(false);
         }
      }
      
      animationRef.current = requestAnimationFrame(loop);
    };
    
    animationRef.current = requestAnimationFrame(loop);
    
    return () => {
       if (animationRef.current) cancelAnimationFrame(animationRef.current);
       lastTimeRef.current = 0;
    };
  }, [isPlaying, isReplayMode, speed, addPacket]);

  if (!isReplayMode) {
    return (
      <button
        onClick={startReplayMode}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-text-secondary bg-bg-primary/40 border border-border-default hover:border-neon-purple/30 hover:text-neon-purple transition-all duration-300 cursor-pointer"
        title="Start Replay"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.182-3.182" />
        </svg>
        Replay History
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-bg-primary/60 border border-neon-purple/40 rounded-lg px-3 py-1.5 shadow-[0_0_15px_rgba(180,0,255,0.1)]">
      {/* Play/Pause */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="text-neon-purple hover:text-neon-purple/80 transition-colors cursor-pointer"
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
             <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
             <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Stop */}
      <button
        onClick={stopReplayMode}
        className="text-neon-magenta hover:text-neon-magenta/80 transition-colors cursor-pointer"
        title="Stop Replay"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
           <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Speed */}
      <div className="flex items-center gap-1 border-l border-border-default pl-3 ml-1">
        {[1, 2, 5].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${speed === s ? 'bg-neon-purple text-bg-primary' : 'text-text-muted hover:text-text-primary'}`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="w-24 h-1.5 bg-bg-primary border border-border-default rounded-full overflow-hidden ml-2">
        <div 
          className="h-full bg-neon-purple transition-all duration-100" 
          style={{ width: `${progress * 100}%` }} 
        />
      </div>
      <span className="text-[10px] font-mono text-text-muted w-8 text-right">
        {Math.round(progress * 100)}%
      </span>
    </div>
  );
}
