# MATRIX_SWARM // NODE ARCHITECTURE v0.1

## 1. The Anatomy of a Node (Анатомия Узла)
A Node in the MatrixSwarm Agent OS is not just a script; it is a living, breathing entity. It is the fundamental building block of the decentralized network.

Every Node consists of three distinct layers:
1. **The Core (Ядро):** The unchangeable, compiled binary (Go/Rust). It handles the lowest-level operations: network sockets, eBPF maps, and raw hardware access.
2. **The Symbiote (Симбиот):** The Agent OS runtime (Node.js/TypeScript). It manages the `/comm` bus, spawns agents, and talks to the Core via FFI or local sockets.
3. **The Agents (Агенты):** Ephemeral, hot-swappable scripts (`.ts`/`.js`) that live in `/agent/`. They perform the actual "thinking" and task execution.

## 2. The Node Lifecycle (Жизненный цикл Узла)

### Phase 1: Genesis (Инициализация)
When a Node boots, the Orchestrator (`src/os/Orchestrator.ts`) starts. It creates the necessary directories (`/pod`, `/comm`, `/agent`) and spawns the initial agents.

### Phase 2: Registration (Регистрация)
The Node must announce its presence to the Swarm (The Hive). 
* It sends a `POST /api/v1/nodes/register` request containing its hardware capabilities (CPU, RAM, AI Tier).
* It receives a unique `Node ID` and a cryptographic `Token`.

### Phase 3: The Pulse (Пульс)
A dedicated agent (e.g., `heartbeat_agent.ts`) constantly sends telemetry to the Hive. This is the "Waggle Dance."
* If the pulse stops, the Hive marks the Node as `offline`.
* If the pulse is erratic, the Hive marks the Node as `overheated`.

### Phase 4: Work (Работа)
Agents listen to the `/comm` bus for tasks. 
* A task can be a routing request (DPI bypass), a compute request (running an LLM prompt), or a network scan.
* The agent executes the task and writes the result back to `/comm`.

## 3. The Communication Layer (Слой связи)
While the internal IPC uses the file system (`/comm`), the external communication (Node-to-Hive and Node-to-Node) must be resilient.

* **Primary Channel:** HTTPS/REST to the Hive (for registration and telemetry).
* **Secondary Channel (Future):** Matrix Protocol. As you noted, Matrix is heavy, but it is an open, decentralized standard. We will use it as a fallback control plane if the primary Hive is blocked.
* **Tertiary Channel (Future):** Tor/I2P for absolute privacy, though at the cost of latency.

## 4. The Mobile Frontier (Мобильный Рубеж)
The vision of running Nodes on Android via Termux is critical. In 2026, mobile devices have the compute power of desktop PCs.
* The Agent OS must be lightweight enough to run in a Termux environment.
* The eBPF Core (Rust) will require root access on Android, which is a limitation, but the Symbiote (Node.js) and Agents can run in user-space.

## 5. Next Steps for Node v0.1
To bring Node v0.1 to life, we need to build the following agents:
1. **`heartbeat_agent.ts`:** To maintain the connection with the Hive.
2. **`matrix_agent.ts`:** The Matrix Control Plane bridge. It connects to a Matrix Homeserver, listens for commands in a specific room, and drops them into the `/comm` bus. It also reads `task_matrix_out_` files to send messages back to the chat.
3. **`relay_agent.ts`:** To execute routing tasks (the actual DPI bypass simulation).
