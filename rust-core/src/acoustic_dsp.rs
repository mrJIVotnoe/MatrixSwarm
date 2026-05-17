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
        let freq_0 = 18500.0;
        let freq_1 = 19500.0;
        let baud_ms = 10.0; // 10ms per bit (100 baud)
        
        // Start bit (sync)
        buffer.append(&mut Self::generate_ultrasonic_marker(sample_rate, 20.0, 20000.0));
        
        for b in payload.as_bytes() {
            for i in 0..8 {
                let bit = (b >> i) & 1;
                let freq = if bit == 1 { freq_1 } else { freq_0 };
                buffer.append(&mut Self::generate_ultrasonic_marker(sample_rate, baud_ms, freq));
            }
        }
        buffer
    }

    /// L3 - Acoustic Resurrection: Decode FSK ultrasound payloads
    #[wasm_bindgen]
    pub fn decode_acoustic_payload(samples: &[f32], sample_rate: f32) -> String {
        let freq_0 = 18500.0;
        let freq_1 = 19500.0;
        let baud_ms = 10.0;
        let samples_per_bit = ((sample_rate * baud_ms) / 1000.0) as usize;
        let sync_samples = ((sample_rate * 20.0) / 1000.0) as usize;
        
        if samples_per_bit == 0 || samples.len() < sync_samples { return String::new(); }
        
        let mut text_bytes: Vec<u8> = Vec::new();
        let mut i = 0;
        
        // Find sync pulse (20kHz)
        while i + sync_samples <= samples.len() {
            let window = &samples[i..i+sync_samples];
            let energy = Self::detect_ultrasonic_beacon(window, sample_rate, 20000.0);
            if energy > 1.0 { // threshold
                i += sync_samples;
                break;
            }
            i += samples_per_bit; // jump forward
        }
        
        // Read bits
        while i + samples_per_bit <= samples.len() {
            let mut current_byte = 0u8;
            let mut valid = true;
            for bit_idx in 0..8 {
                if i + samples_per_bit > samples.len() {
                    valid = false;
                    break;
                }
                let window = &samples[i..i+samples_per_bit];
                let energy_0 = Self::detect_ultrasonic_beacon(window, sample_rate, freq_0);
                let energy_1 = Self::detect_ultrasonic_beacon(window, sample_rate, freq_1);
                
                if energy_1 > energy_0 {
                    current_byte |= 1 << bit_idx;
                }
                i += samples_per_bit;
            }
            if valid {
                text_bytes.push(current_byte);
            } else {
                break;
            }
        }
        
        String::from_utf8_lossy(&text_bytes).into_owned()
    }
}
