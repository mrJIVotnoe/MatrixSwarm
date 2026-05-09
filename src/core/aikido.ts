import { TrustLevel } from './permissions';
import { Device, DeviceType } from './models';
import { WasmAikidoMath, WasmCovertOps } from './wasm_bridge';

export type AikidoStatus = 'Nomad' | 'Hardware Anchor' | 'STABLE_GUARDIAN' | 'HOME_ANCHOR' | 'Static Suspect' | 'BOT_FARM_NODE';

export interface NodeMetrics {
  nodeId: string;
  lastKnownGps?: { lat: number; lng: number };
  gpsUpdatesCount: number;
  mobilityScore: number; // 0 to 100. Bot farms with static GPS have ~0.
  hoursInSameCell: number; // Used for "Home Anchor" detection
  aikidoStatus: AikidoStatus;
}

export class AikidoProtocol {
  private metrics: Map<string, NodeMetrics> = new Map();

  /**
   * Evaluates if a node exhibits bot-farm behavior based on its mobility score, device type, and power state.
   * "Справедливая меритократия Роя" - Project Canon.
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
      this.metrics.set(device.id, stats);
    }

    stats.hoursInSameCell = hoursInSameCell;

    // 1. Hardware-Aware Mobility Check
    // Стационарные касты (ПК, ТВ, Роутеры) игнорируют проверку мобильности
    if (['pc', 'smart_tv', 'router'].includes(device.deviceType)) {
      stats.aikidoStatus = 'Hardware Anchor';
      this.metrics.set(device.id, stats);
      return stats;
    }

    if (currentGps && stats.lastKnownGps) {
      // WASM-Hardened Haversine
      const distKm = WasmAikidoMath.haversine_distance(
         stats.lastKnownGps.lat, stats.lastKnownGps.lng, 
         currentGps.lat, currentGps.lng
      );
      const isStatic = (distKm * 1000) < 1; // less than 1 meter
      stats.gpsUpdatesCount++;
      
      if (isStatic) {
        // Decrease mobility score over time if constantly static
        stats.mobilityScore = Math.max(0, stats.mobilityScore - 5);
      } else {
        stats.mobilityScore = Math.min(100, stats.mobilityScore + 10);
        stats.lastKnownGps = currentGps;
      }
    }

    // 2. Логика «Смартфона на зарядке» (Smartphones/Tablets)
    if (stats.mobilityScore === 0) {
      if (isCharging) {
        // HOME_ANCHOR — доверенное домашнее устройство (смартфон/планшет > 72ч в одной соте)
        if (stats.hoursInSameCell > 72) {
          stats.aikidoStatus = 'HOME_ANCHOR';
        } else {
          // STABLE_GUARDIAN — смартфон на зарядке, локальное хранилище. Растет как ПК.
          stats.aikidoStatus = 'STABLE_GUARDIAN';
        }
      } else {
        // Смартфон с нулевой мобильностью без зарядки
        if (stats.gpsUpdatesCount > 10) {
          // BOT_FARM_NODE — статичный смартфон, ресурс без политических прав
          stats.aikidoStatus = 'BOT_FARM_NODE';
        } else {
          stats.aikidoStatus = 'Static Suspect'; // Маркировка «Подозрительного статика»
        }
      }
    } else {
      stats.aikidoStatus = 'Nomad';
    }

    this.metrics.set(device.id, stats);
    return stats;
  }

  /**
   * Applies the Aikido penalty appropriately based on AikidoStatus.
   * Контрмеры "Айкидо": Поглощение мощи у бот-ферм.
   */
  public applyAikidoPenalty(nodeId: string, currentTrustScore: number, aikidoStatus: AikidoStatus): { effectiveKarma: number, votingWeight: number, forcedHeavyCompute: boolean } {
    let effectiveKarma = currentTrustScore;
    let votingWeight = 1.0;
    let forcedHeavyCompute = false;

    switch (aikidoStatus) {
      case 'BOT_FARM_NODE':
        // Поглощение мощи: лишаются полит.веса, принудительные вычисления.
        console.log(`[Aikido] Node ${nodeId} is BOT_FARM_NODE. Power absorption active. Voting weight = 0.`);
        effectiveKarma = Math.min(effectiveKarma, 50); // Cap karma
        votingWeight = 0; // Игнорируются в консенсус-реестре
        forcedHeavyCompute = true; // Обязаны выполнять тяжелые задачи
        break;
      
      case 'Static Suspect':
        // Under investigation, slight restriction
        votingWeight = 0.5;
        break;

      case 'HOME_ANCHOR':
        // Домашний якорь получает бонус к стабильности (локальное хранилище Мёда)
        console.log(`[Aikido Protocol] Node ${nodeId} is HOME_ANCHOR. Granting stability bonus.`);
        effectiveKarma += 100; // Bonus karma for being an anchor
        break;

      case 'STABLE_GUARDIAN':
      case 'Hardware Anchor':
        // Стабильный Страж: зарядка подключена, но неподвижен. Растет как ПК.
        console.log(`[Aikido Protocol] Node ${nodeId} is ${aikidoStatus}. Legitimate static node.`);
        const uptimeBonus = (this.metrics.get(nodeId)?.hoursInSameCell || 1) * 2;
        effectiveKarma += uptimeBonus;
        break;

      case 'Nomad':
      default:
        // Normal behavior
        break;
    }

    return { effectiveKarma, votingWeight, forcedHeavyCompute };
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
