// Железо смертно. Информация бессмертна. Рой вечен.
// Dual-Core architecture: Wasm (Rust) + JS fallback

// Мы не строим витрину. Мы куем Инфраструктуру Последнего Шанса

// @ts-ignore
import init, { SdpDiscovery, IdentityCore, AikidoCore, AikidoMath, AcousticAnalyzer, SwarmNetwork, EntropyBridge, SwarmCore, CasteAutonomy, CrdtRegister, HolographicCore, VisualKinopsis, ReverseStarlink, PlanetaryShield, GlobalKnowledge, TrustEngine, MessageQueue, NativeNetworkLayer as _NativeNetworkLayer, NativeP2PMesh as _NativeP2PMesh, KarmaCRDT, MessageCRDT as _MessageCRDT, TaskScheduler as _TaskScheduler, ArkManager as _ArkManager, SeismicSensor as _SeismicSensor, GlobalIntentDecomposer, AgentStateMachine as _AgentStateMachine, MetricsEngine as _MetricsEngine, ProprioceptionCore as _ProprioceptionCore, CondorCluster as _CondorCluster, VisionCore as _VisionCore, MeshSurrogate as _MeshSurrogate, ArkStorage as _ArkStorage, CondorEngine as _CondorEngine } from '../../rust-core/pkg/swarm_wasm';

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

