import React, { useEffect, useState } from 'react';
import { Link, Box, ArrowRight } from 'lucide-react';

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

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const res = await fetch('/api/v1/karma/ledger');
        if (res.ok) {
          setBlocks(await res.json());
        }
      } catch (e) {
        console.error("Failed to fetch Karma Ledger");
      }
    };

    fetchLedger();
    const interval = setInterval(fetchLedger, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border border-amber-500/30 p-5 rounded-sm">
      <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-amber-400 uppercase">
        <Link className="w-4 h-4" />
        Блокчейн Кармы (Satoshi's Ledger)
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
              <div className="p-3 border border-amber-500/20 bg-amber-950/20 rounded-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="text-[10px] text-amber-400 font-mono">Block: {block.hash.substring(0, 16)}...</p>
                      <p className="text-[8px] text-amber-500/50">Prev: {block.previous_hash.substring(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-cyan-400">+{block.amount} KARMA</p>
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
