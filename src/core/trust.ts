import { HardwarePort, TrustLevel } from './permissions';
import { AikidoStatus } from './aikido';

export const KPOW_CONSTANTS = {
  KARMA_PER_HOUR_UPTIME: 1,
  KARMA_PER_SUCCESSFUL_PACKET: 0.1,
  KARMA_MAX_PER_DAY: 100, // Anti-bot farm cap
};

/**
 * Initializes a new node's trust level based strictly on hardware connection.
 */
export function initializeDeviceTrust(portType: HardwarePort): TrustLevel {
  // L0 - Hardware Quarantine. Physical devices connected via USB have zero trust initially.
  if (portType === 'usb') {
    return TrustLevel.QUARANTINE;
  }
  return TrustLevel.RECRUIT;
}

/**
 * Calculates earned Karma based on Karma Proof of Work (KPoW) and Aikido Status.
 * Only real contributions increase Karma.
 * Поощрение "Домашних узлов" (Home Anchor / Stable Guardian) происходит путем обычного
 * начисления Кармы как для стационарного ПК (за Аптайм и KPoW).
 */
export function calculateTrustScore(
  baseKarma: number,
  hoursConnected: number, 
  successfulRelayedPackets: number,
  aikidoStatus: AikidoStatus = 'Nomad'
): number {
  let earned = 0;
  
  // Base growth for uptime and storage/relaying
  earned += hoursConnected * KPOW_CONSTANTS.KARMA_PER_HOUR_UPTIME;
  earned += successfulRelayedPackets * KPOW_CONSTANTS.KARMA_PER_SUCCESSFUL_PACKET;
  
  // Cap the daily earnings to prevent sudden massive spikes
  let cappedEarned = Math.min(earned, KPOW_CONSTANTS.KARMA_MAX_PER_DAY);

  // Apply Aikido Protocol logical limits on growth
  if (aikidoStatus === 'Stationary Asset') {
    // Боты и фермы: режем рост Кармы до нуля
    cappedEarned = 0;
  }

  return baseKarma + cappedEarned;
}

/**
 * Evaluates the final computed TrustLevel based on current total Karma score.
 */
export function evaluateTrustLevelByKarma(karmaScore: number): TrustLevel {
  if (karmaScore < 0) return TrustLevel.TRAITOR;
  if (karmaScore < 10) return TrustLevel.QUARANTINE;
  if (karmaScore < 100) return TrustLevel.RECRUIT;
  if (karmaScore < 500) return TrustLevel.ADEPT;
  if (karmaScore < 1000) return TrustLevel.GUARD;
  return TrustLevel.MAGISTRATE;
}
