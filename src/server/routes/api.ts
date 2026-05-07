import { Router } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { getDb } from "../../db.js";
import { state } from "../state.js";
import { Commissar } from "../../commissar.js";
import authRouter from "./auth.js";
import karmaRouter from "./karma.js";
import tasksRouter from "./tasks.js";
import { verifySoulPassport } from "../middleware/auth.js";

const apiRouter = Router();

// ==========================================
// MOUNT SEPARATED ROUTES
// ==========================================
// Auth & Nodes
apiRouter.use("/observers", authRouter);
apiRouter.use("/nodes", authRouter); // Nodes register is in authRouter
// Karma
apiRouter.use("/karma", karmaRouter);
apiRouter.use("/swarm", karmaRouter); // leaderboard and recommendations
// Tasks
apiRouter.use("/tasks", tasksRouter);
apiRouter.use("/nodes", tasksRouter); // heartbeats and tasks completed

// ==========================================
// SWARM STATUS
// ==========================================
apiRouter.get("/swarm/status", async (req, res) => {
  const db = await getDb();
  const nodes = await db.all('SELECT * FROM nodes WHERE is_banned = 0');
  const tasks = Array.from(state.activeTasks.values());
  
  const nodesByAiTier = { none: 0, "slm_1.5b": 0, "slm_3b": 0, llm: 0 };
  
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

apiRouter.get("/commissar/intelligence", async (req, res) => {
  const bestStrategies = await Commissar.analyzeTelemetry();
  res.json(Object.fromEntries(bestStrategies));
});

apiRouter.get("/swarm/senses", async (req, res) => {
  const db = await getDb();
  const nodes = await db.all('SELECT id, senses FROM nodes WHERE status = "online" AND is_banned = 0 AND senses IS NOT NULL');
  const aggregated = { vision: 0, hearing: 0, proprioception: 0, touch: 0, total: nodes.length };

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
// MESH TOPOLOGY & BRAMBLE
// ==========================================
apiRouter.get("/mesh/topology", async (req, res) => {
  const db = await getDb();
  const nodes = await db.all('SELECT id, lat, lng, status, trust_score, power_rating FROM nodes WHERE status = "online" AND is_banned = 0 AND is_frozen = 0');
  const links = [];
  
  const MAX_DISTANCE = 0.02; 
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].lat - nodes[j].lat;
      const dy = nodes[i].lng - nodes[j].lng;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < MAX_DISTANCE) {
        links.push({ source: nodes[i].id, target: nodes[j].id, distance: dist });
      }
    }
  }
  
  res.json({ nodes, links });
});

apiRouter.get("/mesh/cells/:cellId", async (req, res) => {
  const db = await getDb();
  const { cellId } = req.params;
  const nodes = await db.all('SELECT id, device_type, trust_score, is_charging, mobility_score FROM nodes WHERE cell_id = ? AND status = "online" AND is_banned = 0 AND is_frozen = 0 ORDER BY trust_score DESC', [cellId]);
  
  let magistrateId = null;
  if (nodes.length > 0) {
    const chargingNodes = nodes.filter((n: any) => n.is_charging);
    const candidates = chargingNodes.length > 0 ? chargingNodes : nodes;
    magistrateId = candidates[0].id;
  }
  
  res.json({ cell_id: cellId, nodes, magistrate_id: magistrateId });
});

apiRouter.get("/mesh/planetary", async (req, res) => {
  const db = await getDb();
  const cells = await db.all(`
    SELECT cell_id, COUNT(id) as node_count, AVG(trust_score) as avg_trust, AVG(lat) as lat, AVG(lng) as lng
    FROM nodes
    WHERE status = 'online' AND is_banned = 0 AND cell_id IS NOT NULL
    GROUP BY cell_id
  `);
  res.json(cells);
});

apiRouter.post("/bramble/send", async (req, res) => {
  const db = await getDb();
  const { senderId, recipientId, encryptedPayload } = req.body;
  const msgId = crypto.randomUUID();
  await db.run('INSERT INTO bramble_messages (id, sender_id, recipient_id, encrypted_payload, timestamp) VALUES (?, ?, ?, ?, ?)', 
    [msgId, senderId, recipientId, encryptedPayload, Date.now()]);
  res.json({ success: true, messageId: msgId });
});

apiRouter.get("/bramble/sync/:nodeId", async (req, res) => {
  const db = await getDb();
  const { nodeId } = req.params;
  const messages = await db.all('SELECT * FROM bramble_messages WHERE recipient_id = ? AND is_delivered = 0 ORDER BY timestamp ASC', [nodeId]);
  res.json({ messages });
});

