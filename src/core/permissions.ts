import { signData } from './identity';

export type HardwarePort = 'usb' | 'wifi' | 'bluetooth' | 'mobile_data';

export enum TrustLevel {
  TRAITOR = -1,    // Malicious actor (DDoS, quotas exceeded)
  QUARANTINE = 0,  // Hardware Quarantine (L0 - USB - strictly packet transit)
  RECRUIT = 1,     // Basic participant
  ADEPT = 2,       // Verified active node (L2 - P2P Signaling)
  GUARD = 3,       // Relay node
  MAGISTRATE = 4   // Core governing node (L4 - Governance, GPS, Camera)
}

export type PermissionScope = 
  | 'system_ping' 
  | 'p2p_signaling' 
  | 'bramble_relay' 
  | 'gps_location' 
  | 'camera' 
  | 'microphone';

export interface TemporaryPermission {
  scope: PermissionScope;
  expiresAt: number;
  signature: string;
}

export class PermissionEngine {
  private static permissionMatrix: Record<TrustLevel, PermissionScope[]> = {
    [TrustLevel.TRAITOR]: [],
    [TrustLevel.QUARANTINE]: ['system_ping'],  // Hardware Quarantine: strictly limited
    [TrustLevel.RECRUIT]: ['system_ping'],
    [TrustLevel.ADEPT]: ['system_ping', 'p2p_signaling'],
    [TrustLevel.GUARD]: ['system_ping', 'p2p_signaling', 'bramble_relay'],
    [TrustLevel.MAGISTRATE]: ['system_ping', 'p2p_signaling', 'bramble_relay'] // Sensors require explicit User Consent Flow
  };

  private static activePermissions: Map<string, TemporaryPermission> = new Map();

  public static hasPermission(trustLevel: TrustLevel, scope: PermissionScope, pubKey: string): boolean {
    if (trustLevel === TrustLevel.QUARANTINE && scope !== 'system_ping') {
       return false; // Quarantine strictly limited to system pings
    }
    const baseAllowed = this.permissionMatrix[trustLevel] || [];
    if (baseAllowed.includes(scope)) return true;

    // Check temporary user-consented permissions
    const tempPerm = this.activePermissions.get(`${pubKey}_${scope}`);
    if (tempPerm && tempPerm.expiresAt > Date.now()) {
        return true;
    }
    return false;
  }

  public static evaluateHardwareConnection(portType: HardwarePort): TrustLevel {
    if (portType === 'usb') {
      console.warn('[PermissionEngine] Physical USB connection identified. Enforcing L0 Hardware Quarantine.');
      return TrustLevel.QUARANTINE;
    }
    return TrustLevel.RECRUIT;
  }

  public static async requestTemporaryConsent(
     pubKey: string,
     privateKey: string, 
     scope: PermissionScope, 
     message: string,
     durationMs: number = 3600000 // 1 hour default
  ): Promise<boolean> {
    console.warn(`[UserConsentFlow] SYSTEM INTERRUPT: Swarm requires explicit consent for [${scope}]`);
    console.log(`[UserConsentFlow] Reason: ${message}`);
    
    // Simulate UI interruption for explicit consent
    const granted = await new Promise<boolean>(resolve => {
      // In production, this renders an unbypassable UI Modal utilizing React Portals
      setTimeout(() => resolve(true), 1200); 
    });

    if (granted) {
      const expiresAt = Date.now() + durationMs;
      // Temporary permission intrinsically tied to Observer cryptographic identity
      const signature = await signData(privateKey, `${scope}_${expiresAt}`);
      
      this.activePermissions.set(`${pubKey}_${scope}`, {
        scope,
        expiresAt,
        signature
      });
      console.log(`[UserConsentFlow] Consent GRANTED and cryptographically signed for ${scope}. Valid for ${durationMs/1000}s.`);
      return true;
    }
    
    console.warn(`[UserConsentFlow] Consent DENIED for ${scope}.`);
    return false;
  }
}
