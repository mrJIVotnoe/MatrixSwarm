import React, { useState, useEffect } from 'react';
import { Download, Upload, Play, Pause, Trash2, Link, File, HardDrive, Activity, Plus } from 'lucide-react';

interface Torrent {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: 'downloading' | 'seeding' | 'paused';
  downloadSpeed: string;
  uploadSpeed: string;
  eta: string;
  peers: number;
  seeds: number;
}

const MOCK_TORRENTS: Torrent[] = [
  {
    id: 't1',
    name: 'Matrix_Swarm_Node_v2.4.1_Linux-x64.iso',
    size: '1.2 GB',
    progress: 78.5,
    status: 'downloading',
    downloadSpeed: '2.4 MB/s',
    uploadSpeed: '120 KB/s',
    eta: '5m 12s',
    peers: 45,
    seeds: 128
  },
  {
    id: 't2',
    name: 'OpSec_Manual_Collection.zip',
    size: '850 MB',
    progress: 100,
    status: 'seeding',
    downloadSpeed: '0 B/s',
    uploadSpeed: '1.2 MB/s',
    eta: '∞',
    peers: 12,
    seeds: 0
  },
  {
    id: 't3',
    name: 'wiki_ru_all_mini_2023-11.zim',
    size: '4.5 GB',
    progress: 12.3,
    status: 'paused',
    downloadSpeed: '0 B/s',
    uploadSpeed: '0 B/s',
    eta: '-',
    peers: 0,
    seeds: 0
  }
];

