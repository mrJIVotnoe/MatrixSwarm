import { WebSocket } from 'ws';
import { getDb } from "../../db.js";
import { state } from "../state.js";

export function handleSignaling(ws: WebSocket, data: any, nodeId: string) {
  if (['webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate', 'webrtc_signal'].includes(data.type)) {
    const targetWs = state.connectedNodes.get(data.targetNodeId);
    if (targetWs && targetWs.readyState === 1) {
      targetWs.send(JSON.stringify({
        type: data.type,
        senderNodeId: nodeId,
        sdp: data.sdp,
        candidate: data.candidate,
        signal: data.signal,
        signature: data.signature // Mandatory for Zero-Trust verification
      }));
    }
  }
}
