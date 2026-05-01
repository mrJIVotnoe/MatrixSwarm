import React, { useState, useEffect } from 'react';
import { Cpu, Monitor, Zap, Database, Globe, Battery, BatteryCharging, Terminal, Watch, Settings, Gauge } from 'lucide-react';
import { getSystemSpecs, SystemSpecs } from '../lib/aida64';

export function Aida64Panel() {
  const [specs, setSpecs] = useState<SystemSpecs | null>(null);
  const [uptime, setUptime] = useState<number>(0);

  useEffect(() => {
    getSystemSpecs().then(s => setSpecs(s));
    
    // Update uptime
    const start = performance.now();
    const iv = setInterval(() => {
      setUptime(Math.floor((performance.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  if (!specs) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-cyan-500 font-mono text-sm animate-pulse">
        <Terminal className="w-5 h-5 mr-3" /> INITIALIZING AIDA64 SENSOR DIAGNOSTICS...
      </div>
    );
  }

  const formatUptime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex border-b border-cyan-500/30 pb-4 justify-between items-center px-2">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-amber-500 animate-[spin_4s_linear_infinite]" />
          <div>
            <h2 className="text-xl font-bold text-amber-500 tracking-wider">AIDA64 EXTREME SENSOR</h2>
            <p className="text-xs text-cyan-600">АППАРАТНАЯ ДИАГНОСТИКА УЗЛА</p>
          </div>
        </div>
        <div className="text-right text-xs font-mono text-cyan-500">
          <div className="flex items-center justify-end gap-2 text-cyan-400">
            <Watch className="w-3 h-3" /> UPTIME: {formatUptime(uptime)}
          </div>
          <div>{new Date().toISOString().substring(11,19)} UTC</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar p-2">
        
        {/* CPU & Memory */}
        <div className="bg-slate-900/40 border border-cyan-500/20 p-4 rounded-sm flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Cpu className="w-24 h-24 text-cyan-400" />
          </div>
          <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2 mb-4 border-b border-cyan-500/20 pb-2 relative z-10">
            <Cpu className="w-4 h-4" /> MOTHERBOARD & CPU
          </h3>
          <div className="space-y-3 font-mono text-xs z-10 flex-1">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-cyan-600">CPU Cores</span>
              <span className="text-cyan-300 font-bold">{specs.cpuCores} Threads</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-cyan-600">Instruction Set</span>
              <span className="text-cyan-300">Browser Virtualized</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-cyan-600">Memory (Est.)</span>
              <span className="text-cyan-300 font-bold">{specs.memoryString}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-cyan-600">Time Zone</span>
              <span className="text-cyan-300 truncate max-w-[150px] text-right">{specs.timeZone}</span>
            </div>
          </div>
        </div>

        {/* Display & GPU */}
        <div className="bg-slate-900/40 border border-amber-500/20 p-4 rounded-sm flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Monitor className="w-24 h-24 text-amber-500" />
          </div>
          <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2 mb-4 border-b border-amber-500/20 pb-2 relative z-10">
            <Monitor className="w-4 h-4" /> DISPLAY & GPU
          </h3>
          <div className="space-y-3 font-mono text-xs z-10 flex-1">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-amber-600">WebGL Renderer</span>
              <span className="text-amber-300 truncate max-w-[150px] text-right" title={specs.gpuRenderer}>{specs.gpuRenderer}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-amber-600">Resolution</span>
              <span className="text-amber-300">{specs.screenResolution}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-amber-600">Color Depth</span>
              <span className="text-amber-300">{specs.colorDepth}-bit</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-amber-600">Pixel Ratio</span>
              <span className="text-amber-300">{window.devicePixelRatio}x</span>
            </div>
          </div>
        </div>

        {/* Operating System */}
        <div className="bg-slate-900/40 border border-cyan-500/20 p-4 rounded-sm flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Database className="w-24 h-24 text-cyan-400" />
          </div>
          <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2 mb-4 border-b border-cyan-500/20 pb-2 relative z-10">
            <Database className="w-4 h-4" /> OPERATING SYSTEM
          </h3>
          <div className="space-y-3 font-mono text-xs z-10 flex-1">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-cyan-600">OS Platform</span>
              <span className="text-cyan-300">{specs.os}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-cyan-600">Browser Engine</span>
              <span className="text-cyan-300">{specs.browser}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-cyan-600">Internal Lang</span>
              <span className="text-cyan-300">{specs.language}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-cyan-600">User Agent</span>
              <span className="text-cyan-300 truncate max-w-[130px] text-right" title={specs.userAgent}>...{specs.userAgent.substring(specs.userAgent.length - 20)}</span>
            </div>
          </div>
        </div>

        {/* Network & Power */}
        <div className="bg-slate-900/40 border border-cyan-500/20 p-4 rounded-sm flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity mt-8">
            <Globe className="w-24 h-24 text-cyan-400" />
          </div>
          <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2 mb-4 border-b border-cyan-500/20 pb-2 relative z-10">
            <Zap className="w-4 h-4" /> NETWORK & POWER
          </h3>
          <div className="space-y-3 font-mono text-xs z-10 flex-1">
             <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-cyan-600">Uplink Type</span>
              <span className="text-cyan-300 uppercase">{specs.connectionType}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-cyan-600">Downlink Max</span>
              <span className="text-cyan-300">{specs.connectionSpeed}</span>
            </div>
            {specs.batteryLevel && (
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-cyan-600 flex items-center gap-1">Battery Power {specs.batteryCharging ? <BatteryCharging className="w-3 h-3 text-amber-400" /> : <Battery className="w-3 h-3" />}</span>
                <span className={`font-bold ${specs.batteryCharging ? 'text-amber-400' : 'text-cyan-300'}`}>{specs.batteryLevel}</span>
              </div>
            )}
             <div className="flex justify-between border-b border-slate-800 pb-1 mt-2">
              <span className="text-amber-600 font-bold flex items-center gap-1"><Gauge className="w-3 h-3" /> HIVE UPLINK</span>
              <span className="text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]">STABLE</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
