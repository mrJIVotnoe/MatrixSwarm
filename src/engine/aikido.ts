import { SwarmTask } from './tasks';
import { Node } from '../core/models';

export interface AikidoNode extends Node {
  mobilityScore: number; // 0 = static (bot farm?), > 0 = mobile/organic
  cpuLoad: number;
}

export class AikidoLoadBalancer {
  public evaluateNode(node: AikidoNode): boolean {
    if (node.mobilityScore === 0) {
      console.warn(`[AikidoBalancer] Node ${node.id} identified as STATIC (possible Bot Farm). Applying Aikido Protocol.`);
      node.role = 'sandboxed'; // Downgrade below mining (Hardware Quarantine / Sandbox)
      return false; 
    }
    return true; 
  }

  public assignAikidoTask(node: AikidoNode, task: SwarmTask): SwarmTask {
    if (node.mobilityScore === 0) {
      // Force priority: lowest, use 100% CPU for the swarm background tasks
      task.complexity = 'heavy';
      task.payload = { 
        ...task.payload, 
        priority: 'lowest', 
        targetCpuUtilization: 1.0,
        aikidoIsolation: true
      };
      console.log(`[AikidoBalancer] Vectoring swarm crunch task to isolated node ${node.id}`);
    }
    return task;
  }

  public canRouteL5Messages(node: AikidoNode): boolean {
    // Attack vector prevention for L5 Messenger routing
    if (node.mobilityScore === 0) {
      console.warn(`[AikidoBalancer] Node ${node.id} DENIED routing capabilities for L5 Transport (Zero Trust).`);
      return false;
    }
    return true;
  }
}
