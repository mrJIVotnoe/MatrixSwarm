import { getDb } from "../../db.js";
import { state } from "../state.js";

export async function sweepOfflineNodesAndReincarnate() {
  try {
    const db = await getDb();
    const now = Date.now();
    const offlineThreshold = now - 15000; // 15 seconds

    // 1. Mark offline nodes
    const oldNodes = await db.all('SELECT id FROM nodes WHERE status = "online" AND last_heartbeat < ?', [offlineThreshold]);
    if (oldNodes.length > 0) {
      const placeholders = oldNodes.map(() => '?').join(',');
      const ids = oldNodes.map((n: any) => n.id);
      await db.run(`UPDATE nodes SET status = "offline" WHERE id IN (${placeholders})`, ids);
      console.info(`[INFO] [SWARM] Marked ${ids.length} nodes offline.`);
      
      // 2. TaskReincarnation
      for (const [taskId, task] of state.activeTasks.entries()) {
        if (task.status === "assigned" && ids.includes(task.assigned_to)) {
           console.info(`[INFO] [SWARM] TaskReincarnation: Re-queueing task ${taskId} from offline node ${task.assigned_to}`);
           task.status = "pending";
           task.assigned_to = null;
        }
      }
      
      // Handle distributed jobs (re-queue cluster chunks)
      for (const [jobId, job] of state.distributedJobs.entries()) {
        for (const chunk of job.chunks) {
          if (chunk.status === "assigned" && ids.includes(chunk.assigned_to)) {
             console.info(`[INFO] [SWARM] TaskReincarnation: Re-queueing cluster chunk ${chunk.id} from offline node ${chunk.assigned_to}`);
             chunk.status = "pending";
             chunk.assigned_to = null;
          }
        }
      }
    }
  } catch (e) {
    console.error("[ERROR] [SWARM] Background sweep error:", e);
  }
}

export function startBackgroundSweep() {
  setInterval(sweepOfflineNodesAndReincarnate, 5000);
}
