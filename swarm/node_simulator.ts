/**
 * MatrixSwarm Node Simulator (E.S.C.A.P.E. Clients)
 * This script simulates multiple nodes joining the swarm, sending heartbeats,
 * and performing a real P2P Honey Exchange via local UDP multicast 
 * (simulating mDNS + WebRTC DataChannels in a serverless environment).
 */

import crypto from 'crypto';
import dgram from 'dgram';

const API_URL = "http://localhost:3000/api/v1";
const ROLE = process.env.NODE_ROLE || 'Scout_Local';
const MULTICAST_ADDR = '224.0.0.114';
const MULTICAST_PORT = 41234;

let globalTraceCounter = Math.floor(Math.random() * 1000000);

function logStateTransition(oldState: string, newState: string) {
   const traceId = "TRACE_" + (globalTraceCounter++).toString(16).toUpperCase().padStart(8, '0');
   console.log(`[${traceId}] State Transition: ${oldState} -> ${newState}`);
}

async function bootstrap() {
  console.log(`🐝 [BOOTSTRAP] Starting MatrixSwarm Node Simulator: ${ROLE}...`);
  
  logStateTransition("INIT", "READY");

  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  
  // 1. Identity Verification (Simulating Rust-Core)
  const nodeId = crypto.randomBytes(4).toString('hex');
  const soulPassport = {
      seed: "ocean ripple ... " + nodeId, // Mnemonic
      public_key: crypto.randomBytes(32).toString('hex')
  };
  
  console.log(`[IDENTITY] Soul Passport Forged: ${nodeId}`);
  logStateTransition("READY", "RUNNING");

  // We maintain discovered peers
  const peers = new Set();
  const activePeers = new Map<string, number>();
  const activeTasks = new Map<string, string>();

  socket.on('message', (msg, rinfo) => {
      try {
          const data = JSON.parse(msg.toString());
          if (data.nodeId === nodeId) return; // Ignore self
          
          if (data.type === 'MDNS_DISC') {
              if (!peers.has(data.nodeId)) {
                   peers.add(data.nodeId);
                   console.log(`\n=================================\n[mDNS] Discovered Neighbor: ${data.role} (${data.nodeId})\n=================================`);
                   
                   // L3 P2P Messaging: Encrypted Honey Transfer
                   const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.alloc(32, 1), Buffer.alloc(16, 0));
                   let encrypted = cipher.update(`HONEYCOMB_DATA: ${ROLE} verified`, 'utf8', 'hex');
                   encrypted += cipher.final('hex');
                   
                   const response = JSON.stringify({
                       type: 'HONEY_TRANSFER',
                       nodeId,
                       role: ROLE,
                       payload: encrypted
                   });

                   // Send directly to peer's port representing WebRTC DataChannel
                   socket.send(response, rinfo.port, rinfo.address, () => {
                       console.log(`[P2P WebRTC-DataChannel] Sent encrypted Honey to ${data.role}!`);
                   });
              }
              // Task Failover (Reincarnation) tracking
              activePeers.set(data.nodeId, Date.now());
          } else if (data.type === 'HONEY_TRANSFER') {
              // L3 P2P Messaging: Inbound Honey
              const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.alloc(32, 1), Buffer.alloc(16, 0));
              let decrypted = decipher.update(data.payload, 'hex', 'utf8');
              decrypted += decipher.final('utf8');
              console.log(`[P2P WebRTC-DataChannel] Decrypted Honey from ${data.role}: >> "${decrypted}" <<`);
          } else if (data.type === 'TASK_CLAIM') {
              activeTasks.set(data.taskId, data.nodeId);
          }
      } catch (e: unknown) {}
  });

  // Failover detector - Reincarnating tasks
  setInterval(() => {
     const now = Date.now();
     for (const [peerId, lastSeen] of activePeers.entries()) {
        if (now - lastSeen > 15000) { // 15 seconds without heartbeat -> Node died
           console.log(`[WARNING] Node ${peerId} declared DEAD. Reincarnating its tasks...`);
           activePeers.delete(peerId);
           for (const [taskId, ownerId] of activeTasks.entries()) {
              if (ownerId === peerId) {
                  console.log(`[CRDT_FAILOVER] Reclaiming Task ${taskId} from dead node ${peerId}`);
                  const claimMsg = JSON.stringify({ type: 'TASK_CLAIM', taskId, nodeId });
                  socket.send(claimMsg, MULTICAST_PORT, MULTICAST_ADDR);
                  activeTasks.set(taskId, nodeId);
              }
           }
        }
     }
  }, 5000);

  socket.bind(MULTICAST_PORT, () => {
      socket.addMembership(MULTICAST_ADDR);
      console.log(`[NETWORK] Joined L3 Gossip Swarm at ${MULTICAST_ADDR}:${MULTICAST_PORT}`);
      
      // Simulate task acquisition for Magistrate
      if (ROLE === 'Magistrate') {
          setTimeout(() => {
             const taskId = "TASK_DECODE_NEXUS";
             console.log(`[TASKS] ${ROLE} claiming genesis task ${taskId}`);
             activeTasks.set(taskId, nodeId);
             const claimMsg = JSON.stringify({ type: 'TASK_CLAIM', taskId, nodeId });
             socket.send(claimMsg, MULTICAST_PORT, MULTICAST_ADDR);
             
             if (process.env.DEMO_MODE) {
                  setTimeout(() => {
                      logStateTransition("RUNNING", "FAILED");
                      console.log(`[FATAL] Injecting artificial crash to demonstrate task failover... Container will die.`);
                      process.exit(1);
                  }, 6000);
             }
          }, 3000);
      }

      // 2. mDNS Discovery broadcast (Waggle Dance)
      setInterval(() => {
          const discMsg = JSON.stringify({ type: 'MDNS_DISC', role: ROLE, nodeId });
          socket.send(discMsg, MULTICAST_PORT, MULTICAST_ADDR);
      }, 5000);
  });
}

bootstrap().catch(err => {
  console.error(`[BOOTSTRAP ERROR] Fatal crash prevented:`, err);
});

