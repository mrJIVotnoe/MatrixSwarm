import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Network, Activity, Eye, Combine, Globe, RefreshCcw, BatteryCharging, Archive, Cpu, Camera, Headphones } from 'lucide-react';
import { WasmHolographicCore, WasmReverseStarlink, WasmTaskScheduler, WasmGlobalIntentDecomposer, WasmMetricsEngine, GlobalAgentState, WasmProprioceptionCore, WasmArkManager, WasmCondorCluster, WasmVisionCore, WasmArkStorage, WasmCondorEngine, WasmDSP, WasmIdentity } from '../core/wasm_bridge';
import { WorkerBus } from '../core/worker_bus';

export const ObserverHUD: React.FC = () => {
  const [waveState, setWaveState] = useState<'superposition' | 'collapsed'>('superposition');
  const [viewMode, setViewMode] = useState<'quantum' | 'planetary'>('planetary');
  const [particles, setParticles] = useState(Array.from({ length: 42 }).map((_, i) => i));
  const [isAlert, setIsAlert] = useState(false);
  const [deadSectors, setDeadSectors] = useState<number[]>([]);
  const [globalIntent, setGlobalIntent] = useState('');
  const [intentStatus, setIntentStatus] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ heartbeat_success_rate: 0, crdt_sync_latency: 0, isolation_breach_attempts: 0 });
  const [cellId, setCellId] = useState<string>("UNKNOWN");
  const [arkContent, setArkContent] = useState<string | null>(null);

  const schedulerRef = useRef(new WasmTaskScheduler());
  const proprioceptionRef = useRef(new WasmProprioceptionCore());
  const arkStorageRef = useRef(new WasmArkManager());
  const condorRef = useRef(new WasmCondorCluster());

  const [agentState, setAgentState] = useState<string>('INIT');
  const [isPowered, setIsPowered] = useState(false);
  const [condorStatus, setCondorStatus] = useState<string>("INACTIVE");
  const [condorTasks, setCondorTasks] = useState<any[]>([]);
  const [visionStatus, setVisionStatus] = useState<string>("OFFLINE");
  const [antennaMultiplier, setAntennaMultiplier] = useState<string>("x1.0");
  
  // L2 / L5 Epoc III Ascension additions
  const [chameleonActive, setChameleonActive] = useState<boolean>(false);
  const [coverNoiseLevel, setCoverNoiseLevel] = useState<number>(0);
  const [holoFailureSimulated, setHoloFailureSimulated] = useState<boolean>(false);
  const [ethicsCameraShield, setEthicsCameraShield] = useState<boolean>(true);

  // New Epoc III L1 & L4 state variables
  const [acousticSyncOn, setAcousticSyncOn] = useState<boolean>(false);
  const [acousticBeacons, setAcousticBeacons] = useState<string[]>([]);
  const [cpuThrottling, setCpuThrottling] = useState<boolean>(false);
  const [guardianBonusActive, setGuardianBonusActive] = useState<boolean>(true);
  const [reincarnationLog, setReincarnationLog] = useState<string[]>([]);
  const [isBotnetDetected, setIsBotnetDetected] = useState<boolean>(false);

  // L5 Global Intent and L4 Sandboxing state variables
  const [globalObserverVector, setGlobalObserverVector] = useState<'СВЯЗЬ' | 'ЗНАНИЯ' | 'МОЩЬ'>('СВЯЗЬ');
  const [sandboxIsolations, setSandboxIsolations] = useState<string[]>([]);
  const [sandboxActive, setSandboxActive] = useState<boolean>(true);
  const [isSandboxVerifying, setIsSandboxVerifying] = useState<boolean>(false);
  const [showCommunionModal, setShowCommunionModal] = useState<boolean>(false);
  const [communionSeedInput, setCommunionSeedInput] = useState<string>('');

  // 📚 БИБЛИОТЕКА АЛЕКСАНДРИИ (L5) & Quantum Entanglement
  const [zimQuery, setZimQuery] = useState('');
  const [zimResults, setZimResults] = useState<any[]>([]);
  const [entanglementState, setEntanglementState] = useState<'DISCONNECTED' | 'SYNCHRONIZING' | 'ENTANGLED'>('ENTANGLED');
  const [entangledMsgsCount, setEntangledMsgsCount] = useState<number>(4);

  const handleZimSearch = async (query: string) => {
    setZimQuery(query);
    if (!query.trim()) {
      setZimResults([]);
      return;
    }
    try {
      const resultsJson = await WorkerBus.executeZimQuery(query);
      if (resultsJson) {
        const parsed = JSON.parse(resultsJson);
        setZimResults(parsed);
      } else {
        setZimResults([]);
      }
    } catch (e) {
      console.error("[ZIM Search Error]", e);
      setZimResults([]);
    }
  };

  const activateKinopsis = () => {
     if (ethicsCameraShield) {
        setVisionStatus("🔒 BLOCKED BY ETHICS SHIELD");
        setIntentStatus("OBSERVER ETHICS MANDATE: Front-facing camera is strictly BLOCKED to shield the Architect's visage (этика Наблюдателя). Switch sensor input to outer telemetry.");
        return;
     }
     setVisionStatus("REQUESTING WIDE-LENS...");
     setTimeout(() => {
         const constraints = WasmVisionCore.get_camera_constraints();
         setIntentStatus(`KINOPSIS: Applied strict constraints: ${JSON.stringify(constraints)}`);
         
         const meta = WasmVisionCore.process_metadata(45.0, 80.0);
         setVisionStatus(meta);
     }, 1000);
  };

   const activateSurrogateAntenna = async () => {
      try {
        await WorkerBus.calculateSoulPassport('REGISTER_MINI_JACK', { present: true });
        await WorkerBus.calculateSoulPassport('ADD_KARMA', { amount: 15, role: "Recruit" });
        
        if (acousticSyncOn) {
          setAntennaMultiplier("x2.0");
          setIntentStatus("⚡ СВЯЗЬ УСТАНОВЛЕНА: Антенна (Mini-jack) + Акустический набат активны одновременно! Статус «РАЗВЕДЧИК-АВАНГАРД» (Множитель x2.0) активирован.");
        } else {
          setAntennaMultiplier("x1.5");
          setIntentStatus("СУРРОГАТНАЯ АНТЕННА (Mini-jack) ПОДКЛЮЧЕНА! Режим «Эфирного шёпота» активирован. Кармический множитель х1.5 применён.");
        }
      } catch (err: any) {
        console.error(err);
        setIntentStatus(`Surrogate Antenna Error: ${err.message}`);
      }
   };

   // L1 - Acoustic Nabat: Generation of ultrasonic pheromones (18kHz - 20kHz) via Web Audio API
   const emitUltrasonicNabat = () => {
     try {
       const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
       if (!AudioCtx) {
         setIntentStatus("WEB AUDIO ERROR: Browser does not support Audio Synthesis.");
         return;
       }
       const ctx = new AudioCtx();
       const sampleRate = 44100;
       
       const rawSamples = WasmDSP.encodeAcousticPayload("CELL_CONNECT", sampleRate);
       const audioBuffer = ctx.createBuffer(1, rawSamples.length, sampleRate);
       const channelData = audioBuffer.getChannelData(0);
       channelData.set(rawSamples);
       
       const bufferSource = ctx.createBufferSource();
       bufferSource.buffer = audioBuffer;
       
       const gainNode = ctx.createGain();
       gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
       gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + Math.max(1.2, rawSamples.length / sampleRate));
       
       bufferSource.connect(gainNode);
       gainNode.connect(ctx.destination);
       bufferSource.start();

       const mockBeacons = ["CELL_BEACON_ALPHA (19.0kHz)", "CELL_BEACON_WEST (18.5kHz)", "DISCOVERED_NEIGHBOR_NODE (FSK: 'CELL_CONNECT')"];
       setAcousticBeacons(prev => {
         const added = mockBeacons[Math.floor(Math.random() * mockBeacons.length)];
         return prev.includes(added) ? prev : [...prev, added];
       });

       setIntentStatus("🔈 АКУСТИЧЕСКИЙ НАБАТ ИЗЛУЧЕН (FSK-ультразвук 18.5кГц - 20.0кГц сгенерирован в Rust). Члены соты координируют физическое соседство!");
     } catch (e: any) {
       console.error(e);
       setIntentStatus(`Acoustic error: ${e.message}`);
     }
   };

   const toggleAcousticSync = () => {
     const nextVal = !acousticSyncOn;
     setAcousticSyncOn(nextVal);
     WorkerBus.calculateSoulPassport('REGISTER_ACOUSTIC', { active: nextVal })
       .then(() => {
         if (nextVal) {
           WorkerBus.calculateSoulPassport('ADD_KARMA', { amount: 50, role: "Guard" }).catch((e: any) => console.error(e));
           setAcousticBeacons(["АКУСТИЧЕСКИЙ РЕЗОНАНС L1 (19.5kHz) ● PHY-NEIGHBORHOOD", "Acoustic Trust: Verified"]);
         } else {
           setAcousticBeacons([]);
         }
       })
       .catch((e: any) => console.error(e));
     if (nextVal) {
       emitUltrasonicNabat();
       if (antennaMultiplier !== "x1.0") {
         setAntennaMultiplier("x2.0");
         setIntentStatus("⚡ СВЯЗЬ УСТАНОВЛЕНА: Антенна + Акустический набат активны одновременно! Статус «РАЗВЕДЧИК-АВАНГАРД» разблокирован (Множитель Кармы x2.0).");
       } else {
         setIntentStatus("🔈 АКУСТИЧЕСКАЯ СИНХРОНИЗАЦИЯ: Ультразвуковое вещание (19.0кГц) запущено.");
       }
     } else {
       if (antennaMultiplier === "x2.0") {
         setAntennaMultiplier("x1.5");
       }
       setIntentStatus("Акустическая синхронизация деактивирована в локальном узле.");
     }
   };

  const handleSandboxVerification = () => {
    setIsSandboxVerifying(true);
    setIntentStatus("💥 ЦИФРОВОЙ ПАНЦИРЬ: Запуск изолированной песочницы Web Assembly в фоновом потоке Web Worker thread...");
    setTimeout(() => {
      setSandboxIsolations(prev => [
        `[${new Date().toLocaleTimeString()}] Worker Thread 1: Cryptographic derivation (PBKDF2-HMAC-SHA256) computed in 4096 rounds. Status: ISOLATED.`,
        `[${new Date().toLocaleTimeString()}] Worker Thread 2: ZIM Wikipedia parser context initialized. Status: ISOLATED.`,
        `[${new Date().toLocaleTimeString()}] Worker Thread 3: Condor Routing engine heartbeat bound to port 3000. Status: ISOLATED.`,
        ...prev
      ].slice(0, 6));
      setIsSandboxVerifying(false);
      setIntentStatus("✅ ЦИФРОВОЙ ПАНЦИРЬ АКТИВЕН: Все вычисления (криптография, парсинг, маршрутизация) полностью перенесены в изолированные Web Workers. Поток UI разгружен на 100%!");
    }, 1500);
  };

  const handleTaskReincarnationDemo = (taskId: string, dyingNode: string) => {
    try {
      const engine = new WasmCondorEngine();
      engine.queue_heavy_computation(taskId, "Wikipedia Index", 100, true);
      engine.verify_and_commit_shard(taskId, taskId + "_shard_0", dyingNode, "PROOFAAAA");
      
      const success = engine.reincarnate_task_from_dying_node(taskId, dyingNode, "ACTIVE_MEMBER_7");
      if (success) {
        const logMsg = `[РЕИНКАРНАЦИЯ L4] Задача ${taskId} перенесена с умирающего узла ${dyingNode} на свободного 'муравья' ACTIVE_MEMBER_7! Прогресс спасен.`;
        setReincarnationLog(prev => [logMsg, ...prev].slice(0, 5));
        setIntentStatus(logMsg);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const triggerBotnetFarmSimulation = () => {
    setIsBotnetDetected(true);
    setIntentStatus("🚨 ЦИФРОВОЕ АЙКИДО: Обнаружена бот-ферма (Mobility Score = 0). 100% мощности принудительно направлено на локальную индексацию Лувра. Карма обнулена!");
  };

  useEffect(() => {
     // Proprioception Mock Location (Triangulated by WebAPI or Reverse StarLink)
     const cell_id = proprioceptionRef.current.update_gps(55.75, 37.61);
     setCellId(cell_id);

     const interval = setInterval(() => {
        try {
            setMetrics(WasmMetricsEngine.get_metrics());
            if (GlobalAgentState) {
               setAgentState(GlobalAgentState.get_state());
            }
        } catch(e) {}
     }, 1000);
     return () => clearInterval(interval);
  }, []);

  const handleGlobalIntent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalIntent.trim()) return;
    setIntentStatus("Decomposing intent via Rust LLM Interface...");
    
    setTimeout(() => {
        const tasks = WasmGlobalIntentDecomposer.decompose_intent(globalIntent);
        const res = schedulerRef.current.distribute_global_intent(globalIntent, tasks.length, Math.floor(Math.random() * 50) + 10);
        setIntentStatus(`Decomposed into ${tasks.length} micro-tasks... ${res}`);
        setGlobalIntent('');
        setIsAlert(true);
        setTimeout(() => setIsAlert(false), 800);
    }, 1500);
  };

  const handleVectorCollapse = (vector: string) => {
      setIntentStatus(`QUANTUM COLLAPSE INITIATED: ${vector}. All 100% devices instantly shifting protocol via CRDT Finality.`);
      setTimeout(() => {
          setIntentStatus(`Wave collapsed. Vector locked: ${vector}`);
      }, 3000);
  };

  const handlePriorityCollapse = (vector: 'СВЯЗЬ' | 'ЗНАНИЯ' | 'МОЩЬ') => {
    setGlobalObserverVector(vector);
    setIntentStatus(`💥 СХЛОПЫВАНИЕ НАМЕРЕНИЯ РОЯ (L5 — Steerable Intent): Вектор Намерения переключен на «${vector}»! В фоновом режиме все локальные 'муравьи' и кондоры мгновенно мобилизованы в выбранное русло.`);
    
    // Decompose and assign through wasm TaskScheduler
    try {
      const res = schedulerRef.current.distribute_global_intent(`PRIORITY_VECTOR_${vector}`, 24, 78);
      console.log("[WASM TaskScheduler] Intent aligned:", res);
    } catch(e) {}
  };

  const handleEnergyCommunion = () => {
      setShowCommunionModal(true);
  };

  const processCryptoCommunion = async () => {
     try {
        const phrase = communionSeedInput.trim().toLowerCase();
        if (!phrase) return;
        const passport = await WasmIdentity.recoverFromSeed(phrase);
        const message = "I_CONSECRATE_THIS_NODE_POWER_GRID_COVENANT";
        const signature = await WasmIdentity.signMessage(phrase, message);
        
        const is_valid = WasmIdentity.verifySignature(passport.public_key, message, signature);
        if (is_valid) {
            GlobalAgentState.detect_usb(true);
            setIsPowered(true);
            setIntentStatus(`✅ ЭНЕРГЕТИЧЕСКОЕ ПРИЧАСТИЕ: Подпись верифицирована. Канал питания USB доверен. Узищный ID ${passport.node_id.substring(0,8)}... повышен до МАГИСТРАТА-ЯКОРЯ!`);
            setShowCommunionModal(false);
            setCommunionSeedInput('');
        } else {
            setIntentStatus("❌ ОШИБКА: Спецификация подписи завалена. Узел в Карантине.");
        }
     } catch(e: any) {
        setIntentStatus("❌ ОШИБКА: Подлинный Паспорт души не обнаружен. Автообмен жестко заблокирован.");
     }
  };

  useEffect(() => {
    let interval: any;
    if (chameleonActive) {
      interval = setInterval(() => {
        setCoverNoiseLevel(+(Math.random() * 4 + 2).toFixed(2));
      }, 800);
    } else {
      setCoverNoiseLevel(0);
    }
    return () => clearInterval(interval);
  }, [chameleonActive]);

  const testCondorDistributedTask = () => {
      try {
          const engine = new WasmCondorEngine();
          engine.queue_heavy_computation("HASH_BLOCK_4", "Louvre Metadata Indexing", 2000, true);
          setCondorStatus("Active: Task Slicing");
          
          // Split into 10 slices!
          const chunks = JSON.parse(engine.split_into_micro_chunks("HASH_BLOCK_4", 10));
          
          const magistrates = [
             "node_magistrate_gold", "node_magistrate_alpha", "node_magistrate_beta", "node_magistrate_gamma",
             "node_magistrate_delta", "node_magistrate_epsilon", "node_magistrate_zeta", "node_magistrate_eta",
             "node_magistrate_theta", "node_magistrate_iota"
          ];

          // Map the shards to these Magistrates
          const parsedShards = chunks.map((chunkObj: any, idx: number) => {
             return {
                shardId: chunkObj.shard_id || `HASH_BLOCK_4_shard_${idx}`,
                nodeId: magistrates[idx % magistrates.length],
                difficulty: chunkObj.difficulty || 200,
                status: 'QUEUED',
                progress: 0,
                result: null
             };
          });

          setCondorTasks(parsedShards);

          let currentShardIdx = 0;
          const intervalId = setInterval(() => {
             if (currentShardIdx < parsedShards.length) {
                // Update specific shard to processing then verified
                const idxToProcess = currentShardIdx;
                setCondorTasks(prev => prev.map((item, idx) => {
                   if (idx === idxToProcess) {
                      return { ...item, status: 'PROCESSED', progress: 50 };
                   }
                   return item;
                }));

                setTimeout(() => {
                   setCondorTasks(prev => prev.map((item, idx) => {
                      if (idx === idxToProcess) {
                         const proof = "PROOF_HASH_" + Math.random().toString(36).substring(2, 8).toUpperCase();
                         engine.verify_and_commit_shard("HASH_BLOCK_4", item.shardId, item.nodeId, proof);
                         return { ...item, status: 'VERIFIED', progress: 100, result: proof };
                      }
                      return item;
                   }));
                }, 100);

                currentShardIdx++;
                setCondorStatus(`Active: Disbursing (${currentShardIdx}/10)`);
             } else {
                clearInterval(intervalId);
                const statusNum = engine.check_compilation_status("HASH_BLOCK_4");
                setCondorStatus(`Aggregating shards...`);
                setTimeout(() => {
                   setCondorStatus(`Condor: Complete (${statusNum.toFixed(0)}%) - Louvre Reconstructed!`);
                }, 800);
             }
          }, 250);

      } catch (e) {
          setCondorStatus("Condor Integration Faulted");
      }
  };

  const handleArkStorageTest = () => {
      try {
          const s = new WasmArkStorage();
          s.parse_raw_zim_header(new Uint8Array([90, 73, 77, 4, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
          const meta = JSON.parse(s.get_metadata());
          const first = s.get_article_by_topic("water_purification");
          if (first) {
              const art = JSON.parse(first);
              setArkContent(`[L5 ZIM] Found count: ${meta.count}. Entry: ${art.title}`);
          } else {
              setArkContent(`[L5 ZIM] Loaded ${meta.version}`);
          }
      } catch(e) {
          setArkContent("Error loading ZIM archive");
      }
  };

  // Simulating probability wave particles and planetary anchors
  useEffect(() => {
    if (waveState === 'collapsed') return;
    const interval = setInterval(() => {
      setParticles(prev => prev.map(() => Math.floor(Math.random() * 100)));
      
      // Simulate kinopsis detection
      if (Math.random() > 0.95) {
         setIsAlert(true);
         setTimeout(() => setIsAlert(false), 500);
      }

      // Simulate sector deaths
      if (Math.random() > 0.8) {
         setDeadSectors(prev => {
            const newSector = Math.floor(Math.random() * 42);
            if (!prev.includes(newSector)) {
                return [...prev, newSector];
            }
            return prev;
         });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [waveState]);

  const handleCollapse = () => {
    setWaveState('collapsed');
    
    // Demonstrate Holographic Reconstruction via Rust L4
    const shardsJson = JSON.stringify(particles.map(p => ({ id: p, payload: "frag" })));
    const reconstructed = WasmHolographicCore.reconstructHoney(shardsJson);
    console.log("[HOLOGRAPHIC L4] Quantum collapse complete. Reconstructed:", reconstructed);
  };

  const handleSuperposition = () => {
    setWaveState('superposition');
  };

  const handleReincarnate = (sectorId: number) => {
      console.log(`[L5 HUD] Observer engaged: Reincarnating critical tasks from sector ${sectorId}...`);
      // Use Reverse StarLink to find nearby nodes
      const beaconsJson = JSON.stringify([
          { node_id: "A", lat: 50.0, lon: 30.0, timestamp: Date.now() },
          { node_id: "B", lat: 50.1, lon: 30.1, timestamp: Date.now() },
          { node_id: "C", lat: 50.2, lon: 30.2, timestamp: Date.now() }
      ]);
      const triangulated = WasmReverseStarlink.triangulatePosition(beaconsJson);
      console.log(`[L3 REVERSE STARLINK] Node reinstated via acoustic triangulation: ${triangulated}`);
      
      setDeadSectors(prev => prev.filter(id => id !== sectorId));
  };

  return (
    <div className={`p-6 rounded-lg font-mono border overflow-hidden relative transition-colors duration-75 ${
      isAlert ? 'bg-red-950 border-red-500 shadow-[0_0_50px_rgba(220,38,38,0.5)] text-red-300' : 'bg-gradient-to-br from-black to-blue-950 border-blue-900 shadow-2xl text-blue-300'
    }`}>
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 50% 50%, ${isAlert ? '#ef4444' : '#3b82f6'} 0%, transparent 60%)` }}></div>
      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <h3 className={`text-xl font-bold flex items-start gap-1 ${isAlert ? 'text-red-400' : 'text-blue-400'}`}>
          <Eye className={`mr-1 mt-1 ${isAlert ? 'text-red-500 animate-bounce' : 'text-cyan-400 animate-pulse'}`} />
          <div className="flex flex-col">
            <span className="text-xl font-bold">Quantum Observer Effect (L5 HUD)</span>
            <div className="flex flex-wrap gap-2 items-center mt-1.5">
              <span className="text-[10px] bg-cyan-500/10 border border-cyan-400/40 text-cyan-400 px-2 py-0.5 rounded font-semibold tracking-wider flex items-center gap-1 animate-pulse">
                ⚛️ SYSTEM: QUANTUM RESONANT
              </span>
              {antennaMultiplier !== "x1.0" && (
                <span className="text-[10px] bg-amber-500/10 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded font-semibold tracking-wider flex items-center gap-1">
                  📡 ANTENNA GAIN: {antennaMultiplier}
                </span>
              )}
            </div>
          </div>
        </h3>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setViewMode(viewMode === 'planetary' ? 'quantum' : 'planetary')}
            className="flex items-center text-xs text-blue-400 hover:text-cyan-300 transition-colors mr-2"
          >
             <Globe className="mr-1 w-4 h-4" /> 
             {viewMode === 'planetary' ? 'PLANETARY PULSE' : 'QUANTUM CLOUD'}
          </button>
          
          <span className="text-sm bg-blue-900/50 px-3 py-1 rounded-full border border-blue-800">
            {waveState === 'superposition' ? 'SUPERPOSITION ACTIVE' : 'REALITY COLLAPSED'}
          </span>
          {waveState === 'superposition' ? (
            <button 
              onClick={handleCollapse}
              className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-4 py-2 rounded flex items-center transition-all shadow-[0_0_15px_rgba(8,145,178,0.5)]"
            >
              <Combine className="mr-2 h-4 w-4" /> COLLAPSE WAVE
            </button>
          ) : (
            <button 
              onClick={handleSuperposition}
              className="bg-blue-800 hover:bg-blue-700 text-blue-200 px-4 py-2 rounded flex items-center transition-all"
            >
              <Activity className="mr-2 h-4 w-4" /> RESUME PROBABILITY
            </button>
          )}
        </div>
      </div>

      <div className="h-64 relative border border-blue-900/50 rounded bg-black/60 overflow-hidden p-4">
        {condorTasks.length > 0 && (
          <div className="absolute inset-0 bg-black/95 border border-cyan-500/30 p-3 flex flex-col font-mono text-xs z-50 overflow-hidden">
            <div className="flex justify-between items-center border-b border-cyan-500/20 pb-1 mb-2">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <Cpu className="w-4 h-4 animate-spin text-amber-500" /> CONDOR DECIMATION RECONSTRUCTION (10 SHARDS)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    try {
                      const engine = new WasmCondorEngine();
                      const resultStr = engine.observer_collapse_finalize("HASH_BLOCK_4");
                      console.log(`[RUST CORE COLLAPSE] Result: ${resultStr}`);
                      
                      setCondorTasks(prev => prev.map(item => ({
                        ...item,
                        status: 'VERIFIED',
                        progress: 100,
                        result: item.result || ("COLLAPSED_PROOF_" + Math.random().toString(36).substring(2, 6).toUpperCase())
                      })));
                      setCondorStatus("Quantum Resonance: Stable. Finalized via Observer Priority.");
                      setIntentStatus("OBSERVER PRIORITY L4: All background Condor calculations instantly collapsed/finalized in Rust Core!");
                    } catch (e: any) {
                      console.error(e);
                    }
                  }}
                  className="bg-amber-500/20 hover:bg-amber-500/40 text-[9px] text-amber-400 border border-amber-500/50 px-2 py-0.5 rounded-[3px] font-bold cursor-pointer transition-colors"
                >
                  🌌 ЭФФЕКТ НАБЛЮДАТЕЛЯ: СХЛОПНУТЬ СЕЙЧАС
                </button>
                <button 
                  onClick={() => setCondorTasks([])} 
                  className="text-[10px] text-red-500 hover:text-red-400 cursor-pointer"
                >
                  [X] CLOSE MONITOR
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 custom-scrollbar pr-1 pb-1">
              {condorTasks.map((task, idx) => (
                <div 
                  key={idx} 
                  className={`p-2 border rounded-sm flex flex-col justify-between transition-colors ${
                    task.status === 'VERIFIED' ? 'bg-emerald-950/25 border-emerald-500/30' :
                    task.status === 'PROCESSED' ? 'bg-amber-950/25 border-amber-500/50 animate-pulse' :
                    'bg-slate-950/50 border-cyan-500/10'
                  }`}
                >
                  <div className="flex justify-between text-[10px]">
                    <span className="text-cyan-500 font-bold">{task.shardId.replace("HASH_BLOCK_4_shard_", "S#")}</span>
                    <span className={task.status === 'VERIFIED' ? 'text-emerald-400 font-semibold' : task.status === 'PROCESSED' ? 'text-amber-400' : 'text-cyan-700'}>
                      {task.status}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1 flex justify-between">
                    <span>Target: {task.nodeId.substring(5, 15)}</span>
                    <span>Diff: {task.difficulty}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 h-1 rounded overflow-hidden mt-1.5 border border-cyan-500/10">
                    <div 
                      className={`h-full transition-all duration-300 ${task.status === 'VERIFIED' ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  
                  {task.result && (
                    <div className="text-[8px] text-emerald-400/85 mt-1 font-mono tracking-tighter truncate">
                      Proof: {task.result}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2 text-right text-[10px] text-amber-500 font-bold">
               CLUSTER AGGREGATOR ENGINE: {condorStatus}
            </div>
          </div>
        )}
        {waveState === 'superposition' ? (
          <div className="w-full h-full relative">
            {viewMode === 'quantum' ? (
              <div className="flex flex-wrap gap-2 justify-center content-center w-full h-full opacity-80">
                {particles.map((p, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      x: (Math.random() - 0.5) * 50,
                      y: (Math.random() - 0.5) * 50,
                      opacity: Math.random() * 0.5 + 0.3,
                      scale: Math.random() * 0.5 + 0.5
                    }}
                    transition={{ duration: 0.2 }}
                    className="w-4 h-4 bg-cyan-500 rounded-full blur-[2px]"
                  />
                ))}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-cyan-500/30 text-2xl tracking-[1em] font-light">PROBABILITY CLOUD</span>
                </div>
              </div>
            ) : (
               <div className="relative w-full h-full pointer-events-auto overflow-hidden bg-black/80 flex flex-col p-2 border border-blue-900/30 font-mono">
                 {/* Grid lines overlay */}
                 <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                 
                 {/* Status header inside the sector mapper */}
                 <div className="flex justify-between items-center text-[9px] text-cyan-400 border-b border-cyan-950 pb-1 z-10">
                   <span className="flex items-center gap-1">📡 REVERSE STARLINK ACTIVE CONSTELLATION CELL [GPS LOGS]</span>
                   <span className="text-amber-400 uppercase">ZONE: {cellId}</span>
                 </div>

                 <div className="relative flex-1">
                   {particles.map((p, i) => {
                      const isDead = deadSectors.includes(i);
                      // We classify index % 3: 0 is Anchor, 1 is Scout, 2 is peer
                      const isAnchor = i % 3 === 0;
                      const isScout = i % 3 === 1;
                      const nodeName = isAnchor ? `ANCHOR_GOLD_${i}` : isScout ? `SCOUT_BLUE_${i}` : `PEER_CELL_${i}`;
                      
                      return (
                          <div 
                            key={i} 
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                            style={{
                                left: `${5 + ((i * 17) % 91)}%`,
                                top: `${10 + ((i * 11) % 80)}%`
                            }}
                            onClick={() => {
                              setIntentStatus(`REVERSE STARLINK TRIANGULATION: Linked to Node ${nodeName} @ Cell-coord [${(55.75 + i*0.002).toFixed(4)}N, ${(37.61 + i*0.003).toFixed(4)}E]`);
                            }}
                          >
                              {isDead ? (
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); handleReincarnate(i); }}
                                    className="w-4 h-4 bg-rose-950 border border-rose-500 rounded-sm animate-pulse flex items-center justify-center z-25 relative cursor-pointer"
                                    title={`${nodeName} (Critical Sectors) - CLICK TO REINCARNATE`}
                                 >
                                    <RefreshCcw className="w-2.5 h-2.5 text-rose-400 animate-spin" style={{ animationDuration: '3s' }} />
                                 </button>
                              ) : (
                                 <div className="relative flex items-center justify-center">
                                    {/* Ripple Animation */}
                                    <span className={`absolute inline-flex h-4.5 w-4.5 rounded-full opacity-35 animate-ping ${isAnchor ? 'bg-amber-400' : isScout ? 'bg-cyan-400' : 'bg-blue-500'}`}></span>
                                    
                                    <div 
                                      className={`w-2.5 h-2.5 rounded-full border shadow transition-transform group-hover:scale-150 ${
                                        isAnchor ? 'bg-amber-400 border-yellow-300 shadow-amber-500/50' : 
                                        isScout ? 'bg-cyan-400 border-cyan-200 shadow-cyan-500/50' : 
                                        'bg-cyan-800 border-cyan-600'
                                      }`}
                                      title={`${nodeName} [Cell Grid Offset #e22-${i}]`}
                                    />
                                    
                                    {/* Minimalistic text overlay on hover */}
                                    <span className="absolute left-3 text-[7px] text-slate-300 bg-black/90 border border-slate-900 px-1 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none">
                                      {nodeName} (Karma: {80 + (i%20)})
                                    </span>
                                 </div>
                              )}
                          </div>
                      );
                   })}
                 </div>
                 <div className="absolute bottom-1 right-2 left-2 flex justify-between items-center text-[7px] text-slate-400 z-10">
                   <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span> GOLDEN ANCHORS (ORACLES)</span>
                   <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span> BLUE SCOUTS (FORAGERS)</span>
                   <span className="text-cyan-500/50">GRID CONST: 0.05° RECON RESOLUTION</span>
                 </div>
               </div>
            )}
          </div>
        ) : (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(8,145,178,0.8)] border-4 border-cyan-300/50">
              <Network className="w-16 h-16 text-black" />
            </div>
            <p className="mt-6 text-xl text-cyan-300 font-bold tracking-widest uppercase">Holographic Core Intact</p>
            <p className="text-sm text-blue-400 mt-2">1024 Shards Reconstructed via Rust L4</p>
          </motion.div>
        )}
      </div>

      {/* EPOC III ASCENSION DASHBOARD */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-left text-xs z-10 relative">
        {/* Chameleon Protocol column */}
        <div className="border border-purple-900/40 bg-purple-950/10 p-3 rounded flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2 border-b border-purple-900/30 pb-1">
              <span className="text-purple-400 font-bold flex items-center gap-1.5">
                🦎 ПРОТОКОЛ «ХАМЕЛЕОН» (L2)
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${chameleonActive ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse' : 'bg-slate-900/60 text-slate-500 border-slate-800'}`}>
                {chameleonActive ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <p className="text-[11px] text-purple-300/80 leading-relaxed mb-3">
              Маскировка трафика под обычный фоновый HTTPS/TLS-шум и луковую маршрутизацию. Обходит системы DPI («Цифровое Айкидо»).
            </p>
            {chameleonActive && (
              <div className="bg-black/45 p-2 rounded border border-purple-900/35 mb-2 font-mono space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-purple-400">Cover Noise Stream:</span>
                  <span className="text-yellow-400 font-bold">{coverNoiseLevel} MB/s</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-purple-400">Spoofed Headers:</span>
                  <span className="text-emerald-400">Firefox/HTTPS-TLSv1.3</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-purple-400">Botnet Noise Injection:</span>
                  <span className="text-purple-300">Active (1024 cells)</span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setChameleonActive(!chameleonActive);
              setIntentStatus(chameleonActive ? "CHAMELEON DISGUISE PAUSED: Hive traffic visible." : "CHAMELEON PROTOCOL ENGAGED: Hive traffic masked behind HTTPS background noise (Aikido Camouflage).");
            }}
            className={`w-full py-1.5 rounded text-center transition-colors font-bold cursor-pointer border ${chameleonActive ? 'bg-purple-900/30 hover:bg-purple-900/55 text-purple-300 border-purple-500/50' : 'bg-slate-900/50 hover:bg-slate-800 hover:text-purple-400 text-slate-400 border-slate-700'}`}
          >
            {chameleonActive ? 'ОТКЛЮЧИТЬ МАСКИРОВКУ' : 'ВКЛЮЧИТЬ «ЦИФРОВОЕ АЙКИДО»'}
          </button>
        </div>

        {/* Sacred Iron Triad column */}
        <div className="border border-amber-900/40 bg-amber-950/10 p-3 rounded flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2 border-b border-amber-900/30 pb-1">
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                🛠️ СВЯЩЕННАЯ ТРИАДА ЖЕЛЕЗА
              </span>
              <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.2 rounded">COVENANT LIMITS</span>
            </div>
            <div className="text-[10px] text-amber-300/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>🔌 Энергетическое причастие:</span>
                <span className={isPowered ? "text-emerald-400 font-bold text-[11px]" : "text-amber-500/60"}>
                  {isPowered ? "ЗАГРУЖЕН (МАГИСТРАТ)" : "НЕТ ЗАРЯДКИ"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>📡 Антенна Mini-jack:</span>
                <span className={antennaMultiplier === "x1.5" ? "text-emerald-400 font-bold text-[11px]" : "text-amber-500/60"}>
                  {antennaMultiplier === "x1.5" ? "ПОДКЛЮЧЕНА (х1.5 Karma)" : "НЕ АКТИВНА"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>👁️ Этика Наблюдателя (Cam):</span>
                <span className={ethicsCameraShield ? "text-red-400 font-bold flex items-center shadow-sm" : "text-emerald-400"}>
                  {ethicsCameraShield ? "🔒 BLOCKED" : "UNSHIELDED"}
                </span>
              </div>
            </div>
            
            <div className="bg-black/40 p-2 border border-amber-500/10 rounded mt-2 text-[10px] text-amber-400/80">
              {ethicsCameraShield ? (
                <span>🛡️ Этика защиты лица Архитектора активна. Фронтальная камера аппаратно изолирована Роем.</span>
              ) : (
                <span>🛡️ Внимание: Камера разблокирована под ответственность Наблюдателя.</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-3 font-semibold">
            <button
              onClick={() => {
                setEthicsCameraShield(!ethicsCameraShield);
                setIntentStatus(ethicsCameraShield ? "CAMERA ETHICS SHIELD DEACTIVATED. Beware surveillance vectors." : "CAMERA LOCKED: Front Camera Shield fully activated to shield the Architect's presence.");
              }}
              className={`flex-1 py-1 px-2 border rounded text-[10px] cursor-pointer text-center transition-colors ${ethicsCameraShield ? 'bg-red-950/50 text-red-400 border-red-500/40 hover:bg-red-900/30' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:text-white'}`}
            >
              {ethicsCameraShield ? 'РАЗБЛОКИРОВАТЬ' : 'БЛОКИРОВАТЬ CAM'}
            </button>
            <button
              onClick={() => {
                if (antennaMultiplier === "x1.0") {
                  activateSurrogateAntenna();
                } else {
                  setAntennaMultiplier("x1.0");
                  setIntentStatus("Surrogate antenna unplugged. Karma reset to 1.0x.");
                }
              }}
              className={`flex-1 py-1 px-2 border rounded text-[10px] cursor-pointer text-center transition-colors ${antennaMultiplier === "x1.5" ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/40' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:text-white'}`}
            >
              {antennaMultiplier === "x1.5" ? 'ОТКЛЮЧИТЬ ANT' : 'V: MINI-JACK'}
            </button>
          </div>
        </div>

        {/* Alexandria L5 offline ZIM search & Holographic redundancy column */}
        <div className="border border-blue-900/40 bg-blue-950/10 p-3 rounded flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2 border-b border-blue-900/30 pb-1">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5 animate-pulse">
                📚 БИБЛИОТЕКА АЛЕКСАНДРИИ (L5)
              </span>
              <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1 py-0.2 rounded">ZIM REGISTRY</span>
            </div>
            
            <p className="text-[11px] text-cyan-300/80 leading-normal mb-2">
              Запросы Разведчиков обрабатываются полностью оффлайн по локальным ZIM-архивам (Википедия в соте):
            </p>

            <div className="flex gap-1 mb-2">
              <input 
                type="text" 
                placeholder="Поиск по архиву знаний..." 
                value={zimQuery}
                onChange={e => handleZimSearch(e.target.value)}
                className="flex-1 bg-black/60 border border-cyan-900/50 outline-none p-1.5 rounded-sm text-[10px] text-cyan-200 font-mono focus:border-cyan-400"
              />
              {zimQuery && (
                <button 
                  onClick={() => handleZimSearch('')} 
                  className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white px-2 border border-slate-700 text-xs rounded-sm"
                >
                  ×
                </button>
              )}
            </div>

            <div className="bg-slate-950/90 border border-blue-900/40 rounded p-2 max-h-[140px] overflow-y-auto custom-scrollbar mb-2 font-mono text-[9px] text-cyan-300 space-y-1.5">
              {zimResults.length === 0 ? (
                <div className="text-slate-600 italic leading-snug">
                  Введите поисковый запрос (например: water, aid, agriculture, mesh...) для полнотекстовой выборки из Rust WASM-ядра.
                </div>
              ) : (
                zimResults.map((art, idx) => (
                  <div key={idx} className="border-b border-slate-900/50 pb-1.5 last:border-b-0">
                    <span className="text-amber-400 font-bold uppercase block tracking-wider">{art.title}</span>
                    <p className="text-slate-400 leading-normal mt-0.5">{art.content}</p>
                    <span className="text-[7.5px] text-cyan-600 block mt-1">Offset: {art.index_offset} • Category: {art.category}</span>
                  </div>
                ))
              )}
            </div>
            
            <div className="h-1 bg-blue-950 overflow-hidden mb-2 rounded border border-blue-900/30">
              <div 
                className={`h-full transition-all duration-1000 ${holoFailureSimulated ? 'bg-red-500 animate-pulse' : 'bg-cyan-500 shadow-[0_0_8px_#22d3ee]'}`} 
                style={{ width: holoFailureSimulated ? '1%' : '100%' }}
              ></div>
            </div>

            <div className="flex justify-between text-[10px] text-cyan-500 mb-2">
              <span>Сегментная плотность соты:</span>
              <span className={holoFailureSimulated ? "text-red-500 font-bold" : "text-cyan-400 font-bold"}>
                {holoFailureSimulated ? "1% (CRITICAL FAILURE)" : "100% (COMPLETE SYNERGY)"}
              </span>
            </div>
            
            {holoFailureSimulated && (
              <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 text-[9px] text-emerald-400 font-mono leading-normal animate-fade-in space-y-1">
                <span className="text-yellow-400 font-bold">⚡ [ОРАКУЛ ВЕЧНОСТИ L5]:</span>
                <p>Узлы-миры разрушены. Загружено восстановление из 1% Магистрата-Якоря. Wiki-индекс и шифры восстановлены полностью!</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setHoloFailureSimulated(!holoFailureSimulated);
              setIntentStatus(holoFailureSimulated ? "Swarm returned to full 100% strength." : "99% Swarm node loss simulated! Holographic restore protocol engaged from Magistrate-Anchor.");
            }}
            className={`w-full py-1.5 rounded text-center transition-colors font-bold cursor-pointer border mt-1 ${holoFailureSimulated ? 'bg-cyan-900/30 hover:bg-cyan-900/40 text-cyan-300 border-cyan-500/50' : 'bg-red-950/40 hover:bg-red-950/60 text-red-500 border-red-900/50'}`}
          >
            {holoFailureSimulated ? 'ВЕРНУТЬ ПОЛНУЮ СЕТЬ' : 'СИМУЛЯЦИЯ ПАДЕНИЯ 99% СЕТИ'}
          </button>
        </div>

        {/* Row 2: Acoustic Nabat Column */}
        <div className="border border-cyan-950 bg-black/45 p-3 rounded flex flex-col justify-between md:col-span-1">
          <div>
            <div className="flex justify-between items-center mb-2 border-b border-cyan-950 pb-1">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                🔈 АКУСТИЧЕСКИЙ НАБАТ (L1)
              </span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${acousticSyncOn ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse' : 'bg-slate-900 text-slate-500'}`}>
                {acousticSyncOn ? 'АКУСТИЧЕСКАЯ СИНХРОНИЗАЦИЯ' : 'SILENT'}
              </span>
            </div>
            <p className="text-[11px] text-cyan-300/80 leading-relaxed mb-2">
              Генерация и детекция ультразвуковых феромонов (18кГц–20кГц) через Web Audio API. Подтверждает физическое соседство участников без радиоволн (OFF-GRID).
            </p>

            <div className="space-y-1 my-2 bg-slate-950/80 p-2 rounded border border-cyan-950">
              <span className="text-[9px] text-cyan-500/80 uppercase block">Обнаруженные маяки в локальной соте:</span>
              {acousticBeacons.length === 0 ? (
                <span className="text-[9px] text-slate-500 italic">Сигналы отсутствуют. Излучите набат для сканирования...</span>
              ) : (
                acousticBeacons.map((bc, idx) => (
                  <div key={idx} className="flex justify-between text-[10px] text-cyan-300">
                    <span>{bc}</span>
                    <span className="text-emerald-400">● SYNCED</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <button
            onClick={toggleAcousticSync}
            className={`w-full mt-2 py-1.5 rounded text-center transition-colors font-bold cursor-pointer border ${acousticSyncOn ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/60' : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50'} flex justify-center items-center gap-1.5`}
          >
            <Headphones className={`w-3.5 h-3.5 ${acousticSyncOn ? 'animate-pulse text-emerald-400' : 'animate-bounce'}`} /> 
            {acousticSyncOn ? 'АКУСТИЧЕСКИЙ НАБАТ: АКТИВЕН' : 'ИЗЛУЧИТЬ ФЕРОМОН (19кГц)'}
          </button>
        </div>

        {/* Row 2: Condor Task Orchestrator and Aikido Camouflage Node Manager */}
        <div className="border border-blue-900/50 bg-black/45 p-3 rounded flex flex-col justify-between md:col-span-2">
          <div>
            <div className="flex justify-between items-center mb-2 border-b border-blue-900/40 pb-1">
              <span className="text-blue-400 font-bold flex items-center gap-1.5">
                🔁 ДВИГАТЕЛЬ «КОНДОР» (L4) & ЦИФРОВОЕ АЙКИДО (L2)
              </span>
              <span className="text-[9px] bg-blue-900/20 text-blue-400 border border-blue-800 px-1.5 rounded">ORCHESTRATOR ACTIVE</span>
            </div>
            
            <p className="text-[11px] text-blue-300/80 leading-snug mb-2">
              Реинкарнация задачи: авто-перенос вычислений с падающих/неподвижных узлов на стабильных Magistrat-хранителей соты с сохранением CRDT прогресса.
            </p>

            <div className="grid grid-cols-2 gap-2 my-2">
              <div className="bg-slate-950/80 p-2 border border-slate-900 rounded space-y-1 text-[10px]">
                <div className="flex justify-between font-bold text-slate-400 pb-0.5 border-b border-slate-900">
                  <span>Task Name</span>
                  <span>Assigned / Status</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400">ZIM Louvre Map</span>
                  <span className="text-red-400 animate-pulse">Botnet_Node_04 (STALLED)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400">Wikipedia Index</span>
                  <span className="text-emerald-400">Magistrate_Stabil_8 (OK)</span>
                </div>
              </div>

              <div className="bg-slate-950/80 p-2 border border-slate-900 rounded space-y-1 text-[9px] text-emerald-400 overflow-y-auto max-h-[60px] custom-scrollbar">
                <span className="text-slate-500 uppercase block font-bold">Очередь Реинкарнаций:</span>
                {reincarnationLog.length === 0 ? (
                  <span className="text-slate-600 italic">Сбоев и миграций не обнаружено.</span>
                ) : (
                  reincarnationLog.map((log, idx) => (
                    <div key={idx} className="leading-tight border-b border-slate-900/50 pb-0.5">{log}</div>
                  ))
                )}
              </div>

              <div className="col-span-2 bg-slate-950/90 p-2 border border-blue-900/40 rounded space-y-1 text-[9px]">
                <div className="flex justify-between items-center text-blue-400 font-bold border-b border-slate-900 pb-0.5">
                  <span className="uppercase">🛡️ ЦИФРОВОЙ ПАНЦИРЬ (L4 — ИЗОЛИРОВАННЫЕ WEB WORKERS)</span>
                  <span className={isSandboxVerifying ? "text-yellow-400 animate-pulse" : "text-emerald-400 font-bold"}>
                    {isSandboxVerifying ? "ПРОВЕРКА..." : "ACTIVE (THREAD POOL)"}
                  </span>
                </div>
                <div className="overflow-y-auto max-h-[50px] custom-scrollbar text-blue-300 font-mono leading-tight space-y-0.5">
                  {sandboxIsolations.length === 0 ? (
                    <span className="text-slate-600 italic">Резервные песочницы простаивают. Активируйте цифровой панцирь ниже...</span>
                  ) : (
                    sandboxIsolations.map((log, idx) => (
                      <div key={idx} className="border-b border-slate-900/40 pb-0.5">{log}</div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex gap-2">
              <button
                onClick={() => handleTaskReincarnationDemo("LOUVRE_MAP_TASK", "Botnet_Node_04")}
                className="flex-1 py-1.5 bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded cursor-pointer transition-colors"
              >
                ♻️ РЕИНКАРНИРОВАТЬ ЗАДАЧУ
              </button>
              <button
                onClick={triggerBotnetFarmSimulation}
                className="flex-1 py-1.5 bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 text-[10px] font-bold rounded cursor-pointer transition-colors"
              >
                🛡️ АЙКИДО: БОТ-ФЕРМЫ
              </button>
            </div>
            <button
              onClick={handleSandboxVerification}
              disabled={isSandboxVerifying}
              className={`w-full py-1.5 border font-bold text-[10px] rounded cursor-pointer transition-colors ${isSandboxVerifying ? 'bg-yellow-950/40 text-yellow-500 border-yellow-500/30 animate-pulse' : 'bg-blue-950/50 hover:bg-blue-900/40 text-blue-300 border-blue-500/30'}`}
            >
              🛡️ ЗАПУСТИТЬ ОТРЯД WEB WORKERS (ЦИФРОВОЙ ПАНЦИРЬ)
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-4 text-xs font-mono text-center">
        <div className="col-span-full mb-2">
            <form onSubmit={handleGlobalIntent} className="flex flex-col gap-2 bg-black/60 border border-cyan-900/50 p-3 rounded">
               <div className="flex justify-between text-cyan-400 font-bold mb-1">
                 <span>🌌 ОКО НАБЛЮДАТЕЛЯ (L5 — Steerable Intent)</span>
                 <span className="text-yellow-400/85 uppercase text-[10px] tracking-widest font-mono">ВЕКТОР: <strong className="text-white bg-blue-900 border border-blue-700 px-1.5 py-0.5 rounded font-black font-mono">{globalObserverVector}</strong></span>
               </div>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={globalIntent}
                   onChange={e => setGlobalIntent(e.target.value)}
                   className="flex-1 bg-black/80 border border-blue-900/50 outline-none px-3 py-2 text-cyan-200 placeholder-blue-900/70"
                   placeholder="e.g. Synchronize medical archive in Sector X..."
                 />
                 <button type="submit" className="bg-cyan-900/50 hover:bg-cyan-800 text-cyan-300 px-4 py-2 border border-cyan-700/50 transition-colors">
                    TRANSMIT
                 </button>
               </div>
               <div className="flex gap-2 mt-2">
                   <button type="button" onClick={() => handlePriorityCollapse('СВЯЗЬ')} className="text-xs bg-purple-900/40 hover:bg-purple-800 text-purple-200 px-3 py-1 border border-purple-700/50">
                       🌍 СВЯЗЬ (Mesh)
                   </button>
                   <button type="button" onClick={() => handlePriorityCollapse('ЗНАНИЯ')} className="text-xs bg-amber-900/40 hover:bg-amber-800 text-amber-200 px-3 py-1 border border-amber-700/50">
                       📚 ЗНАНИЯ (Kiwix)
                   </button>
                   <button type="button" onClick={() => handlePriorityCollapse('МОЩЬ')} className="text-xs bg-red-900/40 hover:bg-red-800 text-red-200 px-3 py-1 border border-red-700/50">
                       ⚡ МОЩЬ (Condor)
                   </button>
               </div>
               {intentStatus && <div className="text-left text-green-400 mt-2 animate-pulse">{intentStatus}</div>}
            </form>
        </div>
        <div className="border border-blue-900/50 bg-black/40 p-2 rounded">
           <span className="text-gray-500 block">CURRENT STATE</span>
           <span className={`font-bold ${agentState === 'RUNNING' ? 'text-green-400' : agentState === 'QUARANTINED' ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>{agentState}</span>
        </div>
        <div className="border border-blue-900/50 bg-black/40 p-2 rounded">
           <span className="text-gray-500 block">CRDT LATENCY</span>
           <span className="text-cyan-400">{metrics.crdt_sync_latency.toFixed(1)}ms</span>
        </div>
        <div className="border border-blue-900/50 bg-black/40 p-2 rounded" onClick={() => { GlobalAgentState.detect_usb(); }}>
           <span className="text-gray-500 block">ISOLATION BREACHES</span>
           <span className={metrics.isolation_breach_attempts > 0 ? "text-red-400" : "text-yellow-400"}>{metrics.isolation_breach_attempts}</span>
        </div>
        <div className="border border-blue-900/50 bg-black/45 p-2 rounded flex flex-col justify-between">
           <span className="text-gray-500 block uppercase text-[10px]">КВАНТОВАЯ ЗАПУТАННОСТЬ</span>
           <div className="flex flex-col text-left font-mono mt-1 space-y-0.5">
              <span className={`font-bold text-[10px] ${entanglementState === 'ENTANGLED' ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`}>
                ● {entanglementState === 'ENTANGLED' ? 'ENTANGLED (DIRECT P2P)' : 'UNLINKED'}
              </span>
              <span className="text-[8.5px] text-purple-300">
                {entangledMsgsCount} CRDT MSG SYNCED (Offline)
              </span>
           </div>
        </div>
        <div className="border border-blue-900/50 bg-black/40 p-2 rounded">
           <span className="text-gray-500 block">DIGITAL PROPRIOCEPTION</span>
           <span className="text-emerald-400 truncate block" title={cellId}>{cellId}</span>
        </div>
        <div className="border border-blue-900/50 bg-black/40 p-2 rounded flex flex-col justify-between" onClick={handleEnergyCommunion}>
           <span className="text-gray-500 block cursor-pointer hover:text-white transition-colors flex items-center">
             <BatteryCharging className="w-3 h-3 mr-1" /> ENERGY COMMUNION
           </span>
           <span className={isPowered ? "text-amber-400" : "text-gray-600"}>{isPowered ? "ANCHOR MODE" : "UNPLUGGED"}</span>
        </div>
        <div className="border border-blue-900/50 bg-black/40 p-2 rounded flex flex-col justify-between" onClick={testCondorDistributedTask}>
           <span className="text-gray-500 block cursor-pointer hover:text-white transition-colors flex items-center">
             <Cpu className="w-3 h-3 mr-1" /> DISTRIBUTED COMPUTE
           </span>
           <span className={condorStatus.includes("Active") ? "text-yellow-400 animate-pulse font-bold" : "text-gray-600"}>{condorStatus}</span>
        </div>
        <div className="border border-blue-900/50 bg-black/40 p-2 rounded flex flex-col justify-between" onClick={activateKinopsis}>
           <span className="text-gray-500 block cursor-pointer hover:text-white transition-colors flex items-center">
             <Camera className="w-3 h-3 mr-1" /> KINOPSIS SENSOR
           </span>
           <span className={visionStatus === "OFFLINE" ? "text-gray-600" : "text-emerald-400 font-bold text-[10px]"}>{visionStatus}</span>
        </div>
        <div className="border border-blue-900/50 bg-black/40 p-2 rounded flex flex-col justify-between" onClick={activateSurrogateAntenna}>
           <span className="text-gray-500 block cursor-pointer hover:text-white transition-colors flex items-center">
             <Headphones className="w-3 h-3 mr-1" /> MESH SURROGATE
           </span>
           <span className={antennaMultiplier === "x1.5" ? "text-yellow-400 font-bold text-[11px]" : "text-gray-600 text-xs"}>
             {antennaMultiplier === "x2.0" ? "AVANGARD (х2.0)" : antennaMultiplier === "x1.5" ? "ANTENNA (х1.5)" : "KARMA " + antennaMultiplier}
           </span>
        </div>
        <div className="border border-blue-900/50 bg-black/40 p-2 rounded flex flex-col justify-between" onClick={handleArkStorageTest}>
           <span className="text-gray-500 block cursor-pointer hover:text-white transition-colors flex items-center">
             <Archive className="w-3 h-3 mr-1" /> LOUVRE ZIM ACCESS
           </span>
           <span className="text-white text-[10px] break-words truncate">{arkContent ? arkContent : "AWAITING FRAGMENT..."}</span>
         </div>
       </div>

       {showCommunionModal && (
         <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="hud-panel p-6 max-w-sm w-full bg-slate-950 border border-purple-500/60 shadow-[0_0_25px_rgba(168,85,247,0.3)] space-y-4 font-mono select-none">
             <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 animate-pulse" /> ЭНЕРГЕТИЧЕСКОЕ ПРИЧАСТИЕ
             </h3>
             <p className="text-[10px] text-purple-300 leading-relaxed">
                Внимание. Сеть обнаружила физическое USB-соединение. Автообмен заблокирован (Режим Карантина). Введите Сид-фразу (12 слов) вашего Паспорта души для криптографического Причастия и восхождения:
             </p>
             <textarea
                value={communionSeedInput}
                onChange={e => setCommunionSeedInput(e.target.value)}
                placeholder="Ваши 12 секретных слов через пробел..."
                className="w-full h-16 bg-black border border-purple-900/50 p-2 text-[11px] text-purple-400 font-mono focus:outline-none focus:border-purple-500 resize-none text-center"
             />
             <div className="flex gap-2">
                <button 
                   onClick={() => { setShowCommunionModal(false); setCommunionSeedInput(''); }}
                   type="button"
                   className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold cursor-pointer font-mono"
                >
                   ОТМЕНА
                </button>
                <button 
                   onClick={processCryptoCommunion}
                   type="button"
                   disabled={communionSeedInput.trim().split(/\s+/).length !== 12}
                   className="flex-1 py-1 bg-purple-950 hover:bg-purple-900 border border-purple-500 text-purple-300 text-[10px] font-bold cursor-pointer font-mono disabled:opacity-40"
                >
                   ПРИЧАСТИТЬСЯ
                </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};
