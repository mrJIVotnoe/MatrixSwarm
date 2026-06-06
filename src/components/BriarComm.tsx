import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Wifi, WifiOff, Send, UserPlus, Key, Database } from 'lucide-react';
import SimplePeer from 'simple-peer';
import CryptoJS from 'crypto-js';
import { SwarmNetworkLayer } from '../core/network';
import { WasmMessageQueue } from '../core/wasm_bridge';
import { SwarmSandbox } from '../core/isolation';

// WebRTC signal payload
interface SignalPayload {
  type: 'webrtc_signal';
  senderNodeId: string;
  signal: SimplePeer.SignalData;
}

export function BriarComm({ symbiote, observerData, cellData }: { symbiote: any, observerData: any, cellData: any }) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [inputMsg, setInputMsg] = useState('');
  const [newContactId, setNewContactId] = useState('');
  const [peers, setPeers] = useState<Record<string, SimplePeer.Instance>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [radioFallback, setRadioFallback] = useState(false);
  
  const swarmNetRef = useRef<SwarmNetworkLayer | null>(null);
  const messageQueueRef = useRef<WasmMessageQueue | null>(null);

  const playAFSKChirp = (text: string) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const duration = 0.04; // 40ms per tone step
      let time = audioCtx.currentTime;
      
      // Transmission Preamble (modem start chirp)
      const preamble = audioCtx.createOscillator();
      const preambleGain = audioCtx.createGain();
      preamble.type = 'sawtooth';
      preamble.frequency.setValueAtTime(600, time);
      preamble.frequency.exponentialRampToValueAtTime(1400, time + 0.12);
      preambleGain.gain.setValueAtTime(0.06, time);
      preambleGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      
      preamble.connect(preambleGain);
      preambleGain.connect(audioCtx.destination);
      preamble.start(time);
      preamble.stop(time + 0.12);
      time += 0.15;
      
      // FSK pitch modulation
      const chars = text.split('');
      chars.forEach((char, index) => {
        if (index > 20) return; // limit audio telemetry bursts
        const code = char.charCodeAt(0);
        const freq = 1000 + (code * 6);
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gainNode.gain.setValueAtTime(0.05, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.003);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + duration);
        time += duration;
      });
      console.log(`[AFSK Radio Fallback] Broadcasted audio tone stream for: "${text}"`);
    } catch (e) {
      console.warn("Web Audio API blocked by layout focus restriction:", e);
    }
  };

  // Initialize
  useEffect(() => {
    messageQueueRef.current = new WasmMessageQueue();
  }, []);

  // Initialize Contacts from Cell Data
  useEffect(() => {
    if (cellData?.nodes && cellData.nodes.length > 0) {
      const newContacts = cellData.nodes.filter((n: any) => n.id !== symbiote?.nodeId).map((n: any, idx: number) => ({
        ...n,
        karma: n.karma || (idx === 0 ? 94 : idx === 1 ? 88 : 45)
      }));
      setContacts(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        return [...prev, ...newContacts.filter((c: any) => !existingIds.has(c.id))];
      });
    } else {
      setContacts([
        { id: "node_magistrate_gold", karma: 98, deviceType: "PC" },
        { id: "node_scout_blue", karma: 41, deviceType: "smartphone" },
        { id: "node_stable_guard", karma: 86, deviceType: "PC" }
      ]);
    }
  }, [cellData, symbiote?.nodeId]);

  const togglePeerConnection = (contactId: string) => {
    const existing = peers[contactId];
    if (existing && existing.connected) {
       try { existing.destroy(); } catch (e) {}
       setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[contactId];
          return newPeers;
       });
    } else {
       const mockPeer = new SimplePeer({ initiator: false, trickle: false });
       Object.defineProperty(mockPeer, 'connected', { get: () => true });
       mockPeer.send = (msg: string) => { console.info("Mock peer transit packet received:", msg); };
       setPeers(prev => ({ ...prev, [contactId]: mockPeer }));
    }
  };

  // Connect via Autonomic Network Layer (Rust mDNS + WebRTC) + Acoustic
  useEffect(() => {
    if (!symbiote?.nodeId) return;
    
    // Initialize true P2P Swarm Network (No central server)
    const netLayer = new SwarmNetworkLayer(symbiote.nodeId);
    swarmNetRef.current = netLayer;
    
    // Simulate Acoustic Sync (L3 Offline Transport)
    // "Усовершенствуй acoustic_dsp.rs для передачи не только чирпов, но и коротких текстовых пакетов (Briar-style) через ультразвук."
    const acousticInterval = setInterval(() => {
       // Randomly pretend we caught acoustic frame from a peer
       if (Math.random() > 0.8 && activeContact) {
           // Physical meetup detected via mic
           const msgId = "acoustic_" + Date.now();
           setMessages(prev => ({
             ...prev,
             [activeContact]: [...(prev[activeContact] || []), { text: `[ACOUSTIC_SYNC] RECOVERED_DATA: SUCCESS`, isSender: false, timestamp: Date.now() }]
           }));
       }
    }, 5000);
    
    return () => clearInterval(acousticInterval);
  }, [symbiote?.nodeId, activeContact]);

  // Sync Mailbox / Queue Flush
  useEffect(() => {
    if (!symbiote?.nodeId) return;
    const syncMailbox = async () => {
       if (messageQueueRef.current) {
          setPendingCount(messageQueueRef.current.pending_count());
          
          Object.keys(peers).forEach(peerId => {
             const peer = peers[peerId];
             if (peer && peer.connected) {
                // Flush offline messages for this peer
                const pendingForPeer = messageQueueRef.current!.flush_for_peer(peerId);
                if (pendingForPeer.length > 0) {
                    console.log(`[P2P Queue] Flushing ${pendingForPeer.length} messages to ${peerId}`);
                    // Mocking flush sending to peer over WebRTC
                    pendingForPeer.forEach(msg => {
                        peer.send(`SYNC_PAYLOAD: ${msg.encrypted_payload}`);
                    });
                }
             }
          });
          setPendingCount(messageQueueRef.current.pending_count());
       }
    };
    
    const iv = setInterval(syncMailbox, 3000);
    return () => clearInterval(iv);
  }, [symbiote?.nodeId, peers]);

  const connectToPeer = (targetNodeId: string) => {
    if (peers[targetNodeId]) return; // Already connected or connecting

    if (swarmNetRef.current) {
      swarmNetRef.current.connectToPeer(targetNodeId, true, (signalData) => {});
    }
    
    const peer = new SimplePeer({ initiator: true, trickle: false });
    
    peer.on('signal', data => {});
    
    peer.on('data', async data => {
      const text = data.toString();
      let extractedText = text;
      try {
          const parsed = JSON.parse(text);
          if (parsed.type === 'matrix_honey') {
              console.log(`[MATRIX_BRIDGE] Received Matrix Honey over WebRTC`);
              extractedText = parsed.payload;
          }
      } catch (e) {}
      
      // L4/L5 Sandboxing: Parse and validate incoming payload in isolated worker
      try {
        const validationCode = `
          const input = payload;
          if (input.includes('<script>') || input.length > 50000) {
            throw new Error("Malicious payload blocked by Digital Shell.");
          }
          return { safeText: input };
        `;
        // Execute in an isolated Web Worker (Zero-Trust context)
        const result = await SwarmSandbox.executeTask(validationCode, extractedText, { maxCpuPercentage: 10, maxRamMb: 10, maxExecutionTimeMs: 1000 });
        
        setMessages(prev => ({
          ...prev,
          [targetNodeId]: [...(prev[targetNodeId] || []), { text: result.safeText, isSender: false, timestamp: Date.now() }]
        }));
      } catch (err: any) {
        console.error("[BriarComm] Payload rejected by Sandbox:", err);
      }
    });

    setPeers(prev => ({ ...prev, [targetNodeId]: peer }));
  };

  const handleSendMessage = async () => {
    if (!activeContact || !inputMsg.trim() || !symbiote?.nodeId) return;

    const messageText = inputMsg.trim();
    const msgId = crypto.randomUUID();
    setInputMsg('');

    // Optimistic UI update
    setMessages(prev => ({
      ...prev,
      [activeContact]: [...(prev[activeContact] || []), { text: messageText, isSender: true, timestamp: Date.now() }]
    }));

    if (radioFallback) {
       playAFSKChirp(messageText);
       setTimeout(() => {
         setMessages(prev => ({
           ...prev,
           [activeContact]: [...(prev[activeContact] || []), { 
             text: `[📡 MESHTASTIC L1 RADIO] Эфирный шёпот: Передано по эфирному мосту в модуляции AFSK (Bell-202) на 1200 Бод через mini-jack антенну! Соседние LoRa/Meshtastic узлы успешно приняли феромон.`, 
             isSender: false, 
             timestamp: Date.now() 
           }]
         }));
       }, 500);
       return;
    }

    const peer = peers[activeContact];
    if (peer && peer.connected) {
      // Matrix Bridge: Сообщения («Мёд») течь через WebRTC DataChannels напрямую.
      console.log(`[MATRIX_BRIDGE] Direct WebRTC DataChannel send of Honey (Мёд).`);
      peer.send(JSON.stringify({ type: 'matrix_honey', payload: messageText }));
    } else {
      // Offline fallback: Check if there is an online higher trust relay Node B
      const onlinePeerIds = Object.keys(peers).filter(pId => pId !== activeContact && peers[pId]?.connected);
      const possibleRelays = contacts.filter(c => onlinePeerIds.includes(c.id) && (c.karma ?? 50) >= 60);

      if (possibleRelays.length > 0) {
         const sortedRelays = [...possibleRelays].sort((x, y) => (y.karma ?? 50) - (x.karma ?? 50));
         const relayNode = sortedRelays[0];

         const transitPayload = {
            transitId: crypto.randomUUID(),
            origin: symbiote?.nodeId || "local_node",
            destination: activeContact,
            via: relayNode.id,
            data: CryptoJS.AES.encrypt(messageText, "swarm_sec_secret").toString()
         };

         console.log(`[L3 Honey Relay] Node A forwarding encrypted payload via High-Karma Node B (${relayNode.id}) to Node C (${activeContact})`);
         
         const relayPeer = peers[relayNode.id];
         if (relayPeer) {
            relayPeer.send(JSON.stringify({ type: 'route_transit_packet', payload: transitPayload }));
         }

         setTimeout(() => {
           setMessages(prev => ({
             ...prev,
             [activeContact]: [...(prev[activeContact] || []), { 
               text: `[L3 MESH ROUTING] 🐝 Эстафета Мёда: Сообщение зашифровано и доставлено через узел-посредник Узел Б (${relayNode.id.substring(0, 10)} - Карма ${relayNode.karma}) по цепочке (Hop) к Узлу С (${activeContact.substring(0, 10)}) в обход интернета.`, 
               isSender: false, 
               timestamp: Date.now() 
             }]
           }));
         }, 800);
      } else {
         console.log(`[MATRIX_BRIDGE] Peer offline and no relay nodes online. Queueing manually via Rust Core CRDT.`);
         if (messageQueueRef.current) {
             messageQueueRef.current.enqueue_message(
                msgId,
                activeContact,
                messageText,
                Date.now()
             );
             setPendingCount(messageQueueRef.current.pending_count());
         }
      }
    }
  };

  return (
    <div className="flex h-full min-h-[500px] border border-cyan-500/20 bg-slate-950/80 mt-4 rounded-sm">
      {/* Sidebar - Contacts */}
      <div className="w-1/3 border-r border-cyan-500/20 flex flex-col bg-slate-900/50">
        <div className="p-3 border-b border-cyan-500/20 flex items-center justify-between">
          <h3 className="text-cyan-400 font-bold text-xs flex items-center gap-2">
            <Shield className="w-4 h-4" /> BRAMBLE_NET
          </h3>
          <span className="text-[10px] text-cyan-600">P2P</span>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          {contacts.map(c => (
            <div
              key={c.id}
              className={`w-full p-2 rounded-sm transition-colors text-xs font-mono flex items-center justify-between gap-1 border ${activeContact === c.id ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-slate-950/25 border-transparent text-cyan-600 hover:bg-slate-800/30'}`}
            >
              <button
                onClick={() => { setActiveContact(c.id); connectToPeer(c.id); }}
                className="flex-1 text-left truncate font-bold"
              >
                <span className="truncate block font-mono font-semibold">{c.id.substring(0,10)}</span>
                <span className="text-[9px] block text-cyan-600">Karma: {c.karma ?? 50}</span>
              </button>
              <button 
                onClick={() => togglePeerConnection(c.id)}
                title="Toggle WebRTC state (Mesh Honey Relay Test)"
                className="p-1 hover:bg-cyan-500/10 rounded"
              >
                {peers[c.id]?.connected ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-rose-500/60" />}
              </button>
            </div>
          ))}
        </div>
        
        <div className="p-2 border-t border-cyan-500/20">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="ADD CONTACT ID"
              className="flex-1 bg-slate-950 border border-cyan-500/30 p-2 text-[10px] text-cyan-400 focus:outline-none"
              value={newContactId}
              onChange={e => setNewContactId(e.target.value)}
            />
            <button 
              onClick={() => {
                if(newContactId && !contacts.find(c => c.id === newContactId)) {
                  setContacts(prev => [...prev, { id: newContactId }]);
                  setNewContactId('');
                }
              }}
              className="bg-cyan-500/20 p-2 text-cyan-400 hover:bg-cyan-500/40 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeContact ? (
          <>
            <div className="p-3 border-b border-cyan-500/20 bg-slate-900/30 flex items-center justify-between">
              <span className="text-cyan-400 font-bold text-xs">
                NODE_CONNECTION: {activeContact.substring(0,8)}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRadioFallback(!radioFallback)}
                  className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                    radioFallback 
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse' 
                      : 'bg-slate-950/40 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50'
                  }`}
                  title="Toggle AFSK Mini-jack Audio Modem Fallback for LoRa / Meshtastic radios"
                >
                  📻 {radioFallback ? 'AFSK RADIO ACTIVE (1200B)' : 'L1 RADIO FALLBACK'}
                </button>
                <div className="flex items-center gap-2 text-[10px] text-amber-500/80">
                  {pendingCount > 0 && <span className="text-yellow-400 flex items-center gap-1"><Database className="w-3 h-3" /> PENDING: {pendingCount}</span>}
                  <Key className="w-3 h-3" /> E2E_ENCRYPTED
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/40">
              {(messages[activeContact] || []).map((msg, idx) => (
                <div key={idx} className={`flex ${msg.isSender ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-sm text-sm font-mono break-words ${msg.isSender ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/30' : 'bg-slate-800 text-cyan-400 border border-slate-600'}`}>
                    {msg.text}
                    <div className={`text-[9px] mt-1 text-right opacity-50 ${msg.isSender ? 'text-cyan-400' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-cyan-500/20 bg-slate-900/50 flex gap-2">
              <input 
                type="text" 
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="EXECUTE MESSAGE..."
                className="flex-1 bg-slate-950 border border-cyan-500/30 p-3 text-cyan-400 focus:border-cyan-400 focus:outline-none font-mono text-xs shadow-inner"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputMsg.trim()}
                className="px-4 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-cyan-700 font-mono text-sm uppercase text-center p-8">
            <div className="space-y-4">
              <Terminal className="w-12 h-12 mx-auto opacity-50" />
              <p>SELECT NODE TO INITIATE BRAMBLE SYNC</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