export function handleRustError(err: unknown, contextStr: string) {
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

import { WorkerBus } from './worker_bus';

export const WasmIdentity = {
  forgePassport: async (humanEntropy: string) => {
    try { return await WorkerBus.forgePassport(humanEntropy); }
    catch (e) { handleRustError(e, 'WasmIdentity.forgePassport'); throw e; }
  },
  recoverFromSeed: async (phrase: string) => {
    try { return await WorkerBus.recoverPassport(phrase); }
    catch (e) { handleRustError(e, 'WasmIdentity.recoverFromSeed'); throw e; }
  },
  soulMigration: async (oldPhrase: string, newPhrase: string, legacyKarma: number) => {
    try { return await WorkerBus.soulMigration(oldPhrase, newPhrase, legacyKarma); }
    catch (e) { handleRustError(e, 'WasmIdentity.soulMigration'); throw e; }
  },
  exportLegacyContainer: async (phrase: string, karma: number, isGuard: boolean) => {
    try { return await WorkerBus.exportLegacyContainer(phrase, karma, isGuard); }
    catch (e) { handleRustError(e, 'WasmIdentity.exportLegacyContainer'); throw e; }
  },
  importLegacyContainer: async (encryptedHex: string, newPhrase: string) => {
    try { return await WorkerBus.importLegacyContainer(encryptedHex, newPhrase); }
    catch (e) { handleRustError(e, 'WasmIdentity.importLegacyContainer'); throw e; }
  },
  signMessage: async (phrase: string, message: string) => {
    try { return await WorkerBus.signMessage(phrase, message); }
    catch(e) { handleRustError(e, 'WasmIdentity.signMessage'); throw e; }
  },
  verifySignature: async (publicKeyHex: string, message: string, signatureHex: string) => {
    try { return await WorkerBus.verifySignature(publicKeyHex, message, signatureHex); }
    catch(e) { handleRustError(e, 'WasmIdentity.verifySignature'); throw e; }
  },
  deriveHkdfKey: (masterSecret: string, info: string): string => {
    try { return (IdentityCore as any).derive_hkdf_key(masterSecret, info); }
    catch(e) { handleRustError(e, 'WasmIdentity.deriveHkdfKey'); throw e; }
  },
  deriveHkdfKeyAsync: async (masterSecret: string, info: string): Promise<string> => {
    try { return await WorkerBus.deriveHkdfKey(masterSecret, info); }
    catch(e) { handleRustError(e, 'WasmIdentity.deriveHkdfKeyAsync'); throw e; }
  }
};

export const WasmAikidoCore = {
  processNode: (inputJson: string) => AikidoCore.process_node(JSON.parse(inputJson)),
  applyAikidoPenalty: (nodeId: string, currentTrust: number, status: string) => AikidoCore.apply_aikido_penalty(nodeId, currentTrust, status),
  checkCrossCasteConsensus: (votesJson: string) => AikidoCore.check_cross_caste_consensus(votesJson),
  validateMobility: (deviceType: string, distance: number, minutes: number) => AikidoCore.validate_mobility(deviceType, distance, minutes),
  plowSoil: (isActiveRouting: boolean, isActiveSeeding: boolean, currentKarma: number, elapsedHours: number, isPowerfulResource: boolean): any => {
    try { return (AikidoCore as any).plow_soil(isActiveRouting, isActiveSeeding, currentKarma, elapsedHours, isPowerfulResource); }
    catch(e) { handleRustError(e, 'WasmAikidoCore.plowSoil'); throw e; }
  },
  evaluateMobilityAndHarvest: (deviceType: string, distanceMeters: number, elapsedMinutes: number, currentMobilityScore: number, currentKarma: number): any => {
    try { 
      return (AikidoCore as any).evaluate_mobility_and_harvest(deviceType, distanceMeters, elapsedMinutes, currentMobilityScore, currentKarma); 
    }
    catch(e) { 
      // Fallback implementation of evaluate_mobility_and_harvest
      let new_score = currentMobilityScore;
      let new_karma = currentKarma;
      let is_bot_farm = false;
      let cpu_harvested = false;
      let status = "";

      const lowerDevice = deviceType.toLowerCase();
      if (lowerDevice === "smartphone" || lowerDevice === "tablet") {
        if (distanceMeters > 10) {
          new_score = Math.min(100, new_score + 15);
          new_karma = Math.min(1000, new_karma + 5);
          status = `ORGANIC MOVEMENT (FALLBACK): +15.0 Mobility, +5.0 Kinetic Karma. Shift detected: ${distanceMeters.toFixed(1)}m.`;
        } else {
          if (elapsedMinutes >= 1.0) {
            new_score = Math.max(0, new_score - 10);
          }
          if (new_score === 0) {
            is_bot_farm = true;
            cpu_harvested = true;
            status = "STATIONARY SMARTPHONE DETECTED (FALLBACK). CPU power is fully absorbed for Kiwix indexing without Karma reward.";
          } else {
            status = "Stationary Mobile Node. Decreasing mobility index.";
          }
        }
      } else {
        status = "Fixed Infrastructure Anchor. Operational status nominal.";
      }

      return {
        new_mobility_score: new_score,
        new_karma,
        is_bot_farm,
        cpu_harvested,
        status,
      };
    }
  }
};

class KiwixZimReaderFallback {
  private articles: any[] = [
    {
      url: "A/medicine_emergency.html",
      title: "Экстренная Медицина в Сотах",
      content: "Первая помощь при травмах: остановить кровотечение с помощью жгута, наложить давящую повязку. Антисептики: спирт, хлоргексидин."
    },
    {
      url: "A/water_filter.html",
      title: "Фильтрация Воды в Экстремальных Условиях",
      content: "Очистка воды: песчаный фильтр, древесный угля, кипячение. Использовать ультразвуковые сенсоры для дезинфекции мелкой взвеси."
    },
    {
      url: "A/cbrn_defense.html",
      title: "Радиационная и Химическая Защита (ЯДРО)",
      content: "При обнаружении угрозы: укрыться в герметичном подвале. Использовать бытовые счетчики Гейгера. Калий йодид при выбросах радиации."
    },
    {
      url: "A/mesh_routing.html",
      title: "Развертывание Mesh Сетей (Bramble Protocol)",
      content: "Настройка ad-hoc соединений. Пакеты «Мёда» передаются между смартфонами напрямую через WebRTC и mDNS без использования DNS и Интернета."
    }
  ];

  parse_zim_header(bytes: Uint8Array) {
    if (bytes.length < 40) throw new Error("ZIM file is too small to contain valid header.");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = view.getUint32(0, true);
    const version = view.getUint16(4, true);
    const article_count = view.getUint32(22, true);
    const index_position = 80;

    const uuidParts: string[] = [];
    for (let i = 6; i < 22; i++) {
      if (i < bytes.length) {
        uuidParts.push(bytes[i].toString(16).padStart(2, '0'));
      }
    }
    const uuid = uuidParts.join("-");

    return {
      magic,
      version,
      uuid,
      article_count: article_count > 0 ? article_count : 4,
      index_position
    };
  }

  add_article(url: string, title: string, content: string) {
    this.articles.push({ url, title, content });
  }

  search(query: string) {
    const queryLower = query.toLowerCase();
    const matches: { score: number, article: any }[] = [];
    
    for (const art of this.articles) {
      const titleLower = art.title.toLowerCase();
      const contentLower = art.content.toLowerCase();
      let score = 0;
      
      if (titleLower.includes(queryLower)) score += 10;
      if (contentLower.includes(queryLower)) score += 3;
      
      if (score > 0) {
        matches.push({ score, article: art });
      }
    }
    
    matches.sort((a, b) => b.score - a.score);
    return matches.map(m => m.article);
  }
}

class NativeMeshNetworkFallback {
  private pheromones: Map<string, any> = new Map();
  private nodes: Map<string, any> = new Map();
  private acoustic_neighbors: Map<string, boolean> = new Map();
  private honey_queue: any[] = [];

  enqueue_honey(message_id: string, sender: string, recipient: string, encrypted_payload: string, timestamp: number) {
    this.honey_queue.push({
      message_id,
      sender_id: sender,
      recipient_id: recipient,
      encrypted_payload,
      is_delivered: false,
      timestamp
    });
  }

  exchange_honey(sender_id: string, recipient_id: string) {
    const exchangeable_packets: any[] = [];
    for (const packet of this.honey_queue) {
      if (!packet.is_delivered && (packet.recipient_id === recipient_id || packet.recipient_id === "BROADCAST")) {
        packet.is_delivered = true;
        exchangeable_packets.push({ ...packet });
      }
    }
    return exchangeable_packets;
  }

  get_sleeping_honey_count() {
    return this.honey_queue.filter(p => !p.is_delivered).length;
  }

  emit_pheromone(id: string, origin: string, payload: string) {
    this.pheromones.set(id, { id, origin_id: origin, intensity: 1.0, payload_l3: payload });
    return true;
  }

  decay_pheromones() {
    let decay_count = 0;
    for (const [id, value] of this.pheromones.entries()) {
      value.intensity -= 0.1;
      if (value.intensity <= 0.0) {
        this.pheromones.delete(id);
        decay_count++;
      }
    }
    return decay_count;
  }

  register_heartbeat(node_id: string, current_time: number) {
    this.nodes.set(node_id, { last_heartbeat: current_time });
  }

  register_acoustic_handshake(node_id: string, success: boolean) {
    this.acoustic_neighbors.set(node_id, success);
  }

  is_physical_neighbor(node_id: string) {
    return this.acoustic_neighbors.get(node_id) || false;
  }

  get_acoustic_trust_level(node_id: string) {
    return this.is_physical_neighbor(node_id) ? 3 : 1;
  }

  greet_federated_magistrate(magistrate_id: string, cell_id: string): string {
    return `L3_FEDERATION_ESTABLISHED: Magistrate ${magistrate_id} in Cell ${cell_id} linked via federated bridge. No central servers required.`;
  }

  route_honey_packet(
    message_id: string,
    sender_id: string,
    recipient_id: string,
    encrypted_payload: string,
    is_recipient_known_direct: boolean,
    anchor_magistrate_id: string,
    timestamp: number
  ): string {
    if (is_recipient_known_direct) {
      this.enqueue_honey(message_id, sender_id, recipient_id, encrypted_payload, timestamp);
      return "ROUTE_DIRECT_L2: Honey packet routed directly using physical local cell channels.";
    } else {
      this.enqueue_honey(message_id, sender_id, anchor_magistrate_id, encrypted_payload, timestamp);
      return `ROUTE_FEDERATED_L3: Distant node. Encrypted payload ('Honey') relayed to Anchor Magistrate (${anchor_magistrate_id}).`;
    }
  }
}

// Dynamically bind to WASM modules when available, defaulting to top-bracket JS fallbacks
let KiwixZimReaderClass: any = KiwixZimReaderFallback;
let NativeMeshNetworkClass: any = NativeMeshNetworkFallback;

try {
  // @ts-ignore
  import('../../rust-core/pkg/swarm_wasm').then((m: any) => {
    if (m.KiwixZimReader) {
      KiwixZimReaderClass = m.KiwixZimReader;
      console.info("[WASM BRIDGE] Bound KiwixZimReader direct to WebAssembly Core.");
    }
    if (m.MeshNetwork) {
      NativeMeshNetworkClass = m.MeshNetwork;
      console.info("[WASM BRIDGE] Bound MeshNetwork direct to WebAssembly Core.");
    }
  }).catch(() => {});
} catch(e) {}

export { KiwixZimReaderClass as KiwixZimReader, NativeMeshNetworkClass as NativeMeshNetwork };

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
  requestCameraConstraints: () => VisualKinopsis.request_camera_constraints(),
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

export const WasmSdpDiscovery = {
  encodeSdpToQr: (nodeId: string, sdpType: string, sdpRaw: string): string => 
    SdpDiscovery.encode_sdp_to_qr(nodeId, sdpType, sdpRaw),
  decodeSdpFromQr: (qrPayload: string): any => 
    SdpDiscovery.decode_sdp_from_qr(qrPayload),
  scanLocalMdnsPeers: (): string => 
    SdpDiscovery.scan_local_mdns_peers()
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

  add_karma(amount: number, role: string = "Drone") {
    if (this.inner.add_karma) this.inner.add_karma(amount, role);
  }

  get_level(): TrustLevel {
    return this.inner.get_level() as unknown as TrustLevel;
  }

  register_mini_jack(present: boolean) {
    if (this.inner.register_mini_jack) this.inner.register_mini_jack(present);
  }

  register_acoustic_sync(active: boolean) {
    if (this.inner.register_acoustic_sync) this.inner.register_acoustic_sync(active);
  }

  is_scout_vanguard(): boolean {
    if (this.inner.is_scout_vanguard) return this.inner.is_scout_vanguard();
    return false;
  }

  check_physical_link(isUsbConnected: boolean, authorizedPower: boolean = false): boolean {
    if (this.inner.check_physical_link) return this.inner.check_physical_link(isUsbConnected, authorizedPower);
    return false;
  }

  is_anchor_magistrate_candidate(): boolean {
    if (this.inner.is_anchor_magistrate_candidate) return this.inner.is_anchor_magistrate_candidate();
    return false;
  }
}

export class WasmTaskScheduler {
  private inner: _TaskScheduler;

  constructor() {
    this.inner = new _TaskScheduler();
  }

  assign_task(id: string, node_id: string, payload: string, current_time: number) {
    this.inner.assign_task(id, node_id, payload, BigInt(current_time) as unknown as number);
  }

  receive_heartbeat(node_id: string, current_time: number) {
    this.inner.receive_heartbeat(node_id, BigInt(current_time) as unknown as number);
  }

  check_reincarnation(current_time: number, fallback_node: string): string {
    return this.inner.check_reincarnation(BigInt(current_time) as unknown as number, fallback_node);
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
    this.inner.enqueue_message(id, recipient_id, payload, BigInt(timestamp) as unknown as number);
  }

  flush_for_peer(peer_id: string): unknown[] {
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
  add_message(id: string, s: string, r: string, p: string, ts: number) { this.inner.add_message(id, s, r, p, BigInt(ts) as unknown as number); }
  get_messages_for(r: string): unknown[] { return JSON.parse(this.inner.get_messages_for(r)); }
  merge_all(s: string) { this.inner.merge_all(s); }
  export_all(): string { return this.inner.export_all(); }
  export_deltas_since(since_ts: number): string { return this.inner.export_deltas_since ? this.inner.export_deltas_since(BigInt(since_ts) as unknown as number) : "[]"; }
  merge_deltas(delta_data: string) { if (this.inner.merge_deltas) this.inner.merge_deltas(delta_data); }
}

export class WasmKarmaCRDT {
  private inner: KarmaCRDT;
  constructor() { this.inner = new KarmaCRDT(); }
  add_block(json: string): boolean { return this.inner.add_block(json); }
  merge_all(sync: string): number { return this.inner.merge_all(sync); }
  export_all(): unknown[] { return JSON.parse(this.inner.export_all()); }
  size(): number { return this.inner.size(); }
  export_deltas_since(since_ts: number): unknown[] { return JSON.parse(this.inner.export_deltas_since(since_ts)); }
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
       // Queued offline or connection broken
       return false;
    }
  }
  flush_offline_queue(peer_id: string): number {
    try {
       if (this.inner.flush_offline_queue) {
           return this.inner.flush_offline_queue(peer_id);
       }
    } catch(e) {}
    return 0;
  }
}


