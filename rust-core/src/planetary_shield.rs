use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[wasm_bindgen]
pub struct PlanetaryShield {}

#[derive(Serialize, Deserialize)]
pub struct SeismographData {
    pub node_id: String,
    pub accel_x: f32,
    pub accel_y: f32,
    pub accel_z: f32,
    pub timestamp: u64,
}

#[wasm_bindgen]
impl PlanetaryShield {
    /// L3 - Planetary Safety: Analyze micro-vibrations from millions of devices
    #[wasm_bindgen]
    pub fn analyze_seismic_activity(sensor_batch_json: &str) -> String {
        let readings: Vec<SeismographData> = serde_json::from_str(sensor_batch_json).unwrap_or_default();
        
        if readings.is_empty() {
            return "STABLE".to_string();
        }

        let mut anomaly_score = 0.0;
        
        for r in &readings {
            // Simplified P-wave detection vector math
            let magnitude = (r.accel_x.powi(2) + r.accel_y.powi(2) + r.accel_z.powi(2)).sqrt();
            if magnitude > 2.5 { // Threshold for early warning detection
                anomaly_score += magnitude;
            }
        }
        
        // If the localized network detects a synchronized anomaly
        if anomaly_score > (readings.len() as f32 * 1.5) {
            "NABAT_EARTHQUAKE_WARNING_BROADCAST".to_string()
        } else {
            "STABLE".to_string()
        }
    }
}
