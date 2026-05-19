// Fake pkg for Vite development without cargo
export default async function init() { return; }

export const IdentityCore = {
  forge_passport: (human_entropy) => {
    return {
      seed_phrase: "simulated rust phrase for the testing environment due to compilation limits",
      public_key: "MOCK_KEY",
      node_id: "WASM_MOCK"
    };
  },
  recover_from_seed: (p) => {
    return { seed_phrase: p, public_key: "MOCK", node_id: "WASM_MOCK" };
  },
  soul_migration: (o, n, k) => {
    return { old_node_id: "WASM", new_node_id: "WASM", migrated_karma: k, signature: "SIG" };
  },
  export_legacy_container: (p, k, isGuard) => `ENCRYPTED_LEGACY_CONTAINER[mock]`,
  import_legacy_container: (enc, newPhrase) => ({ original_node_id: "OLD", new_node_id: "NEW", restored_karma: 100, restored_guard_status: true, verification: "SUCCESS" })
};

export const AikidoCore = {
  process_node: (inputObj) => {
    return {
      node_id: inputObj.node_id,
      new_lat: inputObj.curr_lat || inputObj.prev_lat,
      new_lng: inputObj.curr_lng || inputObj.prev_lng,
      mobility_score: inputObj.mobility_score,
      gps_updates_count: inputObj.gps_updates_count + 1,
      karma: inputObj.karma,
      role: "Scout",
      aikido_status: "Nomad",
      untrusted_link_event: inputObj.connection_type === "usb"
    };
  },
  apply_aikido_penalty: (n, c, s) => {
    return { effective_karma: c, voting_weight: 1.0, forced_heavy_compute: false };
  },
  check_cross_caste_consensus: (votes_json) => {
    return true; // Simplified for mock
  },
  validate_mobility: (device_type, dist, time) => {
    return true;
  }
};

export const SwarmNetwork = {

  create_pheromone_pulse: (id, st, k, ts) => {
    return { node_id: id, status: st, karma: k, timestamp: ts };
  },
  parse_pheromone_pulse: (json) => {
    return JSON.parse(json);
  },
  generate_mdns_broadcast: (node_id) => {
    return `MDNS_DISC_REQ::${node_id}::_matrixswarm._udp.local`;
  },
  poll_mdns_peers: () => {
    return ["LOCAL_PEER_A0F9", "LOCAL_PEER_B221"];
  },
  trigger_gossip_discovery: (local_id) => {
      return JSON.stringify([
            {
                "id": "AUSTIN_ROUTER_19X",
                "trust_score": 85.0,
                "power_rating": "Magistrate",
                "device_type": "router",
                "capabilities": "[\"p2p_signaling\", \"bramble_relay\"]"
            },
            {
                "id": "MOBILE_SCOUT_Z",
                "trust_score": 45.0,
                "power_rating": "Scout",
                "device_type": "smartphone",
                "capabilities": "[\"system_ping\"]"
            }
      ]);
  },
  gossip_transmit_signal: (target, payload_json) => {},
  gossip_receive_signals: (local_id) => { return "[]"; }
};

export const EntropyBridge = {
  absorb_human_entropy: (mv, delay, salt) => {
    return "ENTROPY_" + salt + "_" + mv;
  }
};

export const SwarmCore = {
  execute_compute_task: (seed, start, end) => {
    let prime_count = 0;
    const is_prime = (n) => {
      if (n < 2) return false;
      if (n === 2 || n === 3) return true;
      if (n % 2 === 0 || n % 3 === 0) return false;
      let i = 5;
      while (i * i <= n) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
        i += 6;
      }
      return true;
    };
    for (let n = start; n < end; n++) {
      if (is_prime(n)) prime_count++;
    }
    return prime_count;
  }
};

