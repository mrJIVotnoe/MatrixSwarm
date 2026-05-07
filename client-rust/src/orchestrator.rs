use std::collections::HashMap;
use instant::Instant; // WebAssembly compatible timing

#[derive(Debug, Clone, PartialEq)]
pub enum NodeRole {
    Client,
    Relay,
    Magistrate,
    Sandboxed, // For zero-trust quarantined nodes
}

pub struct Capabilities {
    pub cpu_cores: u32,
    pub ram_mb: u32,
    pub has_sensors: bool,
}

impl Capabilities {
    /// Determines the Swarm role based on Hardware Capabilities and Trust Level.
    pub fn determine_role(&self, trust_level: i32) -> NodeRole {
        if trust_level <= 0 {
            return NodeRole::Sandboxed;
        }
        
        // High-end PC/Server equipment becomes Magistrate or Relay
        if self.cpu_cores >= 4 && self.ram_mb >= 2048 {
            if trust_level >= 1000 {
                return NodeRole::Magistrate;
            } else {
                return NodeRole::Relay;
            }
        }
        
        // Weak or simple nodes (old phones, etc) become Clients/Scouts
        NodeRole::Client
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum TaskStatus {
    Pending,
    Assigned(String), // String holds the Node ID currently processing it
    Completed,
}

pub struct SwarmTask {
    pub id: String,
    pub status: TaskStatus,
    pub last_heartbeat: Option<Instant>,
}

/// L4 - Swarm Logic (The Orchestrator)
pub struct TaskOrchestrator {
    pub tasks: HashMap<String, SwarmTask>,
    pub heartbeat_timeout_ms: u64,
}

impl TaskOrchestrator {
    pub fn new() -> Self {
        Self {
            tasks: HashMap::new(),
            heartbeat_timeout_ms: 10000, // 10 seconds of silence kills the assignment
        }
    }

    pub fn unwrap_or_create(&mut self, task_id: &str) {
        if !self.tasks.contains_key(task_id) {
            self.tasks.insert(task_id.to_string(), SwarmTask {
                id: task_id.to_string(),
                status: TaskStatus::Pending,
                last_heartbeat: None,
            });
        }
    }

    pub fn assign_task(&mut self, task_id: &str, node_id: &str) {
        if let Some(task) = self.tasks.get_mut(task_id) {
            task.status = TaskStatus::Assigned(node_id.to_string());
            task.last_heartbeat = Some(Instant::now());
        }
    }

    pub fn update_heartbeat(&mut self, task_id: &str) {
        if let Some(task) = self.tasks.get_mut(task_id) {
            if let TaskStatus::Assigned(_) = task.status {
                task.last_heartbeat = Some(Instant::now());
            }
        }
    }

    /// Mechanism of "Task Reincarnation".
    /// Iterates through assigned tasks. If physical heartbeats are dropped,
    /// we instantaneously revoke the assignment and reincarnate it to a free Magistrate.
    /// Железо смертно. Информация бессмертна. Рой вечен.
    pub fn reincarnate_dead_tasks(&mut self, available_magistrates: &[String]) -> Vec<String> {
        let now = Instant::now();
        let mut reincarnated = Vec::new();
        let mut curr_magi_idx = 0;

        for (id, task) in self.tasks.iter_mut() {
            if let TaskStatus::Assigned(_) = task.status {
                if let Some(hb) = task.last_heartbeat {
                    if now.duration_since(hb).as_millis() as u64 > self.heartbeat_timeout_ms {
                        // Reincarnation triggered.
                        // Assign to nearest free magistrate if available, otherwise Pending
                        if curr_magi_idx < available_magistrates.len() {
                            let newly_assigned = &available_magistrates[curr_magi_idx];
                            task.status = TaskStatus::Assigned(newly_assigned.clone());
                            curr_magi_idx += 1;
                        } else {
                            task.status = TaskStatus::Pending;
                        }
                        
                        task.last_heartbeat = Some(Instant::now());
                        reincarnated.push(id.clone());
                    }
                }
            }
        }
        
        reincarnated
    }
}
