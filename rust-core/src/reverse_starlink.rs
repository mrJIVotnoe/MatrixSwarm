use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[wasm_bindgen]
pub struct ReverseStarlink {}

#[derive(Serialize, Deserialize)]
pub struct NodeBeacon {
    pub node_id: String,
    pub lat: f32,
    pub lon: f32,
    pub timestamp: u64,
}

#[wasm_bindgen]
impl ReverseStarlink {
    /// L3 - Reverse StarLink: Triangulate relative position from peers in Acoustic/mDNS network
    #[wasm_bindgen]
    pub fn triangulate_position(beacons_json: &str) -> String {
        let beacons: Vec<NodeBeacon> = serde_json::from_str(beacons_json).unwrap_or_default();
        
        if beacons.len() < 3 {
            return "AWAITING_MORE_BEACONS".to_string();
        }
        
        // Simplified centroid triangulation for independent terrestrial mapping
        let mut sum_lat = 0.0;
        let mut sum_lon = 0.0;
        
        for b in &beacons {
            sum_lat += b.lat;
            sum_lon += b.lon;
        }
        
        let avg_lat = sum_lat / beacons.len() as f32;
        let avg_lon = sum_lon / beacons.len() as f32;

        format!("TRIANGULATED:{},{}", avg_lat, avg_lon)
    }
}
