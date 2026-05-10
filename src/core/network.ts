import Peer from 'simple-peer';
import { WasmSwarmNetwork } from './wasm_bridge';

// In a real scenario, this coordinates with the signaling server (Bramble/Matrix relays).
// For the local cell (geo-cluster), nodes exchange signaling data and connect directly.
export class SwarmNetworkLayer {
  private peers: Map<string, Peer.Instance> = new Map();
  private localNodeId: string;
  private karma: number = 50.0;

  constructor(nodeId: string) {
    this.localNodeId = nodeId;
    // Broadcast pure Rust mDNS discovery
    console.log(`[NetworkLayer] Emitting mDNS: ${WasmSwarmNetwork.generateMdnsBroadcast(nodeId)}`);
    
    // Simulate mDNS polling mechanism driven by Rust
    setInterval(() => {
        const discovered = WasmSwarmNetwork.pollMdnsPeers();
        if (discovered && discovered.length > 0) {
            console.log(`[NetworkLayer] Rust mDNS Polling discovered neighbors:`, discovered);
        }
    }, 10000);
  }

  /**
   * Initializes a WebRTC connection with a peer in the same Geo-Cluster.
   */
  public connectToPeer(peerId: string, isInitiator: boolean, signalingCallback: (data: any) => void) {
    if (this.peers.has(peerId)) {
      console.warn(`[NetworkLayer] Already connected or connecting to ${peerId}`);
      return;
    }

    console.log(`[NetworkLayer] Establishing WebRTC P2P mesh link to ${peerId} (Initiator: ${isInitiator})`);

    // We maintain simple-peer as the transport layer, but data is constructed natively by Rust
    const peer = new Peer({
      initiator: isInitiator,
      trickle: false,
      objectMode: true,
    });

    peer.on('signal', (data) => {
      console.log(`[NetworkLayer] Generated signal for ${peerId}`);
      signalingCallback(data);
    });

    peer.on('connect', () => {
      console.log(`[NetworkLayer] 🟢 P2P Mesh Link Established with ${peerId}`);
      // Send Digital Pheromone Handshake via Rust Core
      const handshakePulse = WasmSwarmNetwork.createPheromonePulse(
        this.localNodeId, "HANDSHAKE", this.karma, Date.now()
      );
      peer.send(JSON.stringify(handshakePulse));
    });

    peer.on('data', (data) => {
      this.handleIncomingData(peerId, data);
    });

    peer.on('close', () => {
      console.log(`[NetworkLayer] 🔴 P2P Mesh Link Closed with ${peerId}`);
      this.peers.delete(peerId);
    });

    peer.on('error', (err) => {
      console.error(`[NetworkLayer] Error with peer ${peerId}:`, err);
      this.peers.delete(peerId);
    });

    this.peers.set(peerId, peer);
  }

  public receiveSignal(peerId: string, signalData: any) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.signal(signalData);
    } else {
      console.warn(`[NetworkLayer] Received signal for unknown peer ${peerId}`);
    }
  }

  public broadcastPheromone(status: string) {
    const pulse = WasmSwarmNetwork.createPheromonePulse(
      this.localNodeId, status, this.karma, Date.now()
    );
    const dataString = JSON.stringify(pulse);
    for (const [peerId, peer] of this.peers.entries()) {
      if (peer.connected) {
        try {
          peer.send(dataString);
        } catch (e) {
          console.error(`[NetworkLayer] Failed to send to ${peerId}`);
        }
      }
    }
  }

  private handleIncomingData(peerId: string, dataStr: string) {
    try {
      // Decode via Rust Core
      const payload = WasmSwarmNetwork.parsePheromonePulse(dataStr);
      console.log(`[NetworkLayer] Rx Pheromone from ${peerId}:`, payload);
      // Process payload through Swarm Integrity and Isolation
    } catch (e) {
      console.log(`[NetworkLayer] Rx Raw from ${peerId}: ${dataStr}`);
    }
  }
  
  public getConnectedPeersList(): string[] {
    const active: string[] = [];
    for (const [id, peer] of this.peers.entries()) {
      if (peer.connected) active.push(id);
    }
    return active;
  }
}
