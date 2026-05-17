import { Identity, signData, verifySignature } from '../core/identity';
import { SwarmNetwork } from '../../rust-core/pkg/swarm_wasm';

export interface PeerInfo {
  id: string;
  trust_score: number;
  power_rating: string;
  device_type: string;
  capabilities: string;
}

export class MatchmakingClient {
  private identity: Identity;
  public cellId: string;
  private gossipInterval: any;
  
  public onPeersDiscovered?: (peers: PeerInfo[]) => void;
  public onSignalReceived?: (type: string, senderId: string, payload: any) => void;

  constructor(identity: Identity, cellId: string) {
    this.identity = identity;
    this.cellId = cellId;
  }

  public connect(serverUrl: string) {
    console.log('[L3] Discarded central server. Initializing Native Gossip (mDNS + Acoustic).');
    
    // Simulate initial discovery
    this.discoverPeers();

    // Start Gossip loop for receiving signals
    this.gossipInterval = setInterval(() => {
        const signalsJson = SwarmNetwork.gossip_receive_signals(this.identity.address);
        try {
            const signals = JSON.parse(signalsJson);
            for (const data of signals) {
                if (['webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate', 'webrtc_signal'].includes(data.type)) {
                    // Zero-Trust: Verify sender signature
                    const isValid = verifySignature(data.senderNodeId, JSON.stringify(data.sdp || data.candidate || data.signal), data.signature);
                    if (!isValid) {
                    console.warn(`[ZeroTrust] Rejected invalid signature from ${data.senderNodeId}.`);
                    continue;
                    }
                    
                    if (this.onSignalReceived) {
                    this.onSignalReceived(data.type, data.senderNodeId, data);
                    }
                }
            }
        } catch(e) {}
    }, 2000);
  }

  public discoverPeers() {
      console.log("[mDNS] Sending out discovery pings...");
      const peersStr = SwarmNetwork.trigger_gossip_discovery(this.identity.address);
      try {
          const peers: PeerInfo[] = JSON.parse(peersStr);
          if (this.onPeersDiscovered) {
              this.onPeersDiscovered(peers);
          }
      } catch(e) {}
  }

  public async sendSignal(targetNodeId: string, type: 'webrtc_offer' | 'webrtc_answer' | 'webrtc_ice_candidate' | 'webrtc_signal', payload: any) {
    // Sign the payload
    const signature = await signData(this.identity.privateKey, JSON.stringify(payload));
    
    const packet = {
      type,
      senderNodeId: this.identity.address,
      targetNodeId,
      signature,
      ...payload
    };

    // Use Native Gossip to transmit
    SwarmNetwork.gossip_transmit_signal(targetNodeId, JSON.stringify(packet));
  }

  public disconnect() {
      if (this.gossipInterval) {
          clearInterval(this.gossipInterval);
      }
      console.log('[L3 Signaling] Native Gossip Disconnected');
  }
}
