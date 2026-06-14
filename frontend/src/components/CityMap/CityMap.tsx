import { useEffect, useRef } from 'react';
import { Application, Container } from 'pixi.js';
import { usePacketStore } from '../../hooks/usePacketStore';
import { MapRenderer } from './MapRenderer';
import { Vehicle } from './Vehicle';


export default function CityMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const mapRendererRef = useRef<MapRenderer | null>(null);
  const vehiclesContainerRef = useRef<Container | null>(null);
  const vehiclesRef = useRef<Map<string, Vehicle>>(new Map());
  const processedPacketsRef = useRef<Set<string>>(new Set());

  const packets = usePacketStore((s) => s.packets);
  const filters = usePacketStore((s) => s.filters);
  const selectPacket = usePacketStore((s) => s.selectPacket);

  useEffect(() => {
    let isDestroyed = false;
    let cleanupResize: (() => void) | null = null;
    
    const initPixi = async () => {
      if (!containerRef.current) return;
      
      const app = new Application();
      await app.init({
        backgroundAlpha: 0,
        resizeTo: containerRef.current,
        antialias: true,
      });

      if (isDestroyed) {
        app.destroy(true, { children: true });
        return;
      }

      appRef.current = app;
      containerRef.current.appendChild(app.canvas);

      const mapRenderer = new MapRenderer(app);
      mapRendererRef.current = mapRenderer;
      
      const vehiclesContainer = new Container();
      vehiclesContainerRef.current = vehiclesContainer;
      app.stage.addChild(vehiclesContainer);

      const onResize = () => {
        if (containerRef.current) {
           app.resize();
           mapRenderer.resize(app.screen.width, app.screen.height);
        }
      };
      
      onResize();
      window.addEventListener('resize', onResize);
      cleanupResize = () => window.removeEventListener('resize', onResize);

      app.ticker.add((ticker) => {
         const delta = ticker.deltaTime;
         
         if (mapRendererRef.current) {
            mapRendererRef.current.update(delta);
         }

         let outboundCount = 0;
         let inboundCount = 0;

         for (const [id, vehicle] of vehiclesRef.current.entries()) {
            if (vehicle.isComplete) {
               vehiclesRef.current.delete(id);
            } else {
               vehicle.update(delta);
               if (vehicle.sprite.visible) {
                  if (vehicle.packet.direction === 'request') outboundCount++;
                  else inboundCount++;
               }
            }
         }

         if (mapRendererRef.current) {
            mapRendererRef.current.updateCongestion(outboundCount, inboundCount);
         }
      });
    };

    initPixi();

    return () => {
      isDestroyed = true;
      if (cleanupResize) cleanupResize();
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  // Process new packets
  useEffect(() => {
    if (!mapRendererRef.current || !vehiclesContainerRef.current) return;

    if (packets.length === 0) {
      processedPacketsRef.current.clear();
      for (const vehicle of vehiclesRef.current.values()) {
         vehicle.destroy();
      }
      vehiclesRef.current.clear();
      return;
    }

    for (const packet of packets) {
      if (!processedPacketsRef.current.has(packet.id)) {
        processedPacketsRef.current.add(packet.id);
        
        // Spawn vehicle
        const routePositions = mapRendererRef.current.getRoutePath(packet.route);
        if (routePositions.length > 0) {
           const vehicle = new Vehicle(
              packet,
              routePositions,
              vehiclesContainerRef.current,
              selectPacket
           );
           
           // Apply initial filter state
           if (filters.domain && (!packet.domain || !packet.domain.toLowerCase().includes(filters.domain.toLowerCase()))) vehicle.sprite.visible = false;
           if (filters.protocol && packet.protocol !== filters.protocol) vehicle.sprite.visible = false;
           if (filters.status && packet.status !== filters.status) vehicle.sprite.visible = false;
           if (filters.sourceIp && !packet.source_ip.includes(filters.sourceIp)) vehicle.sprite.visible = false;
           if (filters.destIp && !packet.destination_ip.includes(filters.destIp)) vehicle.sprite.visible = false;

           vehiclesRef.current.set(packet.id, vehicle);

           // If retransmitted, spawn a ghost a bit later
           if (packet.status === 'retransmitted') {
               setTimeout(() => {
                   if (vehiclesContainerRef.current) {
                      const ghost = new Vehicle(
                         packet,
                         routePositions,
                         vehiclesContainerRef.current,
                         selectPacket,
                         true
                      );
                      ghost.sprite.visible = vehicle.sprite.visible;
                      vehiclesRef.current.set(packet.id + '_ghost', ghost);
                   }
               }, 400);
           }
        }
      }
    }
  }, [packets, selectPacket, filters]);

  // Apply filters to existing vehicles
  useEffect(() => {
    for (const vehicle of vehiclesRef.current.values()) {
      const p = vehicle.packet;
      let visible = true;

      if (filters.domain && (!p.domain || !p.domain.toLowerCase().includes(filters.domain.toLowerCase()))) visible = false;
      if (filters.protocol && p.protocol !== filters.protocol) visible = false;
      if (filters.status && p.status !== filters.status) visible = false;
      if (filters.sourceIp && !p.source_ip.includes(filters.sourceIp)) visible = false;
      if (filters.destIp && !p.destination_ip.includes(filters.destIp)) visible = false;

      vehicle.sprite.visible = visible;
    }
  }, [filters]);

  return (
    <div 
      className="flex-1 relative overflow-hidden rounded-xl m-1 border border-border-default bg-bg-primary"
      ref={containerRef}
    />
  );
}
