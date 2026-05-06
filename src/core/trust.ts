import { ConnectionType, Device, TrustLevel } from './models';

export const TRUST_CONSTANTS = {
  USB_INITIAL: 0,
  WEBRTC_INITIAL: 1, // Assumption
  SEED_CONFIRMED: +2,
  KNOWN_DEVICE: +1,
  SUSPICIOUS_ACTIVITY: -1,
  KEY_MISMATCH: -10, // Instant sandbox
  MIN_MAGISTRATE_TRUST: 5,
};

/**
 * Initializes a new device's trust level based on connection context
 */
export function initializeDeviceTrust(connectionType: ConnectionType): TrustLevel {
  if (connectionType === 'usb') {
    return TRUST_CONSTANTS.USB_INITIAL; // Аппаратный карантин
  }
  return TRUST_CONSTANTS.WEBRTC_INITIAL;
}

/**
 * Process trust actions
 */
export type TrustAction = 'CONFIRM_SEED' | 'DISCOVER_KNOWN' | 'SUSPICIOUS_EVENT' | 'KEY_MISMATCH';

export function evaluateTrust(currentTrust: TrustLevel, action: TrustAction): TrustLevel {
  switch (action) {
    case 'CONFIRM_SEED':
      return currentTrust + TRUST_CONSTANTS.SEED_CONFIRMED;
    case 'DISCOVER_KNOWN':
      return currentTrust + TRUST_CONSTANTS.KNOWN_DEVICE;
    case 'SUSPICIOUS_EVENT':
      return currentTrust + TRUST_CONSTANTS.SUSPICIOUS_ACTIVITY;
    case 'KEY_MISMATCH':
      return currentTrust + TRUST_CONSTANTS.KEY_MISMATCH;
    default:
      return currentTrust;
  }
}

/**
 * Check if the device is trusted enough to be given un-sandboxed access
 */
export function isDeviceTrusted(device: Device): boolean {
  return device.trustLevel > 0;
}
