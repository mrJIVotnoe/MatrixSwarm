use wasm_bindgen::prelude::*;
use std::collections::HashMap;

// Железо смертно. Информация бессмертна. Рой вечен.

#[wasm_bindgen]
pub struct MeshNetwork {
    pheromones: HashMap<String, PheromonePacket>,
    nodes: HashMap<String, NodeState>,
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
}
