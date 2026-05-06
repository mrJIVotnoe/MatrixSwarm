use crate::trust::TrustLevel;

#[derive(Debug, Clone, PartialEq)]
pub enum DeviceType {
    Smartphone,
    Pc,
    Router,
    SmartTv,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AikidoStatus {
    Nomad,
    HardwareAnchor,
    StationaryAsset, // Bot-farm absorbed state
}

pub struct GpsCoord {
    pub lat: f64,
    pub lng: f64,
}

pub struct NodeStats {
    pub device_type: DeviceType,
    pub mobility_score: u32, // 0 to 100
    pub last_gps: Option<GpsCoord>,
    pub status: AikidoStatus,
}

impl NodeStats {
    pub fn new(device_type: DeviceType) -> Self {
        // Hardware anchors inherently don't move. Exclude them from mobility rules.
        let status = match device_type {
            DeviceType::Pc | DeviceType::Router | DeviceType::SmartTv => AikidoStatus::HardwareAnchor,
            DeviceType::Smartphone => AikidoStatus::Nomad,
        };

        Self {
            device_type,
            mobility_score: 50,
            last_gps: None,
            status,
        }
    }

    /// Evaluates Aikido Protocol rules based on GPS updates to detect static bot-farms.
    pub fn evaluate_mobility(&mut self, current_gps: GpsCoord) {
        if self.status == AikidoStatus::HardwareAnchor {
            return; // Not applicable for stationary hardware
        }

        if let Some(ref last) = self.last_gps {
            let distance = calculate_distance(last, &current_gps);
            if distance < 1.0 {
                // Static: decrement score
                self.mobility_score = self.mobility_score.saturating_sub(5);
            } else {
                // Moving: increment score
                self.mobility_score = core::cmp::min(100, self.mobility_score.saturating_add(10));
            }
        }
        
        self.last_gps = Some(current_gps);

        // If a smartphone never moves, it's flagged as a bot farm.
        if self.mobility_score == 0 && self.device_type == DeviceType::Smartphone {
            self.status = AikidoStatus::StationaryAsset;
        } else if self.status == AikidoStatus::StationaryAsset && self.mobility_score > 20 {
            self.status = AikidoStatus::Nomad; // Recovery if it starts moving
        }
    }

    /// Applies Aikido constraints: Returns (effective_karma, has_consensus_voice, forced_heavy_workload)
    pub fn apply_aikido_penalty(&self, current_karma: TrustLevel) -> (TrustLevel, bool, bool) {
        match self.status {
            AikidoStatus::StationaryAsset => {
                // Aikido Absorption:
                // Cap karma, remove consensus right (false), force heavy background workloads (true).
                let capped_karma = core::cmp::min(current_karma, 50);
                (capped_karma, false, true)
            },
            _ => {
                // Normal legitimate node behavior
                (current_karma, true, false)
            }
        }
    }
}

/// Simple haversine-like distance approximation in meters for fast zero-cost execution
fn calculate_distance(pos1: &GpsCoord, pos2: &GpsCoord) -> f64 {
    let d_lat = pos1.lat - pos2.lat;
    let d_lng = pos1.lng - pos2.lng;
    (d_lat * d_lat + d_lng * d_lng).sqrt() * 111000.0
}
