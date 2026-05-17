import { PeerInfo, MatchmakingClient } from './signaling';
import { WasmMeshNetwork, WasmTaskScheduler, WasmNativeP2PMesh } from '../core/wasm_bridge';

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
  private nativeMesh: typeof WasmNativeP2PMesh.prototype;

  public onData?: (data: any) => void;
  public onStateChange?: (state: RTCPeerConnectionState) => void;

  constructor(peer: PeerInfo, matchmaker: MatchmakingClient, nativeMesh: any) {
    this.peerId = peer.id;
    this.peerTrustLevel = peer.trust_score;
    this.matchmaker = matchmaker;
    this.nativeMesh = nativeMesh;

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
      console.log(`[Mesh L3] DataChannel OPEN with ${this.peerId}. Transferring control to Native WebAssembly Rust Core.`);
      
      // Flush any queued offline messages
      const flushed = (this.nativeMesh as any).flush_offline_queue(this.peerId);
      if (flushed && flushed > 0) {
        console.log(`[Queue] Flushed ${flushed} offline messages to ${this.peerId}.`);
      }

      this.startHeartbeat();
    };

    // L3: Handing over WebRTC DataChannel to Native Rust
    this.nativeMesh.register_data_channel(this.peerId, this.dataChannel, (dataStr: string) => {
        try {
            const msg: MeshMessage = JSON.parse(dataStr);
            if (msg.type === 'pheromone_heartbeat') {
              console.log(`[Pheromone] Direct native pulse from ${this.peerId} handled.`);
              wasmScheduler.receive_heartbeat(this.peerId, Date.now());
              wasmMesh.emit_pheromone(`hb_${this.peerId}`, this.peerId, "heartbeat_ok");
            } else if (msg.type === 'relay_request') {
              if (this.peerTrustLevel < 1) {
                console.warn(`[ZeroTrust] ${this.peerId} has inadequate trust score. Dropping relay request.`);
                return;
              }
            } else {
              if (this.onData) this.onData(msg.payload);
            }
        } catch(e) {
            console.error("Native Parse err", e)
        }
    });
  }

  private heartbeatInterval?: NodeJS.Timeout;

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.dataChannel?.readyState === 'open') {
         // Sending directly via Rust Native layer
         this.nativeMesh.transmit_pheromone_direct(this.peerId, JSON.stringify({ type: 'pheromone_heartbeat', payload: { ts: Date.now() } }));
      }
    }, 5000);
  }

  public close() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.dataChannel) {
        this.dataChannel.onopen = null;
        this.dataChannel.onmessage = null;
        this.dataChannel.close();
    }
    if (this.rtcConnection) {
        this.rtcConnection.onicecandidate = null;
        this.rtcConnection.onconnectionstatechange = null;
        this.rtcConnection.ondatachannel = null;
        this.rtcConnection.close();
    }
  }

  public send(message: MeshMessage) {
      // L3 Direct Rust transmitting handles internal queueing if channel isn't open yet
      this.nativeMesh.transmit_pheromone_direct(this.peerId, JSON.stringify(message));
  }

  private initiateRelayFallback() {
    console.log(`[RelayFallback] Symmetric NAT detected for ${this.peerId}. Switching to Magistrate relay.`);
    this.initiateSurrogateChannels();
  }

  private initiateSurrogateChannels() {
    console.warn(`[SurrogateChannels] L3 Net Down. Checking hooks for Kynopsis / Acoustic Pheromones.`);
  }
}

export class MeshNetwork {
  private connections: Map<string, SwarmConnection> = new Map();
  private matchmaker: MatchmakingClient;
  private nativeMesh: typeof WasmNativeP2PMesh.prototype;

  constructor(matchmaker: MatchmakingClient) {
    this.matchmaker = matchmaker;
    this.nativeMesh = new WasmNativeP2PMesh("local_node_" + Date.now());

    this.matchmaker.onSignalReceived = async (type, senderId, payload) => {
      let conn = this.connections.get(senderId);
      
      if (!conn) {
        const peerMock = { id: senderId, trust_score: 50, power_rating: 'unknown', device_type: 'unknown', capabilities: '[]' };
        conn = new SwarmConnection(peerMock, this.matchmaker, this.nativeMesh);
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
      const conn = new SwarmConnection(peer, this.matchmaker, this.nativeMesh);
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

  public stop() {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
  }
}
