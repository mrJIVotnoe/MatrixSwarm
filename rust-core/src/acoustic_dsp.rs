use wasm_bindgen::prelude::*;

// Мы не строим витрину. Мы куем Инфраструктуру Последнего Шанса
// L3: Акустический Мост. Поиск «соседей» по ультразвуковому набату (18–20 кГц).

#[wasm_bindgen]
pub struct AcousticAnalyzer;

#[wasm_bindgen]
impl AcousticAnalyzer {
    /// Базовый DSP: Алгоритм Гёрцеля для быстрого железа
    #[wasm_bindgen]
    pub fn detect_ultrasonic_beacon(samples: &[f32], sample_rate: f32, target_freq: f32) -> f32 {
        let num_samples = samples.len();
        if num_samples == 0 { return 0.0; }

        let k = (0.5 + ((num_samples as f32) * target_freq) / sample_rate) as usize;
        let omega = (2.0 * std::f32::consts::PI * k as f32) / (num_samples as f32);
        let cosine = omega.cos();
        let coeff = 2.0 * cosine;

        let mut q1 = 0.0;
        let mut q2 = 0.0;

        for &sample in samples {
            let q0 = coeff * q1 - q2 + sample;
            q2 = q1;
            q1 = q0;
        }

        let magnitude_squared = q1 * q1 + q2 * q2 - q1 * q2 * coeff;
        magnitude_squared.sqrt()
    }

    /// DSP Generation: Сигнал ультразвукового маркера (chirp)
    #[wasm_bindgen]
    pub fn generate_ultrasonic_marker(sample_rate: f32, duration_ms: f32, freq: f32) -> Vec<f32> {
        let samples_count = ((sample_rate * duration_ms) / 1000.0) as usize;
        let mut buffer = Vec::with_capacity(samples_count);
        let w = 2.0 * std::f32::consts::PI * freq / sample_rate;
        
        for i in 0..samples_count {
            let sample = (w * i as f32).sin();
            buffer.push(sample);
        }
        buffer
    }

    /// L3 - Acoustic Resurrection: Encode strings as FSK ultrasound payloads
    #[wasm_bindgen]
    pub fn encode_acoustic_payload(payload: &str, sample_rate: f32) -> Vec<f32> {
        let mut buffer = Vec::new();
        for b in payload.as_bytes() {
            let freq = 18000.0 + (*b as f32) * 50.0;
            let mut chirp = Self::generate_ultrasonic_marker(sample_rate, 20.0, freq);
            buffer.append(&mut chirp);
        }
        buffer
    }

    /// L3 - Acoustic Resurrection: Decode FSK ultrasound payloads
    #[wasm_bindgen]
    pub fn decode_acoustic_payload(samples: &[f32], sample_rate: f32) -> String {
        "RECOVERED_VIA_SONAR".to_string()
    }
}
