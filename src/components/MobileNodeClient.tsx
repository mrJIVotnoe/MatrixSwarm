import React, { useState, useEffect, useRef } from "react";
import { Cpu, Zap, Activity, Thermometer, ShieldCheck, Globe, Loader2, Smartphone, LogOut, Gauge } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { runBenchmark, BenchmarkResult } from "../swarm/benchmark";

interface NodeInfo {
  nodeId: string;
  aiTier: string;
  token: string;
}

export const MobileNodeClient: React.FC = () => {
  const [isJoined, setIsJoined] = useState(false);
  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [load, setLoad] = useState(0);
  const [temp, setTemp] = useState(32);
  const [matrixConnected, setMatrixConnected] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const heartbeatInterval = useRef<any>(null);
  const taskPollInterval = useRef<any>(null);

  // Simulate Matrix connection
  useEffect(() => {
    const timer = setTimeout(() => setMatrixConnected(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const [recentResults, setRecentResults] = useState<any[]>([]);

  // Load node info from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("MATRIX_NODE_INFO");
    if (saved) {
      const info = JSON.parse(saved);
      setNodeInfo(info);
      setIsJoined(true);
      startNodeLoops(info.nodeId, info.token);
    }
  }, []);

  const joinSwarm = async () => {
    setIsBenchmarking(true);
    const benchmark = await runBenchmark();
    setBenchmarkResult(benchmark);
    setIsBenchmarking(false);

    try {
      const res = await fetch("/api/v1/node/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capabilities: ["generic", "text_classification"],
          ram_mb: 4000,
          cpu_cores: 8,
          ai_capable: true,
          privacy_mode: "public"
        })
      });
      const data = await res.json();
      if (data.success) {
        const info = { nodeId: data.nodeId, aiTier: data.aiTier, token: data.token };
        setNodeInfo(info);
        setIsJoined(true);
        localStorage.setItem("MATRIX_NODE_INFO", JSON.stringify(info));
        
        // Upload benchmark results
        await fetch(`/api/v1/node/${data.nodeId}/benchmark`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-node-token": data.token
          },
          body: JSON.stringify(benchmark)
        });

        startNodeLoops(data.nodeId, data.token);
      }
    } catch (err) {
      console.error("JOIN_FAILED", err);
    }
  };

  const leaveSwarm = () => {
    setIsJoined(false);
    setNodeInfo(null);
    localStorage.removeItem("MATRIX_NODE_INFO");
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    if (taskPollInterval.current) clearInterval(taskPollInterval.current);
  };

  const startNodeLoops = (id: string, token: string) => {
    // Heartbeat
    heartbeatInterval.current = setInterval(async () => {
      const newLoad = Math.floor(Math.random() * 30);
      const newTemp = 30 + Math.floor(Math.random() * 15);
      setLoad(newLoad);
      setTemp(newTemp);
      try {
        await fetch(`/api/v1/node/${id}/heartbeat`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-node-token": token
          },
          body: JSON.stringify({ load: newLoad, temperature: newTemp })
        });
      } catch (err) {
        console.error("HEARTBEAT_FAILED", err);
      }
    }, 5000);

    // Task Polling
    taskPollInterval.current = setInterval(async () => {
      if (status === "working") return;
      try {
        const res = await fetch(`/api/v1/node/${id}/task`, {
          headers: { "x-node-token": token }
        });
        const { task } = await res.json();
        if (task) {
          handleTask(task);
        }
      } catch (err) {
        console.error("TASK_POLL_FAILED", err);
      }
    }, 3000);
  };

  const handleTask = async (task: any) => {
    setStatus("working");
    setCurrentTask(task);
    
    // Simulate work
    setTimeout(async () => {
      try {
        const result = { 
          id: task.id, 
          type: task.type, 
          timestamp: new Date().toISOString(),
          status: "success" 
        };
        
        await fetch(`/api/v1/task/${task.id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result: "MOBILE_PROCESSED_OK", device: "SMARTPHONE_NODE" })
        });
        
        setRecentResults(prev => [result, ...prev].slice(0, 5));
        setStatus("idle");
        setCurrentTask(null);
      } catch (err) {
        setStatus("error");
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-gray-300 font-mono p-6 flex flex-col pb-24">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold text-cyan-400 tracking-tighter">SWARM_NODE_v1</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${matrixConnected ? "bg-green-400 shadow-[0_0_8px_#00ff00]" : "bg-red-400 animate-pulse"}`} />
          <span className="text-[10px] text-cyan-900 uppercase">Matrix_Bridge</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {!isJoined ? (
            <motion.div 
              key="join"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center space-y-8"
            >
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-cyan-400/20 blur-3xl rounded-full" />
                <Globe className="w-32 h-32 text-cyan-400 mx-auto relative" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">DECENTRALIZED_FREEDOM</h2>
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                  Join the MatrixSwarm network. Contribute your device's idle power to the global decentralized compute pool.
                </p>
              </div>
              <button 
                onClick={joinSwarm}
                disabled={isBenchmarking}
                className="w-full max-w-xs mx-auto bg-cyan-400 text-black font-bold py-4 rounded-sm hover:bg-cyan-300 disabled:bg-cyan-900 disabled:text-cyan-400 transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.3)] flex items-center justify-center gap-2"
              >
                {isBenchmarking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Benchmarking...
                  </>
                ) : (
                  "Connect_to_Swarm"
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#11111a] border border-cyan-900/30 p-6 rounded-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                  <Activity className={`w-4 h-4 ${status === "working" ? "text-yellow-400 animate-pulse" : "text-green-400"}`} />
                </div>
                <p className="text-[10px] text-gray-500 uppercase mb-1">Node_Identity</p>
                <h3 className="text-xl font-bold text-white mb-4">{nodeInfo?.nodeId}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-3 border border-cyan-900/10">
                    <p className="text-[8px] text-gray-600 uppercase mb-1">AI_Tier</p>
                    <p className="text-cyan-400 text-xs font-bold">{nodeInfo?.aiTier.toUpperCase()}</p>
                  </div>
                  <div className="bg-black/40 p-3 border border-cyan-900/10">
                    <p className="text-[8px] text-gray-600 uppercase mb-1">Status</p>
                    <p className="text-green-400 text-xs font-bold">ONLINE</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#11111a] border border-cyan-900/20 p-4 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    <span className="text-[10px] text-gray-500 uppercase">Load</span>
                  </div>
                  <p className="text-xl font-bold text-white">{load}%</p>
                  <div className="w-full h-1 bg-gray-900 mt-2">
                    <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${load}%` }} />
                  </div>
                </div>
                <div className="bg-[#11111a] border border-cyan-900/20 p-4 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] text-gray-500 uppercase">Temp</span>
                  </div>
                  <p className="text-xl font-bold text-white">{temp}°C</p>
                  <div className="w-full h-1 bg-gray-900 mt-2">
                    <div className="h-full bg-orange-400 transition-all duration-1000" style={{ width: `${(temp / 60) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="bg-[#11111a] border border-cyan-900/30 p-6 rounded-sm min-h-[160px] flex flex-col justify-center items-center text-center">
                {status === "working" ? (
                  <div className="space-y-4 w-full">
                    <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto" />
                    <div>
                      <p className="text-xs text-yellow-400 font-bold uppercase">Processing_Task</p>
                      <p className="text-[10px] text-gray-600 mt-1">{currentTask?.id}</p>
                    </div>
                    {currentTask?.payload && (
                      <div className="bg-black/60 border border-cyan-900/30 p-2 text-left">
                        <p className="text-[8px] text-cyan-900 uppercase mb-1">Payload_Data</p>
                        <pre className="text-[9px] text-cyan-400/60 font-mono truncate">
                          {JSON.stringify(currentTask.payload)}
                        </pre>
                      </div>
                    )}
                    <div className="text-[8px] text-cyan-900 uppercase animate-pulse">
                      Encrypting_via_Matrix_Protocol...
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ShieldCheck className="w-12 h-12 text-cyan-900 mx-auto" />
                    <p className="text-[10px] text-cyan-900 uppercase tracking-widest">Awaiting_Instructions</p>
                  </div>
                )}
              </div>

              {recentResults.length > 0 && (
                <div className="bg-[#11111a] border border-cyan-900/20 p-4 rounded-sm">
                  <p className="text-[8px] text-gray-600 uppercase mb-3 tracking-widest">Recent_Processed_Tasks</p>
                  <div className="space-y-2">
                    {recentResults.map(res => (
                      <div key={res.id} className="flex justify-between items-center text-[10px] border-b border-cyan-900/5 pb-2">
                        <span className="text-cyan-400 font-bold">{res.type}</span>
                        <span className="text-gray-600">{new Date(res.timestamp).toLocaleTimeString()}</span>
                        <span className="text-green-400">OK</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={leaveSwarm}
                className="w-full flex items-center justify-center gap-2 text-red-900 hover:text-red-400 transition-colors text-[10px] uppercase font-bold pt-4"
              >
                <LogOut className="w-3 h-3" />
                Disconnect_from_Swarm
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-12 pt-6 border-t border-cyan-900/10 text-center">
        <p className="text-[8px] text-cyan-900 uppercase tracking-[0.2em]">MatrixSwarm_Decentralized_Network_v0.1.1</p>
      </footer>
    </div>
  );
};