interface ArkManagerInterface {
  store_fragment(topic: string, content: string): void;
  read_fragment(topic: string): string;
  get_available_knowledge(): string;
  pollinate(peer_id: string): string;
  receive_pollination(payload: string): number;
  load_zim_archive?(archive_name: string, file_size: number): boolean;
  read_zim_fragment?(topic: string): string;
  install_retro_app?(app_id: string, package_data: string): void;
  get_installed_apps?(): string;
}

interface CondorClusterInterface {
  register_node(is_powered: boolean, karmic_score: number): boolean;
  submit_heavy_task(task_id: string, payload: string, chunks: number): boolean;
  process_chunk(task_id: string): number;
  is_task_complete(task_id: string): boolean;
  get_active_nodes(): number;
}

interface ProprioceptionCoreInterface {
  update_gps(lat: number, lng: number): string;
  get_current_cell(): string | undefined;
  triangulate_via_acoustic_and_ble?(peer_id: string, acoustic_strength: number, ble_strength: number): number;
  register_shared_cell?(peer_id: string, cell_id: string, via_channel: string): boolean;
  get_known_mesh_cells_json?(): string;
}

export class WasmArkManager {
  private inner: ArkManagerInterface;
  constructor() { this.inner = new _ArkManager() as unknown as ArkManagerInterface; }
  store_fragment(topic: string, content: string) { this.inner.store_fragment(topic, content); }
  read_fragment(topic: string): string { return this.inner.read_fragment(topic); }
  get_available_knowledge(): string { return this.inner.get_available_knowledge(); }
  pollinate(peer_id: string): string { return this.inner.pollinate(peer_id); }
  receive_pollination(payload: string): number { return this.inner.receive_pollination(payload); }
  load_zim_archive(archive_name: string, file_size: number): boolean { 
    if (this.inner.load_zim_archive) return this.inner.load_zim_archive(archive_name, file_size);
    return false;
  }
  read_zim_fragment(topic: string): string {
    if (this.inner.read_zim_fragment) return this.inner.read_zim_fragment(topic);
    return "";
  }
  install_retro_app(app_id: string, package_data: string) {
    if (this.inner.install_retro_app) this.inner.install_retro_app(app_id, package_data);
  }
  get_installed_apps(): string {
    if (this.inner.get_installed_apps) return this.inner.get_installed_apps();
    return "";
  }
}

