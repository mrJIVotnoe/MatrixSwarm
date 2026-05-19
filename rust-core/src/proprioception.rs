use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ProprioceptionCore {
    current_cell: Option<String>,
}

#[wasm_bindgen]
impl ProprioceptionCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            current_cell: None,
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

    /// Децентрализованная триангуляция (Reverse StarLink)
    #[wasm_bindgen]
    pub fn triangulate_via_acoustic_and_ble(&self, _peer_id: &str, acoustic_strength: f64, ble_strength: f64) -> f64 {
        let distance = 100.0 - (acoustic_strength * 0.5 + ble_strength * 0.5);
        distance
    }
}
