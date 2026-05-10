use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[wasm_bindgen]
pub struct CrdtRegister {
    // A highly simplified LWW-Element-Set (Last-Writer-Wins) CRDT for Karma and Status
    // Mapping: NodeId -> (Status, Karma, Timestamp)
    state: HashMap<String, (String, f32, u64)>,
}

#[wasm_bindgen]
impl CrdtRegister {
    #[wasm_bindgen(constructor)]
    pub fn new() -> CrdtRegister {
        CrdtRegister {
            state: HashMap::new(),
        }
    }

    /// L4 - CRDT: Update Local state. Resolves conflicts using Timestamp.
    #[wasm_bindgen]
    pub fn merge_state(&mut self, node_id: &str, status: &str, karma: f32, timestamp: u64) {
        let current = self.state.get(node_id);
        if let Some((_, _, current_ts)) = current {
            if timestamp > *current_ts {
                self.state.insert(node_id.to_string(), (status.to_string(), karma, timestamp));
            }
        } else {
            self.state.insert(node_id.to_string(), (status.to_string(), karma, timestamp));
        }
    }

    /// Retrieve the current merged state for a node
    #[wasm_bindgen]
    pub fn get_node_state(&self, node_id: &str) -> Result<JsValue, JsValue> {
        if let Some((status, karma, ts)) = self.state.get(node_id) {
            #[derive(Serialize)]
            struct StatePayload {
                status: String,
                karma: f32,
                timestamp: u64,
            }
            let payload = StatePayload {
                status: status.clone(),
                karma: *karma,
                timestamp: *ts,
            };
            return Ok(serde_wasm_bindgen::to_value(&payload)?);
        }
        Ok(JsValue::NULL)
    }

    /// Export full CRDT state for synchronization
    #[wasm_bindgen]
    pub fn export_state(&self) -> String {
        #[derive(Serialize)]
        struct StatePayload {
            status: String,
            karma: f32,
            timestamp: u64,
        }
        let mut serializable_state = HashMap::new();
        for (k, v) in &self.state {
            serializable_state.insert(k.clone(), StatePayload {
                status: v.0.clone(),
                karma: v.1,
                timestamp: v.2,
            });
        }
        serde_json::to_string(&serializable_state).unwrap_or_default()
    }
}
