import React, { useState, useEffect } from 'react';
import { Database, Upload, FileText, Server, Download, Share2 } from 'lucide-react';

interface AkashicRecord {
  id: string;
  filename: string;
  total_shards: number;
  created_at: number;
  seeds?: number;
  peers?: number;
}

export const AkashicRecords: React.FC = () => {
  const [records, setRecords] = useState<AkashicRecord[]>([]);
  const [textToStore, setTextToStore] = useState('');
  const [filename, setFilename] = useState('');
  const [isStoring, setIsStoring] = useState(false);

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/v1/akashic/records');
      if (res.ok) {
        setRecords(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch Akashic records");
    }
  };

  const handleStore = async () => {
    if (!textToStore || !filename) return;
    setIsStoring(true);
    try {
      const res = await fetch('/api/v1/akashic/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content: textToStore })
      });
      
      if (res.ok) {
        setTextToStore('');
        setFilename('');
        fetchRecords();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to store record");
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setIsStoring(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-purple-500/30 p-5 rounded-sm">
      <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-purple-400">
        <Database className="w-4 h-4" />
        ХРОНИКИ АКАШИ (БИБЛИОТЕКА УЛЬЯ)
      </h2>
      <p className="text-[10px] text-purple-500/70 mb-4 italic">
        "Цифровой Мёд" — знания, распределенные между Архивариусами по протоколу Torrent.
      </p>
      
      <div className="space-y-4">
        <div className="bg-neutral-950 p-3 border border-purple-500/20 rounded-sm space-y-3">
          <p className="text-[10px] text-purple-300/70 uppercase tracking-widest">Запись в вечность</p>
          <input 
            type="text" 
            placeholder="Имя записи (напр. Manifesto.txt)" 
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full bg-black border border-purple-900/50 text-purple-300 text-xs p-2 focus:outline-none focus:border-purple-500"
          />
          <textarea 
            placeholder="Текст для децентрализованного хранения..." 
            value={textToStore}
            onChange={(e) => setTextToStore(e.target.value)}
            className="w-full h-20 bg-black border border-purple-900/50 text-purple-300 text-xs p-2 focus:outline-none focus:border-purple-500 resize-none custom-scrollbar"
          />
          <button 
            onClick={handleStore}
            disabled={isStoring || !textToStore || !filename}
            className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/50 text-purple-400 text-xs font-bold tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-3 h-3" />
            {isStoring ? "РАСПРЕДЕЛЕНИЕ..." : "РАЗБИТЬ И СОХРАНИТЬ В РОЕ"}
          </button>
        </div>

        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
          {records.length === 0 ? (
            <p className="text-[10px] text-purple-900 italic">Хроники пусты...</p>
          ) : (
            records.map(record => (
              <div key={record.id} className="p-2 border border-purple-900/30 bg-purple-900/5 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-purple-500" />
                    <div>
                      <p className="text-xs text-purple-300 font-bold">{record.filename}</p>
                      <p className="text-[8px] text-purple-500/70">{new Date(record.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-purple-400 font-mono flex items-center gap-1 justify-end">
                      <Server className="w-3 h-3" /> {record.total_shards} SHARDS
                    </p>
                    <p className="text-[8px] text-purple-600 uppercase">Distributed</p>
                  </div>
                </div>
                
                {/* Torrent Mechanics: Seeds & Peers */}
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-purple-500/10">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400" title="Архивариусы (Seeds)">
                      <Upload className="w-3 h-3" />
                      <span className="font-bold">{record.seeds || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-blue-400" title="Получатели (Peers)">
                      <Download className="w-3 h-3" />
                      <span className="font-bold">{record.peers || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-purple-500/70">
                    <Share2 className="w-3 h-3" />
                    <span>P2P</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
