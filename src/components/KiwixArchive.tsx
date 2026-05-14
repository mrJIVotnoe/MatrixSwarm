import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Download, Search, HardDrive, Database, WifiOff, FileText, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

// ... other constants ...
const ZIM_LIBRARIES = [
  { id: 'wiki_ru_all_maxi', name: 'Wikipedia (RU) - Maxi', size: '38.2 GB', seeds: 142, status: 'available', progress: 0 },
  { id: 'wiki_en_all_nopic', name: 'Wikipedia (EN) - No Pics', size: '45.1 GB', seeds: 890, status: 'available', progress: 0 },
  { id: 'math_stackexchange', name: 'Mathematics StackExchange', size: '4.2 GB', seeds: 56, status: 'available', progress: 0 },
  { id: 'med_board_survival', name: 'Field Medicine & Survival', size: '1.8 GB', seeds: 312, status: 'available', progress: 0 },
  { id: 'ifitxer_sec_audit', name: 'SecTools & OpSec Manuals', size: '0.8 GB', seeds: 1045, status: 'downloaded', progress: 100 } // Pre-downloaded for demo
];

const MOCK_ARTICLES = [
  { title: 'Public-key cryptography', abstract: 'A cryptographic system that uses pairs of keys: public keys and private keys...' },
  { title: 'Mesh networking', abstract: 'A local network topology in which the infrastructure nodes connect directly, dynamically and non-hierarchically...' },
  { title: 'Deep packet inspection', abstract: 'A form of computer network packet filtering that examines the data part of a packet as it passes an inspection point...' }
];

