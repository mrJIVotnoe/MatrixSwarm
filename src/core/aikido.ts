import { TrustLevel } from './permissions';
import { Device, DeviceType } from './models';
import { WasmAikidoMath, WasmAikidoCore, WasmCovertOps } from './wasm_bridge';

export type AikidoStatus = 'Nomad' | 'Hardware Anchor' | 'STABLE_GUARDIAN' | 'HOME_ANCHOR' | 'Static Suspect' | 'BOT_FARM_NODE' | 'Hardware Quarantine';

export interface NodeMetrics {
  nodeId: string;
  lastKnownGps?: { lat: number; lng: number };
  gpsUpdatesCount: number;
  mobilityScore: number; // 0 to 100.
  hoursInSameCell: number; 
  aikidoStatus: AikidoStatus;
}

export class AikidoProtocol {
  private metrics: Map<string, NodeMetrics> = new Map();

  /**
   * Evaluates node using Rust-driven Hardware Awareness.
   */
  public evaluateNode(
    device: Device,
    currentGps?: { lat: number; lng: number },
    isCharging: boolean = false,
    hoursInSameCell: number = 0
  ): NodeMetrics {
    let stats = this.metrics.get(device.id);
    
    if (!stats) {
      stats = { 
        nodeId: device.id, 
        gpsUpdatesCount: 0, 
        mobilityScore: 50, 
        lastKnownGps: currentGps,
        hoursInSameCell,
        aikidoStatus: 'Nomad'
      };
    }

    let caste = "Unknown";
    if (device.deviceType === 'pc') caste = "PC";
    if (device.deviceType === 'router') caste = "Router";
    if (device.deviceType === 'smart_tv') caste = "SmartTV";
    if (device.deviceType === 'smartphone') caste = "Smartphone";
    if (device.deviceType === 'tablet') caste = "Tablet";

    const inputData = {
       node_id: device.id,
       caste,
       logical_cores: navigator.hardwareConcurrency || 4,
       memory_mb: (navigator as any).deviceMemory ? ((navigator as any).deviceMemory * 1024) : 2048,
       connection_type: device.isUSBConnected ? "usb" : "wifi",
       
       prev_lat: stats.lastKnownGps?.lat ?? null,
       prev_lng: stats.lastKnownGps?.lng ?? null,
       curr_lat: currentGps?.lat ?? null,
       curr_lng: currentGps?.lng ?? null,
       is_charging: isCharging,
       hours_in_same_cell: hoursInSameCell,
       
       mobility_score: stats.mobilityScore,
       gps_updates_count: stats.gpsUpdatesCount,
       karma: 50.0 // Could pull real karma from Trust Engine
    };

    const rustEval = WasmAikidoCore.processNode(JSON.stringify(inputData));
    
    stats.mobilityScore = rustEval.mobility_score;
    stats.gpsUpdatesCount = rustEval.gps_updates_count;
    stats.aikidoStatus = rustEval.aikido_status as AikidoStatus;
    if (rustEval.new_lat !== null && rustEval.new_lng !== null) {
       stats.lastKnownGps = { lat: rustEval.new_lat, lng: rustEval.new_lng };
    }
    stats.hoursInSameCell = hoursInSameCell;

    this.metrics.set(device.id, stats);
    return stats;
  }

  /**
   * Applies the Aikido penalty using Rust WASM Core logic.
   */
  public applyAikidoPenalty(nodeId: string, currentTrustScore: number, aikidoStatus: AikidoStatus): { effectiveKarma: number, votingWeight: number, forcedHeavyCompute: boolean } {
    return WasmAikidoCore.applyAikidoPenalty(nodeId, currentTrustScore, aikidoStatus);
  }

  /**
   * Акустический набат (Proximity Check)
   * Если несколько узлов слышат один паттерн, считаем их единым логическим узлом в голосовании.
   * Возвращает список "Sybil/Логических" групп из списка подписей
   */
  public emitAcousticNabbat(payload: string) {
    if (typeof window !== 'undefined') {
       // Rust WASM Steganography to 18-20kHZ acoustic signal
       const buffer = WasmCovertOps.encode_nabbat(payload);
       console.log(`[Aikido] Acoustic Nabbat Active. Emitting ${buffer.length} samples at 19kHz...`);
       // Further WebAudio API integration would go here.
    }
  }

  public checkAcousticProximity(signatures: { nodeId: string, audioPatternHash: string }[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const sig of signatures) {
      if (!groups.has(sig.audioPatternHash)) {
        groups.set(sig.audioPatternHash, []);
      }
      groups.get(sig.audioPatternHash)!.push(sig.nodeId);
    }

    // Логируем объединение физических устройств в единые логические кластеры
    for (const [hash, nodes] of groups.entries()) {
      if (nodes.length > 1) {
         console.warn(`[Aikido] Acoustic Nabbat: Merging nodes ${nodes.join(', ')} into a single logical entity due to shared proximity pattern ${hash}.`);
      }
    }
    return groups;
  }

  /**
   * Межклассовый консенсус (Cross-Caste Consensus)
   * Для предотвращения атаки 51%, требуется подтверждение от разных каст железа.
   * Минимум 20% одобрения от Magistrates(PC), 20% от Relays(Routers), 20% Scouts(Smartphones).
   */
  public checkCrossCasteConsensus(votes: { deviceType: DeviceType, isPositive: boolean }[]): boolean {
    // Rust-driven Cross-Caste Consensus
    const rustVotes = votes.map(v => ({
      device_type: v.deviceType === 'smart_tv' ? 'smart_tv' : v.deviceType,
      is_positive: v.isPositive
    }));
    return WasmAikidoCore.checkCrossCasteConsensus(JSON.stringify(rustVotes));
  }
}
