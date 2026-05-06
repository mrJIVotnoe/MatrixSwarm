import { Node, Device } from '../core/models';
import { SwarmTask } from './tasks';

export interface DeviceState extends Device {
  batteryLevel?: number; // 0 to 100
}

export class ResourceAllocator {
  findBestNode(task: SwarmTask, availableNodes: Node[], deviceStates: Map<string, DeviceState>): Node | null {
    this.log(`Allocating resource for Task ${task.id} [${task.complexity}]`);
    
    let candidateNodes = availableNodes.filter(node => {
      const device = deviceStates.get(node.deviceId);
      if (!device) return false;
      
      // Battery check: Do not assign to smartphones/battery-powered with < 20% battery
      if (device.batteryLevel !== undefined && device.batteryLevel < 20) {
        this.log(`Node ${node.id} rejected: Battery too low (${device.batteryLevel}%)`);
        return false;
      }

      // Capability matching
      const hasAllCaps = task.requiredCapabilities.every(req => device.capabilities.includes(req));
      if (!hasAllCaps) return false;

      return true;
    });

    if (task.complexity === 'heavy') {
      // Heavy tasks (AES-256, RSA) to 'magistrate'
      candidateNodes = candidateNodes.filter(n => n.role === 'magistrate');
    } else {
      // Light tasks (storing fragments) prefer 'client'
      const clientNodes = candidateNodes.filter(n => n.role === 'client');
      if (clientNodes.length > 0) {
        candidateNodes = clientNodes;
      }
    }

    if (candidateNodes.length > 0) {
      const selected = candidateNodes[Math.floor(Math.random() * candidateNodes.length)];
      this.log(`Node ${selected.id} selected for Task ${task.id}`);
      return selected;
    }

    this.log(`No suitable node found for Task ${task.id}`);
    return null;
  }

  private log(msg: string) {
    console.log(`[SwarmLogs:ResourceAllocator] ${msg}`);
  }
}
