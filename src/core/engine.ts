import { TrustLevel } from './permissions';
import { DeviceCapability } from './models';

export type TaskStatus = 'pending' | 'assigned' | 'completed' | 'failed' | 'reincarnating';
export type TaskComplexity = 'heavy' | 'light' | 'bot_farm_fodder';

export interface SwarmTask {
  id: string;
  name: string;
  complexity: TaskComplexity;
  payload: any;
  status: TaskStatus;
  assignedToNodeId?: string;
  createdAt: number;
  lastHeartbeat?: number;
}

const HEARTBEAT_TIMEOUT = 10000; // 10 seconds

export class SwarmOrchestrator {
  private queue: SwarmTask[] = [];

  addTask(task: Omit<SwarmTask, 'status' | 'createdAt'>) {
    const newTask: SwarmTask = {
      ...task,
      status: 'pending',
      createdAt: Date.now()
    };
    this.queue.push(newTask);
    console.log(`[SwarmOrchestrator] Task ${newTask.id} added to queue [${newTask.complexity}]`);
    return newTask;
  }

  assignTask(taskId: string, nodeId: string, nodeTrustLevel: TrustLevel) {
    const task = this.queue.find(t => t.id === taskId);
    if (!task) return;

    // AIKIDO PROTOCOL: If the node is a TRAITOR (-1) (bot farm / malicious),
    // we STILL assign them meaningless/heavy compute tasks ("bot_farm_fodder")
    // to waste their resources without giving them real rank or vital OS components.
    if (nodeTrustLevel === TrustLevel.TRAITOR) {
      if (task.complexity !== 'bot_farm_fodder') {
        console.warn(`[AntiMalware:Aikido] Traitor Node ${nodeId} requested task. Diverting to sandbox/bot_farm_fodder tasks only.`);
        return; 
      }
      console.log(`[AntiMalware:Aikido] Traitor Node ${nodeId} successfully assigned dummy compute task. Wasting malicious resources.`);
    }

    task.status = 'assigned';
    task.assignedToNodeId = nodeId;
    task.lastHeartbeat = Date.now();
    console.log(`[SwarmOrchestrator] Task ${task.id} ASSIGNED to Node ${nodeId}`);
  }

  updateHeartbeat(taskId: string) {
    const task = this.queue.find(t => t.id === taskId);
    if (task && task.status === 'assigned') {
      task.lastHeartbeat = Date.now();
    }
  }

  /**
   * TASK REINCARNATION MECHANISM
   * Runs periodically. If an assigned node disconnects or fails heartbeat,
   * the task is instantly stripped from them and pushed back to 'pending'.
   */
  monitorTasks() {
    const now = Date.now();
    this.queue.forEach(task => {
      if (task.status === 'assigned' && task.lastHeartbeat && (now - task.lastHeartbeat > HEARTBEAT_TIMEOUT)) {
        console.log(`[TaskReincarnation] Node ${task.assignedToNodeId} failed heartbeat. Reincarnating Task ${task.id}...`);
        task.status = 'reincarnating';
        setTimeout(() => {
          task.status = 'pending';
          task.assignedToNodeId = undefined;
          task.lastHeartbeat = undefined;
          console.log(`[TaskReincarnation] Task ${task.id} reincarnated and awaits new Node.`);
        }, 500); // Small animation/delay buffer
      }
    });
  }

  getPendingTasks() {
    return this.queue.filter(t => t.status === 'pending');
  }
}
