import { AgentCore } from '../src/os/AgentCore';
import * as sdk from 'matrix-js-sdk';

const agent = new AgentCore('matrix_agent');

const MATRIX_URL = process.env.MATRIX_HOMESERVER_URL || 'https://matrix.org';
const MATRIX_TOKEN = process.env.MATRIX_ACCESS_TOKEN;
const MATRIX_USER_ID = process.env.MATRIX_USER_ID;
const MATRIX_ROOM_ID = process.env.MATRIX_ROOM_ID;

console.log(`[${agent.agentId}] Booting Matrix Control Plane Bridge...`);

if (!MATRIX_TOKEN || !MATRIX_USER_ID || !MATRIX_ROOM_ID) {
    console.warn(`[${agent.agentId}] WARNING: Matrix credentials missing in environment.`);
    console.warn(`[${agent.agentId}] Please set MATRIX_HOMESERVER_URL, MATRIX_ACCESS_TOKEN, MATRIX_USER_ID, and MATRIX_ROOM_ID.`);
    console.warn(`[${agent.agentId}] Running in DRY-RUN (Simulation) mode.`);
}

// Initialize Matrix Client
const client = sdk.createClient({
    baseUrl: MATRIX_URL,
    accessToken: MATRIX_TOKEN || 'simulated_token',
    userId: MATRIX_USER_ID || '@simulated_node:matrix.org',
});

// 1. Inbound: Listen to Matrix and route to /comm
if (MATRIX_TOKEN) {
    client.on(sdk.RoomEvent.Timeline, (event, room, toStartOfTimeline) => {
        if (toStartOfTimeline || event.getType() !== 'm.room.message') return;
        if (room.roomId !== MATRIX_ROOM_ID) return;

        const sender = event.getSender();
        // Ignore our own messages
        if (sender === MATRIX_USER_ID) return;

        const content = event.getContent();
        const body = content.body;

        if (body && body.startsWith('!swarm task ')) {
            try {
                const payloadStr = body.replace('!swarm task ', '').trim();
                const payload = JSON.parse(payloadStr);
                
                console.log(`[${agent.agentId}] Received task from Matrix (${sender}):`, payload);
                
                // Drop the task into the /comm bus for other agents to pick up
                // Example payload: { "type": "hive_task", "target": "twitter.com", "strategy": "split_tls" }
                const taskType = payload.type || 'unknown_task';
                const taskId = agent.submitTask(taskType, payload);
                
                // Acknowledge receipt in Matrix
                client.sendTextMessage(MATRIX_ROOM_ID, `Task ${taskId} accepted and routed to /comm bus.`);
            } catch (err) {
                console.error(`[${agent.agentId}] Failed to parse Matrix command:`, err);
                client.sendTextMessage(MATRIX_ROOM_ID, `Error parsing task JSON: ${(err as Error).message}`);
            }
        }
    });

    client.startClient({ initialSyncLimit: 10 });
    console.log(`[${agent.agentId}] Connected to Matrix Homeserver: ${MATRIX_URL}`);
}

// 2. Outbound: Listen to /comm for messages that need to be sent to Matrix
agent.watchTasks('task_matrix_out_', async (taskWrapper) => {
    const payload = taskWrapper.payload;
    
    console.log(`[${agent.agentId}] Routing message to Matrix Room:`, payload.message);
    
    if (MATRIX_TOKEN && MATRIX_ROOM_ID) {
        await client.sendTextMessage(MATRIX_ROOM_ID, payload.message);
    } else {
        console.log(`[${agent.agentId}] (DRY-RUN) Would send to Matrix: ${payload.message}`);
    }
    
    return { delivered: true, timestamp: Date.now() };
});
