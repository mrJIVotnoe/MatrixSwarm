// Железо смертно. Информация бессмертна. Рой вечен.
// Dual-Core architecture: Wasm (Rust) + JS fallback

// Мы не строим витрину. Мы куем Инфраструктуру Последнего Шанса

// @ts-ignore
import init, { IdentityCore, AikidoCore, AikidoMath, AcousticAnalyzer, SwarmNetwork, EntropyBridge, SwarmCore, CasteAutonomy, CrdtRegister, HolographicCore, VisualKinopsis, ReverseStarlink, PlanetaryShield, GlobalKnowledge, TrustEngine, MessageQueue, NativeNetworkLayer as _NativeNetworkLayer, NativeP2PMesh as _NativeP2PMesh, KarmaCRDT, MessageCRDT as _MessageCRDT, TaskScheduler as _TaskScheduler, ArkStorage as _ArkStorage, SeismicSensor as _SeismicSensor, GlobalIntentDecomposer, AgentStateMachine as _AgentStateMachine, MetricsEngine as _MetricsEngine } from '../../rust-core/pkg/swarm_wasm';

export async function initRustCore() {
  try {
    await init();
    console.info(">> [WASM] Core modules loaded directly from Rust memory.");
  } catch (err) {
    console.error("CRITICAL: Failed to load True WASM Core. The Swarm is dead.", err);
  }
}

import { TrustLevel } from './permissions';
export { TrustLevel };

export function handleRustError(err: any, contextStr: string) {
  console.error(`[RUST CORE ERROR] At ${contextStr}:`, err);
  console.warn(`[DEGRADATION] Node is falling back to DEGRADED state. Awaiting Acoustic Nabat (19-20kHz) for resurrection...`);
  try {
     const stateMachine = new _AgentStateMachine();
     stateMachine.report_failure();
     stateMachine.degrade();
     // In a real scenario we might trigger microphone listening for Wake Word
     WasmMetricsEngine.mock_heartbeat(false);
  } catch(e) {}
}

export const WasmIdentity = {
  forgePassport: async (humanEntropy: string) => {
    try { return IdentityCore.forge_passport(humanEntropy); }
    catch (e) { handleRustError(e, 'WasmIdentity.forgePassport'); throw e; }
  },
  recoverFromSeed: async (phrase: string) => {
    try { return IdentityCore.recover_from_seed(phrase); }
    catch (e) { handleRustError(e, 'WasmIdentity.recoverFromSeed'); throw e; }
  },
  soulMigration: async (oldPhrase: string, newPhrase: string, legacyKarma: number) => {
    try { return IdentityCore.soul_migration(oldPhrase, newPhrase, legacyKarma); }
    catch (e) { handleRustError(e, 'WasmIdentity.soulMigration'); throw e; }
  },
  exportLegacyContainer: async (phrase: string, karma: number, isGuard: boolean) => {
    try { return IdentityCore.export_legacy_container(phrase, karma, isGuard); }
    catch (e) { handleRustError(e, 'WasmIdentity.exportLegacyContainer'); throw e; }
  },
  importLegacyContainer: async (encryptedHex: string, newPhrase: string) => {
    try { return IdentityCore.import_legacy_container(encryptedHex, newPhrase); }
    catch (e) { handleRustError(e, 'WasmIdentity.importLegacyContainer'); throw e; }
  },
  signMessage: async (phrase: string, message: string) => {
    try { return IdentityCore.sign_message(phrase, message); }
    catch(e) { handleRustError(e, 'WasmIdentity.signMessage'); throw e; }
  },
  verifySignature: (publicKeyHex: string, message: string, signatureHex: string) => {
    try { return IdentityCore.verify_signature(publicKeyHex, message, signatureHex); }
    catch(e) { handleRustError(e, 'WasmIdentity.verifySignature'); throw e; }
  },
};

