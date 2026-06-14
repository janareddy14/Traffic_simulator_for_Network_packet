export interface Packet {
  id: string;
  timestamp: string;
  direction: 'request' | 'response';
  source_ip: string;
  destination_ip: string;
  domain: string | null;
  protocol: 'DNS' | 'TCP' | 'HTTPS' | 'UDP';
  port: number;
  size: number;
  ttl: number;
  latency_ms: number;
  status: 'delivered' | 'dropped' | 'retransmitted' | 'blocked';
  vehicle_type:
    | 'courier_van'
    | 'bus'
    | 'bike'
    | 'armored_truck'
    | 'heavy_truck'
    | 'train'
    | 'motorbike';
  route: string[];
  tcp_flags: string | null;
  session_id: string;
  anomaly_type?: 'latency' | 'size' | 'blocked' | 'dropped' | 'retransmitted' | null;
}

export type Protocol = Packet['protocol'];
export type PacketStatus = Packet['status'];
export type VehicleType = Packet['vehicle_type'];
export type Direction = Packet['direction'];

export interface PacketFilters {
  domain: string;
  protocol: Protocol | '';
  sourceIp: string;
  destIp: string;
  status: PacketStatus | '';
}

export interface PacketStats {
  pps: number;
  topDomains: { domain: string; count: number }[];
  protocolBreakdown: Record<Protocol, number>;
  avgLatency: number;
  droppedCount: number;
  activeConnections: number;
}
