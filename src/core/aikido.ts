import { TrustLevel } from './permissions';
import { Device } from './models';

export type AikidoStatus = 'Nomad' | 'Hardware Anchor' | 'Stable Guardian' | 'Home Anchor' | 'Static Suspect' | 'Stationary Asset';

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
    // Static hardware is exempt from Aikido mobility penalties
    if (['pc', 'smart_tv', 'router'].includes(device.deviceType)) {
      stats.aikidoStatus = 'Hardware Anchor';
      this.metrics.set(device.id, stats);
      return stats;
    }

    if (currentGps && stats.lastKnownGps) {
      const isStatic = this.calculateDistance(stats.lastKnownGps, currentGps) < 1; // less than 1 meter
      stats.gpsUpdatesCount++;
      
      if (isStatic) {
        // Decrease mobility score over time if constantly static
        stats.mobilityScore = Math.max(0, stats.mobilityScore - 5);
      } else {
        stats.mobilityScore = Math.min(100, stats.mobilityScore + 10);
        stats.lastKnownGps = currentGps;
      }
    }

    // 2. Differentiation for Smartphones/Tablets
    if (stats.mobilityScore === 0) {
      if (isCharging) {
        // 3. New Role: Home Anchor (Домашний Якорь)
        // If > 72 hours in same cell & charging -> gets stability bonus and "Honey" storage rights
        if (stats.hoursInSameCell > 72) {
          stats.aikidoStatus = 'Home Anchor';
        } else {
          stats.aikidoStatus = 'Stable Guardian'; // Stable but not yet an anchor
        }
      } else {
        // Not charging and mobility is 0 -> might be a bot farm sitting unpowered (or on battery)
        // Let's mark as Static Suspect if it's been static for a while
        if (stats.gpsUpdatesCount > 10) {
          stats.aikidoStatus = 'Stationary Asset'; // Demoted to asset to restrict consensus influence
        } else {
          stats.aikidoStatus = 'Static Suspect';
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
   * Modifies consensus weight and returns effective TrustLevel logic if needed.
   * Note: We NEVER assign TRAITOR just for not moving.
   * Only malicious nodes (handled elsewhere) get TRAITOR.
   */
  public applyAikidoPenalty(nodeId: string, currentTrustScore: number, aikidoStatus: AikidoStatus): { effectiveKarma: number, isConsensusRestricted: boolean } {
    let effectiveKarma = currentTrustScore;
    let isConsensusRestricted = false;

    switch (aikidoStatus) {
      case 'Stationary Asset':
        // Подозрительные статичные смартфоны (фермы)
        // Забираем вычислительную мощность, ограничиваем политический вес (консенсус)
        // Но не лишаем Кармы полностью.
        console.log(`[Aikido Protocol] Node ${nodeId} is STATIONARY_ASSET. Restricting consensus influence.`);
        effectiveKarma = Math.min(effectiveKarma, 50); // Cap karma
        isConsensusRestricted = true;
        break;
      
      case 'Static Suspect':
        // Under investigation, slight restriction
        isConsensusRestricted = true;
        break;

      case 'Home Anchor':
        // Домашний якорь получает бонус к стабильности (локальное хранилище Мёда)
        console.log(`[Aikido Protocol] Node ${nodeId} is HOME_ANCHOR. Granting stability bonus.`);
        effectiveKarma += 100; // Bonus karma for being an anchor
        break;

      case 'Stable Guardian':
        // Стабильный Страж: зарядка подключена, но неподвижен. Растет как ПК.
        console.log(`[Aikido Protocol] Node ${nodeId} is STABLE_GUARDIAN. Legitimate static node.`);
        break;

      case 'Hardware Anchor':
      case 'Nomad':
      default:
        // Normal behavior
        break;
    }

    return { effectiveKarma, isConsensusRestricted };
  }

  private calculateDistance(pos1: { lat: number; lng: number }, pos2: { lat: number; lng: number }): number {
    return Math.sqrt(Math.pow(pos1.lat - pos2.lat, 2) + Math.pow(pos1.lng - pos2.lng, 2)) * 111000; // rough meters
  }
}
