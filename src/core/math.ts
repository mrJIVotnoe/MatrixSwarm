export class MathCore {
  /**
   * Calculates the distance between two geographical points using the Haversine formula.
   * This appropriately handles the Earth's curvature.
   * Returns distance in meters.
   */
  public static haversineDistance(
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number }
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const dLat = (pos2.lat - pos1.lat) * (Math.PI / 180);
    const dLng = (pos2.lng - pos1.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(pos1.lat * (Math.PI / 180)) *
        Math.cos(pos2.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  }
}