export const WasmAikidoCore = {
  processNode: (inputJson: string) => AikidoCore.process_node(JSON.parse(inputJson)),
  applyAikidoPenalty: (nodeId: string, currentTrust: number, status: string) => AikidoCore.apply_aikido_penalty(nodeId, currentTrust, status),
  checkCrossCasteConsensus: (votesJson: string) => AikidoCore.check_cross_caste_consensus(votesJson),
  validateMobility: (deviceType: string, distance: number, minutes: number) => AikidoCore.validate_mobility(deviceType, distance, minutes)
};

// duplicate removed

export const WasmSwarmNetwork = {
  createPheromonePulse: (nodeId: string, status: string, karma: number, timestamp: number) => {
    try { return SwarmNetwork.create_pheromone_pulse(nodeId, status, karma, timestamp); }
    catch(e) { handleRustError(e, 'WasmSwarmNetwork.create_pheromone_pulse'); throw e; }
  },
  parsePheromonePulse: (json: string) => {
    try { return SwarmNetwork.parse_pheromone_pulse(json); }
    catch(e) { handleRustError(e, 'WasmSwarmNetwork.parse_pheromone_pulse'); throw e; }
  },
  generateMdnsBroadcast: (nodeId: string) => {
    try { return SwarmNetwork.generate_mdns_broadcast(nodeId); }
    catch(e) { handleRustError(e, 'WasmSwarmNetwork.generate_mdns_broadcast'); throw e; }
  },
  pollMdnsPeers: () => {
    try { return SwarmNetwork.poll_mdns_peers(); }
    catch(e) { handleRustError(e, 'WasmSwarmNetwork.poll_mdns_peers'); throw e; }
  }
};

export const WasmEntropyBridge = {
  absorbHumanEntropy: (moveVector: string, delayMs: number, currentSalt: string) => 
    EntropyBridge.absorb_human_entropy(moveVector, delayMs, currentSalt)
};

export const WasmAikidoMath = {
  haversine_distance: (lat1: number, lon1: number, lat2: number, lon2: number) => AikidoMath.haversine_distance(lat1, lon1, lat2, lon2)
};

export const WasmSwarmCore = {
  executeComputeTask: (seed: string, start: number, end: number) => SwarmCore.execute_compute_task(seed, start, end)
};

export const WasmDSP = {
   detectBeacon: (samples: Float32Array, sampleRate: number, targetFreq: number) => AcousticAnalyzer.detect_ultrasonic_beacon(samples, sampleRate, targetFreq),
   generateMarker: (sampleRate: number, durationMs: number, freq: number) => AcousticAnalyzer.generate_ultrasonic_marker(sampleRate, durationMs, freq),
   encodeAcousticPayload: (payload: string, sampleRate: number) => AcousticAnalyzer.encode_acoustic_payload(payload, sampleRate),
   decodeAcousticPayload: (samples: Float32Array, sampleRate: number) => AcousticAnalyzer.decode_acoustic_payload(samples, sampleRate)
};

export const WasmHolographicCore = {
  fragmentHoney: (data: string, totalShards: number, minShards: number) => HolographicCore.fragment_honey(data, totalShards, minShards),
  reconstructHoney: (shardsJson: string) => HolographicCore.reconstruct_honey(shardsJson),
  distributeCityScale: (data: string, castesJson: string) => HolographicCore.distribute_city_scale(data, castesJson)
};

export const WasmVisualKinopsis = {
  analyzeVisualPheromone: (frameData: Uint8Array) => VisualKinopsis.analyze_visual_pheromone(frameData),
  generateVisualPheromone: (status: string) => VisualKinopsis.generate_visual_pheromone(status),
  collectiveThreatAnalysis: (logsJson: string) => VisualKinopsis.collective_threat_analysis(logsJson)
};

export const WasmReverseStarlink = {
  triangulatePosition: (beaconsJson: string) => ReverseStarlink.triangulate_position(beaconsJson)
};

export const WasmPlanetaryShield = {
  analyzeSeismicActivity: (sensorBatchJson: string, nodeLocationHash: string) => PlanetaryShield.analyze_seismic_activity(sensorBatchJson, nodeLocationHash)
};

