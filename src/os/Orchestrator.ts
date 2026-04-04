import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const AGENT_DIR = path.join(process.cwd(), 'agent');
const POD_DIR = path.join(process.cwd(), 'pod');
const COMM_DIR = path.join(process.cwd(), 'comm');

// Ensure OS directories exist
[AGENT_DIR, POD_DIR, COMM_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const pods = new Map<string, ChildProcess>();

export class Orchestrator {
    static start() {
        console.log('\n=========================================');
        console.log('[OS] MATRIX_SWARM Hive Mind Booting...');
        console.log('=========================================\n');
        
        this.scanAndSpawn();
        
        // Watch for new or updated agents (Hot-Swapping)
        fs.watch(AGENT_DIR, (eventType, filename) => {
            if (filename && filename.endsWith('.ts')) {
                console.log(`[OS] Detected agent DNA change: ${filename} (${eventType})`);
                this.spawnAgent(filename);
            }
        });
    }

    static scanAndSpawn() {
        const agents = fs.readdirSync(AGENT_DIR).filter(f => f.endsWith('.ts'));
        if (agents.length === 0) {
            console.log('[OS] No agents found in /agent directory. Waiting...');
        }
        for (const agent of agents) {
            this.spawnAgent(agent);
        }
    }

    static spawnAgent(filename: string) {
        const agentId = filename.replace('.ts', '');
        
        // Kill existing pod if hot-swapping
        if (pods.has(agentId)) {
            console.log(`[OS] Terminating existing pod for ${agentId}...`);
            pods.get(agentId)?.kill();
        }

        console.log(`[OS] Spawning pod for ${agentId}...`);
        
        // Spawn the agent process
        const child = spawn('npx', ['tsx', path.join(AGENT_DIR, filename)], {
            stdio: 'inherit',
            env: { ...process.env, AGENT_ID: agentId }
        });

        pods.set(agentId, child);

        child.on('exit', (code) => {
            console.log(`[OS] Pod ${agentId} exited with code ${code}.`);
            pods.delete(agentId);
            
            // Self-healing: restart after 3 seconds if it wasn't a deliberate kill
            setTimeout(() => {
                if (!pods.has(agentId) && fs.existsSync(path.join(AGENT_DIR, filename))) {
                    console.log(`[OS] Resurrecting ${agentId}...`);
                    this.spawnAgent(filename);
                }
            }, 3000);
        });
    }
}

// Start the OS if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    Orchestrator.start();
}