apiRouter.post("/bramble/ack", async (req, res) => {
  const db = await getDb();
  const { messageIds } = req.body;
  if (Array.isArray(messageIds) && messageIds.length > 0) {
    const placeholders = messageIds.map(() => '?').join(',');
    await db.run(`UPDATE bramble_messages SET is_delivered = 1 WHERE id IN (${placeholders})`, messageIds);
  }
  res.json({ success: true });
});

// ==========================================
// NODES INFO & REPORT
// ==========================================
apiRouter.get("/nodes", async (req, res) => {
  const db = await getDb();
  const nodes = await db.all('SELECT * FROM nodes WHERE is_banned = 0');
  res.json(nodes);
});

apiRouter.post("/nodes/:nodeId/delegate", async (req, res) => {
  const db = await getDb();
  const { nodeId } = req.params;
  const { magistrateId } = req.body;

  const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
  if (!node) return res.status(404).json({ error: "Node not found." });

  if (magistrateId) {
    const magistrate = await db.get('SELECT * FROM nodes WHERE id = ? AND trust_score >= ?', [magistrateId, state.MAGISTRATE_THRESHOLD]);
    if (!magistrate) return res.status(400).json({ error: "Target is not a valid Magistrate." });
    if (magistrateId === nodeId) return res.status(400).json({ error: "Cannot delegate to yourself." });
  }

  await db.run('UPDATE nodes SET delegated_to = ? WHERE id = ?', [magistrateId, nodeId]);
  res.json({ status: "success", delegatedTo: magistrateId });
});

// Enable Security Middleware on the Report endpoint
apiRouter.post("/nodes/:nodeId/report", verifySoulPassport, async (req, res) => {
  const db = await getDb();
  const { nodeId } = req.params;
  const { targetNodeId, reason, nonce, timestamp } = req.body;

  const challenge = `${targetNodeId}${timestamp}`;
  const hash = crypto.createHash('sha256').update(challenge + nonce).digest('hex');
  
  if (!hash.startsWith('0'.repeat(state.currentPowDifficulty))) {
    return res.status(400).json({ error: `Invalid Proof of Work. Hive requires difficulty ${state.currentPowDifficulty}.` });
  }

  if (Date.now() - timestamp > 300000) {
    return res.status(400).json({ error: "Report challenge expired." });
  }

  console.info(`[INFO] [HIVE] Node ${nodeId} reported node ${targetNodeId} for: ${reason} (PoW Verified)`);

  const targetNode = await db.get('SELECT * FROM nodes WHERE id = ?', [targetNodeId]);
  
  if (targetNode) {
    await db.run('UPDATE nodes SET trust_score = trust_score - 10 WHERE id = ?', [targetNodeId]);
    
    const updatedNode = await db.get('SELECT trust_score FROM nodes WHERE id = ?', [targetNodeId]);
    if (updatedNode.trust_score <= 0) {
      await db.run('UPDATE nodes SET is_banned = 1, status = ? WHERE id = ?', ['banned', targetNodeId]);
      console.info(`[WARN] [HIVE] Node ${targetNodeId} has been GLOBALLY BANNED due to low trust score.`);
    }
  }

  res.json({ status: "reported", message: "The Hive will investigate." });
});

