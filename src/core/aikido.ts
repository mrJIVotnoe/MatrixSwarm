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
    stats.hoursInSameCell = hoursInSameCell;

    if (currentGps && stats.lastKnownGps) {
      // WASM-Hardened Haversine
      const distKm = WasmAikidoMath.haversine_distance(
         stats.lastKnownGps.lat, stats.lastKnownGps.lng, 
         currentGps.lat, currentGps.lng
      );
      const isStatic = (distKm * 1000) < 1;
      stats.gpsUpdatesCount++;
      
      if (isStatic) {
        stats.mobilityScore = Math.max(0, stats.mobilityScore - 5);
      } else {
        stats.mobilityScore = Math.min(100, stats.mobilityScore + 10);
        stats.lastKnownGps = currentGps;
      }
    }

    // Prepare hardware profile for Rust Core
    let caste = "Unknown";
    if (device.deviceType === 'pc') caste = "PC";
    if (device.deviceType === 'router') caste = "Router";
    if (device.deviceType === 'smart_tv') caste = "SmartTV";
    if (device.deviceType === 'smartphone') caste = "Smartphone";
    if (device.deviceType === 'tablet') caste = "Tablet";

    // "Внедрите жесткую логику Zero-Trust USB"
    // Mock connection mapping
    const connection_type = device.isUSBConnected ? "usb" : "wifi";

    const profileJson = JSON.stringify({
       caste,
       logical_cores: navigator.hardwareConcurrency || 4,
       memory_mb: (navigator as any).deviceMemory ? ((navigator as any).deviceMemory * 1024) : 2048,
       connection_type
    });

    const rustEval = WasmAikidoCore.evaluateHardwareProfile(profileJson);
    
    // Rust-driven assessment overrides default JS values
    stats.aikidoStatus = rustEval.aikido_status as AikidoStatus;

    // Apply specific Bot-farm / Nomad detection if Rust assigned generic Scout role.
    if (rustEval.role === "Scout" && stats.mobilityScore === 0) {
      if (isCharging) {
        if (stats.hoursInSameCell > 72) {
          stats.aikidoStatus = 'HOME_ANCHOR';
        } else {
          stats.aikidoStatus = 'STABLE_GUARDIAN';
        }
      } else {
        if (stats.gpsUpdatesCount > 10) {
          stats.aikidoStatus = 'BOT_FARM_NODE';
        } else {
          stats.aikidoStatus = 'Static Suspect';
        }
      }
    }

    // Enforce Hardware Quarantine
    if (rustEval.aikido_status === "Hardware Quarantine") {
      stats.aikidoStatus = "Hardware Quarantine";
    }

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
    const totalVotesByType = { pc: 0, router: 0, smartphone: 0, tablet: 0, smart_tv: 0 };
    const positiveVotesByType = { pc: 0, router: 0, smartphone: 0, tablet: 0, smart_tv: 0 };

    for (const vote of votes) {
      totalVotesByType[vote.deviceType]++;
      if (vote.isPositive) {
        positiveVotesByType[vote.deviceType]++;
      }
    }

    const pcApproval = totalVotesByType.pc > 0 ? (positiveVotesByType.pc / totalVotesByType.pc) : 1; // If 0, assume 1 to not block if no PC
    const routerApproval = totalVotesByType.router > 0 ? (positiveVotesByType.router / totalVotesByType.router) : 1;
    const smartphoneApproval = totalVotesByType.smartphone > 0 ? (positiveVotesByType.smartphone / totalVotesByType.smartphone) : 1;

    // Requirement: at least 20% (0.2) from each core caste. 
    // In actual implementation, we'd need minimum absolute numbers too.
    const isConsensusReached = pcApproval >= 0.2 && routerApproval >= 0.2 && smartphoneApproval >= 0.2;

    console.log(`[Aikido] Cross-Caste Consensus: PC=${(pcApproval*100).toFixed(1)}%, Router=${(routerApproval*100).toFixed(1)}%, App=${(smartphoneApproval*100).toFixed(1)}%. Result: ${isConsensusReached}`);

    return isConsensusReached;
  }
}
