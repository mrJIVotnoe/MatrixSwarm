use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

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

#[derive(Serialize, Deserialize, Clone)]
pub struct CRDTKarmaBlock {
    pub id: String,
    pub node_id: String,
    pub action: String,
    pub amount: f32,
    pub timestamp: u64,
    pub previous_hash: String,
    pub hash: String,
}

#[wasm_bindgen]
pub struct KarmaCRDT {
    blocks: HashMap<String, CRDTKarmaBlock>,
}

#[wasm_bindgen]
impl KarmaCRDT {
    #[wasm_bindgen(constructor)]
    pub fn new() -> KarmaCRDT {
        KarmaCRDT {
            blocks: HashMap::new(),
        }
    }

    /// Add block locally
    #[wasm_bindgen]
    pub fn add_block(&mut self, json_block: &str) -> bool {
        if let Ok(block) = serde_json::from_str::<CRDTKarmaBlock>(json_block) {
            if !self.blocks.contains_key(&block.id) {
                self.blocks.insert(block.id.clone(), block);
                return true;
            }
        }
        false
    }
    
    /// Merge from P2P
    #[wasm_bindgen]
    pub fn merge_all(&mut self, sync_data: &str) -> usize {
        let mut added = 0;
        if let Ok(incoming) = serde_json::from_str::<Vec<CRDTKarmaBlock>>(sync_data) {
            for block in incoming {
                if !self.blocks.contains_key(&block.id) {
                    self.blocks.insert(block.id.clone(), block);
                    added += 1;
                }
            }
        }
        added
    }

    #[wasm_bindgen]
    pub fn export_deltas_since(&self, since_ts: u64) -> String {
        let mut deltas: Vec<&CRDTKarmaBlock> = self.blocks.values()
            .filter(|b| b.timestamp > since_ts)
            .collect();
        deltas.sort_by_key(|b| std::cmp::Reverse(b.timestamp));
        serde_json::to_string(&deltas).unwrap_or_else(|_| "[]".to_string())
    }

    #[wasm_bindgen]
    pub fn merge_deltas(&mut self, delta_data: &str) -> usize {
        self.merge_all(delta_data)
    }

    #[wasm_bindgen]
    pub fn export_all(&self) -> String {
        let mut all: Vec<&CRDTKarmaBlock> = self.blocks.values().collect();
        all.sort_by_key(|b| std::cmp::Reverse(b.timestamp));
        serde_json::to_string(&all).unwrap_or_else(|_| "[]".to_string())
    }
    
    #[wasm_bindgen]
    pub fn size(&self) -> usize {
        self.blocks.len()
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CRDTMessage {
    pub id: String,
    pub sender: String,
    pub recipient: String,
    pub payload: String,
    pub timestamp: u64,
}

#[wasm_bindgen]
pub struct MessageCRDT {
    // observed messages (using set of IDs to prevent duplicates)
    messages: HashMap<String, CRDTMessage>,
}

#[wasm_bindgen]
impl MessageCRDT {
    #[wasm_bindgen(constructor)]
    pub fn new() -> MessageCRDT {
        MessageCRDT {
            messages: HashMap::new(),
        }
    }

    /// Add a message to the CRDT queue
    #[wasm_bindgen]
    pub fn add_message(&mut self, id: &str, sender: &str, recipient: &str, payload: &str, timestamp: u64) {
        if !self.messages.contains_key(id) {
            // L4 - Store in memory encrypted queue
            self.messages.insert(id.to_string(), CRDTMessage {
                id: id.to_string(),
                sender: sender.to_string(),
                recipient: recipient.to_string(),
                payload: payload.to_string(),
                timestamp,
            });
        }
    }

    /// Pull messages available for a recipient ("collapse" queue into delivery)
    #[wasm_bindgen]
    pub fn get_messages_for(&mut self, recipient: &str) -> String {
        let mut to_deliver = Vec::new();
        // Extract messages for the peer
        for msg in self.messages.values() {
            if msg.recipient == recipient || msg.recipient == "BROADCAST" {
                to_deliver.push(msg.clone());
            }
        }
        
        to_deliver.sort_by_key(|m| m.timestamp);
        serde_json::to_string(&to_deliver).unwrap_or_else(|_| "[]".to_string())
    }

    /// Sync internal state with another node's JSON dump
    #[wasm_bindgen]
    pub fn merge_all(&mut self, sync_data: &str) {
        if let Ok(incoming) = serde_json::from_str::<Vec<CRDTMessage>>(sync_data) {
            for msg in incoming {
                self.messages.entry(msg.id.clone()).or_insert(msg);
            }
        }
    }

    #[wasm_bindgen]
    pub fn export_deltas_since(&self, since_ts: u64) -> String {
        let all: Vec<&CRDTMessage> = self.messages.values()
            .filter(|m| m.timestamp > since_ts)
            .collect();
        serde_json::to_string(&all).unwrap_or_else(|_| "[]".to_string())
    }

    #[wasm_bindgen]
    pub fn merge_deltas(&mut self, delta_data: &str) {
        self.merge_all(delta_data)
    }

    #[wasm_bindgen]
    pub fn export_all(&self) -> String {
        let all: Vec<&CRDTMessage> = self.messages.values().collect();
        serde_json::to_string(&all).unwrap_or_else(|_| "[]".to_string())
    }
}
