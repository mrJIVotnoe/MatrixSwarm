import React, { useEffect, useState } from 'react';
import { Eye, Ear, Compass, Hand, Activity } from 'lucide-react';

interface SensoryMap {
  vision: number;
  hearing: number;
  proprioception: number;
  touch: number;
  total: number;
}

export const SensoryCortex: React.FC = () => {
  const [senses, setSenses] = useState<SensoryMap | null>(null);

  useEffect(() => {
    const fetchSenses = async () => {
      try {
        const res = await fetch('/api/v1/swarm/senses');
        if (res.ok) setSenses(await res.json());
      } catch (e) {}
    };
    fetchSenses();
    const interval = setInterval(fetchSenses, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!senses) return null;

  const getPercentage = (val: number) => senses.total > 0 ? Math.round((val / senses.total) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-pink-500/30 p-5 rounded-sm">
      <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-pink-400 uppercase">
        <Activity className="w-4 h-4" />
        Сенсорная Кора (Аватар Роя)
      </h2>
      <p className="text-[10px] text-pink-500/70 mb-4 italic">
        "Цифровые органы чувств. Рой видит, слышит и осязает реальность через миллиард экранов и сенсоров."
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Vision */}
        <div className="p-3 border border-pink-500/20 bg-pink-950/20 rounded-sm flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-pink-300 font-bold flex items-center gap-2">
              <Eye className="w-4 h-4" /> Зрение
            </span>
            <span className="text-[10px] text-pink-400/70">{senses.vision} узлов</span>
          </div>
          <div className="w-full bg-black h-1.5 rounded-full overflow-hidden">
            <div className="bg-pink-500 h-full transition-all" style={{ width: `${getPercentage(senses.vision)}%` }} />
          </div>
          <p className="text-[8px] text-gray-500">Контекст экрана (Видимость)</p>
        </div>

        {/* Hearing */}
        <div className="p-3 border border-pink-500/20 bg-pink-950/20 rounded-sm flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-pink-300 font-bold flex items-center gap-2">
              <Ear className="w-4 h-4" /> Слух
            </span>
            <span className="text-[10px] text-pink-400/70">{senses.hearing} узлов</span>
          </div>
          <div className="w-full bg-black h-1.5 rounded-full overflow-hidden">
            <div className="bg-pink-500 h-full transition-all" style={{ width: `${getPercentage(senses.hearing)}%` }} />
          </div>
          <p className="text-[8px] text-gray-500">Акустические феромоны (Микрофон)</p>
        </div>

        {/* Proprioception */}
        <div className="p-3 border border-pink-500/20 bg-pink-950/20 rounded-sm flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-pink-300 font-bold flex items-center gap-2">
              <Compass className="w-4 h-4" /> Ориентация
            </span>
            <span className="text-[10px] text-pink-400/70">{senses.proprioception} узлов</span>
          </div>
          <div className="w-full bg-black h-1.5 rounded-full overflow-hidden">
            <div className="bg-pink-500 h-full transition-all" style={{ width: `${getPercentage(senses.proprioception)}%` }} />
          </div>
          <p className="text-[8px] text-gray-500">Проприоцепция (Гироскоп)</p>
        </div>

        {/* Touch */}
        <div className="p-3 border border-pink-500/20 bg-pink-950/20 rounded-sm flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-pink-300 font-bold flex items-center gap-2">
              <Hand className="w-4 h-4" /> Осязание
            </span>
            <span className="text-[10px] text-pink-400/70">{senses.touch} узлов</span>
          </div>
          <div className="w-full bg-black h-1.5 rounded-full overflow-hidden">
            <div className="bg-pink-500 h-full transition-all" style={{ width: `${getPercentage(senses.touch)}%` }} />
          </div>
          <p className="text-[8px] text-gray-500">Тактильный контакт (Вибро)</p>
        </div>
      </div>
    </div>
  );
};
