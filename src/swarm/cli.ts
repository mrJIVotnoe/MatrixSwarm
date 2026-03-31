/**
 * MatrixSwarm CLI Node Client
 * Used to register and start a node from the command line.
 */

import { runBenchmark } from "./benchmark";

interface NodeConfig {
  node_id: string;
  address: string;
  capabilities: string[];
  ram_mb: number;
  cpu_cores: number;
  ai_capable: boolean;
  privacy_mode: "public" | "matrix" | "i2p";
}

export class MatrixSwarmCLI {
  private nodeId: string | null = null;
  private token: string | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3000/api/v1") {
    this.baseUrl = baseUrl;
  }

  async register(config: NodeConfig) {
    console.log("[CLI] Registering node with swarm...");
    try {
      const response = await fetch(`${this.baseUrl}/node/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (data.success) {
        this.nodeId = data.nodeId;
        this.token = data.token;
        console.log(`[CLI] Node registered: ${this.nodeId}`);
        console.log(`[CLI] Node token: ${this.token}`);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[CLI] Registration failed:", err);
      return false;
    }
  }

  async runBenchmark() {
    if (!this.nodeId || !this.token) return;
    console.log("[CLI] Running benchmark...");
    const result = await runBenchmark();
    try {
      await fetch(`${this.baseUrl}/node/${this.nodeId}/benchmark`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-node-token": this.token
        },
        body: JSON.stringify(result)
      });
      console.log("[CLI] Benchmark results uploaded.");
    } catch (err) {
      console.error("[CLI] Benchmark upload failed:", err);
    }
  }

  async heartbeat() {
    if (!this.nodeId || !this.token) return;
    try {
      await fetch(`${this.baseUrl}/node/${this.nodeId}/heartbeat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-node-token": this.token
        },
        body: JSON.stringify({
          load: Math.floor(Math.random() * 100),
          temperature: 30 + Math.floor(Math.random() * 20)
        })
      });
    } catch (err) {
      console.error("[CLI] Heartbeat failed:", err);
    }
  }

  start(intervalMs: number = 10000) {
    console.log("[CLI] Starting swarm node client...");
    setInterval(() => this.heartbeat(), intervalMs);
    // Run benchmark every hour
    setInterval(() => this.runBenchmark(), 3600000);
    this.runBenchmark(); // Initial benchmark
  }
}
