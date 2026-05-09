use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum TrustLevel {
    Quarantine = 0,
    Recruit = 1,
    Adept = 2,
    Magistrate = 3,
    Traitor = -1,
}

#[wasm_bindgen]
pub struct TrustEngine {
    karmic_score: i32,
    is_hardware_verified: bool,
}

#[wasm_bindgen]
impl TrustEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            karmic_score: 0,
            is_hardware_verified: false,
        }
    }

    /// Evaluates trust level based on score and hardware verification
    #[wasm_bindgen]
    pub fn get_level(&self) -> TrustLevel {
        if self.karmic_score < 0 {
            return TrustLevel::Traitor;
        }
        
        // Zero-Trust USB & Hardware Quarantine Logic
        if !self.is_hardware_verified {
            return TrustLevel::Quarantine; // Cannot bypass quarantine unless hardware is verified
        }

        match self.karmic_score {
            0..=99 => TrustLevel::Recruit,
            100..=999 => TrustLevel::Adept,
            _ => TrustLevel::Magistrate,
        }
    }

    #[wasm_bindgen]
    pub fn add_karma(&mut self, amount: i32) {
        self.karmic_score += amount;
    }

    #[wasm_bindgen]
    pub fn verify_hardware(&mut self, signature: &str) -> bool {
        // Mock hardware signature verification
        if signature.len() > 10 {
            self.is_hardware_verified = true;
            true
        } else {
            false
        }
    }
}
