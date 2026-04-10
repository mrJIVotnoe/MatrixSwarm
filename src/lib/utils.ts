/**
 * Utility functions for Matrix Swarm
 */

/**
 * Calculates the initial trust score based on hardware capabilities
 */
export function calculateInitialTrustScore(hardware: { cores: number; memory: number }): number {
  let score = 50; // Base score

  if (hardware.cores > 4) score += 10;
  if (hardware.memory > 4) score += 10;
  
  return Math.min(100, score);
}

/**
 * Formats a node ID for display
 */
export function formatNodeId(id: string): string {
  if (!id) return 'unknown';
  return id.substring(0, 8).toUpperCase();
}

/**
 * Determines the AI Tier based on RAM
 */
export function determineAiTier(ramMb: number): string {
  if (ramMb >= 8192) return 'llm';
  if (ramMb >= 4096) return 'slm_3b';
  if (ramMb >= 2048) return 'slm_1.5b';
  return 'none';
}
