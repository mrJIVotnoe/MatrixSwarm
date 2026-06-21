use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

//   "Железо смертно. Информация бессмертна. Рой вечен. Мы мутируем, чтобы жить."

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GenevaPacket {
    pub seq: u32,
    pub ack: u32,
    pub flags: String, // e.g. "SYN", "RST", "ACK"
    pub payload: String,
    pub fragment_offset: u32,
    pub is_tampered: bool,
    pub is_duplicate: bool,
    pub is_dropped: bool,
}

#[wasm_bindgen]
impl GenevaPacket {
    #[wasm_bindgen(constructor)]
    pub fn new(seq: u32, ack: u32, flags: String, payload: String) -> Self {
        Self {
            seq,
            ack,
            flags,
            payload,
            fragment_offset: 0,
            is_tampered: false,
            is_duplicate: false,
            is_dropped: false,
        }
    }
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GenevaStrategy {
    pub id: u32,
    pub name: String,
    pub action_type: String, // "drop" | "tamper" | "duplicate" | "fragment"
    pub target_flag: String, // flag to trigger on
    pub split_size: u32,     // for fragmentation
    pub is_tcb_desync: bool, // alters TCB (TCP Control Block) states
    pub fitness: f32,
    pub generation: u32,
}

#[wasm_bindgen]
impl GenevaStrategy {
    #[wasm_bindgen(constructor)]
    pub fn new(id: u32, name: String, action_type: String, target_flag: String, split_size: u32, is_tcb_desync: bool) -> Self {
        Self {
            id,
            name,
            action_type,
            target_flag,
            split_size,
            is_tcb_desync,
            fitness: 0.0,
            generation: 1,
        }
    }
}

#[wasm_bindgen]
pub struct GenevaEngine {
    strategies: Vec<GenevaStrategy>,
    generation: u32,
    hall_of_fame: HashMap<String, String>, // Strategy Name -> JSON data of the strategy
}

#[wasm_bindgen]
impl GenevaEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let mut default_pool = Vec::new();
        
        // Let's seed 4 classic base strategies inspired by geneva_ccs19.pdf
        default_pool.push(GenevaStrategy {
            id: 1,
            name: "TCP-Desync-ACK".to_string(),
            action_type: "tamper".to_string(),
            target_flag: "SYN-ACK".to_string(),
            split_size: 0,
            is_tcb_desync: true,
            fitness: 45.0,
            generation: 1,
        });

        default_pool.push(GenevaStrategy {
            id: 2,
            name: "Fragment-Sdp-Signaling".to_string(),
            action_type: "fragment".to_string(),
            target_flag: "ACK".to_string(),
            split_size: 16,
            is_tcb_desync: false,
            fitness: 60.0,
            generation: 1,
        });

        default_pool.push(GenevaStrategy {
            id: 3,
            name: "DPI-Spoof-DuplicateRst".to_string(),
            action_type: "duplicate".to_string(),
            target_flag: "SYN".to_string(),
            split_size: 0,
            is_tcb_desync: true,
            fitness: 30.0,
            generation: 1,
        });

        default_pool.push(GenevaStrategy {
            id: 4,
            name: "Silent-Drop-Fin".to_string(),
            action_type: "drop".to_string(),
            target_flag: "RST".to_string(),
            split_size: 0,
            is_tcb_desync: false,
            fitness: 15.0,
            generation: 1,
        });

