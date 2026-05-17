import React, { useEffect, useState, useRef } from 'react';
import { Link, Box, ArrowRight, Activity, Zap } from 'lucide-react';
import { WasmKarmaCRDT } from '../core/wasm_bridge';

interface KarmaBlock {
  id: string;
  node_id: string;
  action: string;
  amount: number;
  timestamp: number;
  previous_hash: string;
  hash: string;
}

export const KarmaLedger: React.FC = () => {
  const [blocks, setBlocks] = useState<KarmaBlock[]>([]);
  const crdtRef = useRef<WasmKarmaCRDT | null>(null);
  const [crdtStateCount, setCrdtStateCount] = useState(0);

  useEffect(() => {
    crdtRef.current = new WasmKarmaCRDT();
    
    // Quantum Synchronization: WebRTC/mDNS CRDT Logic (L4)
    // Synchronize Karma and Soul Passport across cell instantly
    const pullFromP2P = () => {
       // Simulate receiving WebRTC push from another peer with a new CRDT state
       if (Math.random() > 0.7 && crdtRef.current) {
          const fakeBlock = {
             id: "block_" + Date.now(),
             node_id: "peer_" + Math.floor(Math.random()*1000),
             action: "P2P_CRDT_SYNC_REWARD",
             amount: 5,
             timestamp: Date.now(),
             previous_hash: "00000000",
             hash: "crdt" + Date.now()
          };
          
          crdtRef.current.add_block(JSON.stringify(fakeBlock));
          setCrdtStateCount(crdtRef.current.size());
       }
    };

    const fetchLedger = async () => {
      try {
        const res = await fetch('/api/v1/karma/ledger');
        if (res.ok) {
          const apiBlocks = await res.json();
          // Merge API blocks into CRDT natively in Rust
          if (crdtRef.current) {
             apiBlocks.forEach((b: KarmaBlock) => crdtRef.current?.add_block(JSON.stringify(b)));
             // Collapse state back into view view
             const exported = crdtRef.current.export_all();
             setBlocks(exported);
             setCrdtStateCount(exported.length);
          }
        }
      } catch (e) {
        // Offline? We still have CRDT state!
        if (crdtRef.current) {
            const exported = crdtRef.current.export_all();
            setBlocks(exported);
        }
      }
    };

    fetchLedger();
    const interval = setInterval(() => {
        pullFromP2P();
        fetchLedger();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border border-amber-500/30 p-5 rounded-sm">
      <h2 className="text-sm font-bold mb-4 flex items-center justify-between text-amber-400 uppercase">
        <span className="flex items-center gap-2">
            <Link className="w-4 h-4" /> Блокчейн Кармы (CRDT)
        </span>
        <span className="text-[10px] text-amber-500/70 border border-amber-500/30 px-2 py-0.5 rounded-sm flex items-center gap-1">
            <Activity className="w-3 h-3" /> P2P SYNCED: {crdtStateCount}
        </span>
      </h2>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {blocks.length === 0 ? (
          <p className="text-[10px] text-amber-900 italic">Блокчейн пуст. Ожидание первых транзакций...</p>
        ) : (
          blocks.map((block, index) => (
            <div key={block.id} className="relative">
              {index !== blocks.length - 1 && (
                <div className="absolute left-4 top-full h-3 w-0.5 bg-amber-500/20"></div>
              )}
              <div className="p-3 border border-amber-500/20 bg-amber-950/20 rounded-sm hover:border-amber-500/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-[10px] text-amber-400 font-mono">Block: {block.hash.substring(0, 16)}...</p>
                      <p className="text-[8px] text-amber-500/50">Prev: {block.previous_hash.substring(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-cyan-400 flex items-center gap-1 justify-end">
                       {block.action.includes('CRDT') && <Zap className="w-3 h-3 text-amber-400" />}
                       +{block.amount} KARMA
                    </p>
                    <p className="text-[8px] text-gray-500">{new Date(block.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-[10px] bg-black/50 p-1.5 rounded-sm border border-amber-500/10">
                  <span className="text-gray-400 font-mono">{block.node_id.substring(0, 8)}</span>
                  <ArrowRight className="w-3 h-3 text-amber-500/50" />
                  <span className="text-amber-300 font-bold">{block.action}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

