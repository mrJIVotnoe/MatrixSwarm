import { PeerInfo, MatchmakingClient } from './signaling';
import { WasmMeshNetwork, WasmTaskScheduler } from '../core/wasm_bridge';

export type MeshMessage = {
  type: 'pheromone_heartbeat' | 'data' | 'relay_request';
  payload: any;
};

// Singleton Rust cores
const wasmMesh = new WasmMeshNetwork();
const wasmScheduler = new WasmTaskScheduler();

export class SwarmConnection {
  public peerId: string;
  private rtcConnection: RTCPeerConnection;
  private dataChannel?: RTCDataChannel;
  private matchmaker: MatchmakingClient;
  private peerTrustLevel: number;

  public onData?: (data: any) => void;
  public onStateChange?: (state: RTCPeerConnectionState) => void;

  constructor(peer: PeerInfo, matchmaker: MatchmakingClient) {
    this.peerId = peer.id;
    this.peerTrustLevel = peer.trust_score;
    this.matchmaker = matchmaker;

    // Use standard Google/Cloudflare STUN servers for NAT traversal
    this.rtcConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.rtcConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.matchmaker.sendSignal(this.peerId, 'webrtc_ice_candidate', { candidate: event.candidate });
      }
    };

    this.rtcConnection.onconnectionstatechange = () => {
      console.log(`[Mesh L3] Connection with ${this.peerId}: ${this.rtcConnection.connectionState}`);
      if (this.onStateChange) this.onStateChange(this.rtcConnection.connectionState);
      
      if (this.rtcConnection.connectionState === 'failed') {
        this.initiateRelayFallback();
      }
    };

    this.rtcConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };
  }

  public async initiate() {
    // Hardware Quarantine Check: Trust < 1 means we can just initiate, but restrictions apply.
    this.dataChannel = this.rtcConnection.createDataChannel('matrix_swarm');
    this.setupDataChannel(this.dataChannel);

    const offer = await this.rtcConnection.createOffer();
    await this.rtcConnection.setLocalDescription(offer);
    await this.matchmaker.sendSignal(this.peerId, 'webrtc_offer', { sdp: offer });
  }

  public async handleOffer(sdp: RTCSessionDescriptionInit) {
    await this.rtcConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await this.rtcConnection.createAnswer();
    await this.rtcConnection.setLocalDescription(answer);
    await this.matchmaker.sendSignal(this.peerId, 'webrtc_answer', { sdp: answer });
  }

  public async handleAnswer(sdp: RTCSessionDescriptionInit) {
    await this.rtcConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  public async handleIceCandidate(candidate: RTCIceCandidateInit) {
    await this.rtcConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.dataChannel.onopen = () => {
      console.log(`[Mesh L3] DataChannel OPEN with ${this.peerId}`);
      this.startHeartbeat();
    };

    this.dataChannel.onmessage = (event) => {
      const msg: MeshMessage = JSON.parse(event.data);
      if (msg.type === 'pheromone_heartbeat') {
        // Rust Core processing
        console.log(`[Pheromone] Direct pulse from ${this.peerId} handled natively.`);
        wasmScheduler.receive_heartbeat(this.peerId, Date.now());
        wasmMesh.emit_pheromone(`hb_${this.peerId}`, this.peerId, "heartbeat_ok");
        
        // Let Rust check for reincarnated tasks
        const reincarnated = wasmScheduler.check_reincarnation(Date.now(), "magistrate_node_fallback");
        if (reincarnated.length > 0) {
           console.log(`[Reincarnation] WASM System Interrupt... Tasks resurrected: ${reincarnated}`);
        }
      } else if (msg.type === 'relay_request') {
        if (this.peerTrustLevel < 1) {
          console.warn(`[ZeroTrust] ${this.peerId} has inadequate trust score. Dropping relay request.`);
          return;
        }
        // Handle relaying...
      } else {
        if (this.onData) this.onData(msg.payload);
      }
    };
  }

  private startHeartbeat() {
    setInterval(() => {
      if (this.dataChannel?.readyState === 'open') {
        this.send({ type: 'pheromone_heartbeat', payload: { ts: Date.now() } });
      }
    }, 5000);
  }

  public send(message: MeshMessage) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  // --- Fallback Strategies ---
  private initiateRelayFallback() {
    console.log(`[RelayFallback] Symmetric NAT detected for ${this.peerId}. Switching to Magistrate relay.`);
    // 1. We would ask the Matchmaker for a Magistrate proxy
    // 2. We hook into Acoustic Pheromones if L3 IP mesh is dead completely
    this.initiateSurrogateChannels();
  }

  private initiateSurrogateChannels() {
    console.warn(`[SurrogateChannels] L3 Net Down. Checking hooks for Kynopsis / Acoustic Pheromones.`);
    // Acoustic Beacon Fallback
    // window.postMessage({ type: 'INIT_ULTRASOUND_BEACON' }, '*');
  }
}

export class MeshNetwork {
  private connections: Map<string, SwarmConnection> = new Map();
  private matchmaker: MatchmakingClient;

  constructor(matchmaker: MatchmakingClient) {
    this.matchmaker = matchmaker;

    this.matchmaker.onSignalReceived = async (type, senderId, payload) => {
      let conn = this.connections.get(senderId);
      
      if (!conn) {
        // Create connection stub conceptually. We lack PeerInfo here, so we assume basic trust for setup
        const peerMock = { id: senderId, trust_score: 50, power_rating: 'unknown', device_type: 'unknown', capabilities: '[]' };
        conn = new SwarmConnection(peerMock, this.matchmaker);
        this.connections.set(senderId, conn);
      }

      if (type === 'webrtc_offer' && payload.sdp) {
        await conn.handleOffer(payload.sdp);
      } else if (type === 'webrtc_answer' && payload.sdp) {
        await conn.handleAnswer(payload.sdp);
      } else if (type === 'webrtc_ice_candidate' && payload.candidate) {
        await conn.handleIceCandidate(payload.candidate);
      }
    };
  }

  public connectToPeer(peer: PeerInfo) {
    if (!this.connections.has(peer.id)) {
      const conn = new SwarmConnection(peer, this.matchmaker);
      this.connections.set(peer.id, conn);
      conn.initiate();
    }
  }

  public getConnectedPeers() {
    return Array.from(this.connections.keys());
  }

  public broadcastData(data: any) {
    this.connections.forEach(conn => {
      conn.send({ type: 'data', payload: data });
    });
  }
}
