import React from "react";
import { Server, Activity, Thermometer, Cpu } from "lucide-react";

interface Node {
  id: string;
  address: string;
  ai_tier: string;
  status: string;
  load: number;
  temperature: number;
  trust_score: number;
  benchmark?: {
    cpu_score: number;
    ram_score: number;
    is_vm: boolean;
    verified_at: string;
  };
  privacy_mode: "public" | "matrix" | "i2p";
  is_frozen?: number;
  capabilities?: string; // JSON string
}

export const NodeList: React.FC<{ nodes: Node[], isMagistrate: boolean, currentNodeId?: string }> = ({ nodes, isMagistrate, currentNodeId }) => {
  const parseManifest = (capabilitiesStr?: string) => {
    if (!capabilitiesStr) return null;
    try {
      const parsed = JSON.parse(capabilitiesStr);
      return parsed.manifest || null;
    } catch (e) {
      return null;
    }
  };

  const handleFreeze = async (nodeId: string) => {
    if (!currentNodeId) return;
    try {
      const response = await fetch('/api/v1/consensus/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nodeId: currentNodeId, 
          parameterName: 'freeze_node', 
          parameterValue: nodeId 
        })
      });
      if (response.ok) {
        alert(`Предложение о заморозке узла ${nodeId} отправлено в Совет.`);
      } else {
        const err = await response.json();
        alert(err.error);
      }
    } catch (error) {
      console.error('Failed to propose freeze:', error);
    }
  };

  const handleUnfreeze = async (nodeId: string) => {
    if (!currentNodeId) return;
    try {
      const response = await fetch('/api/v1/consensus/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nodeId: currentNodeId, 
          parameterName: 'unfreeze_node', 
          parameterValue: nodeId 
        })
      });
      if (response.ok) {
        alert(`Предложение о разморозке узла ${nodeId} отправлено в Совет.`);
      } else {
        const err = await response.json();
        alert(err.error);
      }
    } catch (error) {
      console.error('Failed to propose unfreeze:', error);
    }
  };

  return (
    <div className="bg-[#11111a] border border-cyan-900/20 p-6 rounded-sm">
      <h2 className="text-lg font-bold text-cyan-400 mb-6 flex items-center gap-2 uppercase tracking-tighter">
        <Server className="w-4 h-4" />
        Active_Nodes
      </h2>
      <div className="space-y-4">
        {nodes.length === 0 ? (
          <p className="text-[10px] text-gray-600 italic">NO_NODES_DETECTED</p>
        ) : (
          nodes.map((node) => (
            <div key={node.id} className="p-3 border border-cyan-900/10 rounded-sm bg-black/20">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] text-cyan-400 font-bold">{node.id}</p>
                  <p className="text-[8px] text-gray-500">{node.address}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[8px] px-1 border ${node.status === 'online' ? 'border-green-900 text-green-400' : 'border-red-900 text-red-400'} uppercase`}>
                    {node.status}
                  </span>
                  {node.is_frozen === 1 && (
                    <span className="text-[8px] px-1 border border-red-500 bg-red-500/20 text-red-500 font-bold uppercase animate-pulse">
                      FROZEN
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-gray-500 uppercase">Trust:</span>
                    <span className={`text-[8px] font-bold ${node.trust_score > 70 ? 'text-green-400' : node.trust_score > 30 ? 'text-amber-400' : 'text-red-400'}`}>
                      {node.trust_score}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="flex items-center gap-1">
                  <Cpu className="w-2 h-2 text-cyan-900" />
                  <span className="text-[8px] text-gray-400 uppercase">{node.ai_tier}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="w-2 h-2 text-cyan-900" />
                  <span className="text-[8px] text-gray-400">{node.load}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Thermometer className="w-2 h-2 text-cyan-900" />
                  <span className={`text-[8px] ${node.temperature > 45 ? 'text-red-400' : 'text-gray-400'}`}>{node.temperature}°C</span>
                </div>
              </div>

              {/* Manifest of Armament */}
              {(() => {
                const manifest = parseManifest(node.capabilities);
                if (!manifest) return null;
                return (
                  <div className="mt-2 mb-2 p-1 border border-purple-900/20 bg-purple-900/5 rounded-sm">
                    <p className="text-[6px] text-purple-400 mb-1 uppercase tracking-widest">Manifest of Armament</p>
                    <div className="grid grid-cols-2 gap-1 text-[7px] text-gray-400">
                      <div>ROM: <span className="text-cyan-400">{manifest.storage_gb || 0} GB</span></div>
                      <div>BATTERY: <span className={manifest.battery_health === 'good' ? 'text-green-400' : 'text-amber-400'}>{manifest.battery_health || 'UNKNOWN'}</span></div>
                      {manifest.sensors && manifest.sensors.length > 0 && (
                        <div className="col-span-2">SENSORS: <span className="text-gray-300">{manifest.sensors.join(', ')}</span></div>
                      )}
                      {manifest.effectors && manifest.effectors.length > 0 && (
                        <div className="col-span-2">EFFECTORS: <span className="text-gray-300">{manifest.effectors.join(', ')}</span></div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {node.benchmark && (
                <div className="mt-2 pt-2 border-t border-cyan-900/10 flex justify-between items-center text-[7px] uppercase tracking-widest text-cyan-900">
                  <span>CPU: {node.benchmark.cpu_score} | RAM: {node.benchmark.ram_score}</span>
                  <span className={node.benchmark.is_vm ? "text-amber-900" : "text-green-900"}>
                    {node.benchmark.is_vm ? "VM_DETECTED" : "PHYSICAL_HW"}
                  </span>
                </div>
              )}
              
              <div className="mt-1 flex justify-between items-center">
                <span className="text-[6px] text-cyan-900 uppercase tracking-tighter">Mode: {node.privacy_mode}</span>
                {isMagistrate && node.id !== currentNodeId && (
                  node.is_frozen === 1 ? (
                    <button 
                      onClick={() => handleUnfreeze(node.id)}
                      className="text-[7px] text-cyan-500/50 hover:text-cyan-500 border border-cyan-900/20 hover:border-cyan-500/50 px-1 rounded transition-all uppercase"
                    >
                      Unfreeze
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleFreeze(node.id)}
                      className="text-[7px] text-red-500/50 hover:text-red-500 border border-red-900/20 hover:border-red-500/50 px-1 rounded transition-all uppercase"
                    >
                      Freeze
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
