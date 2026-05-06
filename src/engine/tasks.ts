import { NodeRole, DeviceCapability } from '../core/models';
import { PermissionEngine, TrustLevel, PermissionScope } from '../core/permissions';

export type TaskStatus = 'pending' | 'assigned' | 'completed' | 'failed' | 'reincarnating';
export type TaskComplexity = 'heavy' | 'light';

export interface SwarmTask {
  id: string;
  name: string;
  complexity: TaskComplexity;
  requiredCapabilities: DeviceCapability[];
  requiredScope?: PermissionScope; 
  payload: any;
  status: TaskStatus;
  assignedToNodeId?: string;
  createdAt: number;
  lastHeartbeat?: number;
}

const HEARTBEAT_TIMEOUT = 10000; // 10 seconds

export class TaskManager {
  private queue: SwarmTask[] = [];

  addTask(task: Omit<SwarmTask, 'status' | 'createdAt'>) {
    const newTask: SwarmTask = {
      ...task,
      status: 'pending',
      createdAt: Date.now()
    };
    this.queue.push(newTask);
    this.log(`Task ${newTask.id} (${newTask.name}) added to queue [${newTask.complexity}]`);
    return newTask;
  }

  // Modified to check TrustLevel
  assignTask(taskId: string, nodeId: string, nodeTrustLevel: TrustLevel = TrustLevel.RECRUIT, pubKey: string = '') {
    const task = this.queue.find(t => t.id === taskId);
    if (task) {
      if (task.requiredScope && !PermissionEngine.hasPermission(nodeTrustLevel, task.requiredScope, pubKey)) {
          this.log(`[PermissionEngine] Task ${task.id} REJECTED for Node ${nodeId} - Insufficient Trust (${nodeTrustLevel}) for scope: ${task.requiredScope}`);
          return;
      }
      task.status = 'assigned';
      task.assignedToNodeId = nodeId;
      task.lastHeartbeat = Date.now();
      this.log(`Task ${task.id} ASSIGNED to Node ${nodeId}`);
    }
  }

  updateHeartbeat(taskId: string) {
    const task = this.queue.find(t => t.id === taskId);
    if (task && task.status === 'assigned') {
      task.lastHeartbeat = Date.now();
    }
  }

  // TaskReincarnation
  monitorTasks() {
    const now = Date.now();
    this.queue.forEach(task => {
      if (task.status === 'assigned' && task.lastHeartbeat && (now - task.lastHeartbeat > HEARTBEAT_TIMEOUT)) {
        this.log(`[TaskReincarnation] Node ${task.assignedToNodeId} failed to heartbeat. Reincarnating Task ${task.id}`);
        task.status = 'pending';
        task.assignedToNodeId = undefined;
        task.lastHeartbeat = undefined;
      }
    });
  }

  getPendingTasks() {
    return this.queue.filter(t => t.status === 'pending');
  }

  getAllTasks() {
    return [...this.queue];
  }

  private log(msg: string) {
    console.log(`[SwarmLogs:TaskManager] ${msg}`);
  }
}
