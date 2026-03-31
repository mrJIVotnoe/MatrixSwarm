import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import * as admin from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

// Initialize Firebase Admin
admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = getFirestore();

// Types
interface Task {
  id: string;
  type: string;
  payload: any;
  priority: number;
  status: "pending" | "running" | "completed" | "failed";
  created_at: Timestamp;
  updated_at: Timestamp;
  assigned_node: string | null;
  result: any;
  error: string | null;
  attempts: number;
}

interface Node {
  id: string;
  address: string;
  capabilities: string[];
  ram_mb: number;
  cpu_cores: number;
  ai_capable: boolean;
  ai_tier: "none" | "slm_1.5b" | "slm_3b" | "llm";
  load: number;
  status: "online" | "overheated" | "offline";
  last_heartbeat: Timestamp;
  temperature: number;
}

const TASK_REQUIREMENTS: Record<string, { minRamMb: number; aiTier: string }> = {
  generic: { minRamMb: 0, aiTier: "none" },
  text_classification: { minRamMb: 1500, aiTier: "slm" },
  speech_to_text: { minRamMb: 2000, aiTier: "slm" },
  "llm_1.5b": { minRamMb: 2000, aiTier: "slm" },
  "llm_3b": { minRamMb: 3500, aiTier: "slm" },
  "llm_7b": { minRamMb: 5000, aiTier: "llm" },
  "llm_8b": { minRamMb: 6000, aiTier: "llm" },
  image_processing: { minRamMb: 2000, aiTier: "slm" },
  video_transcode: { minRamMb: 3000, aiTier: "slm" },
  file_storage: { minRamMb: 0, aiTier: "none" },
};

// Cleanup intervals
const NODE_TIMEOUT_MS = 30000; // 30 seconds
const TASK_PRUNE_AGE_MS = 300000; // 5 minutes
const TASK_WATCHDOG_TIMEOUT_MS = 120000; // 2 minutes

setInterval(async () => {
  try {
    const now = Timestamp.now();
    const thirtySecondsAgo = Timestamp.fromMillis(now.toMillis() - NODE_TIMEOUT_MS);
    const fiveMinutesAgo = Timestamp.fromMillis(now.toMillis() - TASK_PRUNE_AGE_MS);
    const twoMinutesAgo = Timestamp.fromMillis(now.toMillis() - TASK_WATCHDOG_TIMEOUT_MS);

    // Cleanup stale nodes
    const staleNodes = await db.collection("nodes")
      .where("status", "!=", "offline")
      .where("last_heartbeat", "<", thirtySecondsAgo)
      .get();
    
    const batch = db.batch();
    staleNodes.forEach(doc => {
      batch.update(doc.ref, { status: "offline" });
    });

    // Delete very old nodes
    const veryOldNodes = await db.collection("nodes")
      .where("last_heartbeat", "<", Timestamp.fromMillis(now.toMillis() - 3600000))
      .get();
    veryOldNodes.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Re-queue tasks stuck in 'running' state for too long (Watchdog)
    const stuckTasks = await db.collection("tasks")
      .where("status", "==", "running")
      .where("updated_at", "<", twoMinutesAgo)
      .get();
    
    if (!stuckTasks.empty) {
      console.log(`[WATCHDOG] Re-queued ${stuckTasks.size} stuck tasks.`);
      stuckTasks.forEach(doc => {
        batch.update(doc.ref, { 
          status: "pending", 
          assigned_node: null, 
          updated_at: now 
        });
      });
    }

    // Prune old completed/failed tasks
    const oldTasks = await db.collection("tasks")
      .where("status", "in", ["completed", "failed"])
      .where("created_at", "<", fiveMinutesAgo)
      .get();
    oldTasks.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    if (!stuckTasks.empty) broadcastStatus();
  } catch (err) {
    console.error("[SYSTEM] Cleanup error:", err);
  }
}, 10000);

// WebSocket Broadcasting
let wss: WebSocketServer;

