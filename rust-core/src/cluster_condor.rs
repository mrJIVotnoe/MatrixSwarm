use wasm_bindgen::prelude::*;
use std::collections::HashMap;

#[derive(Clone)]
pub struct CondorTask {
    pub id: String,
    pub payload: String,
    pub total_chunks: u32,
    pub completed_chunks: u32,
}

#[wasm_bindgen]
pub struct CondorCluster {
    tasks: HashMap<String, CondorTask>,
    active_nodes: u32,
}

#[wasm_bindgen]
impl CondorCluster {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            tasks: HashMap::new(),
            active_nodes: 0,
        }
    }

    #[wasm_bindgen]
    pub fn register_node(&mut self, is_powered: bool, karmic_score: i32) {
        // "Тяжелые задачи должны дробиться ... между Магистратами и Стабильными Стражами"
        if is_powered || karmic_score > 100 {
            self.active_nodes += 1;
        }
    }

    #[wasm_bindgen]
    pub fn submit_heavy_task(&mut self, task_id: &str, payload: &str, chunks: u32) -> bool {
        self.tasks.insert(task_id.to_string(), CondorTask {
            id: task_id.to_string(),
            payload: payload.to_string(),
            total_chunks: chunks,
            completed_chunks: 0,
        });
        true
    }

    #[wasm_bindgen]
    pub fn process_chunk(&mut self, task_id: &str) -> u32 {
        if let Some(task) = self.tasks.get_mut(task_id) {
            if task.completed_chunks < task.total_chunks {
                task.completed_chunks += 1;
            }
            return task.completed_chunks;
        }
        0
    }

    #[wasm_bindgen]
    pub fn is_task_complete(&self, task_id: &str) -> bool {
        if let Some(task) = self.tasks.get(task_id) {
            return task.completed_chunks >= task.total_chunks;
        }
        false
    }
    
    #[wasm_bindgen]
    pub fn get_active_nodes(&self) -> u32 {
        self.active_nodes
    }
}