        Self {
            strategies: default_pool,
            generation: 1,
            hall_of_fame: HashMap::new(),
        }
    }

    // L1 — Packet Manipulation Primitives implementation:
    // Drop primitive: silences the packet under specific conditions.
    #[wasm_bindgen]
    pub fn primitive_drop(&self, mut packet: GenevaPacket) -> GenevaPacket {
        packet.is_dropped = true;
        packet
    }

    // Tamper primitive: modifies TCP sequence, ack numbers, or flags to corrupt state tracking by DPI.
    #[wasm_bindgen]
    pub fn primitive_tamper(&self, mut packet: GenevaPacket, new_flags: &str, increment_seq: u32) -> GenevaPacket {
        packet.flags = new_flags.to_string();
        packet.seq += increment_seq;
        packet.is_tampered = true;
        packet
    }

    // Duplicate primitive: generates clone packets to confuse tracking structures.
    #[wasm_bindgen]
    pub fn primitive_duplicate(&self, packet: GenevaPacket) -> Result<JsValue, JsValue> {
        let mut p1 = packet.clone();
        let mut p2 = packet.clone();
        p2.is_duplicate = true;
        p2.seq += 1; // minor seq displacement for TCB window exhaustion
        
        let mut vec = Vec::new();
        vec.push(p1);
        vec.push(p2);
        
        Ok(serde_wasm_bindgen::to_value(&vec)?)
    }

    // Fragment primitive: slices signaling payload (like WebRTC SDPs) into multiple microscopic TCP blocks
    #[wasm_bindgen]
    pub fn primitive_fragment(&self, packet: GenevaPacket, chunk_size: u32) -> Result<JsValue, JsValue> {
        let mut fragments = Vec::new();
        let payload_bytes = packet.payload.as_bytes();
        
        if payload_bytes.is_empty() {
            fragments.push(packet);
            return Ok(serde_wasm_bindgen::to_value(&fragments)?);
        }

        let chunk_size = if chunk_size == 0 { 8 } else { chunk_size } as usize;
        let mut offset = 0;
        let mut seq_offset = 0;

        for chunk in payload_bytes.chunks(chunk_size) {
            let chunk_str = String::from_utf8_lossy(chunk).to_string();
            let mut frag = GenevaPacket {
                seq: packet.seq + seq_offset,
                ack: packet.ack,
                flags: if offset == 0 { packet.flags.clone() } else { "ACK".to_string() },
                payload: chunk_str,
                fragment_offset: offset as u32,
                is_tampered: false,
                is_duplicate: false,
                is_dropped: false,
            };
            fragments.push(frag);
            offset += chunk.len();
            seq_offset += chunk.len() as u32;
        }

        Ok(serde_wasm_bindgen::to_value(&fragments)?)
    }

    // L4 — Evolutionary Logic: Mutation and Crossover mechanics
    #[wasm_bindgen]
    pub fn evolve_generation(&mut self) -> String {
        self.generation += 1;
        let mut rng_seed = self.generation;

        // Perform crossover and mutation on existing pool
        let mut offspring = Vec::new();
        let pool_size = self.strategies.len();

        if pool_size >= 2 {
            // Sort by fitness descending to select best parents
            self.strategies.sort_by(|a, b| b.fitness.partial_cmp(&a.fitness).unwrap_or(std::cmp::Ordering::Equal));

            // Keep top 2 parents intact
            let best_parent_1 = self.strategies[0].clone();
            let best_parent_2 = self.strategies[1].clone();

            offspring.push(best_parent_1.clone());
            offspring.push(best_parent_2.clone());

            // 1. Crossover: Combine properties of Top parents
            let mut crossed_strategy = GenevaStrategy {
                id: (pool_size + 1) as u32,
                name: format!("Hybrid-{}-{}", best_parent_1.name, best_parent_2.name),
                action_type: best_parent_1.action_type.clone(), // actions from parent 1
                target_flag: best_parent_2.target_flag.clone(), // target conditions from parent 2
                split_size: if best_parent_1.split_size > 0 { best_parent_1.split_size } else { best_parent_2.split_size },
                is_tcb_desync: best_parent_1.is_tcb_desync || best_parent_2.is_tcb_desync,
                fitness: (best_parent_1.fitness + best_parent_2.fitness) / 2.0,
                generation: self.generation,
            };
            
            // 2. Mutate: Introduce random deviations to fields
            rng_seed = (rng_seed * 1103515245 + 12345) & 0x7fffffff;
            if rng_seed % 2 == 0 {
                crossed_strategy.action_type = "tamper".to_string();
                crossed_strategy.is_tcb_desync = true;
                crossed_strategy.name += "-Mutated-Desync";
            } else {
                crossed_strategy.action_type = "fragment".to_string();
                crossed_strategy.split_size = if crossed_strategy.split_size == 0 { 12 } else { crossed_strategy.split_size + 4 };
                crossed_strategy.name += "-Mutated-Frag";
            }

            offspring.push(crossed_strategy);

            // Seed an additional fresh mutated branch to explore landscape
            let mut scout_mutant = GenevaStrategy {
                id: (pool_size + 2) as u32,
                name: format!("Scout-Explorer-G{}", self.generation),
                action_type: if rng_seed % 3 == 0 { "drop".to_string() } else if rng_seed % 3 == 1 { "duplicate".to_string() } else { "tamper".to_string() },
                target_flag: if rng_seed % 2 == 0 { "RST".to_string() } else { "SYN".to_string() },
                split_size: 0,
                is_tcb_desync: rng_seed % 4 == 0,
                fitness: 10.0 + (rng_seed % 30) as f32,
                generation: self.generation,
            };
            offspring.push(scout_mutant);

            self.strategies = offspring;
        }

        format!("GENEVA_EVOLUTION_COMPLETE: Swarm Generation {} compiled. Parent fitness landscapes intersected.", self.generation)
    }

    // Evaluate survival fitness score using network telemetry
    #[wasm_bindgen]
    pub fn evaluate_fitness(&mut self, strategy_name: String, webrtc_speed_ms: f32, kiwix_success: bool) -> f32 {
        let mut final_fitness = 0.0;
        
        // Speed score: lower setup time yields higher survival (capped at 5000ms threshold)
        if webrtc_speed_ms > 0.1 && webrtc_speed_ms < 5000.0 {
            final_fitness += (5000.0 - webrtc_speed_ms) / 50.0;
        } else if webrtc_speed_ms <= 0.1 {
            final_fitness += 10.0; // fallback minimal setup success
        }

        // Kiwix searching success indicates authentic data channel reliability (+40 points)
        if kiwix_success {
            final_fitness += 50.0;
        }

        // Update the strategy's fitness in our pool
        let mut updated = false;
        for s in &mut self.strategies {
            if s.name == strategy_name {
                s.fitness = final_fitness;
                updated = true;
                break;
            }
        }

        // If high fitness, write to Hall of Fame / Collective Memory
        if final_fitness > 65.0 {
            self.hall_of_fame.insert(strategy_name.clone(), format!("{{\"name\": \"{}\", \"fitness\": {}, \"generation\": {}}}", strategy_name, final_fitness, self.generation));
        }

        final_fitness
    }

    #[wasm_bindgen]
    pub fn get_strategies_json(&self) -> String {
        serde_json::to_string(&self.strategies).unwrap_or_else(|_| "[]".to_string())
    }

    // Expose Hall of Fame
    #[wasm_bindgen]
    pub fn get_hall_of_fame_json(&self) -> String {
        let mut list = Vec::new();
        for (_, val) in &self.hall_of_fame {
            list.push(val.clone());
        }
        format!("[{}]", list.join(","))
    }

    // L5 — The Hall of Fame: Synchronize via LWW-CRDT Register
    #[wasm_bindgen]
    pub fn sync_hall_of_fame(&mut self, remote_crdt_json: &str) -> String {
        // Parse incoming key-value mapping of high-fitness strategies mutated by other cells
        if let Ok(parsed) = serde_json::from_str::<HashMap<String, String>>(remote_crdt_json) {
            let mut merged_count = 0;
            for (key, val) in parsed {
                if !self.hall_of_fame.contains_key(&key) {
                    self.hall_of_fame.insert(key, val);
                    merged_count += 1;
                }
            }
            format!("CRDT_SYNC_SUCCESS: Merged {} ancestral crossover markers from distant cells.", merged_count)
        } else {
            "CRDT_SYNC_IDLE: No new genetic matrices found.".to_string()
        }
    }

    // Scout Rewards bonus multiplier
    #[wasm_bindgen]
    pub fn get_scout_multiplier(&self) -> f32 {
        3.0
    }
}
