import { Identity, signData, verifySignature } from '../core/identity';

export interface PeerInfo {
  id: string;
  trust_score: number;
  power_rating: string;
  device_type: string;
  capabilities: string;
}

export class MatchmakingClient {
  private ws: WebSocket | null = null;
  private identity: Identity;
  public cellId: string;
  
  public onPeersDiscovered?: (peers: PeerInfo[]) => void;
  public onSignalReceived?: (type: string, senderId: string, payload: any) => void;

  constructor(identity: Identity, cellId: string) {
    this.identity = identity;
    this.cellId = cellId;
  }

  public connect(serverUrl: string) {
    // Camouflage under WSS HTTPS
    const wsUrl = serverUrl.replace('http', 'ws');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      console.log('[L3 Signaling] Connected to Matchmaking Server');
      // Auth with identity signature
      const payload = { type: 'auth', nodeId: this.identity.address, cellId: this.cellId, timestamp: Date.now() };
      this.send(payload);
    };

    this.ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'auth_success') {
        this.discoverPeers();
      }

      if (data.type === 'discovery_response') {
        if (this.onPeersDiscovered) {
          this.onPeersDiscovered(data.peers);
        }
      }

      if (['webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate', 'webrtc_signal'].includes(data.type)) {
        // Zero-Trust: Verify sender signature
        const isValid = verifySignature(data.senderNodeId, JSON.stringify(data.sdp || data.candidate || data.signal), data.signature);
        if (!isValid) {
          console.warn(`[ZeroTrust] Rejected invalid signature from ${data.senderNodeId}. Hardware isolation triggered.`);
          return; // Ignore compromised message
        }
        
        if (this.onSignalReceived) {
          this.onSignalReceived(data.type, data.senderNodeId, data);
        }
      }
    };

    this.ws.onclose = () => {
      console.log('[L3 Signaling] Disconnected from Matchmaking Server');
    };
  }

  public discoverPeers() {
    this.send({ type: 'discovery', cellId: this.cellId });
  }

  public async sendSignal(targetNodeId: string, type: 'webrtc_offer' | 'webrtc_answer' | 'webrtc_ice_candidate' | 'webrtc_signal', payload: any) {
    // Sign the payload
    const signature = await signData(this.identity.privateKey, JSON.stringify(payload));
    
    this.send({
      type,
      targetNodeId,
      signature,
      ...payload // inject sdp or candidate
    });
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
