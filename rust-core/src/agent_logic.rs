use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentState {
    INIT,
    READY,
    RUNNING,
    DEGRADED,
    FAILED,
    QUARANTINED,
    RESURRECTING,
    TERMINATED,
}

#[wasm_bindgen]
pub struct AgentStateMachine {
    state: AgentState,
    trust_level_verified: bool,
    usb_connection_detected: bool,
}

#[wasm_bindgen]
impl AgentStateMachine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            state: AgentState::INIT,
            trust_level_verified: false,
            usb_connection_detected: false,
        }
    }

    pub fn get_state(&self) -> String {
        format!("{:?}", self.state)
    }

    pub fn verify_trust(&mut self) -> Result<(), JsValue> {
        crate::metrics::track_event("verify_trust");
        self.trust_level_verified = true;
        self.try_transition_ready()
    }

    fn transition_to(&mut self, new_state: AgentState) {
        let trace_id = crate::metrics::get_next_trace_id();
        #[cfg(target_arch = "wasm32")]
        web_sys::console::log_1(&JsValue::from_str(&format!("[{}] State Transition: {:?} -> {:?}", trace_id, self.state, new_state)));
        #[cfg(not(target_arch = "wasm32"))]
        println!("[{}] State Transition: {:?} -> {:?}", trace_id, self.state, new_state);
        self.state = new_state;
    }

    pub fn detect_usb(&mut self) -> Result<(), JsValue> {
        crate::metrics::track_isolation_breach();
        crate::metrics::track_event("usb_detected");
        self.usb_connection_detected = true;
        self.transition_to(AgentState::QUARANTINED);
        Ok(())
    }

    pub fn try_transition_ready(&mut self) -> Result<(), JsValue> {
        if self.usb_connection_detected {
            self.transition_to(AgentState::QUARANTINED);
            return Err(JsValue::from_str("Cannot become ready: UART/USB breach detected. Quarantined."));
        }
        if self.state == AgentState::INIT || self.state == AgentState::RESURRECTING {
            if self.trust_level_verified {
                self.transition_to(AgentState::READY);
                Ok(())
            } else {
                Err(JsValue::from_str("Trust level not verified"))
            }
        } else {
            Err(JsValue::from_str("Invalid state transition to READY"))
        }
    }

    pub fn start_running(&mut self) -> Result<(), JsValue> {
        crate::metrics::track_event("start_running");
        if self.state == AgentState::READY {
            self.transition_to(AgentState::RUNNING);
            Ok(())
        } else {
            Err(JsValue::from_str("Cannot run: not READY"))
        }
    }

    pub fn report_failure(&mut self) {
        crate::metrics::track_event("report_failure");
        if self.state != AgentState::QUARANTINED && self.state != AgentState::TERMINATED {
            self.transition_to(AgentState::FAILED);
        }
    }

    pub fn degrade(&mut self) {
         if self.state == AgentState::RUNNING {
             self.transition_to(AgentState::DEGRADED);
         }
    }

    pub fn resurrect(&mut self) -> Result<(), JsValue> {
         crate::metrics::track_event("resurrect");
         if self.state == AgentState::FAILED || self.state == AgentState::DEGRADED {
             self.transition_to(AgentState::RESURRECTING);
             self.trust_level_verified = false; // requires re-verification
             Ok(())
         } else {
             Err(JsValue::from_str("Can only resurrect from FAILED or DEGRADED state"))
         }
    }

    pub fn terminate(&mut self) {
        self.transition_to(AgentState::TERMINATED);
    }
}

#[derive(Serialize)]
pub struct MicroTask {
    pub id: String,
    pub assigned_role: String,
    pub payload: String,
}

#[wasm_bindgen]
pub struct GlobalIntentDecomposer;

#[wasm_bindgen]
impl GlobalIntentDecomposer {
    /// L5: Observer Command Decomposition
    /// Decompose Natural Language Global Intent into a chain of micro-tasks for Recruits and Scouts
    #[wasm_bindgen]
    pub fn decompose_intent(intent: &str) -> String {
        let mut tasks = Vec::new();
        
        // Very basic LLM-like keyword parsing for task decomposition
        let intent_lower = intent.to_lowercase();
        
        if intent_lower.contains("medic") || intent_lower.contains("heal") || intent_lower.contains("water") || intent_lower.contains("surviv") {
            // Task 1: Medical reference lookup
            tasks.push(MicroTask {
                id: format!("TASK_MED_{}", DateNowFallback()),
                assigned_role: "Magistrate".to_string(),
                payload: "Fetch relevant ZIM fragments from ArkStorage and transmit via Nabat.".to_string(),
            });
            // Task 2: Scouts to listen
            tasks.push(MicroTask {
                id: format!("TASK_LISTEN_{}", DateNowFallback()),
                assigned_role: "Scout".to_string(),
                payload: "Enable aggressive acoustic listening on 18-20kHz for incoming medical pollination.".to_string(),
            });
        }
        else if intent_lower.contains("seismic") || intent_lower.contains("earthquake") {
            tasks.push(MicroTask {
                id: format!("TASK_SEISMIC_{}", DateNowFallback()),
                assigned_role: "Recruit".to_string(),
                payload: "Lower threshold of SeismicSensor to 1.5G and begin immediate aggregation.".to_string(),
            });
            tasks.push(MicroTask {
                id: format!("TASK_ROBOT_{}", DateNowFallback()),
                assigned_role: "Scout".to_string(),
                payload: "Relay any localized seismic anomaly immediately to the cell.".to_string(),
            });
        }
        else {
            // Generic tasks
            tasks.push(MicroTask {
                id: format!("TASK_GEN_{}", DateNowFallback()),
                assigned_role: "Magistrate".to_string(),
                payload: format!("Distribute sub-routines for intent: {}", intent),
            });
        }

        serde_json::to_string(&tasks).unwrap_or_else(|_| "[]".to_string())
    }
}

// Fallback logic for mock IDs
fn DateNowFallback() -> u64 {
    // A Rust standalone timestamp mock
    1000000000
}
