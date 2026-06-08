import { HardwarePort, TrustLevel } from './permissions';
import { AikidoStatus } from './aikido';
import { WasmTrustEngine, WasmAikidoCore } from './wasm_bridge';

export const KPOW_CONSTANTS = {
  KARMA_PER_HOUR_UPTIME: 1,
  KARMA_PER_SUCCESSFUL_PACKET: 0.1,
  KARMA_MAX_PER_DAY: 100, // Anti-bot farm cap
};

/**
 * Initializes a new node's trust level based strictly on hardware connection.
 */
export function initializeDeviceTrust(portType: HardwarePort): TrustLevel {
  const engine = new WasmTrustEngine();
  engine.check_physical_link(portType === 'usb', false);
  return engine.get_level();
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
  const engine = new WasmTrustEngine();
  
  // Set up with base karma
  engine.verify_hardware("base_auth_signature");
  engine.add_karma(baseKarma, "Drone");

  let earned = 0;
  // Base growth for uptime and storage/relaying
  earned += hoursConnected * KPOW_CONSTANTS.KARMA_PER_HOUR_UPTIME;
  earned += successfulRelayedPackets * KPOW_CONSTANTS.KARMA_PER_SUCCESSFUL_PACKET;
  
  // Cap the daily earnings to prevent sudden massive spikes
  let cappedEarned = Math.min(earned, KPOW_CONSTANTS.KARMA_MAX_PER_DAY);

  // Apply Aikido Protocol logical limits on growth
  if (aikidoStatus === 'BOT_FARM_NODE') {
    cappedEarned = 0;
  }

  if (cappedEarned > 0) {
    engine.add_karma(cappedEarned, "Drone");
  }

  // Call Rust Aikido penalty core
  const penalty = WasmAikidoCore.applyAikidoPenalty("local_node", baseKarma + cappedEarned, aikidoStatus);
  return penalty.effectiveKarma;
}

/**
 * Evaluates the final computed TrustLevel based on current total Karma score.
 */
export function evaluateTrustLevelByKarma(karmaScore: number): TrustLevel {
  const engine = new WasmTrustEngine();
  engine.verify_hardware("base_auth_signature");
  engine.add_karma(karmaScore, "Drone");
  return engine.get_level();
}
