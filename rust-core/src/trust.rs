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
    is_cpu_stable: bool,
    is_botnet_farmer: bool,
    is_acoustic_sync_active: bool,
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
            is_cpu_stable: true,
            is_botnet_farmer: false,
            is_acoustic_sync_active: false,
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
        if self.is_botnet_farmer {
            // Aikido Camouflage Rule: 100% computational load redirected, NO karma awarded.
            return;
        }

        let mut final_amount = amount;
        
        // L0 - Hardware Sync (Scout Vanguard Postulate): 
        // If both mini-jack antenna and Acoustic Sync (ultrasound) are active, 
        // node receives Scout Vanguard level with direct x2.0 Karma multiplier!
        if self.has_mini_jack && self.is_acoustic_sync_active && amount > 0 {
            final_amount = (final_amount as f32 * 2.0) as i32;
        } else if self.has_mini_jack && amount > 0 {
            // Mini-Jack Audio Ear / Surrogate Antenna physical ethic: automatic 1.5x Karma bonus
            final_amount = (final_amount as f32 * 1.5) as i32;
        }

        // Condor (Heart / Stable Guardian) ethic: Stable CPU, no thermal throttling. +20% karma bonus.
        if self.is_cpu_stable && amount > 0 {
            final_amount += (final_amount as f32 * 0.20) as i32;
        }

        self.karmic_score += final_amount;
    }

    #[wasm_bindgen]
    pub fn register_acoustic_sync(&mut self, active: bool) {
        self.is_acoustic_sync_active = active;
    }

    #[wasm_bindgen]
    pub fn is_scout_vanguard(&self) -> bool {
        self.has_mini_jack && self.is_acoustic_sync_active
    }

    #[wasm_bindgen]
    pub fn set_cpu_stability(&mut self, stable: bool) {
        self.is_cpu_stable = stable;
    }

    #[wasm_bindgen]
    pub fn detect_botnet_farm(&mut self, mobility_score: f64, is_smartphone: bool) -> bool {
        if is_smartphone && mobility_score == 0.0 {
            self.is_botnet_farmer = true;
            self.karmic_score = 0; // Seize all karma
            true
        } else {
            self.is_botnet_farmer = false;
            false
        }
    }

    #[wasm_bindgen]
    pub fn is_botnet_farmer(&self) -> bool {
        self.is_botnet_farmer
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