use std::collections::HashMap;

/// Fundamental unit of data payload
#[derive(Debug, Clone)]
pub struct SwarmDataPacket {
    pub source_id: String,
    pub target_id: String,
    pub payload: Vec<u8>,
}

pub enum ConnectionState {
    Disconnected,
    Signaling,
    ConnectedDataChannel,
}

pub struct PeerConnection {
    pub peer_id: String,
    pub state: ConnectionState,
    // In actual WebRTC WASM implementations, this would wrap an RTCDataChannel
}

/// L3 - Network Layer (P2P-Fero)
/// Foundation for WebRTC Data Channels and relay signal exchange
pub struct NetworkManager {
    local_node_id: String,
    peers: HashMap<String, PeerConnection>,
}

impl NetworkManager {
    pub fn new(local_node_id: &str) -> Self {
        Self {
            local_node_id: local_node_id.to_string(),
            peers: HashMap::new(),
        }
    }

    /// Initiates a face-to-face signaling request to establish a Data Channel.
    pub fn initiate_peer_connection(&mut self, peer_id: &str) {
        // Prepare signaling (SDP offer) to send through relay
        let conn = PeerConnection {
            peer_id: peer_id.to_string(),
            state: ConnectionState::Signaling,
        };
        self.peers.insert(peer_id.to_string(), conn);
    }
    
    /// Called when WebRTC Data Channel is successfully opened
    pub fn set_peer_connected(&mut self, peer_id: &str) {
        if let Some(conn) = self.peers.get_mut(peer_id) {
            conn.state = ConnectionState::ConnectedDataChannel;
        }
    }

    /// Relays data over the exact established face-to-face WebRTC socket.
    pub fn send_data(&self, peer_id: &str, data: Vec<u8>) -> Result<(), &'static str> {
        if let Some(conn) = self.peers.get(peer_id) {
            match conn.state {
                ConnectionState::ConnectedDataChannel => {
                    // Send to raw datachannel
                    // FFI hook to JS or native socket transmission goes here
                    Ok(())
                },
                _ => Err("Peer is not fully connected over Data Channel"),
            }
        } else {
            Err("Peer not found")
        }
    }
}
