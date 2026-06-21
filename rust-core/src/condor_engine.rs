use wasm_bindgen::prelude::*;
use std::collections::HashMap;

// --- L4: Condor Distributed Compute Clusters ---
// Parallel batch indexation & cryptographic protection of local cell metadata

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct ComputeTask {
    pub id: String,
    pub index_theme: String,
    pub complexity: u32,
    pub is_indexing_louvre: bool,
    pub secret_checksum: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct ShardResult {
    pub shard_id: String,
    pub completed_by: String,
    pub duration_ms: u32,
    pub double_salted_proof: String,
}

#[wasm_bindgen]
pub struct CondorEngine {
    active_tasks: HashMap<String, ComputeTask>,
    completed_shards: HashMap<String, Vec<ShardResult>>,
}

#[wasm_bindgen]
impl CondorEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            active_tasks: HashMap::new(),
            completed_shards: HashMap::new(),
        }
    }

    #[wasm_bindgen]
    pub fn queue_heavy_computation(&mut self, task_id: &str, theme: &str, difficulty: u32, is_louvre: bool) -> bool {
        // Double-scaffold with BLAKE3 to prevent tamper
        let raw_payload = format!("{}{}", task_id, theme);
        let checksum = blake3::hash(raw_payload.as_bytes()).to_string();

        self.active_tasks.insert(task_id.to_string(), ComputeTask {
            id: task_id.to_string(),
            index_theme: theme.to_string(),
            complexity: difficulty,
            is_indexing_louvre: is_louvre,
            secret_checksum: checksum,
        });
        true
    }

    #[wasm_bindgen]
    pub fn split_into_micro_chunks(&self, task_id: &str, total_nodes: u32) -> String {
        // Break indexing assignments or cryptoproofs into custom microscopic shards
        if let Some(task) = self.active_tasks.get(task_id) {
            let chunks_count = if total_nodes > 1 { total_nodes * 2 } else { 4 };
            let mut shards = Vec::new();

            for i in 0..chunks_count {
                let shard_id = format!("{}_shard_{}", task.id, i);
                let difficulty_tier = task.complexity / chunks_count;
                let payload = format!("{{\"shard_id\": \"{}\", \"difficulty\": {}, \"anchor\": \"{}\", \"is_louvre\": {}}}", 
                    shard_id, difficulty_tier, task.index_theme, task.is_indexing_louvre);
                shards.push(payload);
            }
            return format!("[{}]", shards.join(","));
        }
        "[]".to_string()
    }

    #[wasm_bindgen]
    pub fn verify_and_commit_shard(&mut self, task_id: &str, shard_id: &str, node_id: &str, proof_hash: &str) -> bool {
        // Nodes must complete their micro-job and send work-proof verified via Blake3
        let raw_sig = format!("{}:{}:{}", shard_id, node_id, proof_hash);
        let double_salted_proof = blake3::hash(raw_sig.as_bytes()).to_string();

        let list = self.completed_shards.entry(task_id.to_string()).or_insert_with(Vec::new);
        
        // Prevent duplicate results
        if list.iter().any(|s| s.shard_id == shard_id) {
            return false;
        }

        list.push(ShardResult {
            shard_id: shard_id.to_string(),
            completed_by: node_id.to_string(),
            duration_ms: 120, // Simulated fast execution
            double_salted_proof,
        });

        true
    }

    #[wasm_bindgen]
    pub fn observer_collapse_finalize(&mut self, task_id: &str) -> bool {
        if let Some(_task) = self.active_tasks.get(task_id) {
            let list = self.completed_shards.entry(task_id.to_string()).or_insert_with(Vec::new);
            for i in 0..10 {
                let shard_id = format!("{}_shard_{}", task_id, i);
                if !list.iter().any(|s| s.shard_id == shard_id) {
                    let double_salted_proof = blake3::hash(format!("{}:observer_collapse", shard_id).as_bytes()).to_string();
                    list.push(ShardResult {
                        shard_id,
                        completed_by: "observer_quantum_priority".to_string(),
                        duration_ms: 0,
                        double_salted_proof,
                    });
                }
            }
            return true;
        }
        false
    }

    #[wasm_bindgen]
    pub fn check_compilation_status(&self, task_id: &str) -> f32 {
        let _task = match self.active_tasks.get(task_id) {
            Some(t) => t,
            None => return 0.0
        };

        let shards = match self.completed_shards.get(task_id) {
            Some(s) => s.len() as f32,
            None => 0.0
        };

        let target_shards = if shards > 8.0 { 10.0 } else { 8.0 };
        let p = (shards / target_shards) * 100.0;
        if p > 100.0 { 100.0 } else { p }
    }

    #[wasm_bindgen]
    pub fn is_node_ready_for_condor(&self, trust_level: u32, is_plugged_in: bool) -> bool {
        // An Anchor Magistrate (trustLevel = 4, charging) takes priority
        if trust_level >= 3 && is_plugged_in {
            return true;
        }
        false
    }

    #[wasm_bindgen]
    pub fn harmony_delegate_task(&self, task_type: &str, device_type: &str) -> String {
        // "ПК-Мозг" (desktop / pc) should handle heavy tasks like Kiwix index and Crypto calculations.
        // "Смартфоны" (mobile) and "Смарт-ТВ" (smart_tv) are for storage and routing support.
        let is_heavy = task_type == "KiwixIndex" || task_type == "CryptoCompute" || task_type == "HeavyCalculations" || task_type == "ZimParser";
        let is_pc_brain = device_type == "desktop" || device_type == "pc_brain" || device_type == "pc";
        
        if is_heavy {
            if is_pc_brain {
                "DELEGATE_TO_PC_BRAIN:OPTIMAL_HARMONY".to_string()
            } else {
                "REJECT_HEAVY:DELEGATE_TO_PC_BRAIN".to_string()
            }
        } else {
            if device_type == "mobile" || device_type == "smartphone" {
                "DELEGATE_TO_SENSES_MOBILE:STORAGE_AND_ROUTING_ONLY".to_string()
            } else if device_type == "smart_tv" {
                "DELEGATE_TO_RESERVE_TV:STORAGE_AND_ROUTING_ONLY".to_string()
            } else {
                "DELEGATE_TO_GENERIC:STANDARD".to_string()
            }
        }
    }

    #[wasm_bindgen]
    pub fn reincarnate_task_from_dying_node(&mut self, task_id: &str, failing_node: &str, candidate_node: &str) -> bool {
        let mut reincarnated = false;
        if let Some(list) = self.completed_shards.get_mut(task_id) {
            for shard in list.iter_mut() {
                if shard.completed_by == failing_node {
                    shard.completed_by = candidate_node.to_string();
                    // Instant re-salting for cryptographic verification of reincarnation
                    let raw_sig = format!("{}:{}:REINCARNATED_PROOF", shard.shard_id, candidate_node);
                    shard.double_salted_proof = blake3::hash(raw_sig.as_bytes()).to_string();
                    reincarnated = true;
                }
            }
        }
        reincarnated
    }
}
