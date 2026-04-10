import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./src/db.js";
import { Commissar } from "./src/commissar.js";
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { MatrixService } from "./src/services/matrixService.js";

// In-memory fallback for tasks (since they are ephemeral)
const activeTasks = new Map<string, any>();
const connectedNodes = new Map<string, WebSocket>();
const COMM_DIR = path.join(process.cwd(), 'comm');

let matrixEcho: MatrixService | null = null;

if (process.env.MATRIX_BASE_URL && process.env.MATRIX_ACCESS_TOKEN && process.env.MATRIX_ROOM_ID) {
  matrixEcho = new MatrixService(
    process.env.MATRIX_BASE_URL,
    process.env.MATRIX_ACCESS_TOKEN,
    process.env.MATRIX_ROOM_ID,
    process.env.MATRIX_USER_ID,
    process.env.SWARM_ENCRYPTION_KEY
  );
  matrixEcho.start().catch(err => console.error("[HIVE] Matrix Echo failed to start:", err));
} else {
  console.warn("[HIVE] Matrix credentials missing. The Echo protocol will be simulated locally.");
}

if (!fs.existsSync(COMM_DIR)) {
  fs.mkdirSync(COMM_DIR, { recursive: true });
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- WEBSOCKET LOGIC ---
  wss.on('connection', (ws) => {
    let nodeId: string | null = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth') {
          nodeId = data.nodeId;
          if (nodeId) {
            connectedNodes.set(nodeId, ws);
            console.log(`[HIVE] Node ${nodeId} connected via WebSocket`);
            ws.send(JSON.stringify({ type: 'auth_success', message: 'Connected to the Hive' }));
          }
        }

        if (data.type === 'pulse' && nodeId) {
          // Update last heartbeat in DB
          const db = await getDb();
          await db.run('UPDATE nodes SET last_heartbeat = ?, status = ? WHERE id = ?', [Date.now(), 'online', nodeId]);
        }

        if (data.type === 'task_complete' && nodeId) {
          // Handle task completion via WS
          // (Logic similar to the POST route)
        }
      } catch (e) {
        console.error('[HIVE] WS Message Error:', e);
      }
    });

    ws.on('close', () => {
      if (nodeId) {
        connectedNodes.delete(nodeId);
        console.log(`[HIVE] Node ${nodeId} disconnected`);
      }
    });
  });

  // Initialize DB
  const db = await getDb();

  // --- API ROUTES ---

  // 1. Swarm Status
  app.get("/api/v1/swarm/status", async (req, res) => {
    const nodes = await db.all('SELECT * FROM nodes');
    const tasks = Array.from(activeTasks.values());
    
    const nodesByAiTier = {
      none: 0,
      "slm_1.5b": 0,
      "slm_3b": 0,
      llm: 0
    };
    
    nodes.forEach(n => {
      if (n.power_rating === "llm") nodesByAiTier.llm++;
      else if (n.power_rating === "slm_3b") nodesByAiTier["slm_3b"]++;
      else if (n.power_rating === "slm_1.5b") nodesByAiTier["slm_1.5b"]++;
      else nodesByAiTier.none++;
    });

    res.json({
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      runningTasks: tasks.filter(t => t.status === 'assigned').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      totalNodes: nodes.length,
      onlineNodes: nodes.filter(n => n.status === 'online').length,
      overheatedNodes: nodes.filter(n => n.status === 'overheated').length,
      nodesByAiTier
    });
  });

  // 1.5 Recent Tasks
  app.get("/api/v1/tasks/recent", (req, res) => {
    const tasks = Array.from(activeTasks.values()).slice(-20).reverse();
    res.json(tasks);
  });

  // 1.6 Commissar Intelligence (Best Strategies per ISP)
  app.get("/api/v1/commissar/intelligence", async (req, res) => {
    const bestStrategies = await Commissar.analyzeTelemetry();
    res.json(Object.fromEntries(bestStrategies));
  });

  // 2. Node Registration (The Symbiote connects here)
  app.post("/api/v1/nodes/register", async (req, res) => {
    const id = uuidv4();
    const token = uuidv4();
    
    const node = {
      id,
      address: req.ip || req.socket.remoteAddress || "unknown",
      capabilities: JSON.stringify(req.body.capabilities || []),
      ram_mb: req.body.ram_mb || 1024,
      cpu_cores: req.body.cpu_cores || 1,
      power_rating: req.body.power_rating || "unknown",
      status: "online",
      last_heartbeat: Date.now(),
      trust_score: 50,
      token
    };

    await db.run(`
      INSERT INTO nodes (id, address, capabilities, ram_mb, cpu_cores, power_rating, status, last_heartbeat, trust_score, token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [node.id, node.address, node.capabilities, node.ram_mb, node.cpu_cores, node.power_rating, node.status, node.last_heartbeat, node.trust_score, node.token]);

    console.log(`[SWARM] New node registered: ${id} (${node.power_rating})`);
    
    res.json({ id, token, message: "Welcome to the Swarm, Citizen." });
  });

  // 3. Node Heartbeat & Task Polling
  app.post("/api/v1/nodes/:nodeId/heartbeat", async (req, res) => {
    const { nodeId } = req.params;
    const isp = req.body.isp || "unknown_isp"; // Client should send their ISP

    const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
    
    if (!node) {
      return res.status(404).json({ error: "Node not found in the Swarm." });
    }

    await db.run('UPDATE nodes SET last_heartbeat = ?, status = ? WHERE id = ?', [Date.now(), 'online', nodeId]);

    // Simulate assigning a routing task randomly (20% chance per heartbeat)
    let assignedTask = null;
    if (Math.random() < 0.2) {
      const taskId = uuidv4();
      const targets = ["twitter.com", "facebook.com", "instagram.com", "news.bbc.co.uk", "rutracker.org", "youtube.com", "discord.com"];
      
      // Commissar decides the best strategy for this ISP
      const selectedStrategy = await Commissar.getRecommendedStrategy(isp);

      assignedTask = {
        id: taskId,
        type: "byedpi_routing",
        target: targets[Math.floor(Math.random() * targets.length)],
        strategy: selectedStrategy.name,
        params: selectedStrategy.params,
        isp: isp
      };
      activeTasks.set(taskId, { ...assignedTask, status: "assigned", assigned_to: nodeId });
    }

    res.json({ status: "acknowledged", task: assignedTask, trust_score: node.trust_score });
  });

  // 3.5 Task Completion & Telemetry (The Waggle Dance)
  app.post("/api/v1/nodes/:nodeId/tasks/:taskId/complete", async (req, res) => {
    const { nodeId, taskId } = req.params;
    const { success, latency_ms } = req.body;
    
    const task = activeTasks.get(taskId);
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
    
    if (task && node) {
      task.status = success ? "completed" : "failed";
      activeTasks.set(taskId, task);
      
      // Record Telemetry (The Echo / Waggle Dance)
      await db.run(`
        INSERT INTO telemetry (id, node_id, strategy_name, target, success, latency_ms, timestamp, isp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), nodeId, task.strategy, task.target, success ? 1 : 0, latency_ms || 0, Date.now(), task.isp]);

      // Broadcast to Matrix (The Echo)
      if (matrixEcho) {
        matrixEcho.broadcastEcho({
          type: "echo_telemetry",
          isp: task.isp,
          strategy: task.strategy,
          target: task.target,
          success: !!success,
          timestamp: Date.now()
        }).catch(e => console.error("[HIVE] Matrix broadcast failed"));
      }

      // Increase trust score for successful routing
      if (success) {
        await db.run('UPDATE nodes SET trust_score = trust_score + 1 WHERE id = ?', [nodeId]);
      } else {
        await db.run('UPDATE nodes SET trust_score = trust_score - 1 WHERE id = ?', [nodeId]);
      }
    }
    
    const updatedNode = await db.get('SELECT trust_score FROM nodes WHERE id = ?', [nodeId]);
    res.json({ status: "success", trust_score: updatedNode?.trust_score });
  });

  // 4. Get all nodes (For dashboard)
  app.get("/api/v1/nodes", async (req, res) => {
    const nodes = await db.all('SELECT * FROM nodes');
    res.json(nodes);
  });

  // 5. Telegram Mini App Integration (Bridge to /comm)
  app.post("/api/v1/tma/register", (req, res) => {
    const { telegramData, hardware } = req.body;
    
    // Drop task into /comm for telegram_tma_agent to process
    const id = uuidv4().substring(0, 8);
    const filename = `task_tma_register_${id}.json`;
    const filePath = path.join(COMM_DIR, filename);
    
    fs.writeFileSync(filePath, JSON.stringify({
      id,
      type: 'tma_register',
      issuer: 'express_server',
      timestamp: Date.now(),
      payload: {
        telegramId: telegramData?.id || 'unknown',
        username: telegramData?.username || 'anonymous',
        hardware
      }
    }, null, 2));

    // In a real system, we'd wait for the result file. 
    // For this prototype, we'll return a pending status and let the client poll or just assume success.
    res.json({ status: "processing", taskId: id, message: "Registration task queued in Swarm." });
  });

  app.post("/api/v1/tma/pulse", (req, res) => {
    const { nodeId, status } = req.body;
    
    const id = uuidv4().substring(0, 8);
    const filename = `task_tma_pulse_${id}.json`;
    const filePath = path.join(COMM_DIR, filename);
    
    fs.writeFileSync(filePath, JSON.stringify({
      id,
      type: 'tma_pulse',
      issuer: 'express_server',
      timestamp: Date.now(),
      payload: { nodeId, status }
    }, null, 2));

    res.json({ status: "acknowledged" });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SWARM CORE] Server running on port ${PORT}`);
  }).on('error', (err) => {
    console.error('[SWARM CORE] Server failed to start:', err);
  });
}

startServer().catch(err => {
  console.error('[SWARM CORE] Fatal error during startup:', err);
});
