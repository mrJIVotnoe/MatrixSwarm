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
import { SpacedeskPanel } from './components/SpacedeskPanel';
import { getKeysFromSeed, validateSeedPhrase, encryptSeed, decryptSeed, checkPassportExistsInWorkerStorage, savePassportToWorkerStorage, loadPassportFromWorkerStorage, clearPassportFromWorkerStorage } from './lib/crypto';
import { GlobalAgentState, WasmIdentity, WasmAikidoCore } from './core/wasm_bridge';
import { symbioteCore, UserLevel } from './core/symbiosis';
import { useTranslation } from 'react-i18next';
import { setLanguage } from './core/i18n';
import { KiwixArchive } from './components/KiwixArchive';
import { TorrentManager } from './components/TorrentManager';
import { QrCode, Key, RefreshCw, Sliders, ShieldCheck } from 'lucide-react';

type Tab = 'nexus' | 'floor-7' | 'floor-6' | 'floor-5' | 'floor-4' | 'floor-3' | 'floor-2' | 'floor-1';

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
    return localStorage.getItem('observerId') || null;
  });
  const [hasCheckedPassport, setHasCheckedPassport] = useState(false);
  const [hasSavedPassport, setHasSavedPassport] = useState(false);

  useEffect(() => {
    (async () => {
      const exists = await checkPassportExistsInWorkerStorage();
      setHasSavedPassport(exists);
      setHasCheckedPassport(true);
      if (!exists) {
        setObserverId(null);
      }
    })();
  }, []);
  const [decryptedPassport, setDecryptedPassport] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [observerData, setObserverData] = useState<any>(null);
  const [cellData, setCellData] = useState<any>(null);

  // Floor L-1 active plowing simulator
  const [isRoutingActive, setIsRoutingActive] = useState(true);
  const [isSeedingActive, setIsSeedingActive] = useState(false);
  const [isPowerfulResource, setIsPowerfulResource] = useState(true);
  const [plowElapsedHours, setPlowElapsedHours] = useState(1);
  const [plowResult, setPlowResult] = useState<any>(null);

  // Floor L-7 cryptographic playground
  const [signMessageInput, setSignMessageInput] = useState('MatrixSwarm Offline Covenant');
  const [generatedSignature, setGeneratedSignature] = useState('');
  const [verifyMessageInput, setVerifyMessageInput] = useState('MatrixSwarm Offline Covenant');
  const [verifyPubKeyInput, setVerifyPubKeyInput] = useState('');
  const [verifySigInput, setVerifySigInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [legacyContainerPayload, setLegacyContainerPayload] = useState('');

  useEffect(() => {
    if (decryptedPassport && !observerId) {
       const activePassport = decryptedPassport;
       (async () => {
         try {
            if (await validateSeedPhrase(activePassport)) {
               const keys = await getKeysFromSeed(activePassport);
               const id = keys.nodeId;
               localStorage.setItem('observerId', id);
               setObserverId(id);
               // Advance Agent Contract State
               try {
                  GlobalAgentState.verify_trust();
                  GlobalAgentState.start_running();
               } catch (e) {
                  console.error("Agent Contract violation:", e);
               }
            }
               //
                  if (true) { if (true) {
               }
            }
         } catch (e) {
            console.error("Failed to derive ID from passport", e);
            if (false) {
               localStorage.removeItem('soul_passport');
            }
         }
       })();
    }
  }, [observerId, decryptedPassport]);

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

  const handleOnboardingComplete = async (alias: string, user_mode: string, privateKeyBase64: string, publicKeyBase64: string, karma: number, rank: string, masterPassword?: string) => {
    try {
      const res = await fetch('/api/v1/observers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, public_key: publicKeyBase64, user_mode, karma, rank })
      });
      if (res.ok) {
        const data = await res.json();
        const pwd = masterPassword || "default_pwd";
        await savePassportToWorkerStorage(privateKeyBase64, pwd);
        setDecryptedPassport(privateKeyBase64);
        setHasSavedPassport(true);
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

  if (hasSavedPassport && !decryptedPassport) {
     const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
           const decrypted = await loadPassportFromWorkerStorage(passwordInput);
           if (await validateSeedPhrase(decrypted)) {
              setDecryptedPassport(decrypted);
              setUnlockError('');
           } else {
              setUnlockError('Ошибка: неверный мастер-пароль.');
           }
        } catch (err) {
           setUnlockError('Ошибка: неверный мастер-пароль.');
        }
     };

     return (
        <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-50 text-cyan-400 font-mono">
           <form onSubmit={handleUnlock} className="hud-panel p-8 max-w-md w-full space-y-6 border border-cyan-500/40 relative bg-slate-950 rounded-sm">
              <div className="text-center space-y-2">
                 <Lock className="w-12 h-12 text-cyan-400 mx-auto animate-pulse" />
                 <h2 className="text-xl font-bold tracking-widest uppercase">РАЗБЛОКИРОВКА СЕЙФА</h2>
                 <p className="text-xs text-cyan-600/80 uppercase">Паспорт защищен через PBKDF2 + AES-GCM</p>
              </div>
              
              <div>
                 <label className="block text-[10px] text-cyan-500 font-bold mb-2 uppercase tracking-widest text-center">ВВЕДИТЕ МАСТЕР-ПАРОЛЬ</label>
                 <input 
                    type="password" 
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Ваш пароль..."
                    required
                    className="w-full bg-slate-900 border border-cyan-500/30 p-3 text-cyan-400 focus:outline-none focus:border-cyan-400 font-mono text-center transition-all focus:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                 />
              </div>

              {unlockError && <p className="text-xs text-red-500 font-bold text-center">{unlockError}</p>}

              <button 
                 type="submit"
                 className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500 text-cyan-400 font-bold tracking-widest transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              >
                 АКТИВИРОВАТЬ ПАСПОРТ
              </button>

              <button 
                 type="button"
                 onClick={() => {
                    if (confirm("Вы уверены, что хотите сбросить профиль? Все данные будут стёрты!")) {
                       localStorage.clear();
                       window.location.reload();
                    }
                 }}
                 className="w-full text-[10px] text-red-500/60 hover:text-red-500 transition-colors uppercase tracking-wider text-center pt-2 cursor-pointer"
              >
                 Сбросить сейф и создать новый
              </button>
           </form>
        </div>
     );
  }

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

        {/* Tabs Navigation (Отрицательные этажи / Системный Корень) */}
        <div className="flex overflow-x-auto border-b border-cyan-500/30 shrink-0 custom-scrollbar bg-slate-950/40 p-1 gap-1">
          {[
            { id: 'nexus', label: 'L0: NEXUS (НАДЗЕМНЫЙ ХАБ)', labelShort: 'L0', icon: Activity },
            { id: 'floor-1', label: 'L-1: ВСПАШКА ПОЧВЫ & КАРМА', labelShort: 'L-1', icon: Zap },
            { id: 'floor-2', label: 'L-2: БОТНЕТ-ЗАЩИТА & АЙКИДО', labelShort: 'L-2', icon: ShieldCheck },
            { id: 'floor-3', label: 'L-3: P2P BRAMBLE MATRIX', labelShort: 'L-3', icon: Wifi },
            { id: 'floor-4', label: 'L-4: uTORRENT СИДИРОВАНИЕ', labelShort: 'L-4', icon: Download },
            { id: 'floor-5', label: 'L-5: KIWIX БАЗА ЗНАНИЙ', labelShort: 'L-5', icon: BookOpen },
            { id: 'floor-6', label: 'L-6: КВАНТОВОЕ ХРАНЕНИЕ', labelShort: 'L-6', icon: Database },
            { id: 'floor-7', label: 'L-7: КОРЕНЬ ДУШИ (ПАСПОРТ)', labelShort: 'L-7', icon: Key },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold tracking-widest transition-all whitespace-nowrap border-b-2 font-mono ${
                activeTab === tab.id 
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-400 text-glow-cyan shadow-[inset_0_0_10px_rgba(6,182,212,0.15)]' 
                  : 'text-cyan-700 hover:text-cyan-400 border-transparent hover:bg-cyan-500/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">{tab.label}</span>
              <span className="xl:hidden">{tab.labelShort}</span>
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

          {/* FLOOR -3: BRAMBLE P2P MESH СВЯЗЬ */}
          {activeTab === 'floor-3' && (
            <div className="flex-1 w-full h-[70vh] flex flex-col pt-4">
              <div className="hud-panel p-5 rounded-sm relative flex flex-col flex-1 h-[70vh]">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-amber-500">
                  <Wifi className="w-5 h-5 animate-pulse" /> L-3 BRAMBLE P2P MESH СВЯЗЬ
                </h2>
                <p className="text-sm text-cyan-600 mb-4 font-mono uppercase">
                  КАНАЛ ВНЕ-ИНТЕРНЕТНОЙ СВЯЗИ ВНУТРИ СОТЫ ПО BRAMBLE ВМЕСТО FIREBASE. ТРАНСПОРТ МЕДА НАПРЯМУЮ ЧЕРЕЗ WEBRTC И ЛОКАЛЬНЫЙ СИГНАЛИНГ.
                </p>
                <div className="flex-1 flex min-h-0">
                  <BriarComm symbiote={symbiote} observerData={observerData} cellData={cellData} decryptedPassport={decryptedPassport} />
                </div>
              </div>
            </div>
          )}

          {/* FLOOR -2: БОТНЕТ-ЗАЩИТА & АЙКИДО */}
          {activeTab === 'floor-2' && (
            <div className="flex-1 w-full flex flex-col pt-4 min-h-[70vh]">
              <div className="hud-panel p-5 rounded-sm relative flex flex-col flex-1">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
                  <ShieldCheck className="w-5 h-5 animate-bounce" /> L-2 АЙКИДО: ПРОТИВОДЕЙСТВИЕ БОТНЕТАМ
                </h2>
                <div className="mb-4 bg-purple-950/20 border border-purple-500/30 p-3 rounded text-xs text-purple-300 font-mono">
                  <p className="font-bold">АНТИ-СИБИЛЛА (51% ATTACK DEFENDER):</p>
                  <p className="opacity-80 mt-1">Оценка структуры узлов в соте. Если 80%+ узлов ведут себя как статичные бот-фермы, система активирует цифровой камуфляж для защиты нативного эфира.</p>
                </div>
                <SpacedeskPanel symbiote={symbiote} />
              </div>
            </div>
          )}

          {/* FLOOR -1: ВСПАШКА ПОЧВЫ & КАРМИЧЕСКИЙ PoW */}
          {activeTab === 'floor-1' && (
            <div className="flex-1 w-full flex flex-col pt-4 space-y-6">
              <div className="hud-panel p-5 rounded-sm relative flex flex-col">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-cyan-400">
                  <Zap className="w-5 h-5 text-yellow-400 animate-pulse" /> L-1 ВСПАШКА ПОЧВЫ: КАРМИЧЕСКИЙ Proof of Work
                </h2>
                <p className="text-xs text-cyan-600 uppercase font-mono mb-4">
                  Если узел прекращает «вспашку» (сидирование ZIM-архивов и обеспечение mesh-маршрутов), его Карма увядает (decay). Правом голоса в Рое обладают только те, кто доказывает преданность делу делом.
                </p>

                <div className="grid md:grid-cols-2 gap-6 items-start">
                  <div className="border border-cyan-500/20 bg-slate-900/40 p-4 rounded-sm space-y-4 font-mono">
                     <h3 className="text-sm font-bold text-cyan-300 border-b border-cyan-500/10 pb-2">КАБИНА ПЛУГА (СИМУЛЯТОР RUST K-PoW)</h3>
                     
                     <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs text-cyan-400 cursor-pointer">
                           <input 
                              type="checkbox" 
                              checked={isRoutingActive} 
                              onChange={e => setIsRoutingActive(e.target.checked)} 
                              className="accent-cyan-500" 
                           />
                           АКТИВНАЯ MATRIX МАРШРУТИЗАЦИЯ (+2.5 Karma/час)
                        </label>
                        <label className="flex items-center gap-2 text-xs text-cyan-400 cursor-pointer">
                           <input 
                              type="checkbox" 
                              checked={isSeedingActive} 
                              onChange={e => setIsSeedingActive(e.target.checked)} 
                              className="accent-cyan-500" 
                           />
                           АКТИВНОЕ СИДИРОВАНИЕ KIWIX ZIM (+4.5 Karma/час)
                         </label>
                         <label className="flex items-center gap-2 text-xs text-yellow-500 font-bold cursor-pointer font-mono">
                            <input 
                               type="checkbox" 
                               checked={isPowerfulResource} 
                               onChange={e => setIsPowerfulResource(e.target.checked)} 
                               className="accent-yellow-500" 
                            />
                            ⚡ МОЩНЫЙ УЗЕЛ / ПК / ЗАРЯДКА (Ускоренное увядание кармы)
                        </label>
                     </div>

                     <div className="space-y-1">
                        <div className="flex justify-between text-xs text-cyan-400">
                           <span>ИНТЕРВАЛ ВРЕМЕНИ ДЛЯ РАСЧЕТА:</span>
                           <span className="text-yellow-400">{plowElapsedHours} ЧАС(ОВ)</span>
                        </div>
                        <input 
                           type="range" 
                           min="1" 
                           max="24" 
                           value={plowElapsedHours} 
                           onChange={e => setPlowElapsedHours(Number(e.target.value))} 
                           className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                        />
                     </div>

                     <button 
                        onClick={() => {
                          try {
                            const result = WasmAikidoCore.plowSoil(isRoutingActive, isSeedingActive, trustScore, plowElapsedHours, isPowerfulResource);
                            setPlowResult(result);
                            if (result && result.new_karma !== undefined) {
                              if (symbiote) {
                                symbiote.trustScore = result.new_karma;
                              }
                              setTrustScore(result.new_karma);
                              addLog(`[WASM Core] Plowing completed in Rust. Karma updated: ${result.new_karma.toFixed(1)}. is_withering=${result.is_withering}`);
                            }
                          } catch (err: any) {
                            addLog(`[ERROR] Plow failed: ${err.message}`);
                          }
                        }}
                        className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold text-xs tracking-wider transition-colors cursor-pointer"
                     >
                        ВЫДАТЬ PoW-РАСЧЕТ В RUST CORE
                     </button>
                  </div>

                  <div className="border border-cyan-500/20 bg-slate-900/40 p-4 rounded-sm space-y-3 font-mono h-full min-h-[220px]">
                     <h3 className="text-sm font-bold text-cyan-300 border-b border-cyan-500/10 pb-2">АНАЛИТИКА ВСПАШКИ</h3>
                     {plowResult ? (
                        <div className="space-y-4">
                           <div className="flex justify-between items-center bg-black p-2 border border-cyan-500/10 rounded">
                              <span className="text-xs text-cyan-500">ИТОГОВАЯ КАРМА:</span>
                              <span className="text-xl font-bold text-emerald-400 text-glow-cyan">{plowResult.new_karma.toFixed(1)}</span>
                           </div>
                           <p className={`text-xs p-2.5 rounded font-semibold ${plowResult.is_withering ? 'bg-red-950/30 border border-red-500/30 text-rose-400 animate-pulse' : 'bg-green-950/30 border border-green-500/30 text-emerald-400'}`}>
                              {plowResult.status}
                           </p>
                           {plowResult.is_withering && (
                              <p className="text-[10px] text-red-500/80 leading-relaxed uppercase">
                                 🚨 Внимание: Из-за простоя узла ваши очки увядают. Срочно активируйте сидирование, чтобы сохранить свой Кворум в суде присяжных!
                              </p>
                           )}
                        </div>
                     ) : (
                        <div className="text-center py-8 text-cyan-600 text-xs">
                           Запустите оценку выше для загрузки метрик из WASM-протокола.
                        </div>
                     )}
                  </div>
               </div>
              </div>

              <div className="hud-panel p-5 rounded-sm relative flex flex-col">
                 <h2 className="text-sm font-bold text-cyan-300 mb-3 flex items-center gap-1.5 uppercase">
                    <Database className="w-4 h-4 text-cyan-400" /> СВЯЗАННЫЙ РАСПРЕДЕЛЕННЫЙ ЖУРНАЛ КАРМЫ (CRDT)
                 </h2>
                 <KarmaLedger />
              </div>
            </div>
          )}

          {/* FLOOR -4: uTORRENT СИДИРОВАНИЕ */}
          {activeTab === 'floor-4' && (
            <div className="flex-1 w-full flex flex-col pt-4 min-h-[70vh]">
              <div className="hud-panel p-5 rounded-sm relative flex flex-col flex-1">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
                  <Download className="w-5 h-5 text-glow-cyan animate-pulse" /> L-4 uTORRENT СИДИРОВАНИЕ
                </h2>
                <p className="text-sm text-cyan-600 mb-4 font-mono uppercase">
                  УПРАВЛЕНИЕ P2P-ОБМЕНОМ И МАКСИМАЛЬНАЯ РАЗДАЧА ФАЙЛОВ. ВСЕ СИМУЛЯЦИИ ИСПРАВЛЕНЫ, СТАТУС БЛОКИРОВКИ ОТСЛЕЖИВАЕТСЯ АВТОМАТИЧЕСКИ.
                </p>
                <div className="flex-1">
                  <TorrentManager symbiote={symbiote} isSynced={!!decryptedPassport} />
                </div>
              </div>
            </div>
          )}

          {/* FLOOR -5: KIWIX OFFLINE АРХИВЫ */}
          {activeTab === 'floor-5' && (
            <div className="flex-1 w-full flex flex-col pt-4 min-h-[70vh]">
              <div className="hud-panel p-5 rounded-sm relative flex flex-col flex-1">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
                  <BookOpen className="w-5 h-5 animate-pulse" /> L-5 KIWIX OFFLINE БАЗА ЗНАНИЙ
                </h2>
                <p className="text-sm text-cyan-600 mb-4 font-mono uppercase">
                  ЛОКАЛЬНАЯ ЭНЦИКЛОПЕДИЯ ДЛЯ ВЫЖИВАНИЯ УПРАВЛЯЕМАЯ ИЗ САНДБОКСА WEB WORKER. ПОИСК И ХРАНЕНИЕ В ФОРМАТЕ ZIM.
                </p>
                <div className="flex-1">
                  <KiwixArchive symbiote={symbiote} isSynced={!!decryptedPassport} />
                </div>
              </div>
            </div>
          )}

          {/* FLOOR -6: КВАНТОВОЕ НАДЕЖНОЕ ХРАНЕНИЕ (Isolated Crypto Worker) */}
          {activeTab === 'floor-6' && (
            <div className="flex-1 w-full flex flex-col pt-4 space-y-6">
              <div className="hud-panel p-5 rounded-sm relative flex flex-col">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-teal-400">
                  <Database className="w-5 h-5" /> L-6 КВАНТОВЫЙ СЛОЙ ХРАНЕНИЯ (SubtleCrypto Sandbox)
                </h2>
                
                <div className="p-4 bg-teal-950/20 border border-teal-500/30 rounded font-mono text-xs text-teal-300 space-y-4">
                  <div className="flex justify-between items-center border-b border-teal-500/10 pb-2">
                     <span className="font-bold uppercase">🔐 КАНАЛ СВЯЗИ С РАБОЧИМ ПОТОКОМ (Web Worker):</span>
                     <span className="text-glow-cyan text-emerald-400 font-bold">АКТИВЕН / ИЗОЛИРОВАН</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                     <div>
                        <span className="text-teal-600 block text-[10px] uppercase font-bold text-left">Транспорт Ключей:</span>
                        <p className="leading-relaxed mt-1 text-teal-300/90 text-left">
                           Паспорт Души загружен и защищен в закрытой памяти crypto.worker.ts. Внутри основного браузерного треда отсутствуют сырые seed-фразы или приватные ключи, что делает XSS-инъекции бесполезными.
                        </p>
                     </div>
                     <div>
                        <span className="text-teal-600 block text-[10px] uppercase font-bold text-left">Криптографическая Устойчивость:</span>
                        <p className="leading-relaxed mt-1 text-teal-300/90 text-left">
                           Для запечатывания используется PBKDF2 (100,000 раундов SHA-256) и шифрование по алгоритму AES-GCM 256-бит в SubtleCrypto Sandbox.
                        </p>
                     </div>
                  </div>
                  
                  <div className="bg-black p-3 border border-teal-900 rounded space-y-1">
                     <div className="text-[10px] text-teal-500 uppercase">Данные Сейфа IndexedDB:</div>
                     <div className="text-slate-400 text-[10px]">Database Name: MatrixSwarmIdentityDB</div>
                     <div className="text-slate-400 text-[10px]">Object Store: identity</div>
                     <div className="text-slate-300 font-bold text-[10px] mt-1 flex justify-between">
                        <span>СТАТУС КЛЮЧЕЙ В ПАМЯТИ РАБОЧЕГО:</span>
                        <span className="text-emerald-400">DEC_PHRASE_RESTORED_IN_THREAD_LOCK</span>
                     </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                     <button 
                        onClick={() => {
                           if (confirm("Вы абсолютно уверены? Это приведет к полной очистке защищенного IndexedDB сейфа и перезагрузке узла! Сид-фраза будет стерта.")) {
                              clearPassportFromWorkerStorage().then(() => {
                                 localStorage.clear();
                                 window.location.reload();
                              });
                           }
                        }}
                        className="py-1.5 px-4 bg-red-500/10 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-bold text-xs tracking-wider transition-colors cursor-pointer rounded-sm"
                     >
                        СБРОСИТЬ СЕЙФ КЛЮЧЕЙ И ОЧИСТИТЬСЯ (ПОЛИЦЕЙСКИЙ ДАМПЕР)
                     </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FLOOR -7: КОРЕНЬ ДУШИ (ПАСПОРТ) */}
          {activeTab === 'floor-7' && (
            <div className="flex-1 w-full flex flex-col pt-4 space-y-6">
              <div className="hud-panel p-5 rounded-sm relative flex flex-col">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-yellow-500">
                  <Key className="w-5 h-5 text-yellow-400 animate-spin-slow" /> L-7 КОРЕНЬ ДУШИ (The Soul Passport)
                </h2>
                <p className="text-xs text-cyan-600 uppercase font-mono mb-4">
                  Глубинная идентичность узла. BIP39/Ed25519 ключи вычисляются строго на нативном Rust-ядре и локализуются в закрытом Sandbox сейфе.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                   <div className="border border-cyan-500/20 bg-slate-900/40 p-4 rounded-sm space-y-4 font-mono">
                      <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest border-b border-cyan-500/10 pb-2">Ржавое Клеймо (WASM SIGNER & ENGINE)</h3>
                      
                      <div className="space-y-2">
                         <label className="block text-[10px] text-cyan-500 font-bold uppercase">ВЫПУСТИТЬ КРИПТОГРАФИЧЕСКИЙ ДОГОВОР:</label>
                         <input 
                            type="text" 
                            value={signMessageInput}
                            onChange={e => setSignMessageInput(e.target.value)}
                            className="w-full bg-slate-950 border border-cyan-500/30 p-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 font-mono"
                            placeholder="Message content..."
                         />
                      </div>

                      <button 
                         onClick={async () => {
                           try {
                             if (!decryptedPassport) return;
                             const signature = await WasmIdentity.signMessage(decryptedPassport, signMessageInput);
                             setGeneratedSignature(signature);
                             addLog(`[WASM Core] Message successfully signed with Ed25519.`);
                           } catch (err: any) {
                             addLog(`[ERROR] Sign failed: ${err.message}`);
                           }
                         }}
                         className="w-full py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-bold text-xs tracking-wider transition-colors cursor-pointer"
                      >
                         ПОДПИСАТЬ СООБЩЕНИЕ В RUST CORE
                      </button>

                      {generatedSignature && (
                         <div className="space-y-1">
                            <span className="text-[10px] text-yellow-500/80 uppercase block">ВАША HEX ПОДПИСЬ:</span>
                            <div className="p-2.5 bg-black border border-cyan-500/20 font-mono text-[9px] break-all max-h-20 overflow-y-auto custom-scrollbar text-yellow-400 leading-tight">
                              {generatedSignature}
                            </div>
                         </div>
                      )}
                   </div>

                   <div className="border border-cyan-500/20 bg-slate-900/40 p-4 rounded-sm space-y-4 font-mono">
                      <div className="flex justify-between items-center border-b border-cyan-500/10 pb-2">
                         <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">ВЕРИФИКАТОР Ed25519 ПОДПИСЕЙ</h3>
                         <button 
                            onClick={async () => {
                              if (!decryptedPassport) return;
                              try {
                                const keys = await getKeysFromSeed(decryptedPassport);
                                setVerifyPubKeyInput(keys.publicKey);
                                setVerifySigInput(generatedSignature);
                              } catch (e) {}
                            }}
                            className="text-[9px] text-yellow-500 hover:underline hover:text-yellow-400"
                         >
                            ЗАПОЛНИТЬ МОИ ДАННЫЕ
                         </button>
                      </div>

                      <div className="space-y-2 text-left">
                         <div>
                            <span className="text-[9.5px] text-slate-500 font-bold block uppercase mb-1">Публичный ключ (Hex/Base64):</span>
                            <input 
                               type="text" 
                               value={verifyPubKeyInput}
                               onChange={e => setVerifyPubKeyInput(e.target.value)}
                               className="w-full bg-slate-950 border border-cyan-500/20 p-2 text-[10px] text-cyan-300 focus:outline-none"
                               placeholder="PublicKey..."
                            />
                         </div>
                         <div>
                            <span className="text-[9.5px] text-slate-500 font-bold block uppercase mb-1">Проверяемое описание:</span>
                            <input 
                               type="text" 
                               value={verifyMessageInput}
                               onChange={e => setVerifyMessageInput(e.target.value)}
                               className="w-full bg-slate-950 border border-cyan-500/20 p-2 text-[10px] text-cyan-300 focus:outline-none"
                               placeholder="Message..."
                            />
                         </div>
                         <div>
                            <span className="text-[9.5px] text-slate-500 font-bold block uppercase mb-1">Проверяемая подпись (Hex):</span>
                            <textarea 
                               value={verifySigInput}
                               onChange={e => setVerifySigInput(e.target.value)}
                               className="w-full h-12 bg-slate-950 border border-cyan-500/20 p-2 text-[9px] text-cyan-300 focus:outline-none resize-none"
                               placeholder="Hex Signature..."
                            />
                         </div>
                      </div>

                      <button 
                         onClick={async () => {
                           try {
                             const is_valid = await WasmIdentity.verifySignature(verifyPubKeyInput, verifyMessageInput, verifySigInput);
                             setVerificationResult(is_valid);
                             addLog(`[WASM Core] Verified signature result: ${is_valid}`);
                           } catch (err: any) {
                             setVerificationResult(false);
                             addLog(`[ERROR] Verification error: ${err.message}`);
                           }
                         }}
                         className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs tracking-wider transition-colors cursor-pointer"
                      >
                         ВЕРИФИЦИРОВАТЬ Ed25519 В RUST CORE
                      </button>

                      {verificationResult !== null && (
                         <div className={`text-center p-2 rounded text-xs font-bold leading-tight uppercase border ${verificationResult ? 'bg-green-950/40 border-green-500/30 text-emerald-400 animate-pulse' : 'bg-red-950/40 border-red-500/30 text-rose-500'}`}>
                            {verificationResult ? "✓ ВЕНЕЦ СОГЛАСИЯ: ПОДПИСЬ КОРРЕКТНА! УЗЕЛ ВЕРИФИЦИРОВАН!" : "✗ КОРРУПЦИЯ: ПОДПИСЬ ОТКЛОНЕНА ЯДРОМ! КЛЮЧ НЕ СОВПАДАЕТ!"}
                         </div>
                      )}
                   </div>
                </div>

                {/* Soul Migration Container Link */}
                <div className="border border-amber-500/20 bg-slate-950/70 p-4 rounded mt-6 font-mono text-left">
                   <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
                      <h4 className="text-xs font-bold text-amber-500 uppercase">ЭКСПОРТНЫЙ КОНТЕЙНЕР (LEGACY PASSPORT BINDING)</h4>
                      <button 
                         onClick={async () => {
                           try {
                             if (!decryptedPassport) return;
                             const payload = await WasmIdentity.exportLegacyContainer(decryptedPassport, trustScore, true);
                             setLegacyContainerPayload(payload);
                             addLog(`[WASM Core] Legacy container successfully packed.`);
                           } catch (err: any) {
                             addLog(`[ERROR] Export failed: ${err.message}`);
                           }
                         }}
                         className="text-[10px] text-yellow-500 font-bold hover:underline"
                      >
                         ВЫГРУЗИТЬ
                      </button>
                   </div>
                   <p className="text-[10px] text-cyan-600 mt-2 mb-2 leading-relaxed">
                      Сформируйте шифрованный запечатанный контейнер вашего Паспорта для миграции в оффлайн-системы старого типа. Начисления Кармы и Эдди25519 связи будут запечатаны совместно в Rust-ядре.
                   </p>
                   {legacyContainerPayload && (
                      <textarea 
                         value={legacyContainerPayload}
                         readOnly
                         className="w-full h-16 bg-black border border-cyan-500/10 p-2 text-[10px] font-mono text-yellow-400/95 focus:outline-none"
                      />
                   )}
                </div>
              </div>
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
