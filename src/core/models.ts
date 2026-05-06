export type TrustLevel = number; // -1 to infinity? or 0 to 10? The prompt mentions: usb=0, +2, +1 etc.

export interface User {
  id: string; // hash publicKey
  publicKey: string;
  trustLevel: TrustLevel;
}

export type DeviceCapability = 'camera' | 'compute' | 'storage' | 'display' | 'sensor' | 'network_routing';

export interface Device {
  id: string;
  fingerprint: string;
  capabilities: DeviceCapability[];
  ownerId: string; // User ID
  trustLevel: TrustLevel;
}

export type NodeRole = 'client' | 'relay' | 'magistrate' | 'sandboxed';

export interface Node {
  id: string;
  deviceId: string;
  connections: string[]; // IDs of peer Connections (or peer nodes?) The prompt says: "connections (ID пиров)"
  role: NodeRole;
}

export type ConnectionType = 'webrtc' | 'relay' | 'usb';

export interface Connection {
  peerId: string; // The ID of the connected Node
  type: ConnectionType;
  // potentially status, latency, etc.
}
