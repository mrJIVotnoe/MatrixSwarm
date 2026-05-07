import { Router } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../../db.js";
import { SIMULATION_CONFIG } from "../config/simulation.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { alias, public_key, user_mode } = req.body;
    let id = crypto.createHash('sha256').update(public_key).digest('hex').substring(0, 16);
    
    const db = await getDb();
    const existing = await db.get('SELECT * FROM observers WHERE id = ?', [id]);
    if (existing) {
      return res.json({ id, message: "Observer restored successfully" });
    }

    const created_at = Date.now();
    const mode = user_mode || 'symbiote';
    
    await db.run(`
      INSERT INTO observers (id, alias, public_key, user_mode, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [id, alias, public_key, mode, created_at]);
    
    res.json({ id, message: "Observer registered successfully" });
  } catch (e: any) {
    console.error("[ERROR] Failed to register observer", e);
    res.status(500).json({ error: "Failed to register observer" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const db = await getDb();
    const observer = await db.get('SELECT * FROM observers WHERE id = ?', [req.params.id]);
    if (!observer) return res.status(404).json({ error: "Observer not found" });
    
    const nodes = await db.all('SELECT id, address, status, power_rating, device_type, trust_score, battery_level, is_charging, cell_id, mobility_score FROM nodes WHERE owner_id = ?', [observer.id]);
    
    res.json({ ...observer, nodes });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch observer" });
  }
});

router.post("/nodes/register", async (req, res) => {
  try {
    const db = await getDb();
    const { id, delegatedTo, manifest, capabilities = [], ram_mb, cpu_cores, power_rating, mobility_score, senses } = req.body;
    const token = uuidv4();
    const nodeId = id || uuidv4();
    
    const defaultManifest = {
      storage_gb: 0,
      battery_health: "unknown",
      sensors: [],
      effectors: []
    };
    const armamentManifest = manifest || defaultManifest;
    
    const fullCapabilities = {
      roles: capabilities,
      manifest: armamentManifest
    };

    let lat = SIMULATION_CONFIG.BASE_LAT;
    let lng = SIMULATION_CONFIG.BASE_LNG;

    if (SIMULATION_CONFIG.IS_SIMULATION_MODE) {
      lat += (Math.random() - 0.5) * SIMULATION_CONFIG.COORDINATE_SPREAD;
      lng += (Math.random() - 0.5) * SIMULATION_CONFIG.COORDINATE_SPREAD;
    }

    const cell_id = req.body.cell_id || `HEX-${Math.floor(lat * 10)}:${Math.floor(lng * 10)}`;
    const cluster_id = `CLUSTER-${req.body.power_rating ? req.body.power_rating.split(' ')[0].toUpperCase() : 'UNKNOWN'}`;

    const is_purified = req.body.is_purified ? 1 : 0;
    const device_type = req.body.device_type || "smartphone";
    const battery_level = req.body.battery_level !== undefined ? req.body.battery_level : 100;
    const is_charging = req.body.is_charging !== undefined ? (req.body.is_charging ? 1 : 0) : 1;
    const owner_id = req.body.owner_id || null;
    
    let initial_trust = is_purified ? 50 : 10;
    if (battery_level < 20 && !is_charging) {
      initial_trust = Math.min(initial_trust, 20);
    }

    const address = req.ip || req.socket.remoteAddress || "unknown";

    await db.run(`
      INSERT INTO nodes (id, address, capabilities, ram_mb, cpu_cores, power_rating, status, last_heartbeat, trust_score, token, delegated_to, lat, lng, cell_id, cluster_id, senses, is_purified, device_type, battery_level, is_charging, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nodeId, address, JSON.stringify(fullCapabilities), ram_mb || 1024, cpu_cores || 1, power_rating || "unknown", 
      "online", Date.now(), initial_trust, token, delegatedTo || null, lat, lng, cell_id, cluster_id, 
      JSON.stringify(senses || { vision: false, hearing: false, proprioception: false, touch: false }), 
      is_purified, device_type, battery_level, is_charging, owner_id
    ]);

    console.info(`[INFO] [SWARM] New node registered: ${nodeId} (${power_rating}, ${device_type}, Purified: ${is_purified})`);
    
    res.json({ id: nodeId, token, message: "Welcome to the Swarm, Citizen." });
  } catch (err) {
    console.error("[ERROR] Node registration failed", err);
    res.status(500).json({ error: "Failed to register node" });
  }
});

export default router;
