import Peer from 'simple-peer';

// In a real scenario, this coordinates with the signaling server (Bramble/Matrix relays).
// For the local cell (geo-cluster), nodes exchange signaling data and connect directly.
export class SwarmNetworkLayer {
  private peers: Map<string, Peer.Instance> = new Map();
  private localNodeId: string;

  constructor(nodeId: string) {
    this.localNodeId = nodeId;
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

    // Using simple-peer for WebRTC datachannels
    const peer = new Peer({
      initiator: isInitiator,
      trickle: false, // Wait for ICE candidates to gather for simplicity
      objectMode: true,
    });

    peer.on('signal', (data) => {
      // Must send this signal data to the target peer via signaling server
      console.log(`[NetworkLayer] Generated signal for ${peerId}`);
      signalingCallback(data);
    });

    peer.on('connect', () => {
      console.log(`[NetworkLayer] 🟢 P2P Mesh Link Established with ${peerId}`);
      peer.send(JSON.stringify({ type: 'handshake', from: this.localNodeId }));
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

  public broadcastToCell(payload: any) {
    const dataString = JSON.stringify(payload);
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
      const payload = JSON.parse(dataStr);
      console.log(`[NetworkLayer] Rx from ${peerId}:`, payload);
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
