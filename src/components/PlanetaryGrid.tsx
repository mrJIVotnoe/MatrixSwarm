import React, { useEffect, useState } from 'react';
import { Globe, Hexagon, Radio } from 'lucide-react';

interface HexCell {
  cell_id: string;
  node_count: number;
  avg_trust: number;
  lat: number;
  lng: number;
}

export const PlanetaryGrid: React.FC = () => {
  const [cells, setCells] = useState<HexCell[]>([]);

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

  return (
    <div className="bg-neutral-900 border border-purple-500/30 p-5 rounded-sm">
      <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-purple-400 uppercase">
        <Globe className="w-4 h-4" />
        Планетарная Сетка (Обратный StarLink)
      </h2>
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
