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
}
