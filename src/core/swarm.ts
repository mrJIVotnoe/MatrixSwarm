import { Device, Node, NodeRole } from './models';
import { TrustLevel } from './permissions';

/**
 * Automatically determine the node role based on device profile and karma (Trust Level)
 */
export function determineNodeRole(deviceTrustLevel: TrustLevel, device: Device): NodeRole {
  // If the device is in quarantine or has negative trust, traitor.
  if (deviceTrustLevel === TrustLevel.TRAITOR) {
    return 'traitor'; // "Ниже майнинга" / Aikido Sandbox
  }
  if (deviceTrustLevel === TrustLevel.QUARANTINE) {
    return 'recruit'; // Just joining
  }

  const { capabilities } = device;
  const isComputeHeavy = capabilities.includes('compute');
  const isStorageHeavy = capabilities.includes('storage');
  const isNetworkHeavy = capabilities.includes('network_routing');

  // PC profile (Compute + Storage)
  if (isComputeHeavy && isStorageHeavy) {
    // Requires high Karma to be a Magistrate
    if (deviceTrustLevel >= TrustLevel.MAGISTRATE) {
      return 'magistrate';
    } else {
      return 'guard'; // Middle tier
    }
  }

  // Router profile
  if (isNetworkHeavy && !isComputeHeavy) {
    return 'relay';
  }

  // default / smartphone / display / sensor
  return 'scout';
}

/**
 * Generate a node template based on the connected device
 */
export function bootstrapNode(device: Device, trustLevel: TrustLevel, userPublicKey: string): Node {
  return {
    id: `node_${device.id}_${Date.now()}`,
    userPublicKey,
    deviceId: device.id,
    role: determineNodeRole(trustLevel, device),
  };
}
