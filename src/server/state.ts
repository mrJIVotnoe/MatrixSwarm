import { WebSocket } from 'ws';
import { MatrixService } from "../services/matrixService.js";

// Global in-memory state
// "Железо смертно. Информация бессмертна. Рой вечен"
export const state = {
  activeTasks: new Map<string, any>(),
  distributedJobs: new Map<string, any>(),
  connectedNodes: new Map<string, WebSocket>(),
  matrixEcho: null as MatrixService | null,
  currentPowDifficulty: 4,
  MAGISTRATE_THRESHOLD: 90,
};
