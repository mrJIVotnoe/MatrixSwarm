import fs from 'fs';
import path from 'path';

const COMM_DIR = path.join(process.cwd(), 'comm');

export class AgentCore {
    public agentId: string;

    constructor(agentId?: string) {
        this.agentId = agentId || process.env.AGENT_ID || `agent_${Math.random().toString(36).substring(7)}`;
        
        if (!fs.existsSync(COMM_DIR)) {
            fs.mkdirSync(COMM_DIR, { recursive: true });
        }
    }

    /**
     * Watches the /comm directory for specific tasks and processes them.
     * Uses atomic renaming to prevent race conditions between multiple agents.
     */
    watchTasks(taskPrefix: string, handler: (task: any) => Promise<any>) {
        console.log(`[${this.agentId}] Watching for tasks matching: ${taskPrefix}...`);
        
        const processFile = async (filename: string) => {
            const filePath = path.join(COMM_DIR, filename);
            const processingPath = filePath + '.processing';

            try {
                // ATOMIC LOCK: Rename the file. If another agent grabs it first, this throws.
                fs.renameSync(filePath, processingPath);
            } catch (e) {
                // File already taken by another agent or deleted. Safe to ignore.
                return;
            }

            try {
                const data = fs.readFileSync(processingPath, 'utf-8');
                const task = JSON.parse(data);
                
                console.log(`[${this.agentId}] Processing task: ${task.id}`);
                const result = await handler(task);
                
                // Write result back to the bus
                const resultPath = path.join(COMM_DIR, `result_${task.id}.json`);
                fs.writeFileSync(resultPath, JSON.stringify({
                    id: task.id,
                    status: 'success',
                    responder: this.agentId,
                    timestamp: Date.now(),
                    data: result
                }, null, 2));

                // Cleanup the processing file
                fs.unlinkSync(processingPath);
                console.log(`[${this.agentId}] Task ${task.id} completed.`);
            } catch (err) {
                console.error(`[${this.agentId}] Task failed:`, err);
                // In a production system, we'd write a failed result.json here.
                try { fs.unlinkSync(processingPath); } catch (e) {}
            }
        };

        // Watch for new files
        fs.watch(COMM_DIR, (eventType, filename) => {
            if (filename && filename.startsWith(taskPrefix) && filename.endsWith('.json')) {
                processFile(filename);
            }
        });

        // Initial sweep for existing tasks
        fs.readdirSync(COMM_DIR).forEach(file => {
            if (file.startsWith(taskPrefix) && file.endsWith('.json')) {
                processFile(file);
            }
        });
    }
    
    /**
     * Submits a new task to the /comm bus.
     */
    submitTask(taskType: string, payload: any): string {
        const id = Math.random().toString(36).substring(2, 10);
        const filename = `task_${taskType}_${id}.json`;
        const filePath = path.join(COMM_DIR, filename);
        
        fs.writeFileSync(filePath, JSON.stringify({
            id,
            type: taskType,
            issuer: this.agentId,
            timestamp: Date.now(),
            payload
        }, null, 2));
        
        return id;
    }
}
