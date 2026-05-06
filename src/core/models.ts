import { TrustLevel } from './permissions';

export interface User {
  id: string; // hash publicKey
  publicKey: string;
}

export type DeviceCapability = 'camera' | 'compute' | 'storage' | 'display' | 'sensor' | 'network_routing';
export type DeviceType = 'smartphone' | 'tablet' | 'pc' | 'smart_tv' | 'router';

export interface Device {
  id: string;
  deviceId: string;
  deviceType: DeviceType;
  capabilities: DeviceCapability[];
}

export type NodeRole = 'recruit' | 'scout' | 'guard' | 'magistrate' | 'traitor' | 'client' | 'relay' | 'sandboxed';

export interface Node {
  id: string; // Always hash(publicKey)
  userPublicKey: string;
  deviceId: string;
  role: NodeRole;
}

export type ConnectionType = 'webrtc' | 'relay' | 'usb';

export interface Connection {
  targetNodeId: string;
  type: ConnectionType;
}

/**
 * Deterministically derives a Node ID from a User's Public Key.
 * In a production environment, this would use SHA-256.
 */
export function deriveNodeId(publicKey: string): string {
  let hash = 0;
  for (let i = 0; i < publicKey.length; i++) {
    const char = publicKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `nx_${Math.abs(hash).toString(16)}`;
}
