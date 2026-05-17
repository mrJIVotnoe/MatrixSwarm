use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[wasm_bindgen]
pub struct CasteAutonomy {}

#[derive(Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu_cores: u32,
    pub ram_gb: f32,
    pub is_plugged_in: bool,
    pub device_type: String, // "desktop", "mobile", "smart_tv", "router"
    pub has_gps: bool,
    pub battery_level: f32,
}

#[wasm_bindgen]
impl CasteAutonomy {
    /// Merits of Iron: Determine Node Role based on system resources
    #[wasm_bindgen]
    pub fn determine_role(metrics_json: &str) -> Result<JsValue, JsValue> {
        let metrics: SystemMetrics = serde_json::from_str(metrics_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        let role = if metrics.device_type == "desktop" && metrics.cpu_cores >= 8 && metrics.ram_gb >= 16.0 && metrics.is_plugged_in {
            "Magistrate"
        } else if metrics.device_type == "mobile" && metrics.has_gps && metrics.battery_level > 20.0 {
            "Scout"
        } else if metrics.device_type == "smart_tv" && metrics.is_plugged_in {
            "Stable Guard"
        } else if metrics.cpu_cores >= 4 && metrics.is_plugged_in {
            "Relay"
        } else {
            "Drone"
        };

        Ok(serde_wasm_bindgen::to_value(&role)?)
    }
}