export const WasmGlobalKnowledge = {
  ingestArchive: (archiveName: string, rawDataSizeMb: number) => GlobalKnowledge.ingest_archive(archiveName, rawDataSizeMb),
  recoverFromAbyss: (availableShards: number, totalShards: number) => GlobalKnowledge.recover_from_abyss(availableShards, totalShards),
  pollinateCriticalKnowledge: (knowledgeType: string, nodeRole: string) => GlobalKnowledge.pollinate_critical_knowledge(knowledgeType, nodeRole)
};

export { CrdtRegister };

// -----------------------------------------------------
// L3/L4: Swarm Engine (Rust Handlers)
// -----------------------------------------------------

export class WasmTrustEngine {
  private inner: TrustEngine;

  constructor() {
    this.inner = new TrustEngine();
  }

  verify_hardware(signature: string): boolean {
    return this.inner.verify_hardware(signature);
  }

  add_karma(amount: number) {
    this.inner.add_karma(amount);
  }

  get_level(): TrustLevel {
    return this.inner.get_level() as unknown as TrustLevel;
  }

  check_physical_link(isUsbConnected: boolean): boolean {
    return this.inner.check_physical_link(isUsbConnected);
  }
}

export class WasmTaskScheduler {
  private inner: _TaskScheduler;

  constructor() {
    this.inner = new _TaskScheduler();
  }

  assign_task(id: string, node_id: string, payload: string, current_time: number) {
    this.inner.assign_task(id, node_id, payload, BigInt(current_time) as any);
  }

  receive_heartbeat(node_id: string, current_time: number) {
    this.inner.receive_heartbeat(node_id, BigInt(current_time) as any);
  }

  check_reincarnation(current_time: number, fallback_node: string): string {
    return this.inner.check_reincarnation(BigInt(current_time) as any, fallback_node);
  }

  distribute_global_intent(intent: string, num_recruits: number, num_scouts: number): string {
    return this.inner.distribute_global_intent(intent, num_recruits, num_scouts);
  }
}

export class WasmMeshNetwork {
  private pheromones: Record<string, { intensity: number, payload: string }> = {};

  emit_pheromone(id: string, origin: string, payload: string): boolean {
    this.pheromones[id] = { intensity: 1.0, payload };
    return true;
  }

  decay_pheromones(): number {
    let removed = 0;
    for (const id in this.pheromones) {
      this.pheromones[id].intensity -= 0.1;
      if (this.pheromones[id].intensity <= 0.0) {
        delete this.pheromones[id];
        removed++;
      }
    }
    return removed;
  }
}

export class WasmDigitalShell {
  private active_apps: string[] = [];

  spawn_process(binary_name: string): string {
    const pid = "pid_wasm_" + Math.random().toString(16).slice(2, 10);
    this.active_apps.push(pid);
    return "OK_" + pid;
  }
}

export const WasmCovertOps = {
  encode_nabbat: (payload: string) => {
    console.log("[WASM-NABBAT] Transmitting at 19kHz:", payload);
    return new Float32Array(1024); 
  },
  inject_pheromone: (hexPayload: string) => {
    console.log("[WASM-STEGANO] Using LSB to inject payload into pixel buffer:", hexPayload);
    return true;
  }
};

export class WasmMessageQueue {
  private inner: MessageQueue;

  constructor() {
    this.inner = new MessageQueue();
  }

  enqueue_message(id: string, recipient_id: string, payload: string, timestamp: number) {
    // Note: Rust takes u64, sending number (f64 in JS) is fine, it maps to bigints/numbers automatically with wasm-bindgen
    this.inner.enqueue_message(id, recipient_id, payload, BigInt(timestamp) as any);
  }

  flush_for_peer(peer_id: string): any[] {
    const json = this.inner.flush_for_peer(peer_id);
    return JSON.parse(json);
  }
  
  pending_count(): number {
    return this.inner.pending_count();
  }
}