export class WasmCondorCluster {
  private inner: CondorClusterInterface;
  constructor() { this.inner = new _CondorCluster() as unknown as CondorClusterInterface; }
  register_node(is_powered: boolean, karmic_score: number) { return this.inner.register_node(is_powered, Math.floor(karmic_score)); }
  submit_heavy_task(task_id: string, payload: string, chunks: number): boolean {
    return this.inner.submit_heavy_task(task_id, payload, chunks);
  }
  process_chunk(task_id: string): number { return this.inner.process_chunk(task_id); }
  is_task_complete(task_id: string): boolean { return this.inner.is_task_complete(task_id); }
  get_active_nodes(): number { return this.inner.get_active_nodes(); }
}

export class WasmProprioceptionCore {
  private inner: ProprioceptionCoreInterface;
  constructor() { this.inner = new _ProprioceptionCore() as unknown as ProprioceptionCoreInterface; }
  update_gps(lat: number, lng: number): string {
    return this.inner.update_gps(lat, lng);
  }
  get_current_cell(): string | undefined {
    return this.inner.get_current_cell();
  }
  triangulate_via_acoustic_and_ble(peer_id: string, acoustic_strength: number, ble_strength: number): number {
    if (this.inner.triangulate_via_acoustic_and_ble) return this.inner.triangulate_via_acoustic_and_ble(peer_id, acoustic_strength, ble_strength);
    return 100.0;
  }
  register_shared_cell(peer_id: string, cell_id: string, via_channel: string): boolean {
    if (this.inner.register_shared_cell) return this.inner.register_shared_cell(peer_id, cell_id, via_channel);
    return false;
  }
  get_known_mesh_cells_json(): string {
    if (this.inner.get_known_mesh_cells_json) return this.inner.get_known_mesh_cells_json();
    return "[]";
  }
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
  decompose_intent: (intent: string): unknown[] => {
    return JSON.parse(GlobalIntentDecomposer.decompose_intent(intent));
  }
};

