import { Router } from "express";
import { getDb } from "../../db.js";
import { state } from "../state.js";

const router = Router();

router.get("/ledger", async (req, res) => {
  try {
    const db = await getDb();
    const blocks = await db.all('SELECT * FROM karma_ledger ORDER BY timestamp DESC LIMIT 50');
    res.json(blocks);
  } catch (err) {
    console.error("[ERROR] Failed to fetch karma ledger", err);
    res.status(500).json({ error: "Failed to fetch karma ledger" });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const db = await getDb();
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
  } catch (err) {
    console.error("[ERROR] Failed to fetch leaderboard", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/recommendations/magistrates", async (req, res) => {
  try {
    const db = await getDb();
    const recommendations = await db.all(`
      SELECT id, trust_score, power_rating 
      FROM nodes 
      WHERE trust_score >= ? AND status = 'online' AND is_banned = 0
      ORDER BY trust_score DESC 
      LIMIT 3
    `, [state.MAGISTRATE_THRESHOLD]);
    
    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

export default router;
