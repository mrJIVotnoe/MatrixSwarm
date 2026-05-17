use wasm_bindgen::prelude::*;
use std::collections::VecDeque;

#[wasm_bindgen]
pub struct SeismicSensor {
    accelerations: VecDeque<f32>,
    threshold: f32,
    nabat_triggered: bool,
    cell_anomaly_reports: u32,
    latest_signature: String,
}

#[wasm_bindgen]
impl SeismicSensor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SeismicSensor {
        SeismicSensor {
            accelerations: VecDeque::with_capacity(100),
            threshold: 2.5, // 2.5 G is a significant shake
            nabat_triggered: false,
            cell_anomaly_reports: 0,
            latest_signature: String::new(),
        }
    }

    #[wasm_bindgen]
    pub fn set_threshold(&mut self, threshold_g: f32) {
        self.threshold = threshold_g;
    }

    /// Receives micro-vibrations context from the device gyroscope/accelerometer
    #[wasm_bindgen]
    pub fn analyze_vibration(&mut self, accel_g: f32) -> bool {
        self.accelerations.push_back(accel_g);
        if self.accelerations.len() > 100 {
            self.accelerations.pop_front();
        }

        // Trigger 'Nabat' if vibration exceeds threshold suddenly
        if accel_g >= self.threshold {
            self.nabat_triggered = true;
            // Generate a signature of the vibe wave to match against others
            let wave_sum: f32 = self.accelerations.iter().take(10).sum();
            self.latest_signature = format!("SIG_{}_{}", (wave_sum * 100.0) as u32, (accel_g * 100.0) as u32);
            return true;
        }
        false
    }

    #[wasm_bindgen]
    pub fn receive_peer_anomaly(&mut self, signature: &str) -> bool {
        // If the peer's vibration signature is similar to ours, or we just trust the aggregated count
        if !self.latest_signature.is_empty() && signature == self.latest_signature {
            self.cell_anomaly_reports += 1;
        } else if self.latest_signature.is_empty() {
             self.cell_anomaly_reports += 1; // Trusting cell peers
        }

        // Trigger Nabat if 5+ devices in cell report identical/proximal anomaly
        if self.cell_anomaly_reports >= 5 {
            self.nabat_triggered = true;
            return true;
        }
        false
    }

    #[wasm_bindgen]
    pub fn is_nabat_active(&self) -> bool {
        self.nabat_triggered
    }

    #[wasm_bindgen]
    pub fn reset_nabat(&mut self) {
        self.nabat_triggered = false;
    }
}
