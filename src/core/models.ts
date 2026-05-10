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
  isUSBConnected?: boolean;
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
 * Deterministically derives a Node ID from a User's Public Key using SHA-256 (Web Crypto API).
 */
export async function deriveNodeId(publicKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKey);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `nx_${hashHex.substring(0, 16)}`;
}
