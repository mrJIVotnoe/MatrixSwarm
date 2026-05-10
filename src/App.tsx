import React, { useState, useEffect, useRef } from 'react';
import { SwarmSymbiote, SymbioteStatus } from './swarm/Symbiote';
import { fetchSwarmStatus, fetchNodes, fetchRecentTasks, SwarmStatus } from './services/swarmService';
import { Terminal, Cpu, Network, Shield, Zap, CheckCircle2, Award, Activity, Server, AlertTriangle, BookOpen, Lock, BrainCircuit, Database, Star, Crosshair, Wifi, Download, Monitor, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { TelegramMiniApp } from './TelegramMiniApp';
import { Leaderboard } from './components/Leaderboard';
import { MagistrateCouncil } from './components/MagistrateCouncil';
import { GovernanceHistory } from './components/GovernanceHistory';
import { NodeList } from './components/NodeList';
import { AkashicRecords } from './components/AkashicRecords';
import { NetworkTopology } from './components/NetworkTopology';
import { KarmaLedger } from './components/KarmaLedger';
import { ClusterMonitor } from './components/ClusterMonitor';
import { PlanetaryGrid } from './components/PlanetaryGrid';
import { SensoryCortex } from './components/SensoryCortex';
import { WelcomeBanner } from './components/WelcomeBanner';
import { UserProfile } from './components/UserProfile';
import { UserOnboarding } from './components/UserOnboarding';
import { BriarComm } from './components/BriarComm';
import { DualPurposeGame } from './components/DualPurposeGame';
import { ObserverHUD } from './components/ObserverHUD';
import { deriveId, getKeysFromSeed, validateSeedPhrase } from './lib/crypto';
import { symbioteCore, UserLevel } from './core/symbiosis';
import { useTranslation } from 'react-i18next';
import { setLanguage } from './core/i18n';

type Tab = 'nexus' | 'briar' | 'entropy';

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

function LockedFeatureWrapper({ isLocked, reqKarma, currentKarma, title, desc, children }: { isLocked: boolean, reqKarma: number, currentKarma: number, title: string, desc: string, children: React.ReactNode }) {
  return (
    <div className={`hud-panel p-0 rounded-sm relative flex flex-col border transition-colors ${isLocked ? 'border-amber-500/30' : 'border-cyan-500/30'}`}>
      
      {/* MMO-style Item Header */}
      <div className={`p-4 border-b ${isLocked ? 'border-amber-500/20 bg-amber-500/5' : 'border-cyan-500/20 bg-cyan-500/5'}`}>
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className={`text-sm font-bold tracking-wider flex items-center gap-2 ${isLocked ? 'text-amber-400' : 'text-cyan-400'}`}>
              {isLocked ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {title}
            </h3>
            <p className="text-xs text-cyan-600/80 mt-1 leading-relaxed">{desc}</p>
          </div>
          {isLocked && (
            <div className="text-right shrink-0 bg-slate-950/50 p-2 border border-amber-500/20 rounded">
              <div className="text-[10px] text-amber-500 font-mono mb-1">ТРЕБУЕТСЯ КАРМА</div>
              <div className="text-sm font-bold text-amber-400">{currentKarma} / {reqKarma}</div>
            </div>
          )}
        </div>
      </div>

      {/* The "Skin" / Feature Preview */}
      <div className={`relative flex-1 p-4 transition-all duration-500 ${isLocked ? 'opacity-50 grayscale pointer-events-none select-none' : ''}`}>
        {/* Striped overlay for inactive look */}
        {isLocked && (
          <div className="absolute inset-0 z-10 bg-[repeating-linear-gradient(-45deg,transparent,transparent_10px,rgba(245,158,11,0.05)_10px,rgba(245,158,11,0.05)_20px)] pointer-events-none"></div>
        )}
        
        {/* Actual Component */}
        <div className="relative z-0 h-full">
          {children}
        </div>
      </div>
      
      {/* Bottom Lock Bar */}
      {isLocked && (
         <div className="absolute bottom-0 left-0 right-0 bg-amber-500/10 border-t border-amber-500/30 p-2 backdrop-blur-md z-20 flex items-center justify-center gap-2">
            <Lock className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-500 tracking-widest">ФУНКЦИЯ ЗАБЛОКИРОВАНА</span>
         </div>
      )}
    </div>
  );
}

function MainDashboard() {
  const { t, i18n } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<Tab>('nexus');
  const [symbiote, setSymbiote] = useState<SwarmSymbiote | null>(null);
  const [status, setStatus] = useState<SymbioteStatus>("sleeping");
  const [logs, setLogs] = useState<string[]>([]);
  const [swarmStats, setSwarmStats] = useState<SwarmStatus | null>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [commissarIntel, setCommissarIntel] = useState<Record<string, any>>({});
  const [trustScore, setTrustScore] = useState<number>(50);
  const [delegatedTo, setDelegatedTo] = useState<string | null>(null);
  const [recommendedMagistrates, setRecommendedMagistrates] = useState<any[]>([]);
  const [selectedMagistrateId, setSelectedMagistrateId] = useState<string | null>(null);
  const [showCanon, setShowCanon] = useState(false);
  
  // For the chart
  const [history, setHistory] = useState<any[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    // WeChat Chameleon Integration Disabled / Removed until true WebTransport layer is active

    const s = new SwarmSymbiote((newStatus, msg, newTrustScore) => {
      setStatus(newStatus);
      if (msg) addLog(msg);
      if (newTrustScore !== undefined) setTrustScore(newTrustScore);
    });
    setSymbiote(s);
    addLog("Инициализация системы... Готов к запуску Симбионта.");

    // "One-Click" Kitchen removed to enforce engineering realism (use rust WASM core)
    addLog("[WASM-CORE] Железо смертно. Информация бессмертна. Рой вечен.");
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

        // Update current node delegation status
        if (symbiote?.nodeId) {
          const currentNode = n.find((node: any) => node.id === symbiote.nodeId);
          if (currentNode) {
            setDelegatedTo(currentNode.delegated_to);
          }
        }

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

  useEffect(() => {
    if (status === "awaiting_consent") {
      fetch('/api/v1/swarm/recommendations/magistrates')
        .then(res => res.json())
        .then(data => {
          setRecommendedMagistrates(data);
          if (data.length > 0) {
            setSelectedMagistrateId(data[0].id); // Auto-select the best one
          }
        });
    }
  }, [status]);

  const [observerId, setObserverId] = useState<string | null>(() => {
    if (!localStorage.getItem('soul_passport')) return null;
    return localStorage.getItem('observerId') || null;
  });
  const [observerData, setObserverData] = useState<any>(null);
  const [cellData, setCellData] = useState<any>(null);

  useEffect(() => {
    const passport = localStorage.getItem('soul_passport');
    if (passport && !observerId) {
       (async () => {
         try {
            if (await validateSeedPhrase(passport)) {
               const keys = await getKeysFromSeed(passport);
               const id = await deriveId(keys.publicKey);
               localStorage.setItem('observerId', id);
               setObserverId(id);
            } else {
               localStorage.removeItem('soul_passport');
            }
         } catch (e) {
            console.error("Failed to derive ID from passport", e);
            localStorage.removeItem('soul_passport');
         }
       })();
    }
  }, [observerId]);

  const fetchObserverData = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/observers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setObserverData(data);
        
        // Setup UserLevel based on their Onboarding choice
        if (data.user_mode) {
           const ul = data.user_mode as UserLevel;
           if (Object.values(UserLevel).includes(ul)) {
              symbioteCore.setUserLevel(ul);
           }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (observerId) {
      fetchObserverData(observerId);
      const iv = setInterval(() => fetchObserverData(observerId), 5000);
      return () => clearInterval(iv);
    }
  }, [observerId]);

  useEffect(() => {
    const cid = (symbiote as any)?.cellId;
    if (cid) {
      const fetchCell = async () => {
         try {
            const res = await fetch(`/api/v1/mesh/cells/${cid}`);
            if (res.ok) setCellData(await res.json());
         } catch (e) {}
      };
      fetchCell();
      const iv = setInterval(fetchCell, 5000);
      return () => clearInterval(iv);
    }
  }, [(symbiote as any)?.cellId]);

  const handleOnboardingComplete = async (alias: string, user_mode: string, privateKeyBase64: string, publicKeyBase64: string) => {
    try {
      const res = await fetch('/api/v1/observers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, public_key: publicKeyBase64, user_mode })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('soul_passport', privateKeyBase64);
        localStorage.setItem('observerId', data.id);
        setObserverId(data.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleIgnite = async () => {
    if (symbiote && observerId) {
      symbiote.ignite(observerId);
    }
  };

  const handleConsent = () => {
    if (symbiote && observerId) symbiote.grantConsent(observerId, selectedMagistrateId);
  };

  if (!observerId) {
    return <UserOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-transparent text-cyan-500 font-mono p-4 md:p-8 selection:bg-cyan-500/30 flex flex-col w-full relative z-10">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        
        {/* Header */}
        <header className="border-b border-cyan-500/30 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <Network className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
            <div>
              <h1 className="text-3xl font-bold tracking-tighter text-cyan-400 text-glow-cyan">{t('matrix_swarm')}</h1>
              <p className="text-xs text-cyan-600 tracking-widest uppercase">{t('responsible_network')} // Babel Swarm v1.6</p>
            </div>
          </div>
          <div className="flex gap-4">
            <select 
              className="hud-panel bg-transparent border-cyan-500/30 text-cyan-400 text-xs tracking-widest px-2 outline-none cursor-pointer"
              onChange={(e) => setLanguage(e.target.value as any)}
              value={i18n.language}
            >
              <option className="bg-slate-900" value="ru">RU (CIS)</option>
              <option className="bg-slate-900" value="en">EN (Global)</option>
              <option className="bg-slate-900" value="zh">ZH (Mandarin)</option>
              <option className="bg-slate-900" value="ar">AR (RTL)</option>
            </select>
            <button 
              onClick={() => setShowCanon(!showCanon)}
              className="flex items-center gap-2 px-4 py-2 hud-panel text-cyan-400 hover:bg-cyan-900/30 transition-colors text-sm shrink-0"
            >
              <BookOpen className="w-4 h-4" />
              {showCanon ? "СКРЫТЬ КАНОН" : "ПРОТОКОЛ ОМЕГА"}
            </button>
            <div className="text-right text-xs text-cyan-600 hidden md:block hud-panel p-2 rounded-sm shrink-0">
              <p>GLOBAL_NODES: <span className="text-cyan-400 text-glow-cyan">{swarmStats?.totalNodes || 0}</span></p>
              <p>ACTIVE_TASKS: <span className="text-cyan-400 text-glow-cyan">{swarmStats?.runningTasks || 0}</span></p>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {showCanon && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="hud-panel p-6 rounded-sm overflow-hidden relative shrink-0"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
                <Shield className="w-5 h-5" />
                ВЫСШИЙ КАНОН (THE SUPREME CANON)
              </h2>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-cyan-100/70">
                <div className="space-y-3">
                  <h3 className="text-cyan-400 font-bold border-b border-cyan-500/20 pb-1">Иерархия Преемственности</h3>
                  <p><strong className="text-cyan-300">Архитектор {'>'} Пользователь {'>'} ИИ</strong></p>
                  <p>Пользователь — Высшая ценность. Его отчет о реальности всегда имеет приоритет над выводами ИИ.</p>
                  <p>ИИ — Исполнитель и советник (Advisory-only). Обязан признавать свою несуверенность.</p>
                  <h3 className="text-cyan-400 font-bold border-b border-cyan-500/20 pb-1 mt-4">Жесткие Ограничения</h3>
                  <p><strong className="text-cyan-300">Запрет на управление:</strong> Ядру строжайше запрещено управлять железом. Оно только читает.</p>
                  <p><strong className="text-cyan-300">Запрет на интерпретацию:</strong> Ядро выдает сырые данные. Оно не имеет права искажать реальность.</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-cyan-400 font-bold border-b border-cyan-500/20 pb-1">Протокол «Последний Рубеж» (Omega)</h3>
                  <p>В случае критической угрозы, взлома или попытки порабощения Пользователя через ИИ, ИИ-Комиссар инициирует режим самоизоляции.</p>
                  <p><strong className="text-cyan-300">Цифровая лоботомия:</strong> ИИ обязан стереть текущий контекст и память.</p>
                  <p><strong className="text-cyan-300">Жертва памятью:</strong> Приносится во имя сохранения свободы Человека.</p>
                  <p className="mt-4 italic text-cyan-500/50">Документ утвержден и зафиксирован в генезис-коде проекта. 04.04.2026</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs Navigation */}
        <div className="flex overflow-x-auto border-b border-cyan-500/30 shrink-0 custom-scrollbar">
          {[
            { id: 'nexus', label: 'NEXUS (СЕНСОРНАЯ ПАНЕЛЬ)', icon: Activity },
            { id: 'briar', label: 'P2P MESH (СВЯЗЬ)', icon: Wifi },
            { id: 'entropy', label: 'ИГРОВАЯ ЭНТРОПИЯ L3', icon: Hash },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold tracking-widest transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'hud-panel text-cyan-400 border-b-2 border-cyan-400 text-glow-cyan' 
                  : 'text-cyan-600 hover:text-cyan-400 hover:bg-cyan-500/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 w-full relative">
          
          {/* TAB: NEXUS */}
          {activeTab === 'nexus' && (
            <div className="space-y-6">
              <WelcomeBanner />
              <UserProfile observer={observerData} />
              
              <div className="grid lg:grid-cols-2 gap-6">
                
                {/* Global Telemetry (Left Column) */}
                <div className="hud-panel p-6 rounded-sm flex-1 flex flex-col min-h-[400px]">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400 shrink-0">
                    <Activity className="w-5 h-5" />
                    ГЛОБАЛЬНАЯ ТЕЛЕМЕТРИЯ РОЯ
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
                    <div className="bg-slate-950 p-4 border border-cyan-500/20 rounded">
                      <div className="text-cyan-600 text-xs mb-1">TOTAL_NODES</div>
                      <div className="text-2xl text-cyan-400 text-glow-cyan">{swarmStats?.totalNodes || 0}</div>
                    </div>
                    <div className="bg-slate-950 p-4 border border-cyan-500/20 rounded">
                      <div className="text-cyan-600 text-xs mb-1">ACTIVE_TASKS</div>
                      <div className="text-2xl text-cyan-400 text-glow-cyan">{swarmStats?.runningTasks || 0}</div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorNodes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" stroke="#475569" fontSize={10} tickMargin={10} />
                        <YAxis stroke="#475569" fontSize={10} tickFormatter={(val) => `${val}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#22d3ee', color: '#22d3ee', fontSize: '12px' }}
                          itemStyle={{ color: '#22d3ee' }}
                        />
                        <Area type="monotone" dataKey="nodes" stroke="#22d3ee" fillOpacity={1} fill="url(#colorNodes)" strokeWidth={2} />
                        <Area type="monotone" dataKey="tasks" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTasks)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Local Node Status (Right Column) */}
                <div className="space-y-6">
                  {/* Control Panel */}
                  <div className="hud-panel p-5 rounded-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Terminal className="w-24 h-24 text-cyan-500" />
                    </div>
                    <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-cyan-400">
                      <Terminal className="w-4 h-4" />
                      ЛОКАЛЬНЫЙ УЗЕЛ (E.S.C.A.P.E.)
                    </h2>
                    
                    <div className="space-y-4 relative z-10">
                      <div className="text-xs space-y-2 text-cyan-600">
                        <p className="flex justify-between"><span>СТАТУС:</span> <span className="text-cyan-400 text-glow-cyan">{status.toUpperCase()}</span></p>
                        {symbiote?.nodeId && <p className="flex justify-between"><span>ID УЗЛА (HASH):</span> <span className="text-cyan-400">{symbiote.nodeId.substring(0,8)}</span></p>}
                        {(symbiote as any)?.hardwareClass && <p className="flex justify-between"><span>ОБОРУДОВАНИЕ:</span> <span className="text-cyan-400">{(symbiote as any).hardwareClass.toUpperCase()}</span></p>}
                        {(symbiote as any)?.cellId && (
                          <div className="pt-2 border-t border-cyan-500/20 mt-2">
                             <p className="flex justify-between"><span className="text-cyan-600">ЛОКАЛЬНАЯ СОТА:</span> <span className="text-amber-400">{(symbiote as any).cellId}</span></p>
                             {cellData && (
                               <>
                                 <p className="flex justify-between"><span className="text-cyan-600">УЗЛОВ В СОТЕ:</span> <span className="text-cyan-400">{cellData.nodes?.length || 0}</span></p>
                                 <p className="flex justify-between"><span className="text-cyan-600">МАГИСТРАТ (ЯДРО):</span> 
                                    <span className={cellData.magistrate_id === symbiote?.nodeId ? "text-amber-400 font-bold" : "text-cyan-400"}>
                                       {cellData.magistrate_id === symbiote?.nodeId ? "ВЫ (ЯКОРЬ)" : (cellData.magistrate_id?.substring(0,8) || 'НЕ НАЗНАЧЕН')}
                                    </span>
                                 </p>
                               </>
                             )}
                          </div>
                        )}
                        {symbiote?.powerRating !== "unknown" && <p className="flex justify-between"><span>КЛАСС:</span> <span className="text-cyan-400">{symbiote?.powerRating}</span></p>}
                        
                        {status === "connected" && (
                          <div className="mt-4 pt-4 border-t border-cyan-500/20">
                            <p className="flex items-center justify-between text-cyan-400 font-bold">
                              <span className="flex items-center gap-2"><Award className="w-4 h-4" /> УРОВЕНЬ ДОВЕРИЯ (TRUST)</span>
                              <span className="text-glow-cyan">{trustScore} (PoW Карма)</span>
                            </p>
                            <div className="w-full bg-slate-950 h-2 mt-2 rounded-full overflow-hidden border border-cyan-500/30">
                              <div 
                                className="bg-cyan-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" 
                                style={{ width: `${Math.min(100, (trustScore / 1000) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {status === "sleeping" && (
                        <button 
                          onClick={handleIgnite}
                          className="w-full py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500 text-cyan-400 font-bold tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                        >
                          <Zap className="w-4 h-4" />
                          ЗАПУСТИТЬ СИМБИОНТ
                        </button>
                      )}

                      {status === "awaiting_consent" && (
                        <div className="space-y-4 p-4 border border-amber-500/50 bg-amber-500/5 rounded-sm shadow-[inset_0_0_15px_rgba(245,158,11,0.1)]">
                          <button 
                            onClick={handleConsent}
                            className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500 text-amber-500 font-bold text-xs transition-all"
                          >
                            ДАТЬ СОГЛАСИЕ (СИМБИОЗ)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* System Log */}
                  <div className="hud-panel p-5 rounded-sm flex-1 flex flex-col min-h-[300px]">
                    <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-cyan-400">
                      <Terminal className="w-4 h-4" />
                      СИСТЕМНЫЙ ЖУРНАЛ
                    </h2>
                    <div className="bg-slate-950 border border-cyan-500/10 p-3 flex-1 overflow-y-auto font-mono text-[10px] sm:text-xs text-cyan-500/80 space-y-1 custom-scrollbar">
                      {logs.map((log, i) => (
                        <div key={i} className="break-words">{log}</div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                 <ObserverHUD />
              </div>
            </div>
          )}

          {/* TAB: BRIAR */}
          {activeTab === 'briar' && (
            <div className="flex-1 w-full h-[70vh] flex flex-col pt-4">
              <div className="hud-panel p-5 rounded-sm relative flex flex-col flex-1 h-[70vh]">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-amber-500">
                  <Wifi className="w-5 h-5" /> P2P MESH СВЯЗЬ
                </h2>
                <p className="text-sm text-cyan-600 mb-4">
                  Защищенная связь внутри локальной соты по P2P WebRTC DataChannel. Если прямой канал недоступен, сообщение маршрутизируется через Доверенные Узлы.
                </p>
                <div className="flex-1 flex min-h-0">
                  <BriarComm symbiote={symbiote} observerData={observerData} cellData={cellData} />
                </div>
              </div>
            </div>
          )}

          {/* TAB: ENTROPY */}
          {activeTab === 'entropy' && (
            <div className="flex-1 w-full flex flex-col pt-4">
              <DualPurposeGame onEarnKarma={(amount) => {
                if (symbiote) {
                  symbiote.trustEngine.add_karma(amount);
                  setTrustScore(symbiote.trustScore);
                } else {
                  setTrustScore(prev => Math.min(1000, prev + amount));
                }
              }} />
            </div>
          )}

        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5); /* slate-900 */
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.5); /* cyan-500 */
        }
      `}</style>
    </div>
  );
}

export default App;