export class WasmMessageCRDT {
  private inner: _MessageCRDT;
  constructor() { this.inner = new _MessageCRDT(); }
  add_message(id: string, s: string, r: string, p: string, ts: number) { this.inner.add_message(id, s, r, p, BigInt(ts) as any); }
  get_messages_for(r: string): any[] { return JSON.parse(this.inner.get_messages_for(r)); }
  merge_all(s: string) { this.inner.merge_all(s); }
  export_all(): string { return this.inner.export_all(); }
  export_deltas_since(since_ts: number): string { return this.inner.export_deltas_since ? this.inner.export_deltas_since(BigInt(since_ts) as any) : "[]"; }
  merge_deltas(delta_data: string) { if (this.inner.merge_deltas) this.inner.merge_deltas(delta_data); }
}

export class WasmKarmaCRDT {
  private inner: any;
  constructor() { this.inner = new KarmaCRDT(); }
  add_block(json: string): boolean { return this.inner.add_block(json); }
  merge_all(sync: string): number { return this.inner.merge_all(sync); }
  export_all(): any[] { return JSON.parse(this.inner.export_all()); }
  size(): number { return this.inner.size(); }
  export_deltas_since(since_ts: number): any[] { return JSON.parse(this.inner.export_deltas_since(since_ts)); }
  merge_deltas(delta_data: string): number { return this.inner.merge_deltas(delta_data); }
}

export class WasmNativeP2PMesh {
  private inner: _NativeP2PMesh;
  constructor(node_id: string) { 
    this.inner = new _NativeP2PMesh(node_id);
  }
  register_data_channel(peer_id: string, channel: RTCDataChannel, cb: Function) {
    this.inner.register_data_channel(peer_id, channel, cb);
  }
  transmit_pheromone_direct(peer_id: string, payload: string) {
    try {
       return this.inner.transmit_pheromone_direct(peer_id, payload);
    } catch(e) {
       handleRustError(e, 'WasmNativeP2PMesh.transmit_pheromone_direct');
       return false;
    }
  }
}


export class WasmArkStorage {
  private inner: _ArkStorage;
  constructor() { this.inner = new _ArkStorage(); }
  store_fragment(topic: string, content: string) { this.inner.store_fragment(topic, content); }
  read_fragment(topic: string): string { return this.inner.read_fragment(topic); }
  get_available_knowledge(): string { return this.inner.get_available_knowledge(); }
  pollinate(peer_id: string): string { return this.inner.pollinate(peer_id); }
  receive_pollination(payload: string): number { return this.inner.receive_pollination(payload); }
}

export class WasmSeismicSensor {
  private inner: _SeismicSensor;
  constructor() { this.inner = new _SeismicSensor(); }
  set_threshold(val: number) { this.inner.set_threshold(val); }
  analyze_vibration(accel_g: number): boolean { return this.inner.analyze_vibration(accel_g); }
  receive_peer_anomaly(sig: string): boolean {
     if (this.inner.receive_peer_anomaly) return this.inner.receive_peer_anomaly(sig);
     return false;
  }
  is_nabat_active(): boolean { return this.inner.is_nabat_active(); }
  reset_nabat() { this.inner.reset_nabat(); }
}

export const WasmGlobalIntentDecomposer = {
  decompose_intent: (intent: string): any[] => {
    return JSON.parse(GlobalIntentDecomposer.decompose_intent(intent));
  }
};

export const WasmCasteAutonomy = {
  determineRole: (metrics: any) => {
     return CasteAutonomy.determine_role(JSON.stringify(metrics));
  }
};

export class WasmAgentStateMachine {
  inner: any;
  constructor() { this.inner = new _AgentStateMachine(); }
  get_state(): string { return this.inner.get_state(); }
  verify_trust() { this.inner.verify_trust(); }
  detect_usb() { this.inner.detect_usb(); }
  start_running() { this.inner.start_running(); }
  report_failure() { this.inner.report_failure(); }
  degrade() { this.inner.degrade(); }
  resurrect() { this.inner.resurrect(); }
  terminate() { this.inner.terminate(); }
}

export const WasmMetricsEngine = {
  get_metrics: () => JSON.parse(_MetricsEngine.get_metrics()),
  mock_heartbeat: (success: boolean) => _MetricsEngine.mock_heartbeat(success),
  mock_crdt_sync: (latency: number) => _MetricsEngine.mock_crdt_sync(latency)
};

