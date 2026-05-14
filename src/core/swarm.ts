import { Device, Node, NodeRole } from './models';
import { TrustLevel } from './permissions';
import { WasmCasteAutonomy } from './wasm_bridge';

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

  // Use Rust-based Meritocracy engine
  const metricsJson = JSON.stringify({
    cpu_cores: navigator.hardwareConcurrency || 4,
    ram_gb: (navigator as any).deviceMemory || 4.0,
    is_plugged_in: device.isUSBConnected || false,
    device_type: device.deviceType === 'pc' ? 'desktop' : device.deviceType === 'smartphone' ? 'mobile' : device.deviceType,
    has_gps: !!navigator.geolocation,
    battery_level: 100 // Simulated for now
  });

  const rustRole = WasmCasteAutonomy.determineRole(metricsJson);

  switch(rustRole) {
    case "Magistrate": return "magistrate";
    case "StableGuardian": return "guard";
    case "Scout": return "scout";
    case "Relay": return "relay";
    default: return "scout";
  }
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
