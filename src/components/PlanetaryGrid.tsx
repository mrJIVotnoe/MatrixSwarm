import React, { useEffect, useState } from 'react';
import { Globe, Hexagon, Radio, Activity } from 'lucide-react';
import { WasmPlanetaryShield } from '../core/wasm_bridge';

interface HexCell {
  cell_id: string;
  node_count: number;
  avg_trust: number;
  lat: number;
  lng: number;
}

export const PlanetaryGrid: React.FC = () => {
  const [cells, setCells] = useState<HexCell[]>([]);
  const [seismicAlarm, setSeismicAlarm] = useState<string | null>(null);

  useEffect(() => {
    const fetchCells = async () => {
      try {
        const res = await fetch('/api/v1/mesh/planetary');
        if (res.ok) setCells(await res.json());
      } catch (e) {}
    };
    fetchCells();
    const interval = setInterval(fetchCells, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
     // L3 - Planetary Proprioception (Accelerometer reading simulation)
     const i = setInterval(() => {
        if (Math.random() > 0.85) {
            // Simulate 15 devices in the same location reporting vibration
            const batch = Array.from({length: 15}).map((_, idx) => ({
                 node_id: `node_${idx}`,
                 accel_x: Math.random() * 2 + (Math.random() > 0.5 ? 1.5 : 0), // Occasional spikes
                 accel_y: Math.random() * 2 + (Math.random() > 0.5 ? 1.5 : 0),
                 accel_z: Math.random() * 2 + (Math.random() > 0.5 ? 1.5 : 0),
                 timestamp: Date.now()
            }));
            const res = WasmPlanetaryShield.analyzeSeismicActivity(JSON.stringify(batch), "8h9b");
            if (res.includes("NABAT")) {
                setSeismicAlarm(res);
                setTimeout(() => setSeismicAlarm(null), 5000);
            }
        }
     }, 3000);
     return () => clearInterval(i);
  }, []);

  return (
    <div className={`bg-slate-900 border p-5 rounded-sm transition-colors ${seismicAlarm ? 'border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'border-purple-500/30'}`}>
      <h2 className={`text-sm font-bold mb-4 flex items-center gap-2 uppercase ${seismicAlarm ? 'text-red-500' : 'text-purple-400'}`}>
        <Globe className="w-4 h-4" />
        Планетарная Сетка (Обратный StarLink)
      </h2>
      
      {seismicAlarm && (
         <div className="p-3 mb-4 bg-red-950/80 border border-red-500 font-mono text-xs text-red-400 animate-pulse flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-500 shrink-0" />
            <div className="flex flex-col gap-1">
               <span className="font-bold text-[10px]">SEISMIC ANOMALY DETECTED</span>
               <span className="break-words">{seismicAlarm}</span>
            </div>
         </div>
      )}
      
      <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
        {cells.length === 0 ? (
          <p className="text-[10px] text-purple-900 italic">Сбор геоданных...</p>
        ) : (
          cells.map(cell => (
            <div key={cell.cell_id} className="p-3 border border-purple-500/20 bg-purple-950/20 rounded-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-300 font-mono font-bold flex items-center gap-1">
                  <Hexagon className="w-3 h-3" /> {cell.cell_id}
                </span>
                <span className="text-[10px] text-purple-400/70 flex items-center gap-1">
                  <Radio className="w-3 h-3" /> {cell.node_count} узлов
                </span>
              </div>
              <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                <span>LAT: {cell.lat.toFixed(4)}</span>
                <span>LNG: {cell.lng.toFixed(4)}</span>
              </div>
              <div className="w-full bg-black h-1 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full" style={{ width: `${Math.min(100, cell.avg_trust)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
