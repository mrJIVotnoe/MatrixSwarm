import React from "react";
import { Server, Activity, Thermometer, Cpu } from "lucide-react";

interface Node {
  id: string;
  address: string;
  ai_tier: string;
  status: string;
  load: number;
  temperature: number;
}

export const NodeList: React.FC<{ nodes: Node[] }> = ({ nodes }) => {
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
                <span className={`text-[8px] px-1 border ${node.status === 'online' ? 'border-green-900 text-green-400' : 'border-red-900 text-red-400'} uppercase`}>
                  {node.status}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};