export const AikidoMath = {
  haversine_distance: (l1, lo1, l2, lo2) => {
    const R = 6371.0;
    const dLat = (l2 - l1) * Math.PI / 180;
    const dLon = (lo2 - lo1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const sqrtA = a ** 0.5;
    const sqrt1A = (1 - a) ** 0.5;
    const c = 2 * Math.atan2(sqrtA, sqrt1A);
    return R * c;
  }
};

export const AcousticAnalyzer = {
  detect_ultrasonic_beacon: () => 0.0,
  generate_ultrasonic_marker: (sample_rate, duration_ms, freq) => new Float32Array(),
  encode_acoustic_payload: (payload, sample_rate) => new Float32Array(),
  decode_acoustic_payload: (samples, sample_rate) => "RECOVERED_VIA_SONAR"
};

export const CasteAutonomy = {
  determine_role: (json) => "Drone"
};

export class CrdtRegister {
  constructor() {}
  merge_state(node_id, status, karma, ts) {}
  get_node_state(node_id) { return null; }
  export_state() { return "{}"; }
}

export const HolographicCore = {
  fragment_honey: (data, total_shards, min_shards) => {
    return Array(total_shards).fill(0).map((_, i) => ({ id: i, payload: `frag_${i}:MOCK` }));
  },
  reconstruct_honey: (shards_json) => {
    return "RECONSTRUCTED_HOLOGRAPHIC_DATA";
  },
  distribute_city_scale: (data, castes_json) => {
    return JSON.parse(castes_json).map((caste, i) => ({ caste, role: caste === 'Magistrate' ? 'PRIMARY_ARCHIVE' : 'VOLATILE_SHARD', payload: `mirror_${i}:MOCK` }));
  }
};

export const VisualKinopsis = {
  request_camera_constraints: () => JSON.stringify({ video: { facingMode: { exact: "environment" }, width: { ideal: 1920 } } }),
  analyze_visual_pheromone: (frame_data) => "NORMAL_CONDITIONS",
  generate_visual_pheromone: (status) => new Uint8Array([100, 200, 100, 200]),
  collective_threat_analysis: (logs_json) => {
    const logs = JSON.parse(logs_json);
    const sosCount = logs.filter(l => l === "FLASH_DETECTED_SOS").length;
    return sosCount >= 3 ? "CRITICAL_LOCKDOWN_ZERO_TRUST" : (sosCount > 0 ? "ELEVATED_RISK" : "ALL_CLEAR");
  }
};

export const ReverseStarlink = {
  triangulate_position: (beacons_json) => {
    return "TRIANGULATED:0,0";
  }
};

export const PlanetaryShield = {
  analyze_seismic_activity: (sensor_batch_json, node_location_hash) => {
    return "STABLE";
  }
};

export const GlobalKnowledge = {
  ingest_archive: (archive_name, raw_data_size_mb) => {
    const required_shards = Math.floor(raw_data_size_mb * 1.5);
    return `ZIM_ARCHIVE_${archive_name.toUpperCase()}_SHARDED_INTO_${required_shards}_PIECES`;
  },
  recover_from_abyss: (available_shards, total_shards) => {
    return (available_shards / total_shards >= 0.01) ? "RECOVERY_SUCCESSFUL_VIA_FOUNTAIN_CODES" : "CRITICAL_DATA_LOSS_SEEKING_ACOUSTIC_PEERS";
  },
  pollinate_critical_knowledge: (knowledge_type, node_role) => {
    if (node_role === "Magistrate" || node_role === "Guard") {
      return ["medicine", "survival", "water_purification"].includes(knowledge_type) ? 
        `EXTRACTING_AND_BROADCASTING_${knowledge_type.toUpperCase()}_VIA_ACOUSTIC_NABAT` : "KNOWLEDGE_TYPE_LOW_PRIORITY_FOR_POLLINATION";
    }
    return "ONLY_MAGISTRATES_CAN_POLLINATE";
  }
};

export class TaskScheduler {
  constructor() {
    this.tasks = {};
    this.heartbeats = {};
  }
  assign_task(id, node_id, payload, current_time) {
    this.tasks[id] = { assigned_to: node_id, payload, deadline: current_time + 5000 };
    this.heartbeats[node_id] = current_time;
  }
  receive_heartbeat(node_id, current_time) {
    this.heartbeats[node_id] = current_time;
  }
  check_reincarnation(current_time, fallback_node) {
    let reincarnated = [];
    for (const [task_id, state] of Object.entries(this.tasks)) {
      const last_hb = this.heartbeats[state.assigned_to] || 0;
      if (current_time - last_hb > 5000) {
        state.assigned_to = fallback_node;
        state.deadline = current_time + 5000;
        reincarnated.push(task_id);
      }
    }
    return reincarnated.join(",");
  }
  distribute_global_intent(intent, num_recruits, num_scouts) {
    const required_tasks = num_recruits + num_scouts;
    if (required_tasks === 0) return "GLOBAL_INTENT_QUEUED_AWAITING_NODES";
    let plan = [];
    if (num_recruits > 0) plan.push(`Assigned ${num_recruits} P2P storage sub-tasks to Recruits.`);
    if (num_scouts > 0) plan.push(`Assigned ${num_scouts} physical network scanning sub-tasks to Scouts.`);
    return `INTENT_ACCEPTED: [${intent}]. ${plan.join(" ")}`;
  }
}

export class TrustEngine {
  constructor() {
    this.karmic_score = 0;
    this.is_hardware_verified = false;
    this.is_powered = false;
    this.has_mini_jack = false;
  }
  verify_hardware(signature) {
    if (signature.length > 10) {
      this.is_hardware_verified = true;
      return true;
    }
    return false;
  }
  register_mini_jack(present) {
    this.has_mini_jack = present;
  }
  is_anchor_magistrate_candidate() {
    return this.is_powered && this.get_level() === 4;
  }
  add_karma(amount, role = "Drone") {
    let amt = amount;
    if (this.has_mini_jack && amount > 0) {
      if (role === "Scout") {
         amt += amount / 2;
      } else {
         amt += amount / 4;
      }
    }
    this.karmic_score += Math.floor(amt);
  }
  get_level() {
    if (this.karmic_score < 0) return -1;
    if (!this.is_hardware_verified) return 0;
    if (this.karmic_score < 100) return 1;
    if (this.karmic_score < 1000) return 2;
    if (this.karmic_score < 10000) return 3;
    return 4;
  }
  check_physical_link(isUsbConnected, authorizedPower = false) {
    if (isUsbConnected) {
      if (authorizedPower) {
        this.is_powered = true;
        return false;
      }
      this.is_hardware_verified = false;
      this.is_powered = false;
      return true;
    }
    this.is_powered = false;
    return false;
  }
}

export class MessageQueue {
  constructor() {
    this.queue = [];
  }
  enqueue_message(id, recipient_id, payload, timestamp) {
    this.queue.push({ id, recipient_id, encrypted_payload: "ENCRYPTED["+payload+"]", timestamp });
  }
  flush_for_peer(peer_id) {
    const to_send = [];
    const remaining = [];
    for (const msg of this.queue) {
      if (msg.recipient_id === peer_id || msg.recipient_id === "BROADCAST") to_send.push(msg);
      else remaining.push(msg);
    }
    this.queue = remaining;
    return JSON.stringify(to_send);
  }
  pending_count() {
    return this.queue.length;
  }
}

export class NativeNetworkLayer {
  constructor(node_id) {
    this.node_id = node_id;
  }
  initiate_peer_connection(peer_id, on_signal, on_msg) {
    return;
  }
  broadcast_pheromone(payload) {}
}

export class NativeP2PMesh {
  constructor(local_id) {
    this.local_id = local_id;
  }
  register_data_channel(peer_id, channel, cb) {}
  transmit_pheromone_direct(peer_id, payload) { return true; }
}

export class KarmaCRDT {
  constructor() {
    this.blocks = {};
  }
  add_block(json) { return true; }
  merge_all(sync) { return 0; }
  export_all() { return "[]"; }
  size() { return 0; }
  export_deltas_since(since_ts) { return "[]"; }
  merge_deltas(delta_data) { return 0; }
}

export const GlobalIntentDecomposer = {
  decompose_intent: (intent) => {
    return JSON.stringify([
      { id: "TASK_1", assigned_role: "Magistrate", payload: `Analyze intent: ${intent}` },
      { id: "TASK_2", assigned_role: "Scout", payload: "Observe environment for context." }
    ]);
  }
};

export const VisionCore = {
  get_camera_constraints: () => JSON.stringify({ video: { facingMode: { exact: "environment" }, width: { ideal: 1920 } } }),
  process_metadata: (light_level, motion_score) => "NORMAL_LIGHT,STATIC_MOTION",
};

export const MeshSurrogate = {
  enable_lora_surrogate: () => "LORA_DRIVER_STUB_LOADED: Listening on pseudo-serial...",
  enable_meshtastic_surrogate: () => "MESHTASTIC_BLE_BRIDGE_MOCK_READY",
};

export class ArkManager {
  constructor() {
    this.fragments = {};
    this.zim_registry = {};
    this.cultural_layer = {};
  }
  load_zim_archive(archive_name, file_size) {
    this.zim_registry[archive_name] = "ZIM/Kiwix-Compatible";
    return true;
  }
  read_zim_fragment(topic) {
    if (topic === "ZIM_WIKIPEDIA_SURVIVAL") return "Kiwix ZIM Fragment: [Water Purification Techniques & Basic First Aid]";
    return "Fragment not found in ZIM registry";
  }
  install_retro_app(app_id, package_data) {
    this.cultural_layer[app_id] = "INSTALLED";
  }
  get_installed_apps() {
    return Object.keys(this.cultural_layer).join(",");
  }
  store_fragment(topic, content) {
    this.fragments[topic] = content;
  }
  read_fragment(topic) {
    return this.fragments[topic] || "";
  }
  get_available_knowledge() {
    return [...Object.keys(this.fragments), ...Object.keys(this.zim_registry), ...Object.keys(this.cultural_layer)].join(",");
  }
  pollinate(peer_id) {
    return JSON.stringify({ fragments: this.fragments, culture: this.cultural_layer });
  }
  receive_pollination(payload) {
    let added = 0;
    try {
        const incoming = JSON.parse(payload);
        if (incoming.fragments) {
            for(const k of Object.keys(incoming.fragments)) {
                if(!this.fragments[k]) {
                    this.fragments[k] = incoming.fragments[k];
                    added++;
                }
            }
        }
        if (incoming.culture) {
            for(const k of Object.keys(incoming.culture)) {
                if(!this.cultural_layer[k]) {
                    this.cultural_layer[k] = incoming.culture[k];
                }
            }
        }
    } catch(e) {}
    return added;
  }
}

export class SeismicSensor {
  constructor() {
    this.nabat_triggered = false;
    this.cell_anomaly_reports = 0;
    this.latest_signature = "";
  }
  set_threshold(val) {}
  analyze_vibration(accel_g) {
    if(accel_g >= 2.5) {
      this.nabat_triggered = true;
      this.latest_signature = "SIG_100_250";
      return true;
    }
    return false;
  }
  receive_peer_anomaly(sig) {
      this.cell_anomaly_reports++;
      if(this.cell_anomaly_reports >= 5) {
          this.nabat_triggered = true;
          return true;
      }
      return false;
  }
  is_nabat_active() { return this.nabat_triggered; }
  reset_nabat() { 
      this.nabat_triggered = false; 
      this.cell_anomaly_reports = 0;
  }
}

export class AgentStateMachine {
  constructor() {
    this.state = "INIT";
    this.trust_level_verified = false;
    this.usb_connection_detected = false;
  }
  get_state() { return this.state; }
  verify_trust() { this.trust_level_verified = true; return this.try_transition_ready(); }
  detect_usb(authorized = false) { 
    if (authorized) {
      return; // Do nothing, it's energy communion
    }
    this.usb_connection_detected = true; 
    this.state = "QUARANTINED"; 
  }
  try_transition_ready() {
      if (this.usb_connection_detected) { this.state = "QUARANTINED"; throw new Error("USB breach"); }
      if (this.state === "INIT" || this.state === "RESURRECTING") {
          if (this.trust_level_verified) { this.state = "READY"; return; }
          throw new Error("No trust");
      }
      throw new Error("Invalid state");
  }
  start_running() {
      if (this.state === "READY") { this.state = "RUNNING"; return; }
      throw new Error("Not ready");
  }
  report_failure() {
      if (this.state !== "QUARANTINED" && this.state !== "TERMINATED") this.state = "FAILED";
  }
  degrade() { if(this.state === "RUNNING") this.state = "DEGRADED"; }
  resurrect() {
      if(this.state === "FAILED" || this.state === "DEGRADED") {
          this.state = "RESURRECTING";
          this.trust_level_verified = false;
          return;
      }
      throw new Error("Cannot resurrect");
  }
  terminate() { this.state = "TERMINATED"; }
}

export class CondorCluster {
  constructor() {
    this.tasks = {};
    this.active_nodes = 0;
  }
  register_node(is_powered, karmic_score) {
    if (is_powered || karmic_score > 100) this.active_nodes += 1;
  }
  submit_heavy_task(task_id, payload, chunks) {
    this.tasks[task_id] = { id: task_id, payload, total: chunks, completed: 0 };
    return true;
  }
  process_chunk(task_id) {
    let t = this.tasks[task_id];
    if (t && t.completed < t.total) t.completed += 1;
    return t ? t.completed : 0;
  }
  is_task_complete(task_id) {
    let t = this.tasks[task_id];
    return t ? t.completed >= t.total : false;
  }
  get_active_nodes() { return this.active_nodes; }
}

export class ProprioceptionCore {
  constructor() {}
  update_gps(lat, lng) { return `CELL_MOCK_${lat.toFixed(2)}_${lng.toFixed(2)}`; }
  get_current_cell() { return "CELL_MOCK"; }
  triangulate_via_acoustic_and_ble(peer_id, acoustic_strength, ble_strength) {
     return 100.0 - (acoustic_strength * 0.5 + ble_strength * 0.5);
  }
}

export const MetricsEngine = {
  get_metrics: () => JSON.stringify({ heartbeat_success_rate: 99.5, crdt_sync_latency: 12.3, isolation_breach_attempts: 0 }),
  mock_heartbeat: (success) => {},
  mock_crdt_sync: (latency) => {}
};

export class MessageCRDT {
  constructor() {
    this.messages = [];
  }
  add_message(id, s, r, p, ts) { 
      this.messages.push({id, s, r, p, ts}); 
      this.messages.sort((a,b) => a.ts - b.ts);
  }
  get_messages_for(r) { return "[]"; }
  merge_all(s) {
      try {
          const incoming = JSON.parse(s);
          for (let msg of incoming) {
              if (!this.messages.find(m => m.id === msg.id)) {
                  this.messages.push(msg);
              }
          }
          this.messages.sort((a,b) => a.ts - b.ts);
      } catch(e) {}
  }
  export_all() { return JSON.stringify(this.messages); }
  export_deltas_since(since_ts) { return JSON.stringify(this.messages.filter(m => m.ts > since_ts)); }
  merge_deltas(delta_data) {
      try {
          const incoming = JSON.parse(delta_data);
          let added = 0;
          for (let msg of incoming) {
              if (!this.messages.find(m => m.id === msg.id)) {
                  this.messages.push(msg);
                  added++;
              }
          }
          this.messages.sort((a,b) => a.ts - b.ts);
          return added;
      } catch(e) {}
  }
}
