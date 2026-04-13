# MATRIX_SWARM // Agent OS

![Version](https://img.shields.io/badge/version-0.3.0--agent_os-green.svg)
![Status](https://img.shields.io/badge/status-Active_Development-yellow.svg)
![Architecture](https://img.shields.io/badge/architecture-File_Driven_IPC-blue.svg)

## 🧠 What is MatrixSwarm?

MatrixSwarm is not just a framework; it is an **Agent OS** (Operating System for AI Agents). 

We are building a decentralized, fault-tolerant execution environment where AI agents act as independent processes communicating through a unified file-system message bus. 

**The core philosophy:** Agents do not call each other's APIs. They observe the environment, react to files, and write results back. 

### ⚡ Key Features
* **File-Driven IPC:** The file system is the message bus. No complex message brokers (Kafka/RabbitMQ) required. It's transparent, easily debuggable, and persistent by default.
* **Self-Healing (Fault Tolerance):** Agents monitor each other. If an agent crashes or hangs, the Swarm detects the absence of a heartbeat and resurrects it.
* **Hot-Swapping:** You can replace an agent's logic (its "DNA") on the fly without stopping the system. The Swarm will gracefully restart the process.
* **Actor Model:** True isolation. Agents only know about the tasks in the `/comm` directory, not about who created them.

---

## 🚀 Quick Start (5-Minute Onboarding)

*Note: The system is currently in active architectural transition. The following represents the target state.*

### 1. The Directory Structure (The Grid)
When you initialize the Swarm, it creates three core directories:
* `/agent/` - The source code and definitions (DNA) of your agents.
* `/pod/` - The runtime environment. Where the actual agent processes live and execute.
* `/comm/` - The Message Bus. Agents read tasks from here and write results back.

### 2. Hello, Agent! (Minimal Example)
To create an agent, you simply drop a script into the `/agent/` directory.

**Example: `agent/hello_agent.js`**
```javascript
// A simple agent that listens for 'greet' tasks
const fs = require('fs');

// The agent watches the /comm/ directory
fs.watch('./comm', (eventType, filename) => {
  if (filename.startsWith('task_greet_')) {
    const task = JSON.parse(fs.readFileSync(`./comm/${filename}`));
    
    // Process the task
    const result = { id: task.id, message: `Hello, ${task.payload.name}!` };
    
    // Write the result back to the bus
    fs.writeFileSync(`./comm/result_${task.id}.json`, JSON.stringify(result));
    
    // Clean up the task
    fs.unlinkSync(`./comm/${filename}`);
  }
});
```

### 3. Ignite the Swarm
Start the core orchestrator (The Hive Mind):
```bash
npm run start
```
The orchestrator will automatically read `/agent/`, spawn the processes in `/pod/`, and monitor their health.

---

## 📖 The Canon (Architecture & Rules)

To understand the deep mechanics, protocols, and constraints of the Swarm, you **must** read the [PROJECT_CANON.md](./PROJECT_CANON.md). 

To understand the profound philosophy behind giving obsolete devices a "second life" and the biological/quantum metaphors driving the architecture, read:
* 📜 **[WHITEPAPER.md](./WHITEPAPER.md)** - The grand vision of the Matrix Swarm.
* 🧘 **[PHILOSOPHY.md](./docs/PHILOSOPHY.md)** - The dialogues and strategic thoughts of the Architect and AI.

It covers:
* The `.cmd` and `.json` file protocols.
* How to prevent Race Conditions (Locking mechanisms).
* The exact lifecycle of an Agent (Spawn -> Listen -> Act -> Report -> Die).

---

## 🎯 Use Cases (Why build this?)

MatrixSwarm is designed for complex, multi-step AI orchestration where reliability is paramount:
1. **AI Orchestration & Research:** Running multiple LLMs/SLMs that debate, verify, and synthesize data asynchronously.
2. **Autonomous OS Agents:** Agents that monitor system health, manage files, or execute cron-like tasks based on complex environmental triggers.
3. **Trading & Monitoring Bots:** Systems where components must be hot-swappable (e.g., updating a trading strategy without bringing down the data-ingestion agent).

---

## 🤝 Contributing & The Future

We are moving towards a hybrid model (File-system + Memory Bus) to handle massive scaling while preserving the debuggability of the file-driven approach. 

If you think in systems, love autonomous structures, and aren't afraid of complex concepts — welcome to the Swarm.
