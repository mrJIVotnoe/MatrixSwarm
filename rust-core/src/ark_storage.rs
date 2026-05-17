use wasm_bindgen::prelude::*;
use std::collections::HashMap;

#[wasm_bindgen]
pub struct ArkStorage {
    fragments: HashMap<String, String>, 
}

#[wasm_bindgen]
impl ArkStorage {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ArkStorage {
        ArkStorage {
            fragments: HashMap::new(),
        }
    }

    #[wasm_bindgen]
    pub fn store_fragment(&mut self, topic: &str, content: &str) {
        self.fragments.insert(topic.to_string(), content.to_string());
    }

    #[wasm_bindgen]
    pub fn read_fragment(&self, topic: &str) -> String {
        self.fragments.get(topic).cloned().unwrap_or_default()
    }

    #[wasm_bindgen]
    pub fn get_available_knowledge(&self) -> String {
        let keys: Vec<String> = self.fragments.keys().cloned().collect();
        keys.join(",")
    }

    #[wasm_bindgen]
    pub fn pollinate(&self, _peer_id: &str) -> String {
        serde_json::to_string(&self.fragments).unwrap_or_else(|_| "{}".to_string())
    }

    #[wasm_bindgen]
    pub fn receive_pollination(&mut self, payload: &str) -> usize {
        let mut added = 0;
        if let Ok(incoming) = serde_json::from_str::<HashMap<String, String>>(payload) {
            for (k, v) in incoming {
                if !self.fragments.contains_key(&k) {
                    self.fragments.insert(k, v);
                    added += 1;
                }
            }
        }
        added
    }
}
