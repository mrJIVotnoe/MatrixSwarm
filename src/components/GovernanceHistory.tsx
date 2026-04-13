import React, { useEffect, useState } from 'react';
import { History, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface GovernanceRecord {
  id: string;
  parameter_name: string;
  parameter_value: string;
  proposer_id: string;
  status: 'approved' | 'rejected';
  votes_for: string[];
  votes_against: string[];
  created_at: number;
}

export const GovernanceHistory: React.FC = () => {
  const [history, setHistory] = useState<GovernanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/v1/consensus/history');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch governance history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredHistory = history.filter(h => 
    h.parameter_name.toLowerCase().includes(filter.toLowerCase()) ||
    h.id.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-neutral-900 border border-emerald-500/20 rounded-sm p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
          <History className="w-4 h-4" />
          АРХИВ РЕШЕНИЙ (GOVERNANCE HISTORY)
        </h2>
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-600" />
          <input 
            type="text" 
            placeholder="Поиск..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-[10px] pl-7 pr-2 py-1 rounded-sm focus:border-emerald-500/50 outline-none text-emerald-400 w-32"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
        {filteredHistory.map((record) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-neutral-950 border-l-2 border-neutral-800 p-3 hover:bg-neutral-900 transition-colors"
            style={{ borderLeftColor: record.status === 'approved' ? '#10b981' : '#ef4444' }}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[9px] text-neutral-500 uppercase font-mono">ID: {record.id}</span>
                <h3 className="text-xs font-bold text-white mt-0.5 uppercase tracking-tighter">
                  {record.parameter_name === 'freeze_node' ? `ЗАМОРОЗКА УЗЛА: ${record.parameter_value.substring(0, 8)}...` :
                   record.parameter_name === 'freeze_segment' ? `ЗАМОРОЗКА СЕГМЕНТА: ${record.parameter_value}` :
                   record.parameter_name === 'unfreeze_node' ? `РАЗМОРОЗКА УЗЛА: ${record.parameter_value.substring(0, 8)}...` :
                   record.parameter_name === 'unfreeze_segment' ? `РАЗМОРОЗКА СЕГМЕНТА: ${record.parameter_value}` :
                   `${record.parameter_name.replace('_', ' ')} → ${record.parameter_value}`}
                </h3>
              </div>
              <div className={`flex items-center gap-1 text-[9px] font-bold uppercase ${record.status === 'approved' ? 'text-emerald-500' : 'text-red-500'}`}>
                {record.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {record.status}
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3 text-[9px] text-neutral-600">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(record.created_at).toLocaleDateString()}</span>
                <span>ЗА: {record.votes_for.length}</span>
                <span>ПРОТИВ: {record.votes_against.length}</span>
              </div>
              <div className="text-[8px] text-neutral-700 font-mono">
                BY: {record.proposer_id.substring(0, 8)}
              </div>
            </div>
          </motion.div>
        ))}

        {filteredHistory.length === 0 && !loading && (
          <div className="text-center py-10 text-neutral-700">
            <p className="text-[10px] uppercase tracking-widest">История пуста</p>
          </div>
        )}
      </div>
    </div>
  );
};
