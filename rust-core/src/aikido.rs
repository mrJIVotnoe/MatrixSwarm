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

#[derive(Serialize, Deserialize)]
pub struct AikidoInput {
    pub node_id: String,
    pub caste: HardwareCaste,
    pub logical_cores: u32,
    pub memory_mb: u32,
    pub connection_type: String, // "wifi", "cellular", "usb", "adb"
    
    // Previous State
    pub prev_lat: Option<f64>,
    pub prev_lng: Option<f64>,
    pub curr_lat: Option<f64>,
    pub curr_lng: Option<f64>,
    pub is_charging: bool,
    pub hours_in_same_cell: f32,
    
    pub mobility_score: f32,
    pub gps_updates_count: u32,
    pub karma: f32,
}

#[derive(Serialize, Deserialize)]
pub struct AikidoOutput {
    pub node_id: String,
    pub new_lat: Option<f64>,
    pub new_lng: Option<f64>,
    pub mobility_score: f32,
    pub gps_updates_count: u32,
    pub karma: f32,
    pub role: SwarmRole,
    pub aikido_status: String,
    pub untrusted_link_event: bool,
}

#[wasm_bindgen]
pub struct AikidoCore;

#[wasm_bindgen]
impl AikidoCore {
    #[wasm_bindgen]
    pub fn process_node(input_val: JsValue) -> Result<JsValue, JsValue> {
        let input: AikidoInput = serde_wasm_bindgen::from_value(input_val)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
            
        let mut out = AikidoOutput {
            node_id: input.node_id.clone(),
            new_lat: input.curr_lat.or(input.prev_lat),
            new_lng: input.curr_lng.or(input.prev_lng),
            mobility_score: input.mobility_score,
            gps_updates_count: input.gps_updates_count,
            karma: input.karma,
            role: SwarmRole::Scout,
            aikido_status: "Nomad".to_string(),
            untrusted_link_event: false,
        };

        // 1. Zero-Trust USB check
        if input.connection_type == "usb" || input.connection_type == "adb" || input.connection_type == "serial" {
            out.untrusted_link_event = true;
            out.aikido_status = "Hardware Quarantine".to_string();
            out.karma = 0.0;
            return Ok(serde_wasm_bindgen::to_value(&out)?);
        }

        // 2. Mobility Score Calculation
        if let (Some(clat), Some(clng), Some(plat), Some(plng)) = (input.curr_lat, input.curr_lng, input.prev_lat, input.prev_lng) {
            let dist_km = AikidoMath::haversine_distance(plat, plng, clat, clng);
            let is_static = dist_km < 0.001; // less than 1 meter
            out.gps_updates_count += 1;
            
            if is_static {
                out.mobility_score = (out.mobility_score - 5.0).max(0.0);
            } else {
                out.mobility_score = (out.mobility_score + 10.0).min(100.0);
                out.new_lat = Some(clat);
                out.new_lng = Some(clng);
            }
        }

        // 3. Hardware Profiles & Stable Guardian logic
        match input.caste {
            HardwareCaste::PC | HardwareCaste::Router | HardwareCaste::SmartTV => {
                out.role = SwarmRole::Magistrate;
                out.aikido_status = "Hardware Anchor".to_string();
                
                // Rust accrues Karma for uptime, ignoring lack of mobility
                out.karma += (input.hours_in_same_cell * 2.0).min(100.0);
            },
            HardwareCaste::Smartphone | HardwareCaste::Tablet => {
                let is_powerful = input.logical_cores >= 8 && input.memory_mb >= 4096;
                
                if out.mobility_score == 0.0 {
                    if input.is_charging {
                        // "Смартфон в режиме зарядки: Rust начисляет Карму за аптайм, игнорируя отсутствие перемещения"
                        if input.hours_in_same_cell > 72.0 {
                            out.aikido_status = "HOME_ANCHOR".to_string();
                        } else {
                            out.aikido_status = "STABLE_GUARDIAN".to_string();
                            out.role = if is_powerful { SwarmRole::StableGuardian } else { SwarmRole::Scout };
                        }
                        out.karma += (input.hours_in_same_cell * 1.5).min(50.0);
                    } else {
                        if out.gps_updates_count > 10 {
                            out.aikido_status = "BOT_FARM_NODE".to_string();
                            out.karma = out.karma.min(50.0);
                        } else {
                            out.aikido_status = "Static Suspect".to_string();
                        }
                    }
                } else {
                    out.role = SwarmRole::Scout;
                    out.aikido_status = "Nomad".to_string();
                }
            },
            HardwareCaste::Unknown => {
                out.role = SwarmRole::Scout;
                out.aikido_status = "Static Suspect".to_string();
                out.karma = out.karma.min(10.0);
            }
        }

        Ok(serde_wasm_bindgen::to_value(&out)?)
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

    #[wasm_bindgen]
    pub fn check_cross_caste_consensus(votes_json: &str) -> bool {
        // Мы не строим витрину. Мы куем Инфраструктуру Последнего Шанса.
        #[derive(Deserialize)]
        struct Vote {
            device_type: String, // "pc", "router", "smartphone", "tablet", "smart_tv"
            is_positive: bool,
        }

        let votes: Vec<Vote> = serde_json::from_str(votes_json).unwrap_or_default();

        let mut pc_total = 0; let mut pc_pos = 0;
        let mut router_total = 0; let mut router_pos = 0;
        let mut smart_total = 0; let mut smart_pos = 0;

        for v in votes {
            match v.device_type.as_str() {
                "pc" => { pc_total += 1; if v.is_positive { pc_pos += 1; } },
                "router" => { router_total += 1; if v.is_positive { router_pos += 1; } },
                "smartphone" | "tablet" => { smart_total += 1; if v.is_positive { smart_pos += 1; } },
                _ => {}
            }
        }

        let pc_approval = if pc_total > 0 { pc_pos as f32 / pc_total as f32 } else { 1.0 };
        let router_approval = if router_total > 0 { router_pos as f32 / router_total as f32 } else { 1.0 };
        let smart_approval = if smart_total > 0 { smart_pos as f32 / smart_total as f32 } else { 1.0 };

        pc_approval >= 0.2 && router_approval >= 0.2 && smart_approval >= 0.2
    }

    /// L2 - Global Trust: GPS Anti-Spoofing and Mobility Check
    #[wasm_bindgen]
    pub fn validate_mobility(device_type: &str, distance_moved: f32, elapsed_minutes: f32) -> bool {
        if device_type == "smartphone" || device_type == "tablet" {
            if elapsed_minutes > 120.0 && distance_moved < 0.05 {
                // Device claims to be mobile but hasn't moved 50 meters in 2 hours
                // Potentially an emulator or static farm spoofing as a mobile Scout
                return false;
            }
        }
        true
    }

    /// L2 - Local bot farm 51% attack detector
    #[wasm_bindgen]
    pub fn detect_bot_farm(static_nodes: u32, mobile_nodes: u32, total_nodes: u32) -> bool {
        if total_nodes < 10 { return false; }
        // If 80%+ of nodes are acting like static smartphones
        let static_ratio = static_nodes as f32 / total_nodes as f32;
        static_ratio > 0.8
    }

    /// L2 - Digital Camouflage
    #[wasm_bindgen]
    pub fn generate_digital_camouflage(real_payload: &str, bot_noise_seed: &str) -> String {
        // Encase the real payload in fake generic metadata mimicking bot farm noise
        // This hides our P2P signal within the 51% attack.
        format!("{{\"bot_signature\": \"{bot_noise_seed}\", \"dummy_metrics\": [0.0, 1.2], \"__hidden_payload\": \"{real_payload}\"}}")
    }
}
