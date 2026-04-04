import { AgentCore } from '../src/os/AgentCore';

// Initialize the agent. It will automatically pick up its ID from the Orchestrator.
const agent = new AgentCore();

console.log(`[${agent.agentId}] Boot sequence complete. Online.`);

// Listen for tasks starting with 'task_greet_'
agent.watchTasks('task_greet_', async (task) => {
    console.log(`[${agent.agentId}] Received greeting request from ${task.issuer} for: ${task.payload.name}`);
    
    // Simulate some "AI" thinking time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
        message: `Hello, ${task.payload.name}! The Swarm acknowledges your presence.`,
        processedBy: agent.agentId,
        memory_usage: process.memoryUsage().heapUsed
    };
});
