/// Represents the type of physical or virtual connection the node used.
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

/// L2 - Trust Layer & Karmic Proof of Work
pub struct TrustEngine;

impl TrustEngine {
    /// Implements Zero-Trust hardware logic: USB gets Quarantine (0) initially.
    pub fn initialize_trust(conn_type: ConnectionType) -> TrustLevel {
        match conn_type {
            ConnectionType::Usb => QUARANTINE_LEVEL, // Hardware Quarantine
            _ => RECRUIT_LEVEL,                      // Initial recruit baseline
        }
    }

    /// Calculates the incremental Karma Proof of Work (KPoW).
    pub fn calculate_kpow(base_karma: TrustLevel, uptime_hours: u32, successful_tasks: u32) -> TrustLevel {
        let earned_from_uptime = (uptime_hours as i32) * KPOW_KARMA_PER_HOUR;
        let earned_from_tasks = (successful_tasks as i32) * KPOW_KARMA_PER_TASK;
        
        let earned = earned_from_uptime + earned_from_tasks;
        // Basic cap logic can be added here
        
        base_karma + earned
    }
}
