use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct P2PMessage {
    pub id: String,
    pub recipient_id: String,
    pub encrypted_payload: String,
    pub timestamp: u64,
}

#[wasm_bindgen]
pub struct MessageQueue {
    queue: Vec<P2PMessage>,
}

#[wasm_bindgen]
impl MessageQueue {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            queue: Vec::new(),
        }
    }

    /// L2/L4 - Store message encrypted when offline
    #[wasm_bindgen]
    pub fn enqueue_message(&mut self, id: &str, recipient_id: &str, payload: &str, timestamp: u64) {
        // In a real implementation payload is encrypted with recipient public key
        // Here we simulate the encryption step
        let encrypted_payload = format!("ENCRYPTED[{}]", payload);
        
        self.queue.push(P2PMessage {
            id: id.to_string(),
            recipient_id: recipient_id.to_string(),
            encrypted_payload,
            timestamp,
        });
    }

    /// Attempt to forward pending messages to newly discovered peers via mDNS or Acoustic Nabat
    #[wasm_bindgen]
    pub fn flush_for_peer(&mut self, peer_id: &str) -> String {
        let mut to_send = Vec::new();
        let mut remaining = Vec::new();

        // Check if any messages are destined for this peer
        for msg in self.queue.drain(..) {
            if msg.recipient_id == peer_id || msg.recipient_id == "BROADCAST" {
                to_send.push(msg);
            } else {
                remaining.push(msg);
            }
        }
        
        self.queue = remaining;
        
        serde_json::to_string(&to_send).unwrap_or_else(|_| "[]".to_string())
    }
    
    #[wasm_bindgen]
    pub fn pending_count(&self) -> usize {
        self.queue.len()
    }
}
