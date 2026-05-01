import React from 'react';
import { User, Shield, Terminal, Settings } from 'lucide-react';
import { motion } from 'motion/react';

interface UserProfileProps {
  observer: any;
}

export function UserProfile({ observer }: UserProfileProps) {
  if (!observer) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="hud-panel p-6 rounded-sm space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-400">
          <User className="w-5 h-5" />
          ПАСПОРТ НАБЛЮДАТЕЛЯ
        </h2>
        <div className="text-xs text-cyan-600 bg-slate-950 px-3 py-1 border border-cyan-500/30 rounded font-mono uppercase">
          ID: {observer.id.substring(0, 12)}...
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 p-4 border border-cyan-500/20 rounded-sm">
          <div className="text-cyan-600 text-[10px] uppercase font-bold mb-1">ПОЗЫВНОЙ</div>
          <div className="text-lg text-cyan-400 font-mono flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            {observer.alias}
          </div>
        </div>

        <div className="bg-slate-900/50 p-4 border border-cyan-500/20 rounded-sm">
          <div className="text-cyan-600 text-[10px] uppercase font-bold mb-1">ФИЛОСОФИЯ (РОЛЬ)</div>
          <div className="text-lg text-amber-400 font-mono flex items-center gap-2 text-glow-amber uppercase">
            <Shield className="w-4 h-4" />
            {observer.user_mode === 'ark' ? 'Искатель (Ковчег)' : observer.user_mode === 'symbiote' ? 'Адепт (Симбионт)' : observer.user_mode === 'magistrate' ? 'Магистрат' : observer.user_mode}
          </div>
        </div>

        <div className="bg-slate-900/50 p-4 border border-cyan-500/20 rounded-sm">
          <div className="text-cyan-600 text-[10px] uppercase font-bold mb-1">ГЛОБАЛЬНАЯ РЕПУТАЦИЯ</div>
          <div className="text-lg text-cyan-400 font-mono text-glow-cyan">
            {observer.reputation}
          </div>
        </div>
      </div>

      <div className="border-t border-cyan-500/20 pt-6">
        <h3 className="text-sm font-bold text-cyan-400 mb-4 uppercase">Подчиненные узлы (Ваши Устройства)</h3>
        {observer.nodes && observer.nodes.length > 0 ? (
          <div className="space-y-2">
            {observer.nodes.map((node: any) => (
              <div key={node.id} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 hover:border-cyan-500/30 transition-colors">
                <div>
                  <div className="text-xs font-mono text-cyan-500">{node.id.substring(0, 8)} - {node.device_type}</div>
                  <div className="text-[10px] text-cyan-700 mt-1">[{node.power_rating}] • Заряд: {node.battery_level}%</div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className={`text-[10px] px-2 py-0.5 rounded ${node.status === 'online' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                    {node.status.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-cyan-600 mt-1">Trust: {node.trust_score}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 bg-slate-900/30 border border-dashed border-cyan-500/30 text-cyan-600 text-sm">
            У вас пока нет подчиненных узлов. Запустите Симбионт на вкладке Рекрут.
          </div>
        )}
      </div>
    </motion.div>
  );
}