async function getSwarmStatus() {
  const tasksSnapshot = await db.collection("tasks").get();
  const nodesSnapshot = await db.collection("nodes").get();

  const taskStats: any = { pending: 0, running: 0, completed: 0, failed: 0 };
  tasksSnapshot.forEach(doc => {
    const data = doc.data();
    taskStats[data.status] = (taskStats[data.status] || 0) + 1;
  });

  const nodesByTier: any = { none: 0, "slm_1.5b": 0, "slm_3b": 0, llm: 0 };
  let onlineNodes = 0;
  let overheatedNodes = 0;

  nodesSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.status === "online") onlineNodes++;
    if (data.status === "overheated") overheatedNodes++;
    nodesByTier[data.ai_tier] = (nodesByTier[data.ai_tier] || 0) + 1;
  });

  return {
    totalTasks: tasksSnapshot.size,
    pendingTasks: taskStats.pending,
    runningTasks: taskStats.running,
    completedTasks: taskStats.completed,
    failedTasks: taskStats.failed,
    totalNodes: nodesSnapshot.size,
    onlineNodes,
    overheatedNodes,
    nodesByAiTier: nodesByTier,
  };
}

async function broadcastStatus() {
  if (!wss) return;
  try {
    const status = await getSwarmStatus();
    const message = JSON.stringify({ type: "SWARM_STATUS", data: status });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } catch (err) {
    console.error("[WS] Broadcast error:", err);
  }
}

function calculateAiTier(ramMb: number, aiCapable: boolean): "none" | "slm_1.5b" | "slm_3b" | "llm" {
  if (!aiCapable || ramMb < 2000) return "none";
  if (ramMb < 3500) return "slm_1.5b";
  if (ramMb < 5000) return "slm_3b";
  return "llm";
}

