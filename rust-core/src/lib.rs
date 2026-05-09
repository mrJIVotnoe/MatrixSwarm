use wasm_bindgen::prelude::*;

mod identity;
mod trust;
mod scheduler;
mod aikido;
mod stegano;

mod network;
mod sandbox;
mod swarm_core;

#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    // "Железо смертно. Информация бессмертна. Рой вечен"
    console_error_panic_hook::set_once();
    Ok(())
}

#[wasm_bindgen]
pub fn get_core_version() -> String {
    String::from("v2.0 Rust-Core (Invicta)")
}
