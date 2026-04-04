import { AgentCore } from '../src/os/AgentCore';
import fs from 'fs';
import path from 'path';

const agent = new AgentCore('issuer_bot');
const COMM_DIR = path.join(process.cwd(), 'comm');

console.log(`[${agent.agentId}] Online. Issuing task...`);

// Issue a task to the bus
const taskId = agent.submitTask('greet', { name: 'Architect' });
console.log(`[${agent.agentId}] Task ${taskId} issued. Watching for result...`);

// Watch for the specific result
const watcher = fs.watch(COMM_DIR, (eventType, filename) => {
    if (filename === `result_${taskId}.json`) {
        const data = fs.readFileSync(path.join(COMM_DIR, filename), 'utf-8');
        const result = JSON.parse(data);
        
        console.log(`\n[${agent.agentId}] === RESULT RECEIVED ===`);
        console.log(JSON.stringify(result, null, 2));
        console.log(`===========================\n`);
        
        // Clean up the result file
        fs.unlinkSync(path.join(COMM_DIR, filename));
        
        // Exit the issuer bot
        process.exit(0);
    }
});
