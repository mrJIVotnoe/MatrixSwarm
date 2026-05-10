use wasm_bindgen::prelude::*;
use blake3;

#[wasm_bindgen]
pub struct EntropyBridge;

#[wasm_bindgen]
impl EntropyBridge {
    /// L2 - Entropy Bridge: Absorb "Human Entropy" (Sudoku vectors & delays) into RNG salt
    #[wasm_bindgen]
    pub fn absorb_human_entropy(move_vector: &str, delay_ms: u32, current_salt: &str) -> String {
        // Мы не строим витрину. Мы куем Инфраструктуру Последнего Шанса.
        // The deterministic engine consumes true human unpredictability to fuel cryptographic nonces.
        let raw_entropy = format!("{}_DELAY{}_VEC{}", current_salt, delay_ms, move_vector);
        blake3::hash(raw_entropy.as_bytes()).to_string()
    }
}
