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
 * Deterministically derives a Node ID from a User's Public Key using PBKDF2 (Web Crypto API).
 */
export async function deriveNodeId(publicKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(publicKey);
  const salt = encoder.encode('swarm_salt');
  
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const hashBuffer = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 10000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `nx_${hashHex.substring(0, 16)}`;
}
