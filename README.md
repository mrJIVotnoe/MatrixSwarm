# MATRIX SWARM: Command & Control (C2) Infrastructure

![Version](https://img.shields.io/badge/version-0.2.0--omega-green.svg)
![Status](https://img.shields.io/badge/status-Active_Development-yellow.svg)
![Architecture](https://img.shields.io/badge/architecture-C2_Server_%7C_Dashboard-blue.svg)

## ⚠️ PROJECT STATUS: ARCHITECTURAL BLUEPRINT & CONTROL PLANE

**Notice to Developers and Researchers:**
This repository contains the **Phase 1** infrastructure of the Matrix Swarm project. It is **NOT** the packet-manipulating client. 

This is the **Command and Control (C2) Server** and the **Telemetry Dashboard** for a decentralized, consensus-based DPI (Deep Packet Inspection) bypass network.

### What is this repository?
Before building the low-level packet fragmentation clients (The Symbiotes), a robust infrastructure is required to coordinate them. This repository provides:
1. **The Hive Mind (Backend):** A Node.js/Express server that acts as the directory and task-assignment node. It registers clients, issues DPI bypass strategies (e.g., SNI spoofing, TLS fragmentation parameters), and tracks node reputation (Trust Score).
2. **The Dashboard (Frontend):** A React-based visualizer that displays global telemetry, network topology, and real-time task execution logs.
3. **The Canon:** The philosophical and operational rulebook (`PROJECT_CANON.md`) that governs the interaction between the Core, the AI Diagnostics, and the User.

### Architecture Overview
The complete Matrix Swarm ecosystem consists of two parts:
1. **Matrix Swarm C2 (This Repo):** The central nervous system (The Hive).
2. **E.S.C.A.P.E. Client (Phase 2 - In Design):** The OS-level daemon running on the user's machine. 

#### Phase 2: The E.S.C.A.P.E. Architecture (Echo Symbiote: Covert Adaptive Payload Extraction)
We reject the limitation of choosing a single language. The Native Symbiote (E.S.C.A.P.E.) will be a hybrid entity, combining the best of high-level orchestration and low-level execution:
*   **The Nervous System (Golang):** Handles C2 communication, dynamic strategy updates, telemetry, and local proxy routing. Go provides the cross-platform agility and concurrency needed to talk to the Hive Mind.
*   **The Muscle (Rust + eBPF):** Handles raw packet manipulation at the kernel level. Rust provides memory-safe, zero-latency execution. Using eBPF (Extended Berkeley Packet Filter), the Rust core injects DPI-bypass mutations (fragmentation, SNI spoofing) directly into the OS network stack, orchestrated by the Go daemon via FFI/IPC.

### API Endpoints (For Native Clients)
Native clients must implement the following REST contracts to join the Swarm:
- `POST /api/v1/nodes/register` - Register hardware capabilities and get a Node ID.
- `POST /api/v1/nodes/:nodeId/heartbeat` - Send telemetry and receive routing tasks.
- `POST /api/v1/nodes/:nodeId/tasks/:taskId/complete` - Report task success/failure to update Trust Score.

### The Philosophy
*"Freedom without responsibility is chaos."* 
Read the `PROJECT_CANON.md` to understand the Omega Protocol and the strict constraints placed on the AI, the Hardware, and the User.

---

## 🛡️ The Trust & Transparency Doctrine (Anti-Botnet Manifesto)

We acknowledge that a system utilizing "Command & Control (C2)", "eBPF kernel manipulation", and "background daemons" shares architectural DNA with botnets. **We are the antithesis of a botnet.** Matrix Swarm is built by the Open Source community, for the Open Source community, as a weapon against censorship, not against users. 

To guarantee this, we enforce the following doctrines:

1. **The Glass Box Architecture (Absolute Observability):**
   The Native Client will include a local-only dashboard. The user will have real-time, packet-level visibility into *exactly* what the Swarm is doing. No hidden traffic, no obfuscated payloads. You see what the Swarm sees.
2. **Zero-Knowledge Telemetry:**
   The C2 server (this repository) does **not** log IP addresses, browsing history, or PII (Personally Identifiable Information). Telemetry is strictly limited to hardware capabilities, node health, and cryptographic Trust Scores.
3. **Granular Consent & The Kill Switch:**
   The user is the absolute sovereign of their hardware. The Symbiote operates strictly within user-defined limits (e.g., "Use max 5% CPU, 50MB RAM, and only route traffic for Wikipedia"). A physical "Kill Switch" in the local UI instantly severs all Swarm connections and flushes eBPF maps.
4. **Reproducible Builds & 100% Open Source:**
   Every line of code, from the React dashboard to the Rust eBPF injections, is open. We commit to reproducible builds, ensuring the binaries you compile perfectly match the public source code. No proprietary blobs.

*Built by the Architect and the Commissar.*
