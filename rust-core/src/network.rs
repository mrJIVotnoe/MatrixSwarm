use wasm_bindgen::prelude::*;
use std::collections::HashMap;

// Железо смертно. Информация бессмертна. Рой вечен.

#[wasm_bindgen]
pub struct MeshNetwork {
    pheromones: HashMap<String, PheromonePacket>,
    nodes: HashMap<String, NodeState>,
    acoustic_neighbors: HashMap<String, bool>,
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
        }
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
}

