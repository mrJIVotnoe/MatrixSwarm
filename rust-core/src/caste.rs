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
    #[wasm_bindgen]
    pub fn calculate_karma_multiplier(has_mini_jack: bool, is_throttling: bool, condor_synced: bool) -> f32 {
        let mut multiplier = 1.0;
        
        // Postulate 1: Mini-Jack Bonus
        // "Наличие разъема и подключенной «суррогатной антенны» (наушников) дает множитель х1.5"
        if has_mini_jack {
            multiplier *= 1.5;
        }

        // Postulate 2: Condor Stability
        // "Стабильная работа процессора без «троттлинга» и успешная синхронизация с кластером Condor — базовый множитель Кармы."
        if !is_throttling && condor_synced {
            multiplier *= 1.2;
        } else if is_throttling {
            // Penalize throttling
            multiplier *= 0.8;
        }
        
        multiplier
    }

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
