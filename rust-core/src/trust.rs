use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum TrustLevel {
    Traitor = -1,
    Quarantine = 0,
    Recruit = 1,
    Adept = 2,
    Guard = 3,
    Magistrate = 4,
}

#[wasm_bindgen]
pub struct TrustEngine {
    karmic_score: i32,
    is_hardware_verified: bool,
    is_powered: bool,
    has_mini_jack: bool,
}

#[wasm_bindgen]
impl TrustEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            karmic_score: 0,
            is_hardware_verified: false,
            is_powered: false,
            has_mini_jack: false,
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
            1000..=9999 => TrustLevel::Guard,
            _ => TrustLevel::Magistrate,
        }
    }

    #[wasm_bindgen]
    pub fn add_karma(&mut self, amount: i32, role: &str) {
        let mut final_amount = amount;
        if self.has_mini_jack && amount > 0 {
            if role == "Scout" {
                // Кармическая Антенна multiplier x1.5
                final_amount += amount / 2;
            } else {
                final_amount += amount / 4; // lesser bonus for non-Scout
            }
        }
        self.karmic_score += final_amount;
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

    #[wasm_bindgen]
    pub fn register_mini_jack(&mut self, present: bool) {
        self.has_mini_jack = present;
    }

    /// L2 - Immunity: Zero-Trust USB & Power Authorization
    #[wasm_bindgen]
    pub fn check_physical_link(&mut self, is_usb_connected: bool, authorized_power: bool) -> bool {
        if is_usb_connected {
            if authorized_power {
                self.is_powered = true;
                // If authorized, trust level doesn't fall, and we mark as powered
                return false;
            }
            // "Если система обнаруживает подключение через USB-кабель, trustLevel узла
            // в памяти Rust должен быть принудительно установлен в 0 (Карантин)"
            self.is_hardware_verified = false;
            self.is_powered = false;
            // "Блокируй любые попытки автоматической синхронизации данных через USB-порты 
            // до тех пор, пока Пользователь (Наблюдатель) не подтвердит доверие через подпись ключом"
            return true; // Return true indicating a quarantine block occurred
        }
        self.is_powered = false;
        false
    }

    #[wasm_bindgen]
    pub fn is_anchor_magistrate_candidate(&self) -> bool {
        self.is_powered && self.get_level() == TrustLevel::Magistrate
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_usb_quarantine() {
        let mut engine = TrustEngine::new();
        engine.add_karma(500); // Adept level logic
        engine.verify_hardware("human-verified-signature");
        
        assert_eq!(engine.get_level(), TrustLevel::Adept);
        
        // Connect USB without authorization
        let blocked = engine.check_physical_link(true, false);
        assert!(blocked);
        
        // Level falls to Quarantine (0)
        assert_eq!(engine.get_level(), TrustLevel::Quarantine);
    }
}