export function KiwixArchive({ symbiote }: { symbiote: any }) {
  const [libraries, setLibraries] = useState(ZIM_LIBRARIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'manager' | 'reader'>('manager');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [sandboxLog, setSandboxLog] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker for Sandboxing archive reads (L4/L5 Isolation)
    workerRef.current = new Worker(new URL('../workers/sandboxWorker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
       if (e.data.type === 'ZIM_QUERY_RESULT') {
          setSandboxLog(e.data.result);
          // Set real results (simulated mapping)
          setSearchResults(MOCK_ARTICLES.filter(a => 
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            a.abstract.toLowerCase().includes(searchQuery.toLowerCase())
          ));
          setIsSearching(false);
       }
    };
    
    return () => workerRef.current?.terminate();
  }, [searchQuery]);

  const startDownload = (id: string) => {
    setLibraries(libs => libs.map(lib => 
      lib.id === id ? { ...lib, status: 'downloading', progress: 0 } : lib
    ));
  };

  useEffect(() => {
    const iv = setInterval(() => {
      setLibraries(libs => libs.map(lib => {
        if (lib.status === 'downloading') {
          const newProgress = lib.progress + (Math.random() * 5);
          if (newProgress >= 100) {
            return { ...lib, status: 'downloaded', progress: 100 };
          }
          return { ...lib, progress: newProgress };
        }
        return lib;
      }));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setViewMode('reader');
    setSelectedArticle(null);
    setSandboxLog(null);
    
    // Dispatch query to isolated Web Worker
    if (workerRef.current) {
        workerRef.current.postMessage({
           type: 'EXECUTE_ZIM_QUERY',
           payload: { query: searchQuery },
           jobId: Date.now()
        });
    } else {
        setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex border-b border-cyan-500/30 pb-4 justify-between items-center px-2">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-emerald-500" />
          <div>
            <h2 className="text-xl font-bold text-emerald-500 tracking-wider">KIWIX OFFLINE ARCHIVE</h2>
            <p className="text-xs text-emerald-600">ОФФЛАЙН БАЗА ЗНАНИЙ УЗЛА (ZIM)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('manager')}
            className={`px-3 py-1 text-xs font-bold border ${viewMode === 'manager' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-emerald-500/30 text-emerald-600 hover:text-emerald-400'}`}
          >
            МЕНЕДЖЕР АРХИВОВ
          </button>
          <button 
            onClick={() => setViewMode('reader')}
            className={`px-3 py-1 text-xs font-bold border ${viewMode === 'reader' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-emerald-500/30 text-emerald-600 hover:text-emerald-400'}`}
          >
            ПОИСКОВИК (READER)
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col pt-2">
        {viewMode === 'manager' && (
          <div className="h-full flex flex-col space-y-4">
             <div className="bg-emerald-950/30 border border-emerald-500/20 p-4 shrink-0">
                <div className="flex items-center gap-4 text-emerald-400 mb-2">
                  <Database className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold">РАСПРЕДЕЛЕННОЕ ХРАНИЛИЩЕ</p>
                    <p className="text-xs text-emerald-600">Загрузка ZIM-архивов происходит через P2P-сеть Роя. После загрузки интернет не требуется.</p>
                  </div>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
               {libraries.map(lib => (
                 <div key={lib.id} className="bg-slate-900/40 border border-emerald-500/20 p-4 flex items-center justify-between">
                   <div className="flex-1">
                     <h3 className="text-sm font-bold text-emerald-400">{lib.name}</h3>
                     <div className="flex items-center gap-4 text-xs text-emerald-600 mt-1">
                       <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {lib.size}</span>
                       <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {lib.seeds} Seeds</span>
                     </div>
                   </div>
                   
                   <div className="w-1/3 flex items-center justify-end">
                     {lib.status === 'available' && (
                       <button 
                         onClick={() => startDownload(lib.id)}
                         className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors"
                       >
                         <Download className="w-4 h-4" /> ЗАГРУЗИТЬ
                       </button>
                     )}
                     
                     {lib.status === 'downloading' && (
                       <div className="w-full max-w-[150px]">
                         <div className="flex justify-between text-[10px] text-emerald-400 mb-1">
                           <span>ЗАГРУЗКА ИЗ РОЯ</span>
                           <span>{Math.floor(lib.progress)}%</span>
                         </div>
                         <div className="h-1 bg-emerald-950 overflow-hidden">
                           <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${lib.progress}%` }}></div>
                         </div>
                       </div>
                     )}
                     
                     {lib.status === 'downloaded' && (
                       <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                         <CheckCircle2 className="w-4 h-4" /> ЛОКАЛЬНО
                       </div>
                     )}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {viewMode === 'reader' && (
           <div className="h-full flex flex-col">
              <form onSubmit={handleSearch} className="flex gap-2 mb-4 shrink-0">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-emerald-500/50" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ПОИСК ПО ОФФЛАЙН АРХИВАМ..."
                    className="w-full bg-emerald-950/20 border border-emerald-500/30 p-2 pl-10 text-emerald-400 focus:outline-none focus:border-emerald-500 focus:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all text-sm font-mono"
                  />
                </div>
                <button type="submit" className="px-6 bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-bold text-xs hover:bg-emerald-500/30">
                  ИСКАТЬ
                </button>
              </form>

              <div className="flex-1 overflow-hidden flex bg-slate-900/20 border border-emerald-500/20">
                <div className="w-1/3 border-r border-emerald-500/20 overflow-y-auto custom-scrollbar p-2 space-y-2">
                  <div className="text-[10px] text-emerald-600 mb-2 pl-2">
                    {isSearching ? 'ПОИСК В ZIM В ПЕСОЧНИЦЕ...' : (searchResults.length > 0 ? `НАЙДЕНО: ${searchResults.length}` : 'НЕТ РЕЗУЛЬТАТОВ')}
                  </div>
                  
                  {sandboxLog && (
                    <div className="mx-2 mb-2 p-2 bg-emerald-950/40 border border-emerald-500/20 text-[9px] text-emerald-500/80 break-words">
                      [WORKER_SANDBOX]: {sandboxLog}
                    </div>
                  )}
                  
                  {isSearching ? (
                     <div className="p-4 flex flex-col items-center justify-center text-emerald-500/50 space-y-4">
                       <Activity className="w-8 h-8 animate-spin" />
                       <span className="text-xs">ИНДЕКСИРОВАНИЕ...</span>
                     </div>
                  ) : (
                    searchResults.map((result, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setSelectedArticle(result)}
                        className={`w-full text-left p-3 flex flex-col gap-1 transition-colors ${selectedArticle?.title === result.title ? 'bg-emerald-500/20 border-l-2 border-emerald-400' : 'hover:bg-emerald-500/10'}`}
                      >
                        <span className="text-emerald-400 text-sm font-bold truncate">{result.title}</span>
                        <span className="text-emerald-600 text-[10px] truncate">{result.abstract}</span>
                      </button>
                    ))
                  )}
                  
                  {!isSearching && searchResults.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-emerald-500/30">
                      <WifiOff className="w-8 h-8 mb-2" />
                      <span className="text-xs text-center">Введите запрос для поиска по локальной Kiwix-библиотеке</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-950/50 relative">
                  {selectedArticle ? (
                    <div className="text-emerald-100 max-w-2xl mx-auto space-y-6">
                       <h1 className="text-3xl font-bold text-emerald-400 border-b border-emerald-500/30 pb-4">
                         {selectedArticle.title}
                       </h1>
                       <div className="text-sm leading-relaxed text-emerald-200/80 space-y-4">
                         <p>{selectedArticle.abstract}</p>
                         <p>In cryptography, a public key infrastructure (PKI) is a set of roles, policies, hardware, software and procedures needed to create, manage, distribute, use, store and revoke digital certificates and manage public-key encryption.</p>
                         <p>The purpose of a PKI is to facilitate the secure electronic transfer of information for a range of network activities such as e-commerce, internet banking and confidential email.</p>
                         <div className="p-4 bg-emerald-950/40 border-l-4 border-emerald-500 italic mt-6">
                           Содержимое доступно в автономном режиме. Получено через ZIM архив 'SecTools & OpSec Manuals'.
                         </div>
                       </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-10">
                      <FileText className="w-32 h-32 text-emerald-500" />
                    </div>
                  )}
                </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