interface SystemMetrics {
  cpu_cores: number;
  ram_gb: number;
  is_plugged_in: boolean;
  device_type: string;
  has_gps: boolean;
  battery_level: number;
}

export const WasmCasteAutonomy = {
  determineRole: (metrics: SystemMetrics) => {
     return CasteAutonomy.determine_role(JSON.stringify(metrics));
  },
  calculateKarmaMultiplier: (has_mini_jack: boolean, is_throttling: boolean, condor_synced: boolean): number => {
      if (CasteAutonomy.calculate_karma_multiplier) {
          return CasteAutonomy.calculate_karma_multiplier(has_mini_jack, is_throttling, condor_synced);
      }
      return 1.0;
  }
};

export class WasmAgentStateMachine {
  inner: _AgentStateMachine;
  constructor() { this.inner = new _AgentStateMachine(); }
  get_state(): string { return this.inner.get_state(); }
  verify_trust() { this.inner.verify_trust(); }
  detect_usb(authorized: boolean = false) { this.inner.detect_usb(authorized); }
  start_running() { this.inner.start_running(); }
  report_failure() { this.inner.report_failure(); }
  degrade() { this.inner.degrade(); }
  resurrect() { this.inner.resurrect(); }
  terminate() { this.inner.terminate(); }
}

