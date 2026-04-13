import React, { useEffect, useState } from 'react';
import { Trophy, Shield, Zap, User } from 'lucide-react';
import { motion } from 'motion/react';

interface LeaderboardNode {
  id: string;
  power_rating: string;
  trust_score: number;
  status: string;
  vote_weight: number;
}

export const Leaderboard: React.FC<{ currentNodeId?: string, currentDelegatedTo?: string | null, onDelegate?: (magId: string | null) => void }> = ({ currentNodeId, currentDelegatedTo, onDelegate }) => {
  const [topNodes, setTopNodes] = useState<LeaderboardNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/v1/swarm/leaderboard');
      const data = await response.json();
      setTopNodes(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelegate = async (magId: string) => {
    if (!currentNodeId) return;
    const isUndelegating = currentDelegatedTo === magId;
    const targetId = isUndelegating ? null : magId;

    try {
      const response = await fetch(`/api/v1/nodes/${currentNodeId}/delegate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magistrateId: targetId })
      });
      if (response.ok) {
        if (onDelegate) onDelegate(targetId);
      }
    } catch (error) {
      console.error('Delegation failed:', error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-4 text-center text-gray-400">Loading Hive Elite...</div>;

  return (
    <div className="bg-gray-900/50 border border-yellow-500/30 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-xl font-bold text-yellow-500 uppercase tracking-wider">Hive Elite (Top 10)</h2>
      </div>

      <div className="space-y-4">
        {topNodes.map((node, index) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex flex-col p-3 rounded-lg border ${
              index === 0 ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-gray-800/50 border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? 'bg-yellow-500 text-black' : 
                  index === 1 ? 'bg-gray-300 text-black' :
                  index === 2 ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-300">
                      {node.id.substring(0, 8)}...
                    </span>
                    {node.power_rating === 'llm' && <Zap className="w-3 h-3 text-blue-400" title="LLM Tier" />}
                    {node.trust_score >= 90 && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/30">
                        MAGISTRATE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 uppercase">{node.power_rating}</div>
                  <div className="text-[9px] text-purple-400 font-bold uppercase mt-1">
                    Вес голоса: {node.vote_weight}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span className="text-lg font-bold text-white">{node.trust_score}</span>
                </div>
                <div className="text-[10px] text-gray-500 uppercase">Trust Score</div>
              </div>
            </div>

            {currentNodeId && node.id !== currentNodeId && node.trust_score >= 90 && (
              <div className="mt-3 pt-3 border-t border-gray-700/50 flex justify-end">
                <button
                  onClick={() => handleDelegate(node.id)}
                  className={`text-[10px] font-bold px-3 py-1 rounded transition-all ${
                    currentDelegatedTo === node.id 
                      ? 'bg-emerald-500 text-black' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {currentDelegatedTo === node.id ? '✓ DELEGATED' : 'DELEGATE VOTE'}
                </button>
              </div>
            )}
          </motion.div>
        ))}

        {topNodes.length === 0 && (
          <div className="text-center py-8 text-gray-500 italic">
            No elite nodes detected yet. Be the first!
          </div>
        )}
      </div>
    </div>
  );
};
