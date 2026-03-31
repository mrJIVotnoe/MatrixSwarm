import React, { useEffect, useState } from "react";
import { fetchSwarmStatus, SwarmStatus, fetchRecentTasks, fetchNodes } from "../services/swarmService";
import { Activity, Cpu, Database, AlertTriangle, CheckCircle, XCircle, Zap, Thermometer, Shield, Globe, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { TaskForm } from "./TaskForm";
import { TaskHistory } from "./TaskHistory";
import { NodeList } from "./NodeList";
import { User } from "../firebase";

export const SwarmMonitor: React.FC<{ user: User | null }> = ({ user }) => {
  const [status, setStatus] = useState<SwarmStatus | null>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [matrixStatus, setMatrixStatus] = useState<"connected" | "syncing" | "offline">("syncing");
  const [token, setToken] = useState<string | undefined>();

  useEffect(() => {
    if (user) {
      user.getIdToken().then(setToken);
    } else {
      setToken(undefined);
    }
  }, [user]);

  const updateStatus = async () => {
    try {
      const [statusData, tasksData, nodesData] = await Promise.all([
        fetchSwarmStatus(),
        fetchRecentTasks(),
        fetchNodes()
      ]);
      setStatus(statusData);
      setRecentTasks(tasksData);
      setNodes(nodesData);
      setLastUpdated(new Date());
      setError(null);
      setMatrixStatus("connected");
    } catch (err) {
      setError("Failed to connect to swarm");
      setMatrixStatus("offline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateStatus();
    
    // Setup WebSocket for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "SWARM_STATUS") {
          setStatus(message.data);
          setLastUpdated(new Date());
          setError(null);
          // Also refresh tasks and nodes when status changes
          fetchRecentTasks().then(setRecentTasks).catch(console.error);
          fetchNodes().then(setNodes).catch(console.error);
        }
      } catch (err) {
        console.error("WS_PARSE_ERROR", err);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection failed. Falling back to polling.");
    };

    // Fallback polling every 30 seconds if WS fails or for safety
    const interval = setInterval(updateStatus, 30000);
    
    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  if (loading && !status) return <div className="p-8 font-mono text-cyan-400 animate-pulse">CONNECTING TO SWARM...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-300 font-mono p-4 md:p-8 pb-24">
      <header className="mb-12 border-b border-cyan-900/30 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-bold text-cyan-400 tracking-tighter flex items-center gap-3">
            <Activity className="w-10 h-10" />
            MATRIX_SWARM_v0.1.1
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-cyan-900 text-sm uppercase tracking-widest">DECENTRALIZED_NODE_ORCHESTRATOR</p>
            <div className="flex items-center gap-2 px-2 py-1 bg-cyan-900/10 border border-cyan-900/30 rounded-sm">
              <div className={`w-1.5 h-1.5 rounded-full ${matrixStatus === "connected" ? "bg-green-400" : "bg-red-400 animate-pulse"}`} />
              <span className="text-[8px] text-cyan-400 uppercase">Matrix_Protocol_Active</span>
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <button 
            onClick={updateStatus}
            className="text-[10px] bg-cyan-900/20 border border-cyan-900/50 px-2 py-1 hover:bg-cyan-400/20 hover:text-cyan-400 transition-all uppercase"
          >
            Manual_Refresh
          </button>
          <div>
            <p className="text-xs text-cyan-900 uppercase">Last Sync</p>
            <p className="text-cyan-400">{lastUpdated.toLocaleTimeString()}</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 p-4 mb-8 text-red-400 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
          label="TOTAL_NODES" 
          value={status?.totalNodes || 0} 
          icon={<Cpu className="w-5 h-5" />} 
          subValue={`${status?.onlineNodes || 0} ONLINE`}
          color="cyan"
        />
        <StatCard 
          label="PENDING_TASKS" 
          value={status?.pendingTasks || 0} 
          icon={<Database className="w-5 h-5" />} 
          subValue={`${status?.runningTasks || 0} RUNNING`}
          color="yellow"
        />
        <StatCard 
          label="COMPLETED" 
          value={status?.completedTasks || 0} 
          icon={<CheckCircle className="w-5 h-5" />} 
          subValue="SUCCESSFUL_OPS"
          color="green"
        />
        <StatCard 
          label="FAILED_OPS" 
          value={status?.failedTasks || 0} 
          icon={<XCircle className="w-5 h-5" />} 
          subValue="RETRY_QUEUED"
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#11111a] border border-cyan-900/20 p-6 rounded-sm">
              <h2 className="text-lg font-bold text-cyan-400 mb-6 flex items-center gap-2 uppercase tracking-tighter">
                <Zap className="w-4 h-4" />
                AI_TIER_DISTRIBUTION
              </h2>
              <div className="space-y-6">
                <TierBar label="LLM_7B+" count={status?.nodesByAiTier.llm || 0} total={status?.totalNodes || 1} color="#ffd700" />
                <TierBar label="SLM_3B" count={status?.nodesByAiTier["slm_3b"] || 0} total={status?.totalNodes || 1} color="#00ff88" />
                <TierBar label="SLM_1.5B" count={status?.nodesByAiTier["slm_1.5b"] || 0} total={status?.totalNodes || 1} color="#00d4ff" />
                <TierBar label="GENERIC" count={status?.nodesByAiTier.none || 0} total={status?.totalNodes || 1} color="#666" />
              </div>
            </div>

            <div className="bg-[#11111a] border border-cyan-900/20 p-6 rounded-sm">
              <h2 className="text-lg font-bold text-cyan-400 mb-6 flex items-center gap-2 uppercase tracking-tighter">
                <Shield className="w-4 h-4" />
                MATRIX_NETWORK_STATUS
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500 uppercase">Encryption</span>
                  <span className="text-green-400 font-bold">E2EE_ACTIVE</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500 uppercase">Protocol</span>
                  <span className="text-cyan-400">MATRIX_v1.9</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500 uppercase">Decentralization</span>
                  <span className="text-cyan-400">100%_P2P</span>
                </div>
                <div className="mt-6 p-3 bg-cyan-900/5 border border-cyan-900/20 rounded-sm">
                  <div className="flex items-center gap-2 text-[8px] text-cyan-400 mb-2">
                    <Globe className="w-3 h-3" />
                    ACTIVE_RELAYS
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-1 flex-1 bg-cyan-400/20 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                          className="h-full bg-cyan-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <TaskForm onTaskCreated={updateStatus} authToken={token} />
          <TaskHistory tasks={recentTasks} />
        </div>

        <div className="space-y-8">
          <div className="bg-[#11111a] border border-cyan-900/20 p-6 rounded-sm">
            <h2 className="text-lg font-bold text-cyan-400 mb-6 flex items-center gap-2 uppercase tracking-tighter">
              <Thermometer className="w-4 h-4" />
              SWARM_HEALTH
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-cyan-900/10 pb-2">
                <span className="text-xs text-gray-500 uppercase">Overheated Nodes</span>
                <span className={status?.overheatedNodes ? "text-red-400" : "text-green-400"}>{status?.overheatedNodes || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-cyan-900/10 pb-2">
                <span className="text-xs text-gray-500 uppercase">Avg Temperature</span>
                <span className="text-cyan-400">32.4°C</span>
              </div>
              <div className="flex justify-between items-center border-b border-cyan-900/10 pb-2">
                <span className="text-xs text-gray-500 uppercase">Throughput</span>
                <span className="text-cyan-400">12.8 OPS/S</span>
              </div>
            </div>
            <div className="mt-8 p-4 bg-cyan-900/5 border border-cyan-900/20 text-[10px] leading-relaxed text-cyan-900">
              SYSTEM_ADVISORY: ENSURE_COOLING_FOR_AI_NODES. TEMPERATURES_ABOVE_45C_WILL_TRIGGER_THROTTLING.
            </div>
          </div>

          <NodeList nodes={nodes} />
        </div>
      </div>
    </div>
  );
};


const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; subValue: string; color: string }> = ({ label, value, icon, subValue, color }) => {
  const colorClasses: Record<string, string> = {
    cyan: "text-cyan-400 border-cyan-900/20",
    yellow: "text-yellow-400 border-yellow-900/20",
    green: "text-green-400 border-green-900/20",
    red: "text-red-400 border-red-900/20",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#11111a] border p-6 rounded-sm ${colorClasses[color]}`}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] uppercase tracking-widest opacity-50">{label}</span>
        {icon}
      </div>
      <div className="text-4xl font-bold mb-2 tracking-tighter">{value}</div>
      <div className="text-[10px] opacity-70">{subValue}</div>
    </motion.div>
  );
};

const TierBar: React.FC<{ label: string; count: number; total: number; color: string }> = ({ label, count, total, color }) => {
  const percentage = (count / (total || 1)) * 100;
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-2 uppercase tracking-widest">
        <span>{label}</span>
        <span>{count} NODES</span>
      </div>
      <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};
