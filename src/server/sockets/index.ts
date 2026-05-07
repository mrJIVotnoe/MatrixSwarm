import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getDb } from "../../db.js";
import { state } from "../state.js";
import { handleSignaling } from "./signaling.js";

export function initializeWebSockets(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    let nodeId: string | null = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth') {
          nodeId = data.nodeId;
          const { cellId } = data;
          if (nodeId) {
            state.connectedNodes.set(nodeId, ws);
            if (cellId) {
              const db = await getDb();
              await db.run('UPDATE nodes SET cell_id = ? WHERE id = ?', [cellId, nodeId]);
            }
            console.info(`[INFO] [HIVE L3] Node ${nodeId} connected via Matchmaking Server`);
            ws.send(JSON.stringify({ type: 'auth_success', message: 'Connected to Matchmaking Server' }));
          }
        }

        if (data.type === 'discovery' && nodeId) {
          const { cellId } = data;
          const db = await getDb();
          const peers = await db.all(
            'SELECT id, trust_score, power_rating, device_type, capabilities FROM nodes WHERE cell_id = ? AND status = "online" AND is_banned = 0 AND id != ? LIMIT 15', 
            [cellId, nodeId]
          );
          
          ws.send(JSON.stringify({
            type: 'discovery_response',
            peers: peers.filter((p: any) => state.connectedNodes.has(p.id))
          }));
          console.info(`[INFO] [HIVE L3] Node ${nodeId} discovered ${peers.length} peers in cell ${cellId}`);
        }

        // Delegate signaling
        if (nodeId) {
          handleSignaling(ws, data, nodeId);
        }

      } catch (e) {
        console.error('[ERROR] [HIVE] WS Message Error:', e);
      }
    });

    ws.on('close', () => {
      if (nodeId) {
        state.connectedNodes.delete(nodeId);
        console.info(`[INFO] [HIVE] Node ${nodeId} disconnected`);
      }
    });
  });
}
