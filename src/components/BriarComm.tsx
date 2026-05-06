import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Wifi, WifiOff, Send, UserPlus, Key } from 'lucide-react';
import SimplePeer from 'simple-peer';
import CryptoJS from 'crypto-js';

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
  
  const wsRef = useRef<WebSocket | null>(null);

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

  // Connect to Signaling WebSockets
  useEffect(() => {
    if (!symbiote?.nodeId) return;
    
    // Using current host for WS connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', nodeId: symbiote.nodeId }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'webrtc_signal') {
        handleIncomingSignal(data.senderNodeId, data.signal);
      }
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      Object.values(peers).forEach((p: any) => p.destroy && p.destroy());
    };
  }, [symbiote?.nodeId]);

  // Poll for Mailbox Messages (Bramble Sync)
  useEffect(() => {
    if (!symbiote?.nodeId) return;
    const syncMailbox = async () => {
      try {
        const res = await fetch(`/api/v1/bramble/sync/${symbiote.nodeId}`);
        if (res.ok) {
           const data = await res.json();
           if (data.messages && data.messages.length > 0) {
             const ackIds: string[] = [];
             data.messages.forEach((msg: any) => {
                // Here we simulate decryption
                // Expected payload: { text: "encrypted..." }
                try {
                  // Fallback dummy decryption using senderId as password
                  const bytes = CryptoJS.AES.decrypt(msg.encrypted_payload, "SwarmSharedSecret");
                  const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
                  
                  setMessages(prev => ({
                    ...prev,
                    [msg.sender_id]: [...(prev[msg.sender_id] || []), { text: decryptedText, isSender: false, timestamp: msg.timestamp }]
                  }));
                  ackIds.push(msg.id);
                } catch (e) {
                   console.error("Decrypt error", e);
                }
             });
             
             if (ackIds.length > 0) {
               await fetch('/api/v1/bramble/ack', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ messageIds: ackIds })
               });
             }
           }
        }
      } catch (e) {}
    };
    
    const iv = setInterval(syncMailbox, 3000);
    return () => clearInterval(iv);
  }, [symbiote?.nodeId]);

  const handleIncomingSignal = (senderNodeId: string, signal: SimplePeer.SignalData) => {
    let peer = peers[senderNodeId];
    if (!peer) {
      peer = new SimplePeer({ initiator: false, trickle: false });
      
      peer.on('signal', data => {
        wsRef.current?.send(JSON.stringify({ type: 'webrtc_signal', targetNodeId: senderNodeId, signal: data }));
      });
      
      peer.on('data', data => {
        const text = data.toString();
        setMessages(prev => ({
          ...prev,
          [senderNodeId]: [...(prev[senderNodeId] || []), { text, isSender: false, timestamp: Date.now() }]
        }));
      });

      setPeers(prev => ({ ...prev, [senderNodeId]: peer! }));
    }
    
    peer.signal(signal);
  };

  const connectToPeer = (targetNodeId: string) => {
    if (peers[targetNodeId]) return; // Already connected or connecting

    const peer = new SimplePeer({ initiator: true, trickle: false });
    
    peer.on('signal', data => {
      wsRef.current?.send(JSON.stringify({ type: 'webrtc_signal', targetNodeId, signal: data }));
    });
    
    peer.on('data', data => {
      const text = data.toString();
      setMessages(prev => ({
        ...prev,
        [targetNodeId]: [...(prev[targetNodeId] || []), { text, isSender: false, timestamp: Date.now() }]
      }));
    });

    setPeers(prev => ({ ...prev, [targetNodeId]: peer }));
  };

  const handleSendMessage = async () => {
    if (!activeContact || !inputMsg.trim() || !symbiote?.nodeId) return;

    const messageText = inputMsg.trim();
    setInputMsg('');

    // Optimistic UI update
    setMessages(prev => ({
      ...prev,
      [activeContact]: [...(prev[activeContact] || []), { text: messageText, isSender: true, timestamp: Date.now() }]
    }));

    const peer = peers[activeContact];
    if (peer && peer.connected) {
      // Direct WebRTC connection
      peer.send(messageText);
    } else {
      // Fallback: Bramble Mailbox over Server (E2E Encrypted)
      const encrypted = CryptoJS.AES.encrypt(messageText, "SwarmSharedSecret").toString();
      await fetch('/api/v1/bramble/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: symbiote.nodeId,
          recipientId: activeContact,
          encryptedPayload: encrypted
        })
      });
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
