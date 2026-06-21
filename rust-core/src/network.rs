use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

// Железо смертно. Информация бессмертна. Рой вечен.

#[derive(Serialize, Deserialize, Clone)]
pub struct HoneyPacket {
    pub message_id: String,
    pub sender_id: String,
    pub recipient_id: String,
    pub encrypted_payload: String,
    pub is_delivered: bool,
    pub timestamp: u64,
}

#[wasm_bindgen]
pub struct MeshNetwork {
    pheromones: HashMap<String, PheromonePacket>,
    nodes: HashMap<String, NodeState>,
    acoustic_neighbors: HashMap<String, bool>,
    honey_queue: Vec<HoneyPacket>,
}

#[derive(Clone)]
struct PheromonePacket {
    id: String,
    origin_id: String,
    intensity: f32, // decodes like an RSSI / signal strength
    payload_l3: String,
}

#[derive(Clone)]
struct NodeState {
    last_heartbeat: u64,
}

#[wasm_bindgen]
impl MeshNetwork {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            pheromones: HashMap::new(),
            nodes: HashMap::new(),
            acoustic_neighbors: HashMap::new(),
            honey_queue: Vec::new(),
        }
    }

    /// Enqueues an encrypted packet ("Honey") that sleeps in memory until transit matches
    #[wasm_bindgen]
    pub fn enqueue_honey(&mut self, message_id: String, sender: String, recipient: String, encrypted_payload: String, timestamp: u64) {
        self.honey_queue.push(HoneyPacket {
            message_id,
            sender_id: sender,
            recipient_id: recipient,
            encrypted_payload,
            is_delivered: false,
            timestamp,
        });
    }

    /// Pulls Honey packages waiting for delivery from Scouts to Magistrates or reciprocal peers
    #[wasm_bindgen]
    pub fn exchange_honey(&mut self, _sender_id: &str, recipient_id: &str) -> Result<JsValue, JsValue> {
        let mut exchangeable_packets = Vec::new();
        for packet in self.honey_queue.iter_mut() {
            if !packet.is_delivered && (packet.recipient_id == recipient_id || packet.recipient_id == "BROADCAST") {
                packet.is_delivered = true;
                exchangeable_packets.push(packet.clone());
            }
        }
        Ok(serde_wasm_bindgen::to_value(&exchangeable_packets)?)
    }

    /// Count how many honey packets sleep in memory
    #[wasm_bindgen]
    pub fn get_sleeping_honey_count(&self) -> usize {
        self.honey_queue.iter().filter(|p| !p.is_delivered).count()
    }

    /// Emits a new L3 digital pheromone into the mesh
    #[wasm_bindgen]
    pub fn emit_pheromone(&mut self, id: String, origin: String, payload: String) -> bool {
        self.pheromones.insert(id.clone(), PheromonePacket {
            id,
            origin_id: origin,
            intensity: 1.0, 
            payload_l3: payload,
        });
        true
    }

    /// Process pheromone decay to free up RAM on old routers
    #[wasm_bindgen]
    pub fn decay_pheromones(&mut self) -> usize {
        let mut to_remove = Vec::new();
        
        for (id, p) in self.pheromones.iter_mut() {
            p.intensity -= 0.1;
            if p.intensity <= 0.0 {
                to_remove.push(id.clone());
            }
        }
        
        let removed_count = to_remove.len();
        for id in to_remove {
            self.pheromones.remove(&id);
        }
        
        removed_count
    }

    #[wasm_bindgen]
    pub fn register_heartbeat(&mut self, node_id: String, current_time: u64) {
        self.nodes.insert(node_id, NodeState { last_heartbeat: current_time });
    }

    /// L1 Acoustic Handshake - registers high frequency 18k-20k FSK acoustic verification
    #[wasm_bindgen]
    pub fn register_acoustic_handshake(&mut self, node_id: String, success: bool) {
        self.acoustic_neighbors.insert(node_id, success);
    }

    /// Verifies if mutual physical neighboring is proved via sound spectra Goertzel checks
    #[wasm_bindgen]
    pub fn is_physical_neighbor(&self, node_id: &str) -> bool {
        *self.acoustic_neighbors.get(node_id).unwrap_or(&false)
    }

    /// Instantly upgrades trust coordinates of an acoustically synced node to Guard (level 3)
    #[wasm_bindgen]
    pub fn get_acoustic_trust_level(&self, node_id: &str) -> i32 {
        if self.is_physical_neighbor(node_id) {
            3 // Guard level
        } else {
            1 // Recruit/Adept fallback
        }
    }

    /// L3 Federated Mesh: Magistrates send hello greetings to form decentralized bridge
    #[wasm_bindgen]
    pub fn greet_federated_magistrate(&mut self, magistrate_id: String, cell_id: String) -> String {
        self.register_heartbeat(magistrate_id.clone(), 123456);
        format!("L3_FEDERATION_ESTABLISHED: Magistrate {} in Cell {} linked via federated bridge. No central servers required.", magistrate_id, cell_id)
    }

    /// L3 Federated Mesh: Route Honey packets selectively. Relays to Anchor Magistrate if recipient is distant/unknown.
    #[wasm_bindgen]
    pub fn route_honey_packet(
        &mut self,
        message_id: String,
        sender_id: String,
        recipient_id: String,
        encrypted_payload: String,
        is_recipient_known_direct: bool,
        anchor_magistrate_id: String,
        timestamp: u64
    ) -> String {
        if is_recipient_known_direct {
            self.enqueue_honey(message_id, sender_id, recipient_id, encrypted_payload, timestamp);
            "ROUTE_DIRECT_L2: Honey packet routed directly using physical local cell channels.".to_string()
        } else {
            // Relays to Anchor Magistrate via Federated Mesh Relaying (L3)
            self.enqueue_honey(message_id, sender_id, anchor_magistrate_id.clone(), encrypted_payload, timestamp);
            format!("ROUTE_FEDERATED_L3: Distant node. Encrypted payload ('Honey') relayed to Anchor Magistrate ({}).", anchor_magistrate_id)
        }
    }
}

