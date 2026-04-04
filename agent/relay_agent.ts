import { AgentCore } from '../src/os/AgentCore';

const agent = new AgentCore('relay_agent');

console.log(`[${agent.agentId}] Online. Awaiting routing tasks...`);

agent.watchTasks('task_hive_task_', async (taskWrapper) => {
    const task = taskWrapper.payload;
    console.log(`[${agent.agentId}] Executing routing task to: ${task.target} using strategy: ${task.strategy}`);
    
    // Simulate the actual routing/DPI bypass work
    const latency = Math.floor(Math.random() * 150) + 20; // 20-170ms
    const success = Math.random() > 0.1; // 90% success rate
    
    await new Promise(resolve => setTimeout(resolve, latency));
    
    console.log(`[${agent.agentId}] Task complete. Success: ${success}, Latency: ${latency}ms`);
    
    // In a full implementation, this agent would also send the telemetry back to the Hive,
    // or drop a 'telemetry_report' task into /comm for another agent to handle.
    
    return {
        success,
        latency_ms: latency,
        target: task.target
    };
});
