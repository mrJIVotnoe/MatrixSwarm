import { Router } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../../db.js";
import { state } from "../state.js";
import { assignTask } from "../services/taskService.js";

const router = Router();

router.get("/recent", (req, res) => {
  const tasks = Array.from(state.activeTasks.values()).slice(-20).reverse();
  res.json(tasks);
});

router.post("/:nodeId/heartbeat", async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { isp = "unknown_isp", senses, battery_level, is_charging, mobility_score = 0, cell_id } = req.body;
    
    const db = await getDb();
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
    
    if (!node) {
      return res.status(404).json({ error: "Node not found in the Swarm." });
    }

    if (node.is_banned) {
      return res.status(403).json({ error: "This node has been banned for malicious activity." });
    }

    if (node.is_frozen) {
      return res.status(403).json({ error: "EMERGENCY: This node has been FROZEN by Magistrate Consensus." });
    }

    // Trust calculation (extracted to service)
    const { calculateTrustModifier } = await import("../services/trustService.js");
    const extraTrustModifier = calculateTrustModifier(node.device_type, mobility_score, node.trust_score);
    const currentTrust = Math.min(100, Math.max(0, node.trust_score + extraTrustModifier));

    let updates = [
      `last_heartbeat = ${Date.now()}`, 
      `status = "online"`, 
      `mobility_score = ${Math.max(node.mobility_score, mobility_score)}`, 
      `trust_score = ${currentTrust}`
    ];
    if (senses) updates.push(`senses = '${JSON.stringify(senses)}'`);
    if (battery_level !== undefined) updates.push(`battery_level = ${battery_level}`);
    if (is_charging !== undefined) updates.push(`is_charging = ${is_charging ? 1 : 0}`);
    if (cell_id) updates.push(`cell_id = '${cell_id}'`);

    await db.run(`UPDATE nodes SET ${updates.join(', ')} WHERE id = ?`, [nodeId]);

    // Parse capabilities
    let batteryHealth = "unknown";
    try {
      const caps = JSON.parse(node.capabilities);
      if (caps.manifest) batteryHealth = caps.manifest.battery_health;
    } catch(e) {}

    const isCharging = (is_charging !== undefined ? is_charging : node.is_charging === 1);
    const hasGoodBattery = (battery_level !== undefined ? battery_level : node.battery_level) > 20;
    const canDoHeavyTasks = isCharging || hasGoodBattery;

    const assignedTask = await assignTask({
      nodeId,
      isp,
      currentTrust,
      mobilityScore: mobility_score,
      deviceType: node.device_type,
      canDoHeavyTasks,
      batteryHealth,
      cellId: node.cell_id
    });

    res.json({ 
      status: "acknowledged", 
      task: assignedTask, 
      trust_score: currentTrust, 
      is_magistrate: currentTrust >= state.MAGISTRATE_THRESHOLD,
      pow_difficulty: state.currentPowDifficulty
    });
  } catch (err) {
    console.error("[ERROR] Heartbeat failed", err);
    res.status(500).json({ error: "Heartbeat failed" });
  }
});

router.post("/:nodeId/tasks/:taskId/complete", async (req, res) => {
  try {
    const { nodeId, taskId } = req.params;
    const { success, latency_ms, result } = req.body;
    
    const task = state.activeTasks.get(taskId);
    const db = await getDb();
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', [nodeId]);
    
    if (node && (node.is_banned || node.is_frozen)) {
      return res.status(403).json({ error: "Node is banned or frozen." });
    }

    if (task && node) {
      task.status = success ? "completed" : "failed";
      state.activeTasks.set(taskId, task);
      
      if (success) {
        let karmaReward = 0;
        let action = "";
        
        switch (task.type) {
          case "compute_hash": karmaReward = 2; action = "PROOF_OF_WORK"; break;
          case "byedpi_routing": karmaReward = 1; action = "ROUTING"; break;
          case "store_akashic_shard": karmaReward = 3; action = "STORAGE"; break;
          case "cluster_chunk": karmaReward = 5; action = "CLUSTER_COMPUTE"; break;
          case "spatial_recon": karmaReward = 4; action = "RECONNAISSANCE"; break;
        }

        if (task.type === "cluster_chunk") {
          const job = state.distributedJobs.get(task.job_id);
          if (job) {
            const chunk = job.chunks.find((c: any) => c.id === taskId);
            if (chunk) {
              chunk.status = 'completed';
              chunk.result = result;
              job.completed_chunks++;
              
              if (job.completed_chunks === job.chunksCount) {
                job.status = 'completed';
                if (job.type === 'prime_search') {
                  job.final_result = job.chunks.reduce((sum: number, c: any) => sum + (c.result || 0), 0);
                  console.info(`[INFO] [CLUSTER] Job ${job.name} COMPLETED! Final result: ${job.final_result}`);
                }
              }
            }
          }
        }

        if (karmaReward > 0) {
          await db.run('UPDATE nodes SET trust_score = MIN(100, trust_score + ?) WHERE id = ?', [karmaReward, nodeId]);
          
          const lastBlock = await db.get('SELECT hash FROM karma_ledger ORDER BY timestamp DESC LIMIT 1');
          const prevHash = lastBlock ? lastBlock.hash : "GENESIS";
          const timestamp = Date.now();
          
          const blockData = `${prevHash}${nodeId}${action}${karmaReward}${timestamp}`;
          const hash = crypto.createHash('sha256').update(blockData).digest('hex');
          
          await db.run(`
            INSERT INTO karma_ledger (id, node_id, action, amount, timestamp, previous_hash, hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [uuidv4(), nodeId, action, karmaReward, timestamp, prevHash, hash]);
          
          console.info(`[INFO] [KARMA] Node ${nodeId.substring(0,8)} earned +${karmaReward} for ${action}.`);
        }
      }

      await db.run(`
        INSERT INTO telemetry (id, node_id, strategy_name, target, success, latency_ms, timestamp, isp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), nodeId, task.strategy || 'compute', task.target, success ? 1 : 0, latency_ms || 0, Date.now(), task.isp || 'unknown']);

      if (state.matrixEcho) {
        state.matrixEcho.broadcastEcho({
          type: "echo_telemetry",
          isp: task.isp,
          strategy: task.strategy,
          target: task.target,
          success: !!success,
          timestamp: Date.now()
        }).catch(e => console.error("[ERROR] Matrix broadcast failed", e));
      }

      if (success) {
        await db.run('UPDATE nodes SET trust_score = trust_score + 1 WHERE id = ?', [nodeId]);
      } else {
        await db.run('UPDATE nodes SET trust_score = trust_score - 1 WHERE id = ?', [nodeId]);
      }
    }
    
    const updatedNode = await db.get('SELECT trust_score FROM nodes WHERE id = ?', [nodeId]);
    res.json({ status: "success", trust_score: updatedNode?.trust_score });
  } catch (err) {
    console.error("[ERROR] Task completion failed", err);
    res.status(500).json({ error: "Task completion failed" });
  }
});

export default router;
