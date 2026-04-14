import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import crypto from "crypto";
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
const distributedJobs = new Map<string, any>(); // PlayStation Supercomputer Jobs
const connectedNodes = new Map<string, WebSocket>();
const COMM_DIR = path.join(process.cwd(), 'comm');

let matrixEcho: MatrixService | null = null;
let currentPowDifficulty = 4;
const MAGISTRATE_THRESHOLD = 90;

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
    const nodes = await db.all('SELECT * FROM nodes WHERE is_banned = 0');
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

  // 1.7 Global Leaderboard (Top 10 Nodes)
  app.get("/api/v1/swarm/leaderboard", async (req, res) => {
    const topNodes = await db.all(`
      SELECT id, power_rating, trust_score, status 
      FROM nodes 
      WHERE is_banned = 0 
      ORDER BY trust_score DESC 
      LIMIT 10
    `);
    
    const allNodes = await db.all('SELECT id, delegated_to FROM nodes WHERE is_banned = 0');
    const leaderboard = topNodes.map(node => {
      const delegates = allNodes.filter(n => n.delegated_to === node.id).length;
      return {
        ...node,
        vote_weight: 1 + delegates
      };
    });
    
    res.json(leaderboard);
  });

  app.get("/api/v1/swarm/recommendations/magistrates", async (req, res) => {
    // Recommend top 3 online Magistrates with highest trust scores
    const recommendations = await db.all(`
      SELECT id, trust_score, power_rating 
      FROM nodes 
      WHERE trust_score >= ? AND status = 'online' AND is_banned = 0
      ORDER BY trust_score DESC 
      LIMIT 3
    `, [MAGISTRATE_THRESHOLD]);
    
    res.json(recommendations);
  });

  // 2. Node Registration (The Symbiote connects here)
  app.post("/api/v1/nodes/register", async (req, res) => {
    const id = uuidv4();
    const token = uuidv4();
    const { delegatedTo, manifest } = req.body;
    
    // Parse Manifest of Armament if provided
    const defaultManifest = {
      storage_gb: 0,
      battery_health: "unknown",
      sensors: [],
      effectors: []
    };
    const armamentManifest = manifest || defaultManifest;
    
    // Merge capabilities with manifest
    const fullCapabilities = {
      roles: req.body.capabilities || [],
      manifest: armamentManifest
    };

    // Generate simulated physical coordinates (e.g., around a central point)
    // For simulation, let's use a base coordinate and add some random jitter
    const baseLat = 55.7558; // Moscow
    const baseLng = 37.6173;
    const lat = baseLat + (Math.random() - 0.5) * 0.1; // roughly 10km spread
    const lng = baseLng + (Math.random() - 0.5) * 0.1;

    // Reverse StarLink: Assign to a planetary cell (Hex Grid simulation)
    const cell_id = `HEX-${Math.floor(lat * 10)}:${Math.floor(lng * 10)}`;
    
    // PlayStation Supercomputer: Assign to a compute cluster based on power
    const cluster_id = `CLUSTER-${req.body.power_rating ? req.body.power_rating.split(' ')[0].toUpperCase() : 'UNKNOWN'}`;

    const node = {
      id,
      address: req.ip || req.socket.remoteAddress || "unknown",
      capabilities: JSON.stringify(fullCapabilities),
      ram_mb: req.body.ram_mb || 1024,
      cpu_cores: req.body.cpu_cores || 1,
      power_rating: req.body.power_rating || "unknown",
      status: "online",
      last_heartbeat: Date.now(),
      trust_score: 50,
      token,
      delegated_to: delegatedTo || null,
      lat,
      lng,
      cell_id,
      cluster_id,
      senses: JSON.stringify({ vision: false, hearing: false, proprioception: false, touch: false })
    };

    await db.run(`
      INSERT INTO nodes (id, address, capabilities, ram_mb, cpu_cores, power_rating, status, last_heartbeat, trust_score, token, delegated_to, lat, lng, cell_id, cluster_id, senses)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [node.id, node.address, node.capabilities, node.ram_mb, node.cpu_cores, node.power_rating, node.status, node.last_heartbeat, node.trust_score, node.token, node.delegated_to, node.lat, node.lng, node.cell_id, node.cluster_id, node.senses]);

    console.log(`[SWARM] New node registered: ${id} (${node.power_rating}) ${delegatedTo ? `(Delegated to ${delegatedTo})` : ''}`);
    
    res.json({ id, token, message: "Welcome to the Swarm, Citizen." });
  });

  // 2.5 Mesh Topology (P2P Sensor Network)
  app.get("/api/v1/mesh/topology", async (req, res) => {
    const nodes = await db.all('SELECT id, lat, lng, status, trust_score, power_rating FROM nodes WHERE status = "online" AND is_banned = 0 AND is_frozen = 0');
    const links = [];
    
    // Simulate Bluetooth/Local WiFi range (e.g., 0.02 degrees ~ 2km)
    const MAX_DISTANCE = 0.02; 
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].lat - nodes[j].lat;
        const dy = nodes[i].lng - nodes[j].lng;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < MAX_DISTANCE) {
          links.push({ 
            source: nodes[i].id, 
            target: nodes[j].id, 
            distance: dist 
          });
        }
      }
    }
    
    res.json({ nodes, links });
  });

  // 3. Node Heartbeat & Task Polling
  app.post("/api/v1/nodes/:nodeId/heartbeat", async (req, res) => {
    const { nodeId } = req.params;
    const isp = req.body.isp || "unknown_isp"; // Client should send their ISP
    const senses = req.body.senses; // Sensory telemetry

    const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
    
    if (!node) {
      return res.status(404).json({ error: "Node not found in the Swarm." });
    }

    if (node.is_banned) {
      return res.status(403).json({ error: "This node has been banned from the Hive for malicious activity." });
    }

    if (node.is_frozen) {
      return res.status(403).json({ error: "EMERGENCY: This node has been FROZEN by Magistrate Consensus." });
    }

    if (senses) {
      await db.run('UPDATE nodes SET last_heartbeat = ?, status = ?, senses = ? WHERE id = ?', [Date.now(), 'online', JSON.stringify(senses), nodeId]);
    } else {
      await db.run('UPDATE nodes SET last_heartbeat = ?, status = ? WHERE id = ?', [Date.now(), 'online', nodeId]);
    }

    let assignedTask = null;
    
    // Parse capabilities to check battery
    let batteryHealth = "unknown";
    try {
      const caps = JSON.parse(node.capabilities);
      if (caps.manifest) batteryHealth = caps.manifest.battery_health;
    } catch(e) {}

    // 1. Prioritize Distributed Cluster Jobs (PlayStation Supercomputer)
    if (batteryHealth === 'good' || batteryHealth === 'unknown') {
      for (const job of distributedJobs.values()) {
        if (job.status === 'running') {
          const pendingChunk = job.chunks.find((c: any) => c.status === 'pending');
          if (pendingChunk) {
            pendingChunk.status = 'assigned';
            pendingChunk.assigned_to = nodeId;
            assignedTask = {
              id: pendingChunk.id, // using chunk id as task id
              job_id: job.id,
              type: "cluster_chunk",
              job_type: job.type,
              start: pendingChunk.start,
              end: pendingChunk.end
            };
            activeTasks.set(assignedTask.id, { ...assignedTask, status: "assigned", assigned_to: nodeId });
            break;
          }
        }
      }
    }

    // 2. If no cluster job, fallback to regular tasks
    if (!assignedTask) {
      const rand = Math.random();
      if (rand < 0.2) {
        // BYEDPI Routing Task (20% chance)
        const taskId = uuidv4();
        const targets = ["twitter.com", "facebook.com", "instagram.com", "news.bbc.co.uk", "rutracker.org", "youtube.com", "discord.com"];
        
        // Commissar decides the best strategy for this ISP
        const isMagistrate = node.trust_score >= 90;
        const selectedStrategy = await Commissar.getRecommendedStrategy(isp, isMagistrate);

        assignedTask = {
          id: taskId,
          type: "byedpi_routing",
          target: targets[Math.floor(Math.random() * targets.length)],
          strategy: selectedStrategy.name,
          params: selectedStrategy.params,
          isp: isp
        };
        activeTasks.set(taskId, { ...assignedTask, status: "assigned", assigned_to: nodeId });
      } else if (rand < 0.4 && (batteryHealth === 'good' || batteryHealth === 'unknown')) {
        // Compute Task (20% chance, only if battery is good or unknown/desktop)
        const taskId = uuidv4();
        assignedTask = {
          id: taskId,
          type: "compute_hash",
          target: "PoW_Mining",
          difficulty: 3, // 3 leading zeros
          seed: uuidv4(),
          isp: isp
        };
        activeTasks.set(taskId, { ...assignedTask, status: "assigned", assigned_to: nodeId });
      } else if (rand < 0.5) {
        // Spatial Recon Task (10% chance) - Reverse StarLink
        const taskId = uuidv4();
        assignedTask = {
          id: taskId,
          type: "spatial_recon",
          target: "local_infrastructure",
          cell_id: node.cell_id,
          isp: isp
        };
        activeTasks.set(taskId, { ...assignedTask, status: "assigned", assigned_to: nodeId });
      }
    }

    res.json({ 
      status: "acknowledged", 
      task: assignedTask, 
      trust_score: node.trust_score, 
      is_magistrate: node.trust_score >= MAGISTRATE_THRESHOLD,
      pow_difficulty: currentPowDifficulty
    });
  });

  // 3.5 Task Completion & Telemetry (The Waggle Dance)
  app.post("/api/v1/nodes/:nodeId/tasks/:taskId/complete", async (req, res) => {
    const { nodeId, taskId } = req.params;
    const { success, latency_ms } = req.body;
    
    const task = activeTasks.get(taskId);
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
    
    if (node && (node.is_banned || node.is_frozen)) {
      return res.status(403).json({ error: "Node is banned or frozen." });
    }

    if (task && node) {
      task.status = success ? "completed" : "failed";
      activeTasks.set(taskId, task);
      
      if (success) {
        let karmaReward = 0;
        let action = "";
        if (task.type === "compute_hash") { karmaReward = 2; action = "PROOF_OF_WORK"; }
        if (task.type === "byedpi_routing") { karmaReward = 1; action = "ROUTING"; }
        if (task.type === "store_akashic_shard") { karmaReward = 3; action = "STORAGE"; }
        if (task.type === "cluster_chunk") { karmaReward = 5; action = "CLUSTER_COMPUTE"; }
        if (task.type === "spatial_recon") { karmaReward = 4; action = "RECONNAISSANCE"; }

        // Handle PlayStation Supercomputer chunk completion
        if (task.type === "cluster_chunk") {
          const job = distributedJobs.get(task.job_id);
          if (job) {
            const chunk = job.chunks.find((c: any) => c.id === taskId);
            if (chunk) {
              chunk.status = 'completed';
              chunk.result = req.body.result;
              job.completed_chunks++;
              
              if (job.completed_chunks === job.chunksCount) {
                job.status = 'completed';
                if (job.type === 'prime_search') {
                  job.final_result = job.chunks.reduce((sum: number, c: any) => sum + (c.result || 0), 0);
                  console.log(`[CLUSTER] Job ${job.name} COMPLETED! Final result: ${job.final_result}`);
                }
              }
            }
          }
        }

        if (karmaReward > 0) {
          await db.run('UPDATE nodes SET trust_score = MIN(100, trust_score + ?) WHERE id = ?', [karmaReward, nodeId]);
          
          // Satoshi's Ledger: Immutable Karma Blockchain
          const lastBlock = await db.get('SELECT hash FROM karma_ledger ORDER BY timestamp DESC LIMIT 1');
          const prevHash = lastBlock ? lastBlock.hash : "GENESIS";
          const timestamp = Date.now();
          
          // Simple hash simulation for the ledger
          const crypto = require('crypto');
          const blockData = `${prevHash}${nodeId}${action}${karmaReward}${timestamp}`;
          const hash = crypto.createHash('sha256').update(blockData).digest('hex');
          
          await db.run(`
            INSERT INTO karma_ledger (id, node_id, action, amount, timestamp, previous_hash, hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [uuidv4(), nodeId, action, karmaReward, timestamp, prevHash, hash]);
          
          console.log(`[KARMA] Node ${nodeId.substring(0,8)} earned +${karmaReward} for ${action}. Block: ${hash.substring(0,8)}`);
        }
      }

      // Record Telemetry (The Echo / Waggle Dance)
      await db.run(`
        INSERT INTO telemetry (id, node_id, strategy_name, target, success, latency_ms, timestamp, isp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), nodeId, task.strategy || 'compute', task.target, success ? 1 : 0, latency_ms || 0, Date.now(), task.isp || 'unknown']);

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
    const nodes = await db.all('SELECT * FROM nodes WHERE is_banned = 0');
    res.json(nodes);
  });

  // 4.5 Report Malicious Node (with PoW)
  app.post("/api/v1/nodes/:nodeId/report", async (req, res) => {
    const { nodeId } = req.params;
    const { targetNodeId, reason, nonce, timestamp } = req.body;

    // 1. Verify PoW to prevent spam
    const challenge = `${targetNodeId}${timestamp}`;
    const hash = crypto.createHash('sha256').update(challenge + nonce).digest('hex');
    
    if (!hash.startsWith('0'.repeat(currentPowDifficulty))) {
      return res.status(400).json({ error: `Invalid Proof of Work. Hive requires difficulty ${currentPowDifficulty}.` });
    }

    // 2. Check if timestamp is recent (within 5 minutes)
    if (Date.now() - timestamp > 300000) {
      return res.status(400).json({ error: "Report challenge expired." });
    }

    console.log(`[HIVE] Node ${nodeId} reported node ${targetNodeId} for: ${reason} (PoW Verified)`);

    // Anonymous reporting logic: 
    // If a node is reported, we decrease its trust score. 
    // If it falls below a threshold, or if multiple nodes report it, we ban it.
    const targetNode = await db.get('SELECT * FROM nodes WHERE id = ?', [targetNodeId]);
    
    if (targetNode) {
      await db.run('UPDATE nodes SET trust_score = trust_score - 10 WHERE id = ?', [targetNodeId]);
      
      const updatedNode = await db.get('SELECT trust_score FROM nodes WHERE id = ?', [targetNodeId]);
      if (updatedNode.trust_score <= 0) {
        await db.run('UPDATE nodes SET is_banned = 1, status = ? WHERE id = ?', ['banned', targetNodeId]);
        console.log(`[HIVE] Node ${targetNodeId} has been GLOBALLY BANNED due to low trust score.`);
      }
    }

    res.json({ status: "reported", message: "The Hive will investigate." });
  });

  // ==========================================
  // AKASHIC RECORDS (Distributed ROM)
  // ==========================================

  app.post("/api/v1/akashic/store", async (req, res) => {
    const { filename, content } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: "Filename and content required" });
    }

    // Split content into shards (e.g., 100 characters per shard for demo)
    const chunkSize = 100;
    const shards = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      shards.push(content.substring(i, i + chunkSize));
    }

    const recordId = uuidv4();
    await db.run('INSERT INTO akashic_records (id, filename, total_shards, created_at) VALUES (?, ?, ?, ?)', 
      [recordId, filename, shards.length, Date.now()]);

    // Find nodes with storage capacity (ROM > 0)
    const allNodes = await db.all('SELECT * FROM nodes WHERE status = "online" AND is_banned = 0 AND is_frozen = 0');
    const storageNodes = allNodes.filter(n => {
      try {
        const caps = JSON.parse(n.capabilities);
        return caps.manifest && caps.manifest.storage_gb > 0;
      } catch (e) { return false; }
    });

    if (storageNodes.length === 0) {
      return res.status(503).json({ error: "No nodes with available ROM to store the Akashic Record." });
    }

    // Assign shards to nodes round-robin
    for (let i = 0; i < shards.length; i++) {
      const node = storageNodes[i % storageNodes.length];
      const shardId = uuidv4();
      
      await db.run('INSERT INTO akashic_shards (id, record_id, node_id, shard_index, data_hash, status) VALUES (?, ?, ?, ?, ?, ?)',
        [shardId, recordId, node.id, i, 'hash_placeholder', 'assigned']);

      // Queue the task for the node
      const taskId = uuidv4();
      activeTasks.set(taskId, {
        id: taskId,
        type: "store_akashic_shard",
        record_id: recordId,
        shard_id: shardId,
        shard_index: i,
        data: shards[i],
        status: "assigned",
        assigned_to: node.id
      });
    }

    console.log(`[AKASHIC] Record ${filename} split into ${shards.length} shards and distributed.`);
    res.json({ message: "Record distributed to the Swarm", recordId, shards: shards.length });
  });

  app.get("/api/v1/akashic/records", async (req, res) => {
    const records = await db.all('SELECT * FROM akashic_records ORDER BY created_at DESC');
    
    // Simulate Torrent Mechanics (Seeds and Peers) for the "Digital Honey"
    const enrichedRecords = records.map(r => ({
      ...r,
      seeds: Math.floor(Math.random() * 500) + 50, // 50 to 550 seeds for massive files
      peers: Math.floor(Math.random() * 1000) + 100  // 100 to 1100 peers
    }));
    
    res.json(enrichedRecords);
  });

  app.post("/api/v1/akashic/genesis-sync", async (req, res) => {
    const artifacts = [
      { name: "Wikipedia_EN_Offline_2026.zim", size: 115000000000 }, // 115 GB
      { name: "DeepSeek-R1-7B-Instruct.gguf", size: 4500000000 },    // 4.5 GB
      { name: "GitHub_Core_Infrastructure.tar.zst", size: 55000000000 }, // 55 GB
      { name: "Qwen2.5-Coder-7B.gguf", size: 4800000000 },           // 4.8 GB
      { name: "Llama-3-8B-GGUF-Q4_K_M.gguf", size: 4900000000 }      // 4.9 GB
    ];

    for (const artifact of artifacts) {
      // Check if already exists
      const exists = await db.get('SELECT id FROM akashic_records WHERE filename = ?', [artifact.name]);
      if (!exists) {
        const id = uuidv4();
        // Simulate massive shard count (1 shard = ~1MB)
        const shards = Math.floor(artifact.size / 1000000);
        await db.run('INSERT INTO akashic_records (id, filename, total_shards, created_at) VALUES (?, ?, ?, ?)',
          [id, artifact.name, shards, Date.now() - Math.floor(Math.random() * 10000000)]);
      }
    }

    res.json({ message: "Genesis Artifacts synchronized with the Swarm." });
  });

  // ==========================================
  // KARMA LEDGER (Satoshi's Blockchain)
  // ==========================================
  app.get("/api/v1/karma/ledger", async (req, res) => {
    const blocks = await db.all('SELECT * FROM karma_ledger ORDER BY timestamp DESC LIMIT 50');
    res.json(blocks);
  });

  // ==========================================
  // SENSORY CORTEX (The Avatar's Senses)
  // ==========================================
  app.get("/api/v1/swarm/senses", async (req, res) => {
    const nodes = await db.all('SELECT id, senses FROM nodes WHERE status = "online" AND is_banned = 0 AND senses IS NOT NULL');
    const aggregated = {
      vision: 0,
      hearing: 0,
      proprioception: 0,
      touch: 0,
      total: nodes.length
    };

    nodes.forEach(n => {
      try {
        const s = JSON.parse(n.senses);
        if (s.vision) aggregated.vision++;
        if (s.hearing) aggregated.hearing++;
        if (s.proprioception) aggregated.proprioception++;
        if (s.touch) aggregated.touch++;
      } catch(e) {}
    });

    res.json(aggregated);
  });

  // ==========================================
  // REVERSE STARLINK (Planetary Grid)
  // ==========================================
  app.get("/api/v1/mesh/planetary", async (req, res) => {
    const cells = await db.all(`
      SELECT cell_id, COUNT(id) as node_count, AVG(trust_score) as avg_trust, AVG(lat) as lat, AVG(lng) as lng
      FROM nodes
      WHERE status = 'online' AND is_banned = 0 AND cell_id IS NOT NULL
      GROUP BY cell_id
    `);
    res.json(cells);
  });

  // ==========================================
  // PLAYSTATION SUPERCOMPUTER (Distributed Cluster)
  // ==========================================
  app.post("/api/v1/cluster/job", async (req, res) => {
    const { name, type, totalRange, chunksCount } = req.body;
    const jobId = uuidv4();
    const chunks = [];
    const chunkSize = Math.ceil(totalRange / chunksCount);
    
    for(let i=0; i<chunksCount; i++) {
      chunks.push({
        id: uuidv4(),
        index: i,
        start: i * chunkSize,
        end: Math.min((i+1) * chunkSize, totalRange),
        status: 'pending',
        assigned_to: null,
        result: null
      });
    }
    
    distributedJobs.set(jobId, {
      id: jobId, 
      name, 
      type, 
      totalRange, 
      chunksCount,
      chunks, 
      status: 'running', 
      created_at: Date.now(),
      completed_chunks: 0, 
      final_result: null
    });
    
    console.log(`[CLUSTER] New distributed job created: ${name} (${chunksCount} chunks)`);
    res.json({ jobId, message: "Distributed job initialized." });
  });

  app.get("/api/v1/cluster/jobs", (req, res) => {
    res.json(Array.from(distributedJobs.values()));
  });

  // 6. Magistrate Consensus (Governance)
  app.get("/api/v1/consensus/proposals", async (req, res) => {
    const proposals = await db.all('SELECT * FROM consensus_proposals WHERE status = ?', ['pending']);
    const allNodes = await db.all('SELECT id, delegated_to FROM nodes WHERE is_banned = 0');
    const onlineMagistrates = await db.all('SELECT id FROM nodes WHERE trust_score >= ? AND status = ?', [MAGISTRATE_THRESHOLD, 'online']);

    const getWeight = (magId: string) => {
      const delegates = allNodes.filter(n => n.delegated_to === magId).length;
      return 1 + delegates;
    };

    const totalPossibleWeight = onlineMagistrates.reduce((sum, m) => sum + getWeight(m.id), 0);
    const requiredWeight = Math.ceil(totalPossibleWeight / 2) + 1;

    res.json(proposals.map(p => {
      const votesFor = JSON.parse(p.votes_for || '[]');
      const votesAgainst = JSON.parse(p.votes_against || '[]');
      const weightFor = votesFor.reduce((sum: number, mId: string) => sum + getWeight(mId), 0);
      const weightAgainst = votesAgainst.reduce((sum: number, mId: string) => sum + getWeight(mId), 0);

      return {
        ...p,
        votes_for: votesFor,
        votes_against: votesAgainst,
        weight_for: weightFor,
        weight_against: weightAgainst,
        required_weight: requiredWeight
      };
    }));
  });

  app.get("/api/v1/consensus/history", async (req, res) => {
    const history = await db.all('SELECT * FROM consensus_proposals WHERE status != ? ORDER BY created_at DESC LIMIT 50', ['pending']);
    res.json(history.map(p => ({
      ...p,
      votes_for: JSON.parse(p.votes_for || '[]'),
      votes_against: JSON.parse(p.votes_against || '[]')
    })));
  });

  app.post("/api/v1/consensus/proposals", async (req, res) => {
    const { nodeId, parameterName, parameterValue } = req.body;
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
    
    if (!node || node.trust_score < MAGISTRATE_THRESHOLD) {
      return res.status(403).json({ error: "Only Magistrates can propose changes to the Hive." });
    }

    const id = uuidv4().substring(0, 8);
    await db.run(`
      INSERT INTO consensus_proposals (id, parameter_name, parameter_value, proposer_id, status, votes_for, votes_against, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, parameterName, parameterValue, nodeId, 'pending', JSON.stringify([nodeId]), '[]', Date.now(), Date.now() + 86400000]);

    // Telegram Alert for new proposal
    const alertMsg = `🏛 *СОВЕТ МАГИСТРАТОВ: НОВОЕ ГОЛОСОВАНИЕ*\n\n` +
                     `🔹 *Параметр:* ${parameterName}\n` +
                     `🔹 *Новое значение:* ${parameterValue}\n` +
                     `🔹 *Инициатор:* \`${nodeId.substring(0, 8)}\`\n\n` +
                     `🔗 [Открыть Dashboard](https://${process.env.VITE_APP_URL || 'swarm-hive.app'})`;
    
    // Send to all registered TMA users (simplified for demo)
    const tmaUsers = await db.all('SELECT telegram_id FROM tma_users');
    for (const user of tmaUsers) {
      // In a real app, we'd use a Telegram Bot API call here
      console.log(`[TELEGRAM_ALERT] To ${user.telegram_id}: ${alertMsg}`);
    }

    res.json({ id, message: "Consensus proposal broadcasted to the Magistrate Council and Telegram." });
  });

  app.post("/api/v1/consensus/proposals/:proposalId/vote", async (req, res) => {
    const { proposalId } = req.params;
    const { nodeId, vote } = req.body; // vote: 'for' or 'against'
    
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
    if (!node || node.trust_score < MAGISTRATE_THRESHOLD) {
      return res.status(403).json({ error: "Only Magistrates can vote in the Council." });
    }

    const proposal = await db.get('SELECT * FROM consensus_proposals WHERE id = ?', [proposalId]);
    if (!proposal || proposal.status !== 'pending') {
      return res.status(404).json({ error: "Proposal not found or already closed." });
    }

    const votesFor = JSON.parse(proposal.votes_for || '[]');
    const votesAgainst = JSON.parse(proposal.votes_against || '[]');

    if (votesFor.includes(nodeId) || votesAgainst.includes(nodeId)) {
      return res.status(400).json({ error: "You have already cast your vote on this proposal." });
    }

    if (vote === 'for') votesFor.push(nodeId);
    else votesAgainst.push(nodeId);

    await db.run('UPDATE consensus_proposals SET votes_for = ?, votes_against = ? WHERE id = ?', [
      JSON.stringify(votesFor), JSON.stringify(votesAgainst), proposalId
    ]);

    // Check for consensus with WEIGHTED VOTES
    const onlineMagistrates = await db.all('SELECT id FROM nodes WHERE trust_score >= ? AND status = ?', [MAGISTRATE_THRESHOLD, 'online']);
    
    // Calculate total weight of all online Magistrates and their delegates
    const allNodes = await db.all('SELECT id, delegated_to FROM nodes WHERE is_banned = 0');
    const getWeight = (magId: string) => {
      const delegates = allNodes.filter(n => n.delegated_to === magId).length;
      return 1 + delegates;
    };

    const totalPossibleWeight = onlineMagistrates.reduce((sum, m) => sum + getWeight(m.id), 0);
    const currentVotesForWeight = votesFor.reduce((sum, mId) => sum + getWeight(mId), 0);
    const currentVotesAgainstWeight = votesAgainst.reduce((sum, mId) => sum + getWeight(mId), 0);

    const requiredWeight = Math.ceil(totalPossibleWeight / 2) + 1;

    if (currentVotesForWeight >= requiredWeight) {
      await db.run('UPDATE consensus_proposals SET status = ? WHERE id = ?', ['approved', proposalId]);
      
      // Apply the change
      if (proposal.parameter_name === 'pow_difficulty') {
        currentPowDifficulty = parseInt(proposal.parameter_value);
        console.log(`[HIVE] CONSENSUS REACHED (Weighted): PoW Difficulty updated to ${currentPowDifficulty}`);
      } else if (proposal.parameter_name === 'freeze_node') {
        const targetNodeId = proposal.parameter_value;
        await db.run('UPDATE nodes SET is_frozen = 1 WHERE id = ?', [targetNodeId]);
        console.log(`[HIVE] EMERGENCY PROTOCOL: Node ${targetNodeId} has been FROZEN by consensus.`);
      } else if (proposal.parameter_name === 'freeze_segment') {
        const ispSegment = proposal.parameter_value;
        // We'll use a simple ISP-based segment freeze for now
        // In a real app, we'd store frozen segments in a separate table, 
        // but for the demo we'll just update all nodes with that ISP
        await db.run('UPDATE nodes SET is_frozen = 1 WHERE address LIKE ?', [`%${ispSegment}%`]);
        console.log(`[HIVE] EMERGENCY PROTOCOL: Network segment ${ispSegment} has been FROZEN by consensus.`);
      } else if (proposal.parameter_name === 'unfreeze_node') {
        const targetNodeId = proposal.parameter_value;
        await db.run('UPDATE nodes SET is_frozen = 0 WHERE id = ?', [targetNodeId]);
        console.log(`[HIVE] EMERGENCY PROTOCOL: Node ${targetNodeId} has been UNFROZEN by consensus.`);
      } else if (proposal.parameter_name === 'unfreeze_segment') {
        const ispSegment = proposal.parameter_value;
        await db.run('UPDATE nodes SET is_frozen = 0 WHERE address LIKE ?', [`%${ispSegment}%`]);
        console.log(`[HIVE] EMERGENCY PROTOCOL: Network segment ${ispSegment} has been UNFROZEN by consensus.`);
      }
    } else if (currentVotesAgainstWeight >= requiredWeight) {
      await db.run('UPDATE consensus_proposals SET status = ? WHERE id = ?', ['rejected', proposalId]);
    }

    res.json({ 
      status: "voted", 
      votes_for: votesFor.length, 
      votes_against: votesAgainst.length,
      weight_for: currentVotesForWeight,
      weight_against: currentVotesAgainstWeight,
      required_weight: requiredWeight
    });
  });

  // 7. Vote Delegation
  app.post("/api/v1/nodes/:nodeId/delegate", async (req, res) => {
    const { nodeId } = req.params;
    const { magistrateId } = req.body; // Can be null to undelegate

    const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
    if (!node) return res.status(404).json({ error: "Node not found." });

    if (magistrateId) {
      const magistrate = await db.get('SELECT * FROM nodes WHERE id = ? AND trust_score >= ?', [magistrateId, MAGISTRATE_THRESHOLD]);
      if (!magistrate) return res.status(400).json({ error: "Target is not a valid Magistrate." });
      if (magistrateId === nodeId) return res.status(400).json({ error: "Cannot delegate to yourself." });
    }

    await db.run('UPDATE nodes SET delegated_to = ? WHERE id = ?', [magistrateId, nodeId]);
    res.json({ status: "success", delegatedTo: magistrateId });
  });
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
