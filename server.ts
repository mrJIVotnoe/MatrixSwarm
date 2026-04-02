import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

// In-memory database for the Swarm Prototype
const db = {
  nodes: new Map<string, any>(),
  tasks: new Map<string, any>()
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- API ROUTES ---

  // 1. Swarm Status
  app.get("/api/v1/swarm/status", (req, res) => {
    const nodes = Array.from(db.nodes.values());
    const tasks = Array.from(db.tasks.values());
    
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
    const tasks = Array.from(db.tasks.values()).slice(-20).reverse();
    res.json(tasks);
  });

  // 2. Node Registration (The Symbiote connects here)
  app.post("/api/v1/nodes/register", (req, res) => {
    const id = uuidv4();
    const token = uuidv4();
    
    const node = {
      id,
      address: req.ip || req.socket.remoteAddress || "unknown",
      capabilities: req.body.capabilities || [],
      ram_mb: req.body.ram_mb || 1024,
      cpu_cores: req.body.cpu_cores || 1,
      power_rating: req.body.power_rating || "unknown",
      status: "online",
      last_heartbeat: Date.now(),
      trust_score: 50, // Initial trust score
      token
    };

    db.nodes.set(id, node);
    console.log(`[SWARM] New node registered: ${id} (${node.power_rating})`);
    
    res.json({ id, token, message: "Welcome to the Swarm, Citizen." });
  });

  // 3. Node Heartbeat & Task Polling
  app.post("/api/v1/nodes/:nodeId/heartbeat", (req, res) => {
    const { nodeId } = req.params;
    const node = db.nodes.get(nodeId);
    
    if (!node) {
      return res.status(404).json({ error: "Node not found in the Swarm." });
    }

    node.last_heartbeat = Date.now();
    node.status = "online";
    db.nodes.set(nodeId, node);

    // Simulate assigning a routing task randomly (20% chance per heartbeat)
    let assignedTask = null;
    if (Math.random() < 0.2) {
      const taskId = uuidv4();
      const targets = ["twitter.com", "facebook.com", "instagram.com", "news.bbc.co.uk", "rutracker.org", "youtube.com", "discord.com"];
      
      // Advanced ByeDPI strategies based on user's list
      const strategies = [
        { name: "split_host", params: "--split 1+s --auto=torst --drop-sack --no-domain --cache-ttl 1500" },
        { name: "fake_sni", params: "--fake -1 --ttl 8 --tfo --no-domain" },
        { name: "disorder_oob", params: "--disorder 3 --split 2+s --tlsrec 1+s --fake -1 --ttl 6 --auto=torst,redirect --tfo --cache-ttl 3600 --mod-http hcsmix --drop-sack --tls-sni tracker.opentrackr.org --timeout 5 --no-domain --def-ttl 8" },
        { name: "udp_fake", params: "--proto=udp --pf=443 --tls-sni=www.youtube.com --fake-data=':\\xC2\\x00\\x00\\x00\\x01\\x14\\x2E\\xE3\\xE3\\x5F...' --udp-fake=25 --auto=torst --split=3 --oob=5 --tlsrec=2+s --disorder=2 --cache-ttl=7200 --timeout=10 --mod-http=hcsmix --tfo --no-domain --fake=-1 --ttl=8" },
        { name: "tls_record_fragmentation", params: "--tlsrec 1 --oob 3 --timeout 7 --no-domain" },
        { name: "http_mix", params: "-s1 -q1 -Y -Ar -s5 -o1+s -At -f-1 -r1+s -As -s1 -o1+s -s-1 -An" }
      ];
      
      const selectedStrategy = strategies[Math.floor(Math.random() * strategies.length)];

      assignedTask = {
        id: taskId,
        type: "byedpi_routing",
        target: targets[Math.floor(Math.random() * targets.length)],
        strategy: selectedStrategy.name,
        params: selectedStrategy.params
      };
      db.tasks.set(taskId, { ...assignedTask, status: "assigned", assigned_to: nodeId });
    }

    res.json({ status: "acknowledged", task: assignedTask, trust_score: node.trust_score });
  });

  // 3.5 Task Completion
  app.post("/api/v1/nodes/:nodeId/tasks/:taskId/complete", (req, res) => {
    const { nodeId, taskId } = req.params;
    const task = db.tasks.get(taskId);
    const node = db.nodes.get(nodeId);
    
    if (task && node) {
      task.status = "completed";
      db.tasks.set(taskId, task);
      
      // Increase trust score for successful routing
      node.trust_score += 1;
      db.nodes.set(nodeId, node);
    }
    res.json({ status: "success", trust_score: node?.trust_score });
  });

  // 4. Get all nodes (For dashboard)
  app.get("/api/v1/nodes", (req, res) => {
    res.json(Array.from(db.nodes.values()));
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("/app/applet/dist/index.html");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SWARM CORE] Server running on port ${PORT}`);
  }).on('error', (err) => {
    console.error('[SWARM CORE] Server failed to start:', err);
  });
}

startServer().catch(err => {
  console.error('[SWARM CORE] Fatal error during startup:', err);
});
