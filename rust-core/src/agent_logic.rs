use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize)]
pub struct MicroTask {
    pub id: String,
    pub assigned_role: String,
    pub payload: String,
}

#[wasm_bindgen]
pub struct GlobalIntentDecomposer;

#[wasm_bindgen]
impl GlobalIntentDecomposer {
    /// L5: Observer Command Decomposition
    /// Decompose Natural Language Global Intent into a chain of micro-tasks for Recruits and Scouts
    #[wasm_bindgen]
    pub fn decompose_intent(intent: &str) -> String {
        let mut tasks = Vec::new();
        
        // Very basic LLM-like keyword parsing for task decomposition
        let intent_lower = intent.to_lowercase();
        
        if intent_lower.contains("medic") || intent_lower.contains("heal") || intent_lower.contains("water") || intent_lower.contains("surviv") {
            // Task 1: Medical reference lookup
            tasks.push(MicroTask {
                id: format!("TASK_MED_{}", DateNowFallback()),
                assigned_role: "Magistrate".to_string(),
                payload: "Fetch relevant ZIM fragments from ArkStorage and transmit via Nabat.".to_string(),
            });
            // Task 2: Scouts to listen
            tasks.push(MicroTask {
                id: format!("TASK_LISTEN_{}", DateNowFallback()),
                assigned_role: "Scout".to_string(),
                payload: "Enable aggressive acoustic listening on 18-20kHz for incoming medical pollination.".to_string(),
            });
        }
        else if intent_lower.contains("seismic") || intent_lower.contains("earthquake") {
            tasks.push(MicroTask {
                id: format!("TASK_SEISMIC_{}", DateNowFallback()),
                assigned_role: "Recruit".to_string(),
                payload: "Lower threshold of SeismicSensor to 1.5G and begin immediate aggregation.".to_string(),
            });
            tasks.push(MicroTask {
                id: format!("TASK_ROBOT_{}", DateNowFallback()),
                assigned_role: "Scout".to_string(),
                payload: "Relay any localized seismic anomaly immediately to the cell.".to_string(),
            });
        }
        else {
            // Generic tasks
            tasks.push(MicroTask {
                id: format!("TASK_GEN_{}", DateNowFallback()),
                assigned_role: "Magistrate".to_string(),
                payload: format!("Distribute sub-routines for intent: {}", intent),
            });
        }

        serde_json::to_string(&tasks).unwrap_or_else(|_| "[]".to_string())
    }
}

// Fallback logic for mock IDs
fn DateNowFallback() -> u64 {
    // A Rust standalone timestamp mock
    1000000000
}
