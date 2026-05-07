use crate::aikido::{DeviceType, AikidoStatus};

/// Represents the type of physical or virtual connection the node used.
#[derive(Debug, Clone, PartialEq)]
pub enum ConnectionType {
    Usb,
    WebRtc,
    Relay,
}

pub type TrustLevel = i32;

pub const QUARANTINE_LEVEL: TrustLevel = 0;
pub const TRAITOR_LEVEL: TrustLevel = -1;
pub const RECRUIT_LEVEL: TrustLevel = 10;
pub const ADEPT_LEVEL: TrustLevel = 100;
pub const MAGISTRATE_LEVEL: TrustLevel = 1000;

pub const KPOW_KARMA_PER_HOUR: i32 = 1;
pub const KPOW_KARMA_PER_TASK: i32 = 2; // For successfully handling micro-tasks / fragments
pub const KARMA_MAX_PER_DAY: i32 = 50;

/// L2 - Trust Layer & Karmic Proof of Work
pub struct TrustEngine;

impl TrustEngine {
    /// Implements Zero-Trust hardware logic: USB gets Quarantine (0) initially.
    pub fn initialize_trust(conn_type: &str) -> TrustLevel {
        if conn_type.eq_ignore_ascii_case("usb") {
            QUARANTINE_LEVEL // Hardware Quarantine
        } else {
            RECRUIT_LEVEL    // Initial recruit baseline
        }
    }

    /// Calculates the incremental Karma Proof of Work (KPoW).
    /// Справедливая меритократия Роя.
    pub fn calculate_kpow(
        base_karma: TrustLevel,
        uptime_hours: u32,
        successful_tasks: u32,
        aikido_status: &AikidoStatus
    ) -> TrustLevel {
        let earned_from_uptime = (uptime_hours as i32) * KPOW_KARMA_PER_HOUR;
        let earned_from_tasks = (successful_tasks as i32) * KPOW_KARMA_PER_TASK;
        
        let mut earned = core::cmp::min(earned_from_uptime + earned_from_tasks, KARMA_MAX_PER_DAY);
        
        match aikido_status {
            AikidoStatus::BotFarmNode => {
                earned = 0; // Bot-farms get zero karma
            },
            AikidoStatus::StableGuardian => {
                // Смартфоны с is_charging == true приравниваются к стационарным узлам
                // и получают бонус к Карме за стабильность (бонус x2 от обычного аптайма).
                earned += (uptime_hours as i32) * KPOW_KARMA_PER_HOUR;
            },
            AikidoStatus::HomeAnchor => {
                // Еще больше бонусов за долгосрочную стационарность
                earned += 20;
            },
            AikidoStatus::HardwareAnchor => {
                // No penalty for static devices.
                // We keep their earned karma intact
            },
            _ => {}
        }
        
        base_karma + earned
    }
}
