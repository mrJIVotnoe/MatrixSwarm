import { v4 as uuidv4 } from "uuid";
import { state } from "../state.js";
import { Commissar } from "../../commissar.js";
import { isFarmSuspect } from "./trustService.js";

interface TaskAssignmentOptions {
  nodeId: string;
  isp: string;
  currentTrust: number;
  mobilityScore: number;
  deviceType: string;
  canDoHeavyTasks: boolean;
  batteryHealth: string;
  cellId: string;
}

export async function assignTask(options: TaskAssignmentOptions): Promise<any | null> {
  const { nodeId, isp, currentTrust, mobilityScore, deviceType, canDoHeavyTasks, batteryHealth, cellId } = options;
  let assignedTask = null;

  // 0. ZERO-TRUST PERIMETER ENFORCEMENT
  if (currentTrust <= 0) {
    // Quarantine mode: strict data exchange prohibition
    return null;
  }

  // 1. Prioritize Distributed Cluster Jobs (PlayStation Supercomputer)
  if (canDoHeavyTasks && (batteryHealth === 'good' || batteryHealth === 'unknown')) {
    for (const job of state.distributedJobs.values()) {
      if (job.status === 'running') {
        const pendingChunk = job.chunks.find((c: any) => c.status === 'pending');
        if (pendingChunk) {
          pendingChunk.status = 'assigned';
          pendingChunk.assigned_to = nodeId;
          assignedTask = {
            id: pendingChunk.id, // using chunk id as task id
            job_id: job.id,
            type: "cluster_chunk",
            job_type: job.type,
            start: pendingChunk.start,
            end: pendingChunk.end
          };
          state.activeTasks.set(assignedTask.id, { ...assignedTask, status: "assigned", assigned_to: nodeId });
          return assignedTask;
        }
      }
    }
  }

  // 2. Fallback to regular tasks
  const rand = Math.random();
  const farmSuspect = isFarmSuspect(deviceType, mobilityScore, currentTrust);

  if (rand < 0.2 && !farmSuspect) {
    // BYEDPI Routing Task
    const taskId = uuidv4();
    const targets = ["twitter.com", "facebook.com", "instagram.com", "news.bbc.co.uk", "rutracker.org", "youtube.com", "discord.com"];
    
    const isMagistrate = currentTrust >= state.MAGISTRATE_THRESHOLD;
    const selectedStrategy = await Commissar.getRecommendedStrategy(isp, isMagistrate);

    assignedTask = {
      id: taskId,
      type: "byedpi_routing",
      target: targets[Math.floor(Math.random() * targets.length)],
      strategy: selectedStrategy.name,
      params: selectedStrategy.params,
      isp: isp
    };
    state.activeTasks.set(taskId, { ...assignedTask, status: "assigned", assigned_to: nodeId });
  } else if ((rand < 0.4 || farmSuspect) && canDoHeavyTasks && (batteryHealth === 'good' || batteryHealth === 'unknown')) {
    // Compute Task
    const taskId = uuidv4();
    assignedTask = {
      id: taskId,
      type: "compute_hash",
      target: "PoW_Mining",
      difficulty: state.currentPowDifficulty,
      seed: uuidv4(),
      isp: isp
    };
    state.activeTasks.set(taskId, { ...assignedTask, status: "assigned", assigned_to: nodeId });
  } else if (rand < 0.5) {
    // Spatial Recon Task (Reverse StarLink)
    const taskId = uuidv4();
    assignedTask = {
      id: taskId,
      type: "spatial_recon",
      target: "local_infrastructure",
      cell_id: cellId,
      isp: isp
    };
    state.activeTasks.set(taskId, { ...assignedTask, status: "assigned", assigned_to: nodeId });
  }

  return assignedTask;
}