function canHandleTask(node: any, taskType: string): boolean {
  const req = TASK_REQUIREMENTS[taskType] || TASK_REQUIREMENTS.generic;
  if (node.ram_mb < req.minRamMb) return false;
  
  if (req.aiTier === "llm" && node.ai_tier !== "llm") return false;
  if (req.aiTier === "slm" && !["slm_1.5b", "slm_3b", "llm"].includes(node.ai_tier)) return false;
  
  if (req.aiTier !== "none" && node.temperature > 45) return false;
  
  return true;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json());

  // API Routes
  const api = express.Router();

  api.post("/task", async (req, res) => {
    const { type = "generic", payload = {}, priority = 5 } = req.body;
    const taskId = uuidv4().slice(0, 12);
    
    try {
      const now = Timestamp.now();
      await db.collection("tasks").doc(taskId).set({
        id: taskId,
        type,
        payload,
        priority,
        status: "pending",
        created_at: now,
        updated_at: now,
        assigned_node: null,
        attempts: 0
      });
      broadcastStatus();
      res.status(201).json({ success: true, taskId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  api.get("/task/:taskId", async (req, res) => {
    try {
      const doc = await db.collection("tasks").doc(req.params.taskId).get();
      if (!doc.exists) return res.status(404).json({ error: "Task not found" });
      const data = doc.data();
      if (data) {
        data.created_at = data.created_at?.toDate().toISOString();
        data.updated_at = data.updated_at?.toDate().toISOString();
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  api.post("/node/register", async (req, res) => {
    const { node_id, address, capabilities = ["generic"], ram_mb = 4000, cpu_cores = 4, ai_capable = false } = req.body;
    const id = node_id || uuidv4().slice(0, 8);
    const aiTier = calculateAiTier(ram_mb, ai_capable);
    
    try {
      const now = Timestamp.now();
      await db.collection("nodes").doc(id).set({
        id,
        address: address || req.ip,
        capabilities,
        ram_mb,
        cpu_cores,
        ai_capable,
        ai_tier: aiTier,
        load: 0,
        status: "online",
        temperature: 0,
        last_heartbeat: now
      }, { merge: true });
      
      broadcastStatus();
      res.status(201).json({ success: true, nodeId: id, aiTier });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to register node" });
    }
  });

  api.post("/node/:nodeId/heartbeat", async (req, res) => {
    const { load = 0, temperature = 0 } = req.body;
    const status = temperature > 50 ? "overheated" : "online";
    
    try {
      const docRef = db.collection("nodes").doc(req.params.nodeId);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Node not found" });

      await docRef.update({
        last_heartbeat: Timestamp.now(),
        load,
        temperature,
        status
      });
      
      broadcastStatus();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Heartbeat failed" });
    }
  });

  api.get("/node/:nodeId/task", async (req, res) => {
    try {
      const nodeDoc = await db.collection("nodes").doc(req.params.nodeId).get();
      if (!nodeDoc.exists) return res.status(404).json({ error: "Node not found" });
      
      const node = nodeDoc.data();
      if (node?.status !== "online") return res.status(400).json({ error: `Node status: ${node?.status}` });
      if (node?.temperature > 45) return res.status(400).json({ error: "Node overheated" });

      // Find pending tasks
      const tasksSnapshot = await db.collection("tasks")
        .where("status", "==", "pending")
        .get();
      
      // Sort in memory to avoid index requirement for composite query
      const sortedTasks = tasksSnapshot.docs
        .map(doc => doc.data())
        .sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return a.created_at.toMillis() - b.created_at.toMillis();
        });
      
      let suitableTask = null;
      for (const t of sortedTasks) {
        if (canHandleTask(node, t.type)) {
          suitableTask = t;
          break;
        }
      }

      if (!suitableTask) return res.json({ task: null });

      // Assign task
      await db.collection("tasks").doc(suitableTask.id).update({
        status: "running",
        assigned_node: node?.id,
        attempts: FieldValue.increment(1),
        updated_at: Timestamp.now()
      });

      broadcastStatus();
      res.json({ task: suitableTask });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Task retrieval failed" });
    }
  });

  api.post("/task/:taskId/complete", async (req, res) => {
    try {
      const taskRef = db.collection("tasks").doc(req.params.taskId);
      const doc = await taskRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Task not found" });
      
      const data = doc.data();
      await taskRef.update({
        status: "completed",
        result: req.body.result,
        updated_at: Timestamp.now()
      });
      
      const nodeId = data?.assigned_node;
      if (nodeId) {
        await db.collection("nodes").doc(nodeId).update({
          load: FieldValue.increment(-20)
        });
      }
      
      broadcastStatus();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Completion failed" });
    }
  });

  api.post("/task/:taskId/fail", async (req, res) => {
    try {
      const taskRef = db.collection("tasks").doc(req.params.taskId);
      const doc = await taskRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Task not found" });

      await taskRef.update({
        status: "failed",
        error: req.body.error || "Unknown error",
        updated_at: Timestamp.now()
      });
      broadcastStatus();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failure report failed" });
    }
  });

  api.get("/swarm/status", async (req, res) => {
    try {
      const status = await getSwarmStatus();
      res.json(status);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Status retrieval failed" });
    }
  });

  api.get("/nodes", async (req, res) => {
    try {
      const result = await db.collection("nodes").orderBy("last_heartbeat", "desc").get();
      const nodes: any[] = [];
      result.forEach(doc => {
        const data = doc.data();
        data.last_heartbeat = data.last_heartbeat?.toDate().toISOString();
        nodes.push(data);
      });
      res.json(nodes);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch nodes" });
    }
  });

  api.get("/tasks/recent", async (req, res) => {
    try {
      const result = await db.collection("tasks").orderBy("created_at", "desc").limit(10).get();
      const tasks: any[] = [];
      result.forEach(doc => {
        const data = doc.data();
        data.created_at = data.created_at?.toDate().toISOString();
        data.updated_at = data.updated_at?.toDate().toISOString();
        tasks.push(data);
      });
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch recent tasks" });
    }
  });

  app.use("/api/v1", api);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = createServer(app);
  
  // Setup WebSocket Server
  wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    console.log("[WS] Client connected");
    broadcastStatus(); // Send initial status
    ws.on("close", () => console.log("[WS] Client disconnected"));
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

