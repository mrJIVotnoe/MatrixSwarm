use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct VisionCore {}

#[wasm_bindgen]
impl VisionCore {
    #[wasm_bindgen]
    pub fn get_camera_constraints() -> String {
        // "Жесткое ограничение — доступ только к основной камере и только в ультра-широком диапазоне. Никакой фронтальной камеры."
        r#"{ "video": { "facingMode": { "exact": "environment" }, "width": { "ideal": 1920 } } }"#.to_string()
    }

    #[wasm_bindgen]
    pub fn check_camera_access(facing_mode: &str) -> bool {
        if facing_mode == "user" || facing_mode == "front" {
            // Block frontal camera access completely
            return false;
        }
        true
    }

    #[wasm_bindgen]
    pub fn process_metadata(light_level: f64, motion_score: f64) -> String {
        // "Обрабатывай мета-данные о движении и освещенности без передачи видеопотока."
        let mut context = Vec::new();
        if light_level < 50.0 {
            context.push("LOW_LIGHT");
        } else if light_level > 200.0 {
            context.push("BRIGHT_LIGHT");
        } else {
            context.push("NORMAL_LIGHT");
        }
        
        if motion_score > 70.0 {
            context.push("HIGH_MOTION");
        } else if motion_score > 20.0 {
            context.push("MODERATE_MOTION");
        } else {
            context.push("STATIC_MOTION");
        }
        
        context.join(",")
    }
}
