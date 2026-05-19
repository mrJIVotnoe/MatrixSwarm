import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Network, Activity, Eye, Combine, Globe, RefreshCcw, BatteryCharging, Archive, Cpu, Camera, Headphones } from 'lucide-react';
import { WasmHolographicCore, WasmReverseStarlink, WasmTaskScheduler, WasmGlobalIntentDecomposer, WasmMetricsEngine, GlobalAgentState, WasmProprioceptionCore, WasmArkManager, WasmCondorCluster, WasmVisionCore } from '../core/wasm_bridge';

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
  const [visionStatus, setVisionStatus] = useState<string>("OFFLINE");
  const [antennaMultiplier, setAntennaMultiplier] = useState<string>("x1.0");

  const activateKinopsis = () => {
     setVisionStatus("REQUESTING WIDE-LENS...");
     setTimeout(() => {
         const constraints = WasmVisionCore.get_camera_constraints();
         setIntentStatus(`KINOPSIS: Applied strict constraints: ${JSON.stringify(constraints)}`);
         
         const meta = WasmVisionCore.process_metadata(45.0, 80.0);
         setVisionStatus(meta);
     }, 1000);
  };

  const activateSurrogateAntenna = () => {
      setAntennaMultiplier("x1.5");
      setIntentStatus("SURROGATE ANTENNA DETECTED (Mini-jack). Karma accumulation boosted.");
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

  const handleEnergyCommunion = () => {
      // User allows authorized power via USB
      GlobalAgentState.detect_usb(true);
      setIsPowered(true);
      setIntentStatus("ENERGY COMMUNION: Authorized USB power. Node anchoring as Magistrate.");
  };

  const testCondorDistributedTask = () => {
      condorRef.current.submit_heavy_task("HASH_BLOCK_4", "0xDEADBEEF", 100);
      setCondorStatus("CONDOR ACTIVE");
      let chunks = 0;
      const t = setInterval(() => {
          chunks++;
          condorRef.current.process_chunk("HASH_BLOCK_4");
          if(chunks >= 100) {
             clearInterval(t);
             setCondorStatus("TASK COMPLETE");
          }
      }, 20);
  };

  const handleArkStorageTest = () => {
      arkStorageRef.current.load_zim_archive("wikipedia_survival.zim", 1024 * 1024 * 500);
      const frag = arkStorageRef.current.read_zim_fragment("ZIM_WIKIPEDIA_SURVIVAL");
      setArkContent(frag);
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
        <h3 className={`text-xl font-bold flex items-center ${isAlert ? 'text-red-400' : 'text-blue-400'}`}>
          <Eye className={`mr-3 ${isAlert ? 'text-red-500 animate-bounce' : 'text-cyan-400 animate-pulse'}`} />
          Quantum Observer Effect (L5 HUD)
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
               <div className="relative w-full h-full pointer-events-auto overflow-hidden">
                 <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Equirectangular_projection_SW.jpg')] bg-cover bg-center mix-blend-screen grayscale"></div>
                 {particles.map((p, i) => {
                    const isDead = deadSectors.includes(i);
                    return (
                        <div 
                          key={i} 
                          className="absolute transform -translate-x-1/2 -translate-y-1/2"
                          style={{
                              left: `${(i * 13) % 100}%`,
                              top: `${(i * 7) % 100}%`
                          }}
                        >
                            {isDead ? (
                               <button 
                                  onClick={() => handleReincarnate(i)}
                                  className="w-4 h-4 bg-red-600 rounded-sm animate-pulse hover:bg-red-400 flex items-center justify-center z-20 tooltip"
                                  title="Sector Critical - Reincarnate!"
                               >
                                  <RefreshCcw className="w-2 h-2 text-white" />
                               </button>
                            ) : (
                               <motion.div 
                                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                                  className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]"
                               />
                            )}
                        </div>
                    );
                 })}
                 <div className="absolute bottom-2 right-2 text-[10px] text-cyan-500/50">PLANETARY ANCHORS [L3]</div>
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
      
      <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-4 text-xs font-mono text-center">
        <div className="col-span-full mb-2">
            <form onSubmit={handleGlobalIntent} className="flex flex-col gap-2 bg-black/60 border border-cyan-900/50 p-3 rounded">
               <div className="flex justify-between text-cyan-400 font-bold mb-1">
                 <span>GLOBAL INTENT (EYE OF GOD) / PROBABILITY COLLAPSE</span>
                 <span className="text-yellow-400/80 uppercase text-[10px] tracking-widest">{intentStatus ? "ACTIVE" : "AWAITING"}</span>
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
                   <button type="button" onClick={() => handleVectorCollapse("MAXIMAL ANONYMITY")} className="text-xs bg-purple-900/40 hover:bg-purple-800 text-purple-200 px-3 py-1 border border-purple-700/50">
                       V: MAXIMAL ANONYMITY
                   </button>
                   <button type="button" onClick={() => handleVectorCollapse("BATTERY SAVER (HIBERNATION)")} className="text-xs bg-amber-900/40 hover:bg-amber-800 text-amber-200 px-3 py-1 border border-amber-700/50">
                       V: HIBERNATION
                   </button>
                   <button type="button" onClick={() => handleVectorCollapse("RED ALERT (CONNECTIVITY)")} className="text-xs bg-red-900/40 hover:bg-red-800 text-red-200 px-3 py-1 border border-red-700/50">
                       V: RED ALERT
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
        <div className="border border-blue-900/50 bg-black/40 p-2 rounded">
           <span className="text-gray-500 block">TRUST / P2P STATUS</span>
           <span className="text-purple-400">{agentState === 'RUNNING' ? 'VERIFIED' : 'AWAITING AUTH'}</span>
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
           <span className={condorStatus.includes("ACTIVE") ? "text-yellow-400 animate-pulse font-bold" : "text-gray-600"}>{condorStatus}</span>
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
           <span className={antennaMultiplier === "x1.5" ? "text-yellow-400 font-bold" : "text-gray-600"}>KARMA {antennaMultiplier}</span>
        </div>
        <div className="border border-blue-900/50 bg-black/40 p-2 rounded flex flex-col justify-between" onClick={handleArkStorageTest}>
           <span className="text-gray-500 block cursor-pointer hover:text-white transition-colors flex items-center">
             <Archive className="w-3 h-3 mr-1" /> LOUVRE ZIM ACCESS
           </span>
           <span className="text-white text-[10px] break-words truncate">{arkContent ? arkContent : "AWAITING FRAGMENT..."}</span>
        </div>
      </div>
    </div>
  );
};
