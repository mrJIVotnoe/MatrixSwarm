import React, { useState, useEffect } from 'react';
import { Network, Zap, Shield, Activity, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

// Declare Telegram WebApp type
declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

export function TelegramMiniApp() {
  const [tgUser, setTgUser] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'registering' | 'active'>('idle');
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [trustScore, setTrustScore] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);

  useEffect(() => {
    // Initialize Telegram WebApp
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        setTgUser(tg.initDataUnsafe.user);
      }
    }
  }, []);

  const handleJoinSwarm = async () => {
    setStatus('registering');
    
    try {
      // Hardware estimation (very basic for browser)
      const hardware = {
        cores: navigator.hardwareConcurrency || 2,
        memory: (navigator as any).deviceMemory || 2,
        tier: (navigator.hardwareConcurrency || 2) > 4 ? 'high' : 'low'
      };

      const res = await fetch('/api/v1/tma/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramData: tgUser || { id: 'dev_mode', username: 'dev_user' },
          hardware
        })
      });

      const data = await res.json();
      
      // Simulate receiving the node ID after processing
      setTimeout(() => {
        setNodeId(`tma_node_${tgUser?.id || 'dev'}_${Math.random().toString(36).substring(7)}`);
        setTrustScore(hardware.tier === 'high' ? 60 : 50);
        setStatus('active');
        
        // Start pulse
        setInterval(sendPulse, 10000);
      }, 1500);

    } catch (err) {
      console.error("Failed to join swarm", err);
      setStatus('idle');
    }
  };

  const sendPulse = async () => {
    if (!nodeId) return;
    try {
      await fetch('/api/v1/tma/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, status: 'online' })
      });
      // Simulate doing some light work
      if (Math.random() > 0.7) {
        setTasksCompleted(prev => prev + 1);
        setTrustScore(prev => prev + 1);
      }
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-emerald-500 font-mono p-4 flex flex-col">
      <header className="flex items-center justify-between border-b border-emerald-500/30 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <Network className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-bold tracking-tighter text-emerald-400">MATRIX_SWARM</h1>
        </div>
        <div className="text-xs bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
          TMA_NODE
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-8">
        
        <div className="text-center space-y-2">
          <Smartphone className="w-16 h-16 text-emerald-500/50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-emerald-400">Вторая Жизнь Устройства</h2>
          <p className="text-sm text-emerald-600">
            Превратите ваш телефон в активный узел децентрализованной сети. Помогайте обходить цензуру.
          </p>
        </div>

        {status === 'idle' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleJoinSwarm}
            className="w-full py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-bold tracking-widest transition-all flex items-center justify-center gap-2 rounded-sm shadow-[0_0_15px_rgba(52,211,153,0.2)]"
          >
            <Zap className="w-5 h-5" />
            ПРИСОЕДИНИТЬСЯ К РОЮ
          </motion.button>
        )}

        {status === 'registering' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
            <p className="text-emerald-400 animate-pulse">Генерация ключей и регистрация в Улье...</p>
          </div>
        )}

        {status === 'active' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-neutral-900 border border-emerald-500/50 p-6 rounded-sm space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_10px_#10b981]" />
            
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-emerald-400">СТАТУС: АКТИВЕН</span>
              </div>
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-emerald-600">ПОЛЬЗОВАТЕЛЬ:</span>
                <span className="text-emerald-400">@{tgUser?.username || 'anonymous'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600">ID УЗЛА:</span>
                <span className="text-emerald-400 truncate max-w-[150px]" title={nodeId || ''}>{nodeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600">TRUST SCORE:</span>
                <span className="text-emerald-400 font-bold">{trustScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600">ВЫПОЛНЕНО ЗАДАЧ:</span>
                <span className="text-emerald-400">{tasksCompleted}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-emerald-500/20">
              <p className="text-xs text-emerald-600 text-center flex items-center justify-center gap-2">
                <Activity className="w-4 h-4" />
                Устройство передает телеметрию и выполняет фоновые задачи маршрутизации.
              </p>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
