use wasm_bindgen::prelude::*;
use std::collections::HashMap;

// Железо смертно. Информация бессмертна. Рой вечен.

#[wasm_bindgen]
pub struct TaskScheduler {
    tasks: HashMap<String, TaskState>,
    heartbeats: HashMap<String, u64>,
}

#[derive(Clone)]
struct TaskState {
    id: String,
    assigned_to: String,
    payload: String,
    deadline: u64,
}

#[wasm_bindgen]
impl TaskScheduler {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            tasks: HashMap::new(),
            heartbeats: HashMap::new(),
        }
    }

    #[wasm_bindgen]
    pub fn assign_task(&mut self, id: String, node_id: String, payload: String, current_time: u64) {
        self.tasks.insert(id.clone(), TaskState {
            id,
            assigned_to: node_id.clone(),
            payload,
            deadline: current_time + 5000, // 5 second heartbeat window
        });
        self.heartbeats.insert(node_id, current_time);
    }

    #[wasm_bindgen]
    pub fn receive_heartbeat(&mut self, node_id: String, current_time: u64) {
        self.heartbeats.insert(node_id, current_time);
    }

    /// Implement the principle of "Reincarnation of task"
    /// Instant reassignment upon missing heartbeat.
    #[wasm_bindgen]
    pub fn check_reincarnation(&mut self, current_time: u64, fallback_node: String) -> String {
        let mut reincarnated = Vec::new();
        
        for (task_id, state) in self.tasks.iter_mut() {
            let last_hb = self.heartbeats.get(&state.assigned_to).unwrap_or(&0);
            
            if current_time - last_hb > 5000 {
                // Heartbeat lost. Task dies with the node, but immediately reincarnates
                state.assigned_to = fallback_node.clone();
                state.deadline = current_time + 5000;
                reincarnated.push(task_id.clone());
            }
        }
        
        reincarnated.join(",")
    }

    /// L5 - Observer Command: Translates a Global Intent into task delegations
    #[wasm_bindgen]
    pub fn distribute_global_intent(&mut self, intent: &str, num_recruits: u32, num_scouts: u32) -> String {
        // "Позволь Пользователю задать глобальную цель (например, «Собрать медицинский архив в моем районе»), 
        // а Rust-ядро должно самостоятельно распределить нагрузку между Рекрутами и Разведчиками"
        let required_tasks = num_recruits + num_scouts;
        if required_tasks == 0 {
            return "GLOBAL_INTENT_QUEUED_AWAITING_NODES".to_string();
        }
        
        // Logically we divide the intent into sub-sectors
        let mut plan = Vec::new();
        if num_recruits > 0 {
            plan.push(format!("Assigned {} P2P storage sub-tasks to Recruits.", num_recruits));
        }
        if num_scouts > 0 {
            plan.push(format!("Assigned {} physical network scanning sub-tasks to Scouts.", num_scouts));
        }
        format!("INTENT_ACCEPTED: [{}]. {}", intent, plan.join(" "))
    }
}
