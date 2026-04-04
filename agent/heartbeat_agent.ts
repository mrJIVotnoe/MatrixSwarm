import { AgentCore } from '../src/os/AgentCore';

const agent = new AgentCore('heartbeat_agent');
const HIVE_URL = process.env.HIVE_URL || 'http://localhost:3000';

console.log(`[${agent.agentId}] Online. Commencing pulse...`);

async function sendHeartbeat() {
    try {
        // In a real scenario, we'd have a registered Node ID. 
        // For now, we simulate it or use the agent ID.
        const nodeId = process.env.NODE_ID || 'simulated_node_1';
        
        const response = await fetch(`${HIVE_URL}/api/v1/nodes/${nodeId}/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                isp: 'Matrix_Telecom',
                status: 'online'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`[${agent.agentId}] Pulse acknowledged. Trust score: ${data.trust_score}`);
            
            // If the Hive assigned a task during the heartbeat, drop it into the /comm bus
            if (data.task) {
                console.log(`[${agent.agentId}] Received task from Hive: ${data.task.id}`);
                agent.submitTask('hive_task', data.task);
            }
        } else {
            console.warn(`[${agent.agentId}] Pulse failed: ${response.status}`);
        }
    } catch (err) {
        console.error(`[${agent.agentId}] Hive unreachable.`);
    }
}

// Send heartbeat every 10 seconds
setInterval(sendHeartbeat, 10000);
sendHeartbeat(); // Initial pulse
