import { Device, NodeRole, TrustLevel } from './models';
import { TRUST_CONSTANTS } from './trust';

/**
 * Automatically determine the node role based on device profile and karma (Trust Level)
 */
export function determineNodeRole(device: Device): NodeRole {
  // If the device is in quarantine or has negative trust, sandboxed.
  if (device.trustLevel <= 0) {
    return 'sandboxed'; // "Ниже майнинга" / Aikido Sandbox
  }

  const { capabilities } = device;
  const isComputeHeavy = capabilities.includes('compute');
  const isStorageHeavy = capabilities.includes('storage');
  const isNetworkHeavy = capabilities.includes('network_routing');

  // PC profile (Compute + Storage)
  if (isComputeHeavy && isStorageHeavy) {
    // Requires high Karma to be a Magistrate
    if (device.trustLevel >= TRUST_CONSTANTS.MIN_MAGISTRATE_TRUST) {
      return 'magistrate';
    } else {
      return 'client'; // Wait for promotion
    }
  }

  // Router profile
  if (isNetworkHeavy && !isComputeHeavy) {
    return 'relay';
  }

  // default / smartphone / display / sensor
  return 'client';
}

/**
 * Generate a node template based on the connected device
 */
export function bootstrapNode(device: Device, connectedPeers: string[] = []): import('./models').Node {
  return {
    id: `node_${device.id}_${Date.now()}`,
    deviceId: device.id,
    role: determineNodeRole(device),
    connections: connectedPeers,
  };
}