export function TorrentManager({ symbiote }: { symbiote: any }) {
  const [torrents, setTorrents] = useState<Torrent[]>(MOCK_TORRENTS);
  const [magnetLink, setMagnetLink] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setTorrents(current => current.map(t => {
        if (t.status === 'downloading') {
          const newProgress = Math.min(100, t.progress + (Math.random() * 0.5));
          const isDone = newProgress >= 100;
          return {
            ...t,
            progress: newProgress,
            status: isDone ? 'seeding' : 'downloading',
            downloadSpeed: isDone ? '0 B/s' : `${(1 + Math.random() * 3).toFixed(1)} MB/s`,
            uploadSpeed: `${(0.1 + Math.random() * 2).toFixed(1)} MB/s`,
            eta: isDone ? '∞' : `${Math.floor(Math.random() * 10)}m ${Math.floor(Math.random() * 60)}s`
          };
        } else if (t.status === 'seeding') {
           return {
            ...t,
            uploadSpeed: `${(0.5 + Math.random() * 2).toFixed(1)} MB/s`
          };
        }
        return t;
      }));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const handleAddTorrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!magnetLink.trim()) return;
    
    const newTorrent: Torrent = {
      id: `t${Date.now()}`,
      name: `Torrent_${magnetLink.substring(0, 12)}...`,
      size: `${(Math.random() * 10).toFixed(1)} GB`,
      progress: 0,
      status: 'downloading',
      downloadSpeed: '0 B/s',
      uploadSpeed: '0 B/s',
      eta: 'Calculating...',
      peers: 0,
      seeds: Math.floor(Math.random() * 50) + 5
    };
    
    setTorrents([...torrents, newTorrent]);
    setMagnetLink('');
    setShowAddModal(false);
  };

  const toggleStatus = (id: string) => {
    setTorrents(current => current.map(t => {
      if (t.id === id) {
        if (t.status === 'paused') {
          return { ...t, status: t.progress >= 100 ? 'seeding' : 'downloading' };
        } else {
          return { ...t, status: 'paused', downloadSpeed: '0 B/s', uploadSpeed: '0 B/s', eta: '-' };
        }
      }
      return t;
    }));
  };

  const removeTorrent = (id: string) => {
    setTorrents(current => current.filter(t => t.id !== id));
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex border-b border-cyan-500/30 pb-4 justify-between items-center px-2">
        <div className="flex items-center gap-3">
          <Download className="w-6 h-6 text-green-500" />
          <div>
            <h2 className="text-xl font-bold text-green-500 tracking-wider">uTORRENT P2P CLIENT</h2>
            <p className="text-xs text-green-600">ОБМЕН ФАЙЛАМИ В СЕТИ РОЯ</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/30 transition-colors text-xs font-bold shrink-0"
        >
          <Plus className="w-4 h-4" /> ДОБАВИТЬ MAGNET
        </button>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar relative border border-green-500/20 bg-slate-900/40">
        <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
          <thead className="bg-slate-950/80 text-green-600 border-b border-green-500/20 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-medium">НАЗВАНИЕ</th>
              <th className="px-4 py-3 font-medium text-right">РАЗМЕР</th>
              <th className="px-4 py-3 font-medium text-right">СТАТУС</th>
              <th className="px-4 py-3 font-medium text-right">ДОНЛОАД</th>
              <th className="px-4 py-3 font-medium text-right">АПЛОАД</th>
              <th className="px-4 py-3 font-medium text-right">ETA</th>
              <th className="px-4 py-3 font-medium text-center">УПРАВЛЕНИЕ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-green-500/10">
            {torrents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-green-500/50">
                  НЕТ АКТИВНЫХ ЗАГРУЗОК
                </td>
              </tr>
            ) : (
              torrents.map(t => (
                <tr key={t.id} className="hover:bg-green-500/5 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {t.status === 'seeding' ? <Upload className="w-4 h-4 text-emerald-400" /> : <File className="w-4 h-4 text-green-400" />}
                      <span className="text-green-300 font-medium truncate max-w-[200px] md:max-w-[300px]" title={t.name}>
                        {t.name}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 mt-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${t.status === 'seeding' ? 'bg-emerald-500' : (t.status === 'paused' ? 'bg-slate-500' : 'bg-green-500')}`} 
                        style={{ width: `${t.progress}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-green-500/80 font-mono text-xs">{t.size}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-mono px-2 py-1 rounded-sm border ${
                      t.status === 'downloading' ? 'border-green-500/30 text-green-400' : 
                      (t.status === 'seeding' ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-500/30 text-slate-400')
                    }`}>
                      {t.progress.toFixed(1)}% {t.status === 'paused' && '(ПАУЗА)'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-green-400 font-mono text-xs">{t.downloadSpeed}</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-mono text-xs">{t.uploadSpeed}</td>
                  <td className="px-4 py-3 text-right text-green-500/80 font-mono text-xs">{t.eta}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleStatus(t.id)} className="p-1 hover:text-green-300 transition-colors">
                        {t.status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </button>
                      <button onClick={() => removeTorrent(t.id)} className="p-1 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-between items-center text-xs text-green-600 px-2 font-mono border-t border-green-500/20 pt-2 shrink-0">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><Download className="w-3 h-3 text-green-400" /> D: 2.4 MB/s</span>
          <span className="flex items-center gap-1"><Upload className="w-3 h-3 text-emerald-400" /> U: 1.3 MB/s</span>
        </div>
        <div>
          DHT Network: {torrents.reduce((acc, t) => acc + t.seeds + t.peers, 0)} Nodes
        </div>
      </div>

      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <form onSubmit={handleAddTorrent} className="bg-slate-900 border border-green-500/40 p-6 max-w-lg w-full flex flex-col gap-4 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
            <h3 className="text-green-400 font-bold text-lg flex items-center gap-2">
              <Link className="w-5 h-5" /> ДОБАВИТЬ MAGNET ССЫЛКУ
            </h3>
            <p className="text-xs text-green-600">Вставьте magnet:?xt=urn:btih:... ссылку для загрузки файла из P2P сети.</p>
            
            <input
              type="text"
              value={magnetLink}
              onChange={e => setMagnetLink(e.target.value)}
              placeholder="magnet:?xt=urn:btih:..."
              className="w-full bg-slate-950 border border-green-500/30 p-3 text-green-400 focus:outline-none focus:border-green-500 font-mono text-sm"
              autoFocus
            />
            
            <div className="flex gap-3 justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-green-500/30 text-green-500 hover:bg-green-500/10 text-xs font-bold"
              >
                ОТМЕНА
              </button>
              <button
                type="submit"
                disabled={!magnetLink.trim()}
                className="px-4 py-2 bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/30 disabled:opacity-50 text-xs font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> ЗАГРУЗИТЬ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
