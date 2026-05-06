use crate::trust::TrustLevel;
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum DeviceType {
    Smartphone,
    Pc,
    Router,
    SmartTv,
    Tablet,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AikidoStatus {
    Nomad,
    HardwareAnchor,
    StableGuardian,
    HomeAnchor,
    StaticSuspect,
    BotFarmNode,
}

pub struct GpsCoord {
    pub lat: f64,
    pub lng: f64,
}

pub struct NodeStats {
    pub device_type: DeviceType,
    pub mobility_score: u32, // 0 to 100
    pub last_gps: Option<GpsCoord>,
    pub hours_in_same_cell: u32,
    pub status: AikidoStatus,
}

impl NodeStats {
    pub fn new(device_type: DeviceType) -> Self {
        // Hardware anchors inherently don't move. Exclude them from mobility rules.
        let status = match device_type {
            DeviceType::Pc | DeviceType::Router | DeviceType::SmartTv => AikidoStatus::HardwareAnchor,
            _ => AikidoStatus::Nomad,
        };

        Self {
            device_type,
            mobility_score: 50,
            last_gps: None,
            hours_in_same_cell: 0,
            status,
        }
    }

    /// Evaluates Aikido Protocol rules based on GPS updates to detect static bot-farms.
    /// Implements 'Справедливая меритократия Роя' as defined in PROJECT_CANON.md.
    pub fn evaluate_mobility(&mut self, current_gps: GpsCoord, is_charging: bool, hours_in_same_cell: u32) {
        self.hours_in_same_cell = hours_in_same_cell;

        if let AikidoStatus::HardwareAnchor = self.status {
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

        // Differentiation for Smartphones/Tablets
        if self.mobility_score == 0 {
            if is_charging {
                if self.hours_in_same_cell > 72 {
                    self.status = AikidoStatus::HomeAnchor;
                } else {
                    self.status = AikidoStatus::StableGuardian;
                }
            } else {
                // Needs history check for "gps_updates_count > 10" theoretically,
                // but conceptually:
                if self.hours_in_same_cell > 24 { // Assuming 24h as threshold for simplicity if no gps_update_count
                    self.status = AikidoStatus::BotFarmNode;
                } else {
                    self.status = AikidoStatus::StaticSuspect;
                }
            }
        } else if self.mobility_score > 20 {
            self.status = AikidoStatus::Nomad;
        }
    }

    /// Applies Aikido constraints: Returns (effective_karma, voting_weight, forced_heavy_workload)
    pub fn apply_aikido_penalty(&self, current_karma: TrustLevel) -> (TrustLevel, f32, bool) {
        match self.status {
            AikidoStatus::BotFarmNode => {
                // Aikido Absorption:
                // Cap karma, remove consensus right (0 voting weight), force heavy background workloads (true).
                let capped_karma = core::cmp::min(current_karma, 50);
                (capped_karma, 0.0, true)
            },
            AikidoStatus::StaticSuspect => {
                (current_karma, 0.5, false)
            },
            AikidoStatus::HomeAnchor => {
                (current_karma + 100, 1.0, false)
            },
            _ => {
                // Normal legitimate node behavior (HardwareAnchor, StableGuardian, Nomad)
                (current_karma, 1.0, false)
            }
        }
    }
}

pub struct AcousticSignature {
    pub node_id: String,
    pub audio_pattern_hash: String,
}

pub struct CasteVote {
    pub device_type: DeviceType,
    pub is_positive: bool,
}

pub struct AikidoProtocol;

impl AikidoProtocol {
    /// Acoustic Nabbat (Proximity Check)
    /// If multiple nodes hear the exact same ultrasonic pattern, group them.
    pub fn check_acoustic_proximity(signatures: &[AcousticSignature]) -> HashMap<String, Vec<String>> {
        let mut groups: HashMap<String, Vec<String>> = HashMap::new();
        for sig in signatures {
            groups.entry(sig.audio_pattern_hash.clone())
                .or_insert_with(Vec::new)
                .push(sig.node_id.clone());
        }
        groups
    }

    /// Cross-Caste Consensus
    /// Minimum 20% approval from Magistrates(Pc), Relays(Router), and Scouts(Smartphone).
    pub fn check_cross_caste_consensus(votes: &[CasteVote]) -> bool {
        let mut total_votes: HashMap<DeviceType, u32> = HashMap::new();
        let mut positive_votes: HashMap<DeviceType, u32> = HashMap::new();

        for vote in votes {
            *total_votes.entry(vote.device_type.clone()).or_insert(0) += 1;
            if vote.is_positive {
                *positive_votes.entry(vote.device_type.clone()).or_insert(0) += 1;
            }
        }

        let get_approval = |dtype: &DeviceType| -> f32 {
            let total = *total_votes.get(dtype).unwrap_or(&0) as f32;
            let positive = *positive_votes.get(dtype).unwrap_or(&0) as f32;
            if total > 0.0 {
                positive / total
            } else {
                1.0 // If caste doesn't exist in vote, assume 100% to not block
            }
        };

        let pc_approval = get_approval(&DeviceType::Pc);
        let router_approval = get_approval(&DeviceType::Router);
        let smartphone_approval = get_approval(&DeviceType::Smartphone);

        // Required 20% from each of the 3 major castes
        pc_approval >= 0.2 && router_approval >= 0.2 && smartphone_approval >= 0.2
    }
}

/// Simple haversine-like distance approximation in meters for fast zero-cost execution
fn calculate_distance(pos1: &GpsCoord, pos2: &GpsCoord) -> f64 {
    let d_lat = pos1.lat - pos2.lat;
    let d_lng = pos1.lng - pos2.lng;
    (d_lat * d_lat + d_lng * d_lng).sqrt() * 111000.0
}
