import React, { useEffect, useState } from 'react';
import { Gavel, Check, X, Clock, AlertCircle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Proposal {
  id: string;
  parameter_name: string;
  parameter_value: string;
  proposer_id: string;
  votes_for: string[];
  votes_against: string[];
  weight_for: number;
  weight_against: number;
  required_weight: number;
  expires_at: number;
}

export const MagistrateCouncil: React.FC<{ nodeId?: string, isMagistrate: boolean }> = ({ nodeId, isMagistrate }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [ispToFreeze, setIspToFreeze] = useState('');

  const fetchProposals = async () => {
    try {
      const response = await fetch('/api/v1/consensus/proposals');
      const data = await response.json();
      setProposals(data);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const proposeFreezeSegment = async () => {
    if (!nodeId || !isMagistrate || !ispToFreeze) return;
    try {
      const response = await fetch('/api/v1/consensus/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nodeId, 
          parameterName: 'freeze_segment', 
          parameterValue: ispToFreeze 
        })
      });
      if (response.ok) {
        setIspToFreeze('');
        fetchProposals();
      } else {
        const err = await response.json();
        alert(err.error);
      }
    } catch (error) {
      console.error('Failed to propose segment freeze:', error);
    }
  };

  useEffect(() => {
    fetchProposals();
    const interval = setInterval(fetchProposals, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleVote = async (proposalId: string, vote: 'for' | 'against') => {
    if (!nodeId || !isMagistrate) return;
    try {
      const response = await fetch(`/api/v1/consensus/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, vote })
      });
      if (response.ok) {
        fetchProposals();
      } else {
        const err = await response.json();
        alert(err.error);
      }
    } catch (error) {
      console.error('Voting failed:', error);
    }
  };

  if (!isMagistrate && proposals.length === 0) return null;

  return (
    <div className="bg-neutral-900 border border-purple-500/30 rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold flex items-center gap-2 text-purple-400">
          <Gavel className="w-4 h-4" />
          СОВЕТ МАГИСТРАТОВ (CONSENSUS)
        </h2>
        {!isMagistrate && (
          <span className="text-[10px] text-purple-500/50 uppercase tracking-widest">Только чтение</span>
        )}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {proposals.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-950 border border-purple-500/20 p-3 rounded-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-purple-300 font-bold uppercase">
                    {p.parameter_name === 'freeze_node' ? '🚨 ЗАМОРОЗКА УЗЛА' : 
                     p.parameter_name === 'freeze_segment' ? '🚨 ЗАМОРОЗКА СЕГМЕНТА' : 
                     p.parameter_name === 'unfreeze_node' ? '🔓 РАЗМОРОЗКА УЗЛА' :
                     p.parameter_name === 'unfreeze_segment' ? '🔓 РАЗМОРОЗКА СЕГМЕНТА' :
                     `Изменение: ${p.parameter_name.replace('_', ' ')}`}
                  </p>
                  <p className="text-lg font-mono text-white mt-1">
                    {p.parameter_name === 'freeze_node' || p.parameter_name === 'unfreeze_node' ? p.parameter_value.substring(0, 12) + '...' : p.parameter_value}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <Clock className="w-3 h-3" />
                    {new Date(p.expires_at).toLocaleTimeString()}
                  </div>
                  <p className="text-[10px] text-neutral-600 mt-1">ID: {p.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${(p.weight_for / (p.weight_for + p.weight_against || 1)) * 100}%` }}
                  />
                  <div 
                    className="bg-red-500 h-full transition-all duration-500" 
                    style={{ width: `${(p.weight_against / (p.weight_for + p.weight_against || 1)) * 100}%` }}
                  />
                </div>
                <div className="flex gap-3 text-[10px] font-bold">
                  <span className="text-emerald-500" title={`Магистратов: ${p.votes_for.length}`}>ВЕС ЗА: {p.weight_for}</span>
                  <span className="text-red-500" title={`Магистратов: ${p.votes_against.length}`}>ВЕС ПРОТИВ: {p.weight_against}</span>
                </div>
              </div>

              <div className="mt-2 flex justify-between items-center">
                <span className="text-[9px] text-neutral-500 uppercase">Кворум: {p.required_weight}</span>
                <span className="text-[9px] text-neutral-500 uppercase">Всего веса: {p.weight_for + p.weight_against}</span>
              </div>

              {isMagistrate && !p.votes_for.includes(nodeId!) && !p.votes_against.includes(nodeId!) && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleVote(p.id, 'for')}
                    className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 text-emerald-500 text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" /> ПОДДЕРЖАТЬ
                  </button>
                  <button
                    onClick={() => handleVote(p.id, 'against')}
                    className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-500 text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" /> ОТКЛОНИТЬ
                  </button>
                </div>
              )}

              {(p.votes_for.includes(nodeId!) || p.votes_against.includes(nodeId!)) && (
                <div className="mt-3 text-center text-[10px] text-neutral-500 italic">
                  Ваш голос учтен в блокчейне Роя
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {proposals.length === 0 && (
          <div className="text-center py-6 border border-dashed border-neutral-800 rounded-sm">
            <AlertCircle className="w-5 h-5 text-neutral-700 mx-auto mb-2" />
            <p className="text-[10px] text-neutral-600 uppercase tracking-widest">Нет активных голосований</p>
          </div>
        )}
      </div>
      {isMagistrate && (
        <div className="mt-6 pt-6 border-t border-red-500/20">
          <h3 className="text-[10px] font-bold text-red-500 uppercase mb-3 flex items-center gap-2">
            <ShieldAlert className="w-3 h-3" /> ЭКСТРЕННЫЕ ПРОТОКОЛЫ (EMERGENCY)
          </h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="ISP Сегмент (напр. Rostelecom)"
              value={ispToFreeze}
              onChange={(e) => setIspToFreeze(e.target.value)}
              className="flex-1 bg-neutral-950 border border-red-900/30 text-[10px] px-3 py-2 rounded-sm focus:border-red-500/50 outline-none text-red-400"
            />
            <button 
              onClick={proposeFreezeSegment}
              disabled={!ispToFreeze}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-500 text-[10px] font-bold uppercase transition-all disabled:opacity-30"
            >
              FREEZE SEGMENT
            </button>
          </div>
          <p className="text-[8px] text-red-900 mt-2 uppercase tracking-widest">
            ВНИМАНИЕ: ЗАМОРОЗКА СЕГМЕНТА ТРЕБУЕТ КОНСЕНСУСА СОВЕТА.
          </p>
        </div>
      )}
    </div>
  );
};