export const GlobalAgentState = new WasmAgentStateMachine();

export const WasmMetricsEngine = {
  get_metrics: () => JSON.parse(_MetricsEngine.get_metrics()),
  mock_heartbeat: (success: boolean) => _MetricsEngine.mock_heartbeat(success),
  mock_crdt_sync: (latency: number) => _MetricsEngine.mock_crdt_sync(latency)
};

export const WasmVisionCore = {
  get_camera_constraints: () => JSON.parse(_VisionCore.get_camera_constraints()),
  process_metadata: (light: number, motion: number) => _VisionCore.process_metadata(light, motion)
};

export const WasmMeshSurrogate = {
  enable_lora: () => _MeshSurrogate.enable_lora_surrogate(),
  enable_meshtastic: () => _MeshSurrogate.enable_meshtastic_surrogate()
};

export class WasmArkStorage {
  private inner: any;
  constructor() {
    this.inner = new _ArkStorage();
  }
  parse_raw_zim_header(buffer: Uint8Array): string {
    return this.inner.parse_raw_zim_header(buffer);
  }
  get_article_by_topic(id: string): string {
    return this.inner.get_article_by_topic(id);
  }
  search_articles(query: string): string {
    return this.inner.search_articles(query);
  }
  get_metadata(): string {
    return this.inner.get_metadata();
  }
}

