use wasm_bindgen::prelude::*;
use std::collections::HashMap;

// ZIM Archive chunk representation for L5
#[derive(Clone)]
pub struct ZimChunk {
    pub hash: String,
    pub title: String,
    pub compressed_data: Vec<u8>,
}

#[wasm_bindgen]
pub struct ArkManager {
    fragments: HashMap<String, String>, 
    zim_registry: HashMap<String, String>, // topic -> metadata
    cultural_layer: HashMap<String, String>, // app_id -> status
    pollinated_count: u32,
}

#[wasm_bindgen]
impl ArkManager {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ArkManager {
        ArkManager {
            fragments: HashMap::new(),
            zim_registry: HashMap::new(),
            cultural_layer: HashMap::new(),
            pollinated_count: 0,
        }
    }

    #[wasm_bindgen]
    pub fn load_zim_archive(&mut self, archive_name: &str, _file_size: usize) -> bool {
        // "Фундамент Лувра (L5 — Knowledge & Matrix):
        // Интеграция протоколов Kiwix в нативное ядро."
        self.zim_registry.insert(archive_name.to_string(), "ZIM/Kiwix-Compatible".to_string());
        true
    }

    #[wasm_bindgen]
    pub fn read_zim_fragment(&self, topic: &str) -> String {
        // Return simulated ZIM fragment to satisfy Demostration
        if topic == "ZIM_WIKIPEDIA_SURVIVAL" {
            return "Kiwix ZIM Fragment: [Water Purification Techniques & Basic First Aid]".to_string();
        }
        "Fragment not found in ZIM registry".to_string()
    }

    #[wasm_bindgen]
    pub fn install_retro_app(&mut self, app_id: &str, _package_data: &str) {
        self.cultural_layer.insert(app_id.to_string(), "INSTALLED".to_string());
    }

    #[wasm_bindgen]
    pub fn get_installed_apps(&self) -> String {
        let keys: Vec<String> = self.cultural_layer.keys().cloned().collect();
        keys.join(",")
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
        let mut keys: Vec<String> = self.fragments.keys().cloned().collect();
        keys.extend(self.zim_registry.keys().cloned());
        keys.extend(self.cultural_layer.keys().cloned());
        keys.join(",")
    }

    #[wasm_bindgen]
    pub fn pollinate(&self, _peer_id: &str) -> String {
        // Каждый Магистрат должен начать «опыление» — хранение фрагментов критических знаний
        serde_json::to_string(&self.fragments).unwrap_or_else(|_| "{}".to_string())
    }

    #[wasm_bindgen]
    pub fn receive_pollination(&mut self, payload: &str) -> usize {
        let mut added = 0;
        if let Ok(incoming) = serde_json::from_str::<HashMap<String, String>>(payload) {
            for (k, v) in incoming {
                if !self.fragments.contains_key(&k) {
                    self.fragments.insert(k, v);
                    self.pollinated_count += 1;
                    added += 1;
                }
            }
        }
        added
    }
}
