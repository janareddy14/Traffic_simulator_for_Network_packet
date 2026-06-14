import { useSocket } from './hooks/useSocket';
import TopBar from './components/TopBar';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import BottomBar from './components/BottomBar';
import CityMap from './components/CityMap';

export default function App() {
  const { status } = useSocket();

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-primary text-text-primary overflow-hidden">
      {/* Top Bar */}
      <TopBar connectionStatus={status} />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel — Filters & Stats */}
        <LeftPanel />

        {/* Center — CityMap */}
        <CityMap />

        {/* Right Panel — Packet Inspector */}
        <RightPanel />
      </div>

      {/* Bottom Bar — Analytics */}
      <BottomBar />
    </div>
  );
}
