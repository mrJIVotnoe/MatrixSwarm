use std::collections::HashMap;

/// Цифровой Панцирь (Security Shell)
/// "Железо смертно. Информация бессмертна. Рой вечен"
/// Управляет запуском задач (L5) в изолированных песочницах (Web Workers)
/// и контролирует доступ к оборудованию.

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum SystemCapability {
    Camera, // Кинопсис
    Gps,    // Проприоцепция
    Compute,
    Storage,
}

pub struct SignedToken {
    pub target_capability: SystemCapability,
    pub user_signature: String,
    pub expires_at_ms: u64,
}

pub struct WebWorkerSandbox {
    pub worker_id: String,
    pub granted_capabilities: Vec<SystemCapability>,
}

pub struct SecurityShell {
    active_sandboxes: HashMap<String, WebWorkerSandbox>,
}

impl SecurityShell {
    pub fn new() -> Self {
        Self {
            active_sandboxes: HashMap::new(),
        }
    }

    /// Спавнит новый изолированный Web Worker (через WASM) для выполнения L5-задач.
    pub fn spawn_worker(&mut self, worker_id: &str) -> Result<(), &'static str> {
        if self.active_sandboxes.contains_key(worker_id) {
            return Err("Worker already exists");
        }

        // В реальном WASM здесь вызывается `web_sys::Worker::new()`
        // Мы моделируем безопасную изоляцию со снятыми всеми разрешениями (Zero-Trust)
        let sandbox = WebWorkerSandbox {
            worker_id: worker_id.to_string(),
            granted_capabilities: Vec::new(),
        };

        self.active_sandboxes.insert(worker_id.to_string(), sandbox);
        Ok(())
    }

    /// Проверяет права доступа Worker'a к критическим ресурсам.
    fn has_permission(&self, worker_id: &str, cap: &SystemCapability) -> bool {
        if let Some(worker) = self.active_sandboxes.get(worker_id) {
            worker.granted_capabilities.contains(cap)
        } else {
            false
        }
    }

    /// Предоставляет доступ к камере (Кинопсис) и GPS (Проприоцепция) 
    /// ТОЛЬКО через подписанный токен от Пользователя.
    pub fn grant_capability_with_token(
        &mut self,
        worker_id: &str,
        token: &SignedToken,
        current_time_ms: u64,
    ) -> Result<(), &'static str> {
        
        let worker = self.active_sandboxes.get_mut(worker_id).ok_or("Worker not found")?;

        if current_time_ms > token.expires_at_ms {
            return Err("Capability token expired");
        }

        // В реальной системе проверяем token.user_signature через криптографию
        if token.user_signature.is_empty() {
             return Err("Invalid user signature");
        }

        worker.granted_capabilities.push(token.target_capability.clone());
        Ok(())
    }

    pub fn access_camera(&self, worker_id: &str) -> Result<(), &'static str> {
        if self.has_permission(worker_id, &SystemCapability::Camera) {
            Ok(())
        } else {
            Err("Permission Denied: Camera access requires signed token (Кинопсис)")
        }
    }

    pub fn access_gps(&self, worker_id: &str) -> Result<(), &'static str> {
        if self.has_permission(worker_id, &SystemCapability::Gps) {
            Ok(())
        } else {
            Err("Permission Denied: GPS access requires signed token (Проприоцепция)")
        }
    }
}