export class WasmCondorEngine {
  private inner: any;
  constructor() {
    this.inner = new _CondorEngine();
  }
  queue_heavy_computation(task_id: string, theme: string, difficulty: number, is_louvre: boolean): boolean {
    return this.inner.queue_heavy_computation(task_id, theme, difficulty, is_louvre);
  }
  split_into_micro_chunks(task_id: string, total_nodes: number): string {
    return this.inner.split_into_micro_chunks(task_id, total_nodes);
  }
  verify_and_commit_shard(task_id: string, shard_id: string, node_id: string, proof_hash: string): boolean {
    return this.inner.verify_and_commit_shard(task_id, shard_id, node_id, proof_hash);
  }
  observer_collapse_finalize(task_id: string): boolean {
    return this.inner.observer_collapse_finalize ? this.inner.observer_collapse_finalize(task_id) : true;
  }
  check_compilation_status(task_id: string): number {
    return this.inner.check_compilation_status(task_id);
  }
  is_node_ready_for_condor(trust_level: number, is_plugged_in: boolean): boolean {
    return this.inner.is_node_ready_for_condor(trust_level, is_plugged_in);
  }
  reincarnate_task_from_dying_node(task_id: string, failing_node: string, candidate_node: string): boolean {
    if (this.inner.reincarnate_task_from_dying_node) {
      return this.inner.reincarnate_task_from_dying_node(task_id, failing_node, candidate_node);
    }
    return false;
  }
}

// 🧬 PROTOCOL GENEVA: GENETIC EVOLUTION (v9.2) - Pure TypeScript Core Mirror Fallback
export class GenevaPacket {
  seq: number;
  ack: number;
  flags: string;
  payload: string;
  fragment_offset: number = 0;
  is_tampered: boolean = false;
  is_duplicate: boolean = false;
  is_dropped: boolean = false;

  constructor(seq: number, ack: number, flags: string, payload: string) {
    this.seq = seq;
    this.ack = ack;
    this.flags = flags;
    this.payload = payload;
  }
}

export class GenevaStrategy {
  id: number;
  name: string;
  action_type: string;
  target_flag: string;
  split_size: number;
  is_tcb_desync: boolean;
  fitness: number = 0.0;
  generation: number = 1;

  constructor(id: number, name: string, action_type: string, target_flag: string, split_size: number, is_tcb_desync: boolean) {
    this.id = id;
    this.name = name;
    this.action_type = action_type;
    this.target_flag = target_flag;
    this.split_size = split_size;
    this.is_tcb_desync = is_tcb_desync;
  }
}

export class GenevaEngine {
  private strategies: GenevaStrategy[];
  private generation: number = 1;
  private hall_of_fame: Record<string, string> = {};

  constructor() {
    this.strategies = [
      new GenevaStrategy(1, "TCP-Desync-ACK", "action-manipulation", "SYN-ACK", 0, true),
      new GenevaStrategy(2, "Fragment-Sdp-Signaling", "fragment", "ACK", 16, false),
      new GenevaStrategy(3, "DPI-Spoof-DuplicateRst", "duplicate", "SYN", 0, true),
      new GenevaStrategy(4, "Silent-Drop-Fin", "drop", "RST", 0, false)
    ];
    this.strategies[0].fitness = 45.0;
    this.strategies[1].fitness = 60.0;
    this.strategies[2].fitness = 30.0;
    this.strategies[3].fitness = 15.0;
  }

  primitive_drop(packet: GenevaPacket): GenevaPacket {
    return { ...packet, is_dropped: true };
  }

  primitive_tamper(packet: GenevaPacket, new_flags: string, increment_seq: number): GenevaPacket {
    return { ...packet, flags: new_flags, seq: packet.seq + increment_seq, is_tampered: true };
  }

  primitive_duplicate(packet: GenevaPacket): GenevaPacket[] {
    const p1 = { ...packet };
    const p2 = { ...packet, is_duplicate: true, seq: packet.seq + 1 };
    return [p1, p2];
  }

  primitive_fragment(packet: GenevaPacket, chunk_size: number): GenevaPacket[] {
    const fragments: GenevaPacket[] = [];
    const payloadStr = packet.payload || "";
    if (!payloadStr) {
      fragments.push({ ...packet });
      return fragments;
    }
    const size = chunk_size === 0 ? 8 : chunk_size;
    let offset = 0;
    let seq_offset = 0;
    for (let i = 0; i < payloadStr.length; i += size) {
      const chunk = payloadStr.substring(i, i + size);
      const frag = new GenevaPacket(packet.seq + seq_offset, packet.ack, offset === 0 ? packet.flags : "ACK", chunk);
      frag.fragment_offset = offset;
      fragments.push(frag);
      offset += chunk.length;
      seq_offset += chunk.length;
    }
    return fragments;
  }

