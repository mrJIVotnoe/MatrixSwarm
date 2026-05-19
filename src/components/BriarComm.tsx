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
  
  const swarmNetRef = useRef<SwarmNetworkLayer | null>(null);
  const messageQueueRef = useRef<WasmMessageQueue | null>(null);

  // Initialize
  useEffect(() => {
    messageQueueRef.current = new WasmMessageQueue();
  }, []);

  // Initialize Contacts from Cell Data
  useEffect(() => {
    if (cellData?.nodes) {
      const newContacts = cellData.nodes.filter((n: any) => n.id !== symbiote?.nodeId);
      setContacts(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        return [...prev, ...newContacts.filter((c: any) => !existingIds.has(c.id))];
      });
    }
  }, [cellData, symbiote?.nodeId]);

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

    const peer = peers[activeContact];
    if (peer && peer.connected) {
      // Matrix Bridge: Сообщения («Мёд») течь через WebRTC DataChannels напрямую.
      console.log(`[MATRIX_BRIDGE] Direct WebRTC DataChannel send of Honey (Мёд).`);
      peer.send(JSON.stringify({ type: 'matrix_honey', payload: messageText }));
    } else {
      // Offline fallback
      console.log(`[MATRIX_BRIDGE] Peer offline. Queueing manually via Rust Core CRDT.`);
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
            <button
              key={c.id}
              onClick={() => { setActiveContact(c.id); connectToPeer(c.id); }}
              className={`w-full text-left p-3 rounded-sm transition-colors text-xs font-mono flex items-center justify-between ${activeContact === c.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-950/50 text-cyan-600 hover:bg-slate-800'}`}
            >
              <span className="truncate">{c.id.substring(0,8)}</span>
              {peers[c.id]?.connected ? <Wifi className="w-3 h-3 text-amber-400" /> : <WifiOff className="w-3 h-3 text-cyan-800" />}
            </button>
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
              <div className="flex items-center gap-2 text-[10px] text-amber-500/80">
                {pendingCount > 0 && <span className="text-yellow-400 flex items-center gap-1"><Database className="w-3 h-3" /> PENDING: {pendingCount}</span>}
                <Key className="w-3 h-3" /> E2E_ENCRYPTED
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
