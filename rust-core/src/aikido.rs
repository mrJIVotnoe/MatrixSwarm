use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[wasm_bindgen]
pub struct AikidoMath;

#[wasm_bindgen]
impl AikidoMath {
    /// Strict Haversine formula calculation in Rust for precise geo-routing
    #[wasm_bindgen]
    pub fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
        const R: f64 = 6371.0; // Earth radius in kilometers

        let d_lat = (lat2 - lat1).to_radians();
        let d_lon = (lon2 - lon1).to_radians();

        let a = (d_lat / 2.0).sin().powi(2)
            + lat1.to_radians().cos() * lat2.to_radians().cos() * (d_lon / 2.0).sin().powi(2);

        let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

        R * c
    }
    
    /// Karmic PoW simulation: consumes attack energy to generate mathematical proofs
    #[wasm_bindgen]
    pub fn absorb_attack(attack_vector: &str, intensity: u32) -> String {
        let mut hash = String::new();
        // Simulate PoW by hashing the attack vector roughly `intensity` times
        let mut current_data = attack_vector.as_bytes().to_vec();
        for _ in 0..(intensity.min(1000)) {
            let next_hash = blake3::hash(&current_data);
            current_data = next_hash.as_bytes().to_vec();
            if hash.is_empty() {
                hash = next_hash.to_string();
            }
        }
        hash
    }
}

// -------------------------------------------------------------
// Hardware Awareness & L2 Trust
// -------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone)]
pub enum HardwareCaste {
    SmartTV,
    Router,
    PC,
    Smartphone,
    Tablet,
    Unknown,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum SwarmRole {
    Magistrate,
    Scout,
    StableGuardian,
}

#[derive(Serialize, Deserialize)]
pub struct HardwareProfile {
    pub caste: HardwareCaste,
    pub logical_cores: u32,
    pub memory_mb: u32,
    pub connection_type: String, // "wifi", "cellular", "usb", "adb"
}

#[derive(Serialize, Deserialize)]
pub struct NodeEvaluation {
    pub role: SwarmRole,
    pub trust_level: f32,
    pub aikido_status: String,
}

#[wasm_bindgen]
pub struct AikidoCore;

#[wasm_bindgen]
impl AikidoCore {
    #[wasm_bindgen]
    pub fn evaluate_hardware_profile(profile_val: JsValue) -> Result<JsValue, JsValue> {
        let profile: HardwareProfile = serde_wasm_bindgen::from_value(profile_val)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let mut trust_level = 50.0;
        let mut role = SwarmRole::Scout;
        let mut aikido_status = "Nomad".to_string();

        // 1) "Zero-Trust USB: при физическом подключении trust_level должен принудительно сбрасываться в 0"
        if profile.connection_type == "usb" || profile.connection_type == "adb" || profile.connection_type == "serial" {
            trust_level = 0.0;
            aikido_status = "Hardware Quarantine".to_string();
        } else {
            // 2) Hardware Profiles
            match profile.caste {
                HardwareCaste::PC | HardwareCaste::Router | HardwareCaste::SmartTV => {
                    // Стационарные касты (ПК, ТВ, Роутеры) игнорируют проверку мобильности
                    role = SwarmRole::Magistrate;
                    aikido_status = "Hardware Anchor".to_string();
                    trust_level = 100.0;
                },
                HardwareCaste::Smartphone | HardwareCaste::Tablet => {
                    // Узел на Rust автоматически проверяет мощности
                    if profile.logical_cores >= 8 && profile.memory_mb >= 4096 {
                        role = SwarmRole::StableGuardian;
                        aikido_status = "STABLE_GUARDIAN".to_string();
                        trust_level = 75.0;
                    } else {
                        role = SwarmRole::Scout;
                        aikido_status = "Nomad".to_string();
                        trust_level = 50.0;
                    }
                },
                HardwareCaste::Unknown => {
                    role = SwarmRole::Scout;
                    aikido_status = "Static Suspect".to_string();
                    trust_level = 10.0;
                }
            }
        }

        let eval = NodeEvaluation {
            role,
            trust_level,
            aikido_status,
        };

        Ok(serde_wasm_bindgen::to_value(&eval)?)
    }

    #[wasm_bindgen]
    pub fn apply_aikido_penalty(node_id: &str, current_trust: f32, status: &str) -> Result<JsValue, JsValue> {
        #[derive(Serialize)]
        struct PenaltyResult {
            pub effective_karma: f32,
            pub voting_weight: f32,
            pub forced_heavy_compute: bool,
        }

        let mut res = PenaltyResult {
            effective_karma: current_trust,
            voting_weight: 1.0,
            forced_heavy_compute: false,
        };

        match status {
            "BOT_FARM_NODE" => {
                res.effective_karma = res.effective_karma.min(50.0);
                res.voting_weight = 0.0;
                res.forced_heavy_compute = true;
            },
            "Static Suspect" => {
                res.voting_weight = 0.5;
            },
            "HOME_ANCHOR" => {
                res.effective_karma += 100.0;
            },
            "STABLE_GUARDIAN" | "Hardware Anchor" => {
                res.effective_karma += 24.0;
            },
            "Hardware Quarantine" => {
                res.effective_karma = 0.0;
                res.voting_weight = 0.0;
            },
            _ => {}
        }

        Ok(serde_wasm_bindgen::to_value(&res)?)
    }
}
