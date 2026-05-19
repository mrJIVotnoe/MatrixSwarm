use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct MeshSurrogate {}

#[wasm_bindgen]
impl MeshSurrogate {
    #[wasm_bindgen]
    pub fn enable_lora_surrogate() -> String {
        // "Подготовка ловушек/костылей для интеграции с меш-сетями LoRa"
        "LORA_DRIVER_STUB_LOADED: Listening on pseudo-serial...".to_string()
    }

    #[wasm_bindgen]
    pub fn enable_meshtastic_surrogate() -> String {
        // "Подготовка ловушек/костылей для интеграции с меш-сетями Meshtastic"
        "MESHTASTIC_BLE_BRIDGE_MOCK_READY".to_string()
    }
}