  evolve_generation(): string {
    this.generation += 1;
    
    // Keep best 2 parents
    this.strategies.sort((a, b) => b.fitness - a.fitness);
    const offspring: GenevaStrategy[] = [];
    const p1 = this.strategies[0];
    const p2 = this.strategies[1];
    
    offspring.push({ ...p1 });
    offspring.push({ ...p2 });

    // Create crossover Hybrid
    const hybrid = new GenevaStrategy(
      this.strategies.length + 1,
      `Hybrid-${p1.name}-${p2.name}`,
      p1.action_type,
      p2.target_flag,
      p1.split_size > 0 ? p1.split_size : p2.split_size,
      p1.is_tcb_desync || p2.is_tcb_desync
    );
    hybrid.fitness = (p1.fitness + p2.fitness) / 2;
    hybrid.generation = this.generation;

    // Mutation logic
    if (this.generation % 2 === 0) {
      hybrid.action_type = "tamper";
      hybrid.is_tcb_desync = true;
      hybrid.name += "-Mutated-Desync";
    } else {
      hybrid.action_type = "fragment";
      hybrid.split_size = hybrid.split_size === 0 ? 12 : hybrid.split_size + 4;
      hybrid.name += "-Mutated-Frag";
    }
    offspring.push(hybrid);

    // Add a fresh explorer
    const explorer = new GenevaStrategy(
      this.strategies.length + 2,
      `Scout-Explorer-G${this.generation}`,
      this.generation % 3 === 0 ? "drop" : (this.generation % 3 === 1 ? "duplicate" : "tamper"),
      this.generation % 2 === 0 ? "RST" : "SYN",
      0,
      this.generation % 4 === 0
    );
    explorer.fitness = 10 + (this.generation * 17) % 30;
    explorer.generation = this.generation;
    offspring.push(explorer);

    this.strategies = offspring;
    return `GENEVA_EVOLUTION_COMPLETE: Swarm Generation ${this.generation} compiled. Parent fitness landscapes intersected.`;
  }

  evaluate_fitness(strategy_name: string, webrtc_speed_ms: number, kiwix_success: boolean): number {
    let final_fitness = 0;
    if (webrtc_speed_ms > 0.1 && webrtc_speed_ms < 5000) {
      final_fitness += (5000 - webrtc_speed_ms) / 50;
    } else if (webrtc_speed_ms <= 0.1) {
      final_fitness += 10;
    }
    if (kiwix_success) {
      final_fitness += 50;
    }

    for (const s of this.strategies) {
      if (s.name === strategy_name) {
        s.fitness = final_fitness;
        break;
      }
    }

    if (final_fitness > 65) {
      this.hall_of_fame[strategy_name] = JSON.stringify({
        name: strategy_name,
        fitness: final_fitness,
        generation: this.generation
      });
    }

    return final_fitness;
  }

  get_strategies_json(): string {
    return JSON.stringify(this.strategies);
  }

  get_hall_of_fame_json(): string {
    const values = Object.values(this.hall_of_fame);
    return `[${values.join(",")}]`;
  }

  sync_hall_of_fame(remote_crdt_json: string): string {
    try {
      const parsed = JSON.parse(remote_crdt_json);
      let merged_count = 0;
      for (const [key, val] of Object.entries(parsed)) {
        if (!this.hall_of_fame[key]) {
          this.hall_of_fame[key] = val as string;
          merged_count++;
        }
      }
      return `CRDT_SYNC_SUCCESS: Merged ${merged_count} ancestral crossover markers from distant cells.`;
    } catch (e) {
      return "CRDT_SYNC_IDLE: No new genetic matrices found.";
    }
  }

  get_scout_multiplier(): number {
    return 3.0;
  }
}




