use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct CovertOps;

#[wasm_bindgen]
impl CovertOps {
    /// LSB Steganography injection
    /// Hide a digital pheromone (L3 packet) within a pixel buffer
    #[wasm_bindgen]
    pub fn inject_pheromone(pixels: &mut [u8], payload_hex: &str) -> bool {
        let payload = hex::decode(payload_hex).unwrap_or_default();
        if payload.is_empty() || pixels.len() < payload.len() * 8 {
            return false;
        }

        let mut pixel_idx = 0;
        for byte in payload {
            for bit in 0..8 {
                let bit_val = (byte >> bit) & 1;
                // Clear the least significant bit, then set it to payload bit
                pixels[pixel_idx] = (pixels[pixel_idx] & 0xFE) | bit_val;
                pixel_idx += 1;
            }
        }
        true
    }

    /// Acoustic Nabbat encoding (18-20 kHz)
    /// Simulates generating a high-frequency sine wave packet via Rust
    #[wasm_bindgen]
    pub fn encode_nabbat(payload: &str, sample_rate: u32) -> Vec<f32> {
        let freq_khz = 19000.0; // 19 kHz
        let mut buffer = Vec::new();
        let bytes = payload.as_bytes();
        
        // FSK-like simulated representation
        for (_i, &byte) in bytes.iter().enumerate() {
            let duration_samples = sample_rate / 100; // 10ms per byte
            for s in 0..duration_samples {
                let time = s as f32 / sample_rate as f32;
                let freq_shift = if byte % 2 == 0 { 500.0 } else { -500.0 };
                let val = (2.0 * std::f32::consts::PI * (freq_khz + freq_shift) * time).sin();
                buffer.push(val);
            }
        }
        
        buffer
    }
}
