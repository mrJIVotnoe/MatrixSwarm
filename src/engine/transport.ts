import { SwarmConnection, MeshMessage } from '../network/mesh';

export interface TransportState {
  status: 'OK' | 'QUARANTINE';
  trustLevel: number;
  requiredAction?: 'SEED_PHRASE_AUTH' | 'NONE';
}

export class P2PMeshTransport {
  private cellConnections: Map<string, SwarmConnection> = new Map();

  public registerCellConnection(peerId: string, conn: SwarmConnection) {
    this.cellConnections.set(peerId, conn);
    console.log(`[P2PMeshTransport] Registered local cell connection for ${peerId}`);
  }

  public stop() {
    this.cellConnections.forEach(conn => conn.close());
    this.cellConnections.clear();
  }

  public broadcastToCell(message: MeshMessage) {
    let sentCount = 0;
    this.cellConnections.forEach((conn, peerId) => {
      try {
        conn.send(message);
        sentCount++;
      } catch (err) {
        console.warn(`[P2PMeshTransport] Failed to send to ${peerId}`);
      }
    });
    console.log(`[P2PMeshTransport] Broadcasted message to ${sentCount} cell peers`);
  }

  /**
   * Zero-Trust USB Fallback: 
   * If a USB connection is detected, the engine must initiate a Hardware Quarantine (trustLevel = 0)
   * until explicitly authorized via a Seed Phrase.
   */
  public handleHardwareConnection(portType: 'usb' | 'cable', deviceId: string): TransportState {
    if (portType === 'usb') {
      console.warn(`[ZeroTrustTransport] Physical ${portType.toUpperCase()} connection detected on ${deviceId}. Initiating Hardware Quarantine.`);
      return {
        status: 'QUARANTINE',
        trustLevel: 0,
        requiredAction: 'SEED_PHRASE_AUTH'
      };
    }
    return { status: 'OK', trustLevel: 1, requiredAction: 'NONE' };
  }

  public authorizeUsbDevice(deviceId: string, seedPhrase: string): boolean {
    // Validate the seed phrase length (BIP39 mock validation)
    const words = seedPhrase.trim().split(/\\s+/);
    if (words.length >= 10) {
      console.log(`[ZeroTrustTransport] Device ${deviceId} explicitly authorized via Seed Phrase. Lifting Quarantine.`);
      return true;
    }
    
    console.warn(`[ZeroTrustTransport] Invalid Seed Phrase for device ${deviceId}. Quarantine maintained.`);
    return false;
  }
}
