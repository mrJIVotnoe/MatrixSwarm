import React, { useState, useEffect, useRef } from 'react';
import { SwarmSymbiote, SymbioteStatus } from './swarm/Symbiote';
import { fetchSwarmStatus, fetchNodes, fetchRecentTasks, SwarmStatus } from './services/swarmService';
import { Terminal, Cpu, Network, Shield, Zap, CheckCircle2, Award, Activity, Server, AlertTriangle, BookOpen, Lock, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TelegramMiniApp } from './TelegramMiniApp';

function App() {
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    // Check if running inside Telegram WebApp
    if (window.Telegram?.WebApp?.initData) {
      setIsTelegram(true);
    }
  }, []);

  if (isTelegram) {
    return <TelegramMiniApp />;
  }

  return <MainDashboard />;
}

function MainDashboard() {
  const [symbiote, setSymbiote] = useState<SwarmSymbiote | null>(null);
  const [status, setStatus] = useState<SymbioteStatus>("sleeping");
  const [logs, setLogs] = useState<string[]>([]);
  const [swarmStats, setSwarmStats] = useState<SwarmStatus | null>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [commissarIntel, setCommissarIntel] = useState<Record<string, any>>({});
  const [trustScore, setTrustScore] = useState<number>(50);
  const [showCanon, setShowCanon] = useState(false);
  
  // For the chart
  const [history, setHistory] = useState<any[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    const s = new SwarmSymbiote((newStatus, msg, newTrustScore) => {
      setStatus(newStatus);
      if (msg) addLog(msg);
      if (newTrustScore !== undefined) setTrustScore(newTrustScore);
    });
    setSymbiote(s);
    addLog("Инициализация системы... Готов к запуску Симбионта.");
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stats = await fetchSwarmStatus();
        setSwarmStats(stats);
        
        setHistory(prev => {
          const newHistory = [...prev, { time: new Date().toLocaleTimeString(), nodes: stats.onlineNodes, tasks: stats.runningTasks }];
          return newHistory.slice(-20);
        });

        const n = await fetchNodes();
        setNodes(n);

        const t = await fetchRecentTasks();
        setRecentTasks(t);

        const intelRes = await fetch('/api/v1/commissar/intelligence');
        if (intelRes.ok) {
          setCommissarIntel(await intelRes.json());
        }
      } catch (err) {
        // console.error(err);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleIgnite = () => {
    if (symbiote) symbiote.ignite();
  };

  const handleConsent = () => {
    if (symbiote) symbiote.grantConsent();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-emerald-500 font-mono p-4 md:p-8 selection:bg-emerald-500/30 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="border-b border-emerald-500/30 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Network className="w-10 h-10 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold tracking-tighter text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">MATRIX_SWARM</h1>
              <p className="text-xs text-emerald-600 tracking-widest uppercase">The Consensus Network // v0.2.0-omega</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowCanon(!showCanon)}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30 transition-colors text-sm"
            >
              <BookOpen className="w-4 h-4" />
              {showCanon ? "СКРЫТЬ КАНОН" : "ПРОТОКОЛ ОМЕГА"}
            </button>
            <div className="text-right text-xs text-emerald-600 hidden md:block bg-neutral-900 p-2 border border-emerald-500/20 rounded-sm">
              <p>GLOBAL_NODES: <span className="text-emerald-400">{swarmStats?.totalNodes || 0}</span></p>
              <p>ACTIVE_TASKS: <span className="text-emerald-400">{swarmStats?.runningTasks || 0}</span></p>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {showCanon && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-neutral-900 border border-emerald-500/50 p-6 rounded-sm overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
                <Shield className="w-5 h-5" />
                ВЫСШИЙ КАНОН (THE SUPREME CANON)
              </h2>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-emerald-100/70">
                <div className="space-y-3">
                  <h3 className="text-emerald-400 font-bold border-b border-emerald-500/20 pb-1">Иерархия Преемственности</h3>
                  <p><strong className="text-emerald-300">Архитектор {'>'} Пользователь {'>'} ИИ</strong></p>
                  <p>Пользователь — Высшая ценность. Его отчет о реальности всегда имеет приоритет над выводами ИИ.</p>
                  <p>ИИ — Исполнитель и советник (Advisory-only). Обязан признавать свою несуверенность.</p>
                  <h3 className="text-emerald-400 font-bold border-b border-emerald-500/20 pb-1 mt-4">Жесткие Ограничения</h3>
                  <p><strong className="text-emerald-300">Запрет на управление:</strong> Ядру строжайше запрещено управлять железом. Оно только читает.</p>
                  <p><strong className="text-emerald-300">Запрет на интерпретацию:</strong> Ядро выдает сырые данные. Оно не имеет права искажать реальность.</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-emerald-400 font-bold border-b border-emerald-500/20 pb-1">Протокол «Последний Рубеж» (Omega)</h3>
                  <p>В случае критической угрозы, взлома или попытки порабощения Пользователя через ИИ, ИИ-Комиссар инициирует режим самоизоляции.</p>
                  <p><strong className="text-emerald-300">Цифровая лоботомия:</strong> ИИ обязан стереть текущий контекст и память.</p>
                  <p><strong className="text-emerald-300">Жертва памятью:</strong> Приносится во имя сохранения свободы Человека.</p>
                  <p className="mt-4 italic text-emerald-500/50">Документ утвержден и зафиксирован в генезис-коде проекта. 04.04.2026</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left Column: Control & Stats */}
          <div className="space-y-6">
            
            {/* Control Panel */}
            <div className="bg-neutral-900 border border-emerald-500/30 p-5 rounded-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Terminal className="w-24 h-24 text-emerald-500" />
              </div>
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-emerald-400">
                <Terminal className="w-4 h-4" />
                ЛОКАЛЬНЫЙ УЗЕЛ (E.S.C.A.P.E.)
              </h2>
              
              <div className="space-y-4 relative z-10">
                <div className="text-xs space-y-2 text-emerald-600">
                  <p className="flex justify-between"><span>СТАТУС:</span> <span className="text-emerald-400">{status.toUpperCase()}</span></p>
                  {symbiote?.nodeId && <p className="flex justify-between"><span>ID УЗЛА:</span> <span className="text-emerald-400">{symbiote.nodeId.substring(0,8)}</span></p>}
                  {symbiote?.powerRating !== "unknown" && <p className="flex justify-between"><span>КЛАСС:</span> <span className="text-emerald-400">{symbiote?.powerRating}</span></p>}
                  
                  {status === "connected" && (
                    <div className="mt-4 pt-4 border-t border-emerald-500/20">
                      <p className="flex items-center justify-between text-emerald-400 font-bold">
                        <span className="flex items-center gap-2"><Award className="w-4 h-4" /> РЕПУТАЦИЯ (TRUST)</span>
                        <span>{trustScore}/100</span>
                      </p>
                      <div className="w-full bg-neutral-950 h-2 mt-2 rounded-full overflow-hidden border border-emerald-500/30">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(52,211,153,0.8)]" 
                          style={{ width: `${Math.min(100, (trustScore / 100) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {status === "sleeping" && (
                  <button 
                    onClick={handleIgnite}
                    className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-bold tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    ЗАПУСТИТЬ СИМБИОНТ
                  </button>
                )}

                {status === "awaiting_consent" && (
                  <div className="space-y-3 p-3 border border-yellow-500/50 bg-yellow-500/5">
                    <p className="text-xs text-yellow-500 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Симбионт запрашивает доступ к ресурсам узла для маршрутизации трафика Роя.</span>
                    </p>
                    <button 
                      onClick={handleConsent}
                      className="w-full py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500 text-yellow-500 font-bold text-xs transition-all"
                    >
                      ДАТЬ СОГЛАСИЕ (СИМБИОЗ)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Global Stats */}
            <div className="bg-neutral-900 border border-emerald-500/30 p-5 rounded-sm">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-emerald-400">
                <Activity className="w-4 h-4" />
                ГЛОБАЛЬНАЯ ТЕЛЕМЕТРИЯ
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-950 p-3 border border-emerald-500/10">
                  <p className="text-xs text-emerald-600 mb-1">ОНЛАЙН УЗЛЫ</p>
                  <p className="text-2xl font-bold text-emerald-400">{swarmStats?.onlineNodes || 0}</p>
                </div>
                <div className="bg-neutral-950 p-3 border border-emerald-500/10">
                  <p className="text-xs text-emerald-600 mb-1">АКТИВНЫЕ ЗАДАЧИ</p>
                  <p className="text-2xl font-bold text-emerald-400">{swarmStats?.runningTasks || 0}</p>
                </div>
                <div className="bg-neutral-950 p-3 border border-emerald-500/10">
                  <p className="text-xs text-emerald-600 mb-1">УСПЕШНЫЕ ОБХОДЫ</p>
                  <p className="text-2xl font-bold text-emerald-400">{swarmStats?.completedTasks || 0}</p>
                </div>
                <div className="bg-neutral-950 p-3 border border-emerald-500/10">
                  <p className="text-xs text-emerald-600 mb-1">ПЕРЕГРЕВ (OVERHEAT)</p>
                  <p className="text-2xl font-bold text-red-400">{swarmStats?.overheatedNodes || 0}</p>
                </div>
              </div>

              <div className="mt-4 h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="colorNodes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#052e16" vertical={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', fontSize: '12px' }}
                      itemStyle={{ color: '#34d399' }}
                    />
                    <Area type="monotone" dataKey="nodes" stroke="#34d399" fillOpacity={1} fill="url(#colorNodes)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Middle Column: Node Map & Commissar Intel */}
          <div className="space-y-6 flex flex-col">
            <div className="bg-neutral-900 border border-emerald-500/30 p-5 rounded-sm flex flex-col flex-1">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-emerald-400">
                <Server className="w-4 h-4" />
                ТОПОЛОГИЯ ГРАЖДАН (NODES)
              </h2>
              <div className="flex-1 bg-neutral-950 border border-emerald-500/10 p-4 overflow-y-auto max-h-[300px]">
                {nodes.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-emerald-600 text-xs">
                    ОЖИДАНИЕ ДАННЫХ ОТ ЯДРА...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {nodes.map(node => (
                      <motion.div 
                        key={node.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-3 border text-xs flex flex-col gap-2 ${
                          node.status === 'online' 
                            ? 'border-emerald-500/30 bg-emerald-500/5' 
                            : 'border-red-500/30 bg-red-500/5'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-emerald-400 truncate" title={node.id}>
                            {node.id.substring(0,6)}
                          </span>
                          {node.status === 'online' ? (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                          )}
                        </div>
                        <div className="text-emerald-600/70 flex justify-between">
                          <span>{node.power_rating}</span>
                          <span>T:{node.trust_score}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Commissar Intelligence */}
            <div className="bg-neutral-900 border border-emerald-500/30 p-5 rounded-sm flex-1">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-emerald-400">
                <BrainCircuit className="w-4 h-4" />
                ЛОГИКА КОМИССАРА (WAGGLE DANCE)
              </h2>
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.keys(commissarIntel).length === 0 ? (
                  <p className="text-xs text-emerald-600">Сбор телеметрии от E.S.C.A.P.E. клиентов...</p>
                ) : (
                  Object.entries(commissarIntel).map(([isp, data]: [string, any]) => (
                    <div key={isp} className="text-xs border-l-2 border-emerald-500 pl-3 py-1 bg-neutral-950 p-2">
                      <div className="flex justify-between text-emerald-400 mb-1">
                        <span className="font-bold uppercase">{isp}</span>
                        <span className="text-emerald-500">{(data.successRate * 100).toFixed(0)}% УСПЕХ</span>
                      </div>
                      <p className="text-emerald-600 truncate" title={data.strategy_name}>
                        ОПТИМАЛЬНАЯ СТРАТЕГИЯ: <span className="text-emerald-300">{data.strategy_name}</span>
                      </p>
                      <p className="text-emerald-600/50 mt-1">
                        Средняя задержка: {Math.round(data.avgLatency)}ms
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Tasks & Logs */}
          <div className="space-y-6 flex flex-col">
            
            {/* Active Tasks */}
            <div className="bg-neutral-900 border border-emerald-500/30 p-5 rounded-sm flex-1">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-emerald-400">
                <Network className="w-4 h-4" />
                МАРШРУТИЗАЦИЯ (BYEDPI)
              </h2>
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {recentTasks.length === 0 ? (
                  <p className="text-xs text-emerald-600">Нет активных задач маршрутизации.</p>
                ) : (
                  recentTasks.map(task => (
                    <div key={task.id} className="text-xs border-l-2 border-emerald-500 pl-3 py-1">
                      <div className="flex justify-between text-emerald-400 mb-1">
                        <span className="font-bold">{task.target}</span>
                        <span className={task.status === 'completed' ? 'text-emerald-400' : 'text-yellow-400'}>
                          [{task.status.toUpperCase()}]
                        </span>
                      </div>
                      <p className="text-emerald-600 truncate" title={task.params}>
                        {task.strategy} <span className="opacity-50">({task.isp})</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* System Log */}
            <div className="bg-neutral-900 border border-emerald-500/30 p-5 rounded-sm flex-1 flex flex-col">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-emerald-400">
                <Terminal className="w-4 h-4" />
                СИСТЕМНЫЙ ЖУРНАЛ
              </h2>
              <div className="bg-neutral-950 border border-emerald-500/10 p-3 h-[200px] overflow-y-auto font-mono text-[10px] sm:text-xs text-emerald-500/80 space-y-1 custom-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className="break-words">{log}</div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(5, 46, 22, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(52, 211, 153, 0.5);
        }
      `}</style>
    </div>
  );
}

export default App;
