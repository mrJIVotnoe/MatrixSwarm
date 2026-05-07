export function calculateTrustModifier(
  deviceType: string,
  mobilityScore: number,
  currentTrust: number
): number {
  let extraModifier = 0;

  if (deviceType === "smartphone") {
    const isFarmSuspect = mobilityScore === 0;
    if (isFarmSuspect && currentTrust > 50) {
      extraModifier = -0.5; // lose some trust if stationary at high ranks
    } else if (mobilityScore > 5 && currentTrust < 30) {
      extraModifier = 0.5; // slight boost for proven mobile devices
    }
  } else if (["smart_tv", "pc", "router"].includes(deviceType)) {
    // Меритократия: для каст smart_tv, pc и router штраф за отсутствие мобильности отключен.
    // They are stable guardians by nature.
  }

  return extraModifier;
}

export function isFarmSuspect(deviceType: string, mobilityScore: number, currentTrust: number): boolean {
  return deviceType === "smartphone" && mobilityScore === 0 && currentTrust < 20;
}
