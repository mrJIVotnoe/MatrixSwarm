use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ProprioceptionCore {
    current_cell: Option<String>,
    known_cells: Vec<String>, // format peer_id:cell_id:channel
    verified_peers: Vec<String>, // acoustically verified peer nodes
}

#[wasm_bindgen]
impl ProprioceptionCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            current_cell: None,
            known_cells: Vec::new(),
            verified_peers: Vec::new(),
        }
    }

    /// Reverse StarLink: Hashing exact coordinates into a "Cell Identifier",
    /// avoiding exact location sharing.
    #[wasm_bindgen]
    pub fn update_gps(&mut self, lat: f64, lng: f64) -> String {
        // Round to 2 decimal places to create a ~1.1km grid cell
        let lat_rounded = (lat * 100.0).round() / 100.0;
        let lng_rounded = (lng * 100.0).round() / 100.0;
        
        let mut hasher = DefaultHasher::new();
        let point_str = format!("CELL:{}:{}", lat_rounded, lng_rounded);
        point_str.hash(&mut hasher);
        let cell_id = format!("C_{:x}", hasher.finish());
        
        self.current_cell = Some(cell_id.clone());
        cell_id
    }

    #[wasm_bindgen]
    pub fn get_current_cell(&self) -> Option<String> {
        self.current_cell.clone()
    }

    /// L3 - Ground Beacon Network: Exchange Cell ID with neighboring nodes
    /// using Acoustic ultrasound (pulse) & WebRTC. Creates a live resilient offline map.
    #[wasm_bindgen]
    pub fn register_shared_cell(&mut self, peer_id: &str, cell_id: &str, via_channel: &str) -> bool {
        let entry = format!("{}:{}:{}", peer_id, cell_id, via_channel);
        if !self.known_cells.contains(&entry) {
            self.known_cells.push(entry);
            true
        } else {
            false
        }
    }

    /// Register acoustic verification between neighboring nodes through ultrasonic handshake
    #[wasm_bindgen]
    pub fn register_acoustic_verification(&mut self, peer_id: &str, heard: bool) {
        if heard {
            if !self.verified_peers.contains(&peer_id.to_string()) {
                self.verified_peers.push(peer_id.to_string());
            }
        } else {
            self.verified_peers.retain(|x| x != peer_id);
        }
    }

    /// Retrieve the serialized JSON list of known peer cell divisions across Ground Mesh network
    #[wasm_bindgen]
    pub fn get_known_mesh_cells_json(&self) -> String {
        let mut parts = Vec::new();
        for entry in &self.known_cells {
            let tokens: Vec<&str> = entry.split(':').collect();
            if tokens.len() >= 3 {
                let peer_id = tokens[0];
                let is_verified = self.verified_peers.contains(&peer_id.to_string());
                parts.push(format!(
                    "{{\"peer_id\":\"{}\",\"cell_id\":\"{}\",\"channel\":\"{}\",\"is_verified\":{}}}",
                    peer_id, tokens[1], tokens[2], is_verified
                ));
            }
        }
        format!("[{}]", parts.join(","))
    }

    /// Децентрализованная триангуляция (Reverse StarLink)
    #[wasm_bindgen]
    pub fn triangulate_via_acoustic_and_ble(&self, _peer_id: &str, acoustic_strength: f64, ble_strength: f64) -> f64 {
        let distance = 100.0 - (acoustic_strength * 0.5 + ble_strength * 0.5);
        distance
    }
}
