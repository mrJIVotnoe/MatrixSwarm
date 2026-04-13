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
    const { delegatedTo } = req.body;
    
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
      token,
      delegated_to: delegatedTo || null
    };

    await db.run(`
      INSERT INTO nodes (id, address, capabilities, ram_mb, cpu_cores, power_rating, status, last_heartbeat, trust_score, token, delegated_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [node.id, node.address, node.capabilities, node.ram_mb, node.cpu_cores, node.power_rating, node.status, node.last_heartbeat, node.trust_score, node.token, node.delegated_to]);

    console.log(`[SWARM] New node registered: ${id} (${node.power_rating}) ${delegatedTo ? `(Delegated to ${delegatedTo})` : ''}`);
    
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

    if (node.is_banned) {
      return res.status(403).json({ error: "This node has been banned from the Hive for malicious activity." });
    }

    if (node.is_frozen) {
      return res.status(403).json({ error: "EMERGENCY: This node has been FROZEN by Magistrate Consensus." });
    }

    await db.run('UPDATE nodes SET last_heartbeat = ?, status = ? WHERE id = ?', [Date.now(), 'online', nodeId]);

    // Simulate assigning a routing task randomly (20% chance per heartbeat)
    let assignedTask = null;
    if (Math.random() < 0.2) {
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