// ==========================================
// AKASHIC RECORDS (Distributed ROM)
// ==========================================
apiRouter.post("/akashic/store", async (req, res) => {
  const db = await getDb();
  const { filename, content } = req.body;
  if (!filename || !content) return res.status(400).json({ error: "Filename and content required" });

  const chunkSize = 100;
  const shards = [];
  for (let i = 0; i < content.length; i += chunkSize) {
    shards.push(content.substring(i, i + chunkSize));
  }

  const recordId = uuidv4();
  await db.run('INSERT INTO akashic_records (id, filename, total_shards, created_at) VALUES (?, ?, ?, ?)', 
    [recordId, filename, shards.length, Date.now()]);

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

  for (let i = 0; i < shards.length; i++) {
    const node = storageNodes[i % storageNodes.length];
    const shardId = uuidv4();
    
    await db.run('INSERT INTO akashic_shards (id, record_id, node_id, shard_index, data_hash, status) VALUES (?, ?, ?, ?, ?, ?)',
      [shardId, recordId, node.id, i, 'hash_placeholder', 'assigned']);

    const taskId = uuidv4();
    state.activeTasks.set(taskId, {
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

  console.info(`[INFO] [AKASHIC] Record ${filename} split into ${shards.length} shards and distributed.`);
  res.json({ message: "Record distributed to the Swarm", recordId, shards: shards.length });
});

apiRouter.get("/akashic/records", async (req, res) => {
  const db = await getDb();
  const records = await db.all('SELECT * FROM akashic_records ORDER BY created_at DESC');
  const enrichedRecords = records.map(r => ({
    ...r,
    seeds: Math.floor(Math.random() * 500) + 50,
    peers: Math.floor(Math.random() * 1000) + 100
  }));
  res.json(enrichedRecords);
});

apiRouter.post("/akashic/genesis-sync", async (req, res) => {
  const db = await getDb();
  const artifacts = [
    { name: "Wikipedia_EN_Offline_2026.zim", size: 115000000000 },
    { name: "DeepSeek-R1-7B-Instruct.gguf", size: 4500000000 },
    { name: "GitHub_Core_Infrastructure.tar.zst", size: 55000000000 },
    { name: "Qwen2.5-Coder-7B.gguf", size: 4800000000 },
    { name: "Llama-3-8B-GGUF-Q4_K_M.gguf", size: 4900000000 }
  ];

  for (const artifact of artifacts) {
    const exists = await db.get('SELECT id FROM akashic_records WHERE filename = ?', [artifact.name]);
    if (!exists) {
      const id = uuidv4();
      const shards = Math.floor(artifact.size / 1000000);
      await db.run('INSERT INTO akashic_records (id, filename, total_shards, created_at) VALUES (?, ?, ?, ?)',
        [id, artifact.name, shards, Date.now() - Math.floor(Math.random() * 10000000)]);
    }
  }
  res.json({ message: "Genesis Artifacts synchronized with the Swarm." });
});

// ==========================================
// PLAYSTATION SUPERCOMPUTER (Cluster)
// ==========================================
apiRouter.post("/cluster/job", async (req, res) => {
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
  
  state.distributedJobs.set(jobId, {
    id: jobId, name, type, totalRange, chunksCount,
    chunks, status: 'running', created_at: Date.now(),
    completed_chunks: 0, final_result: null
  });
  
  console.info(`[INFO] [CLUSTER] Distributed job created: ${name} (${chunksCount} chunks)`);
  res.json({ jobId, message: "Distributed job initialized." });
});

apiRouter.get("/cluster/jobs", (req, res) => {
  res.json(Array.from(state.distributedJobs.values()));
});

// ==========================================
// CONSENSUS GOVERNANCE
// ==========================================
apiRouter.get("/consensus/proposals", async (req, res) => {
  const db = await getDb();
  const proposals = await db.all('SELECT * FROM consensus_proposals WHERE status = ?', ['pending']);
  const allNodes = await db.all('SELECT id, delegated_to FROM nodes WHERE is_banned = 0');
  const onlineMagistrates = await db.all('SELECT id FROM nodes WHERE trust_score >= ? AND status = ?', [state.MAGISTRATE_THRESHOLD, 'online']);

  const getWeight = (magId: string) => {
    const delegates = allNodes.filter(n => n.delegated_to === magId).length;
    return 1 + delegates;
  };

  const totalPossibleWeight = onlineMagistrates.reduce((sum, m) => sum + getWeight(m.id), 0);
  const requiredWeight = Math.ceil(totalPossibleWeight / 2) + 1;

  res.json(proposals.map(p => {
    const votesFor = JSON.parse(p.votes_for || '[]');
    const votesAgainst = JSON.parse(p.votes_against || '[]');
    return {
      ...p,
      votes_for: votesFor,
      votes_against: votesAgainst,
      weight_for: votesFor.reduce((sum: number, mId: string) => sum + getWeight(mId), 0),
      weight_against: votesAgainst.reduce((sum: number, mId: string) => sum + getWeight(mId), 0),
      required_weight: requiredWeight
    };
  }));
});

apiRouter.get("/consensus/history", async (req, res) => {
  const db = await getDb();
  const history = await db.all('SELECT * FROM consensus_proposals WHERE status != ? ORDER BY created_at DESC LIMIT 50', ['pending']);
  res.json(history.map(p => ({
    ...p,
    votes_for: JSON.parse(p.votes_for || '[]'),
    votes_against: JSON.parse(p.votes_against || '[]')
  })));
});

apiRouter.post("/consensus/proposals", verifySoulPassport, async (req, res) => {
  const db = await getDb();
  const { nodeId, parameterName, parameterValue } = req.body;
  const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
  
  if (!node || node.trust_score < state.MAGISTRATE_THRESHOLD) {
    return res.status(403).json({ error: "Only Magistrates can propose changes to the Hive." });
  }

  const id = uuidv4().substring(0, 8);
  await db.run(`INSERT INTO consensus_proposals (id, parameter_name, parameter_value, proposer_id, status, votes_for, votes_against, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [id, parameterName, parameterValue, nodeId, 'pending', JSON.stringify([nodeId]), '[]', Date.now(), Date.now() + 86400000]);

  // Alert
  console.info(`[INFO] [TELEGRAM_ALERT] Magistrate Proposal ${parameterName}=${parameterValue} submitted.`);

  res.json({ id, message: "Consensus proposal broadcasted to the Magistrate Council." });
});

apiRouter.post("/consensus/proposals/:proposalId/vote", verifySoulPassport, async (req, res) => {
  const db = await getDb();
  const { proposalId } = req.params;
  const { nodeId, vote } = req.body;
  
  const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
  if (!node || node.trust_score < state.MAGISTRATE_THRESHOLD) return res.status(403).json({ error: "Only Magistrates can vote in the Council." });

  const proposal = await db.get('SELECT * FROM consensus_proposals WHERE id = ?', [proposalId]);
  if (!proposal || proposal.status !== 'pending') return res.status(404).json({ error: "Proposal not found or already closed." });

  const votesFor = JSON.parse(proposal.votes_for || '[]');
  const votesAgainst = JSON.parse(proposal.votes_against || '[]');

  if (votesFor.includes(nodeId) || votesAgainst.includes(nodeId)) return res.status(400).json({ error: "You have already cast your vote." });

  if (vote === 'for') votesFor.push(nodeId); else votesAgainst.push(nodeId);

  await db.run('UPDATE consensus_proposals SET votes_for = ?, votes_against = ? WHERE id = ?', [JSON.stringify(votesFor), JSON.stringify(votesAgainst), proposalId]);

  // Weighted Check
  const onlineMagistrates = await db.all('SELECT id FROM nodes WHERE trust_score >= ? AND status = ?', [state.MAGISTRATE_THRESHOLD, 'online']);
  const allNodes = await db.all('SELECT id, delegated_to FROM nodes WHERE is_banned = 0');
  
  const getWeight = (magId: string) => 1 + allNodes.filter(n => n.delegated_to === magId).length;
  const requiredWeight = Math.ceil(onlineMagistrates.reduce((sum, m) => sum + getWeight(m.id), 0) / 2) + 1;
  
  const vForWeight = votesFor.reduce((sum, mId) => sum + getWeight(mId), 0);
  const vAgainstWeight = votesAgainst.reduce((sum, mId) => sum + getWeight(mId), 0);

  if (vForWeight >= requiredWeight) {
    await db.run('UPDATE consensus_proposals SET status = ? WHERE id = ?', ['approved', proposalId]);
    
    if (proposal.parameter_name === 'pow_difficulty') {
      state.currentPowDifficulty = parseInt(proposal.parameter_value);
    } else if (proposal.parameter_name === 'freeze_node') {
      await db.run('UPDATE nodes SET is_frozen = 1 WHERE id = ?', [proposal.parameter_value]);
    } else if (proposal.parameter_name === 'freeze_segment') {
      await db.run('UPDATE nodes SET is_frozen = 1 WHERE address LIKE ?', [`%${proposal.parameter_value}%`]);
    } else if (proposal.parameter_name === 'unfreeze_node') {
      await db.run('UPDATE nodes SET is_frozen = 0 WHERE id = ?', [proposal.parameter_value]);
    } else if (proposal.parameter_name === 'unfreeze_segment') {
      await db.run('UPDATE nodes SET is_frozen = 0 WHERE address LIKE ?', [`%${proposal.parameter_value}%`]);
    }
  } else if (vAgainstWeight >= requiredWeight) {
    await db.run('UPDATE consensus_proposals SET status = ? WHERE id = ?', ['rejected', proposalId]);
  }

  res.json({ status: "voted", required_weight: requiredWeight, weight_for: vForWeight, weight_against: vAgainstWeight });
});

// ==========================================
// TMA
// ==========================================
apiRouter.post("/tma/register", (req, res) => {
  const { telegramData, hardware } = req.body;
  const COMM_DIR = path.join(process.cwd(), 'comm');
  if (!fs.existsSync(COMM_DIR)) fs.mkdirSync(COMM_DIR, { recursive: true });

  const id = uuidv4().substring(0, 8);
  fs.writeFileSync(path.join(COMM_DIR, `task_tma_register_${id}.json`), JSON.stringify({
    id, type: 'tma_register', issuer: 'express_server', timestamp: Date.now(),
    payload: { telegramId: telegramData?.id || 'unknown', username: telegramData?.username || 'anonymous', hardware }
  }, null, 2));

  res.json({ status: "processing", taskId: id, message: "Registration task queued in Swarm." });
});

apiRouter.post("/tma/pulse", (req, res) => {
  const { nodeId, status } = req.body;
  const COMM_DIR = path.join(process.cwd(), 'comm');
  if (!fs.existsSync(COMM_DIR)) fs.mkdirSync(COMM_DIR, { recursive: true });
  
  const id = uuidv4().substring(0, 8);
  fs.writeFileSync(path.join(COMM_DIR, `task_tma_pulse_${id}.json`), JSON.stringify({
    id, type: 'tma_pulse', issuer: 'express_server', timestamp: Date.now(),
    payload: { nodeId, status }
  }, null, 2));

  res.json({ status: "acknowledged" });
});

export default apiRouter;
