import { useEffect, useState } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../lib/socket';
import { usePacketStore } from './usePacketStore';
import type { Packet } from '../types/packet';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export function useSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const addPacket = usePacketStore((s) => s.addPacket);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onConnecting = () => setStatus('connecting');
    const onPacket = (data: Packet) => addPacket(data);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onConnecting);
    socket.on('packet', onPacket);

    setStatus('connecting');
    connectSocket();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onConnecting);
      socket.off('packet', onPacket);
      disconnectSocket();
    };
  }, [addPacket]);

  return { status };
}
