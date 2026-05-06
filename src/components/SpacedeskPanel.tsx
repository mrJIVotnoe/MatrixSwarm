import React, { useState, useRef, useEffect } from 'react';
import { Monitor, Smartphone, Link, Wifi, Play, Square, Settings, Maximize, Activity, Cable, Shield, Lock } from 'lucide-react';

export function SpacedeskPanel({ symbiote }: { symbiote: any }) {
  const [mode, setMode] = useState<'select' | 'host' | 'client'>('select');
  const [connectionType, setConnectionType] = useState<'usb' | 'wifi'>('usb');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const [cryptoAuth, setCryptoAuth] = useState<'none' | 'pending' | 'authorized' | 'authorized_friend' | 'rejected' | 'aikido' | 'seed_prompt_self' | 'seed_prompt_friend'>('none');
  const [countdown, setCountdown] = useState(15);
  const [seedPhraseInput, setSeedPhraseInput] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cryptoAuth === 'pending') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCryptoAuth('aikido');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(15);
    }
    return () => clearInterval(timer);
  }, [cryptoAuth]);

  // USB/Cable connection simulation
  useEffect(() => {
    if (mode === 'host' || mode === 'client') {
      if (connectionType === 'usb') {
        const timer = setTimeout(() => {
          setIsConnected(true);
          setCryptoAuth('pending'); // USB requires explicitly crypto-auth
        }, 1500);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setIsConnected(true);
          setCryptoAuth('authorized'); // Assume wifi p2p implies previous handshake in this demo
        }, 4000); 
        return () => clearTimeout(timer);
      }
    } else {
      setIsConnected(false);
      setCryptoAuth('none');
      setIsStreaming(false);
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        setMediaStream(null);
      }
    }
  }, [mode, connectionType]);

  const startHostStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);

      // Listen for user stopping stream via browser UI
      stream.getVideoTracks()[0].onended = () => {
        setIsStreaming(false);
        setMediaStream(null);
      };
    } catch (err) {
      console.error("Error accessing display media.", err);
    }
  };

  const stopHostStream = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }
    setIsStreaming(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex border-b border-cyan-500/30 pb-4 justify-between items-center px-2">
        <div className="flex items-center gap-3">
          <Monitor className="w-6 h-6 text-purple-500" />
          <div>
            <h2 className="text-xl font-bold text-purple-500 tracking-wider">SPACEDESK (KVM MATRIX)</h2>
            <p className="text-xs text-purple-600">ПРЯМОЙ ДОСТУП И РАСШИРЕНИЕ ДИСПЛЕЕВ</p>
          </div>
        </div>
        
        {mode !== 'select' && (
          <button 
            onClick={() => setMode('select')}
            className="px-3 py-1 bg-purple-500/10 border border-purple-500/40 text-purple-400 font-mono text-xs hover:bg-purple-500/20"
          >
            СМЕНИТЬ РЕЖИМ
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {mode === 'select' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 p-4">
             <div className="text-center space-y-2 max-w-lg mb-4">
               <h3 className="text-purple-400 font-bold text-lg">ФИЛОСОФИЯ ПРЯМОГО ПОДКЛЮЧЕНИЯ</h3>
               <p className="text-xs text-purple-600/80 leading-relaxed">
                 Прямая кабельная связь (USB-A/USB-C) создает неразрывную иерархию между устройствами. Мощный узел (PC) транслирует картинку, слейв-узел (Смартфон) становится внешним сенсором или дисплеем. Без задержек, без посредников, чистый data-поток.
               </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
               <button 
                  onClick={() => setMode('host')}
                  className="bg-slate-900/50 border border-purple-500/30 p-6 flex flex-col items-center justify-center gap-4 hover:bg-purple-500/10 hover:border-purple-500 transition-all group"
               >
                 <Monitor className="w-16 h-16 text-purple-500/50 group-hover:text-purple-400 transition-colors" />
                 <div className="text-center">
                   <div className="text-purple-400 font-bold">Я - ИСТОЧНИК (PC)</div>
                   <div className="text-xs text-purple-600 mt-1">Транслировать мой экран на другое устройство</div>
                 </div>
               </button>

               <button 
                  onClick={() => setMode('client')}
                  className="bg-slate-900/50 border border-purple-500/30 p-6 flex flex-col items-center justify-center gap-4 hover:bg-purple-500/10 hover:border-purple-500 transition-all group"
               >
                 <Smartphone className="w-16 h-16 text-purple-500/50 group-hover:text-purple-400 transition-colors" />
                 <div className="text-center">
                   <div className="text-purple-400 font-bold">Я - ДИСПЛЕЙ (СМАРТФОН)</div>
                   <div className="text-xs text-purple-600 mt-1">Принимать картинку и работать как внешний экран</div>
                 </div>
               </button>
             </div>

             <div className="flex gap-4 mt-8">
               <button 
                 onClick={() => setConnectionType('usb')}
                 className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold \${connectionType === 'usb' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'border-slate-700 text-slate-500'}`}
               >
                 <Cable className="w-4 h-4" /> USB КАБЕЛЬ (КАНАЛ СВЯЗИ)
               </button>
               <button 
                 onClick={() => setConnectionType('wifi')}
                 className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold \${connectionType === 'wifi' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'border-slate-700 text-slate-500'}`}
               >
                 <Wifi className="w-4 h-4" /> P2P WIFI (БЕСПРОВОДНОЙ ЭФИР)
               </button>
             </div>
          </div>
        )}

        {mode === 'host' && (
          <div className="flex-1 flex flex-col p-4 bg-slate-900/30 border border-purple-500/20 rounded-sm">
             <div className="flex justify-between items-center mb-4 pb-2 border-b border-purple-500/20">
               <div>
                  <div className="text-purple-400 font-bold flex items-center gap-2">
                    <Monitor className="w-5 h-5" /> REPEATER NODE (HOST)
                  </div>
                  <div className="text-xs flex items-center gap-2 mt-1">
                     <span className="text-purple-600 flex items-center gap-2">
                       {connectionType === 'usb' ? <Cable className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                     </span>
                     {['pending', 'seed_prompt_self', 'seed_prompt_friend'].includes(cryptoAuth) ? <span className="text-red-500 animate-pulse font-bold">ОБНАРУЖЕНО НЕИЗВЕСТНОЕ ОБОРУДОВАНИЕ</span> 
                     : cryptoAuth === 'aikido' ? <span className="text-red-500 font-bold">СЛЕЙВ-УЗЕЛ ВОРКЕР (АЙКИДО)</span>
                     : (isConnected ? <span className="text-purple-400">СВЯЗЬ УСТАНОВЛЕНА И АВТОРИЗОВАНА</span> : <span className="text-purple-600">ОЖИДАНИЕ СЛЕЙВ-УЗЛА...</span>)}
                   </div>
               </div>
               
               <div className="flex gap-2">
                  {!isStreaming ? (
                    <button 
                      disabled={!isConnected || (cryptoAuth !== 'authorized' && cryptoAuth !== 'authorized_friend')}
                      onClick={startHostStream}
                      className="px-4 py-2 bg-purple-500/20 border border-purple-500 text-purple-400 flex items-center gap-2 font-bold text-xs disabled:opacity-50 hover:bg-purple-500/30"
                    >
                      <Play className="w-4 h-4" /> НАЧАТЬ ТРАНСЛЯЦИЮ
                    </button>
                  ) : (
                    <button 
                      onClick={stopHostStream}
                      className="px-4 py-2 bg-red-500/20 border border-red-500 text-red-400 flex items-center gap-2 font-bold text-xs hover:bg-red-500/30"
                    >
                      <Square className="w-4 h-4" /> ОСТАНОВИТЬ
                    </button>
                  )}
               </div>
             </div>

             <div className="flex-1 bg-black border border-purple-500/30 relative flex items-center justify-center overflow-hidden">
               {['pending', 'seed_prompt_self', 'seed_prompt_friend'].includes(cryptoAuth) ? (
                 <div className="flex flex-col items-center justify-center p-8 bg-black/90 absolute inset-0 z-10 border-2 border-red-500/50">
                    <Shield className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
                    <h3 className="text-red-500 font-bold text-xl mb-2">АППАРАТНЫЙ КАРАНТИН</h3>
                    <p className="text-red-400/80 text-sm max-w-md text-center mb-6 border border-red-500/20 p-4 bg-red-950/30">
                      ВНИМАНИЕ! Обнаружено физическое подключение неизвестного устройства по USB-шине. 
                      Выберите протокол развертывания узла и авторизации связи.
                    </p>
                    
                    {cryptoAuth === 'pending' ? (
                      <>
                        <div className="flex flex-col gap-3 w-full max-w-sm mb-6">
                          <button onClick={() => setCryptoAuth('seed_prompt_self')} className="w-full px-6 py-3 bg-purple-900/50 border border-purple-500 text-purple-400 hover:bg-purple-900/80 text-xs font-bold flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" /> ИНТЕГРАЦИЯ: МОЙ УЗЕЛ (СИД-ФРАЗА)
                          </button>
                          <button onClick={() => setCryptoAuth('seed_prompt_friend')} className="w-full px-6 py-3 bg-emerald-900/50 border border-emerald-500 text-emerald-400 hover:bg-emerald-900/80 text-xs font-bold flex items-center justify-center gap-2">
                            <Link className="w-4 h-4" /> ИНСТАЛЛЯЦИЯ: УЗЕЛ СОЮЗНИКА
                          </button>
                          <button onClick={() => setCryptoAuth('aikido')} className="w-full px-6 py-3 bg-red-900/50 border border-red-500 text-red-400 hover:bg-red-900/80 text-xs font-bold flex items-center justify-center gap-2">
                            <Activity className="w-4 h-4" /> АЙКИДО-ПРОТОКОЛ (САНДБОКС)
                          </button>
                        </div>
                        
                        <div className="w-full max-w-sm">
                          <div className="text-red-500/80 text-[10px] text-center mb-1 font-mono">АВТО-АЙКИДО ЧЕРЕЗ {countdown} СЕК...</div>
                          <div className="h-1 bg-red-950 w-full overflow-hidden">
                            <div className="h-full bg-red-500 transition-none" style={{ width: `${(countdown / 15) * 100}%` }}></div>
                          </div>
                          <p className="text-red-500/50 text-[10px] text-center mt-2 leading-tight">
                            Защита от изъятия: Без явной авторизации устройство-самозванец переводится в ранг "Ниже майнинга", без доступа к дисплею или данным, отдавая лишь свои вычислительные мощности Сети.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full max-w-sm flex flex-col gap-4 bg-slate-900/50 border border-slate-700 p-4">
                         <h4 className={`text-sm font-bold text-center ${cryptoAuth === 'seed_prompt_self' ? 'text-purple-400' : 'text-emerald-400'}`}>
                           {cryptoAuth === 'seed_prompt_self' ? 'ПОДТВЕРЖДЕНИЕ ВЛАДЕЛЬЦА' : 'СОЗДАНИЕ УЗЛА СОЮЗНИКА'}
                         </h4>
                         <p className="text-xs text-slate-400 text-center leading-relaxed">
                           {cryptoAuth === 'seed_prompt_self' 
                              ? 'Введите вашу личную Сид-Фразу для расширения прав данного устройства до статуса "Доверенный Узел".' 
                              : 'Предоставьте устройство другу для генерации и ввода его собственной Сид-Фразы. База данных будет сегрегирована.'}
                         </p>
                         <textarea 
                           className="w-full h-24 bg-black border border-slate-700 p-3 text-xs font-mono text-slate-300 focus:border-purple-500 focus:outline-none"
                           placeholder="Слово1 Слово2 Слово3..."
                           value={seedPhraseInput}
                           onChange={(e) => setSeedPhraseInput(e.target.value)}
                         ></textarea>
                         <div className="flex gap-2">
                           <button onClick={() => { setCryptoAuth('pending'); setSeedPhraseInput(''); }} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 border border-slate-600">
                             ОТМЕНА
                           </button>
                           <button 
                             disabled={seedPhraseInput.trim().length < 10}
                             onClick={() => {
                               setCryptoAuth(cryptoAuth === 'seed_prompt_self' ? 'authorized' : 'authorized_friend');
                               setSeedPhraseInput('');
                             }} 
                             className={`flex-1 px-4 py-2 text-xs font-bold disabled:opacity-50 border ${
                               cryptoAuth === 'seed_prompt_self' 
                                 ? 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 border-purple-500' 
                                 : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border-emerald-500'
                             }`}
                           >
                             ПРИНЯТЬ
                           </button>
                         </div>
                      </div>
                    )}
                 </div>
               ) : cryptoAuth === 'aikido' ? (
                 <div className="text-red-500 flex flex-col items-center gap-4">
                   <Activity className="w-20 h-20 animate-[spin_3s_linear_infinite] opacity-50" />
                   <div className="text-center">
                     <h3 className="font-bold text-lg">АЙКИДО-РЕЖИМ АКТИВЕН</h3>
                     <p className="font-mono text-sm max-w-xs mt-2 text-red-400/80">
                       Данный узел изолирован в песочнице. Доступ к KVM заблокирован. Устройство выполняет теневые вычисления для Сети.
                     </p>
                   </div>
                 </div>
               ) : cryptoAuth === 'rejected' ? (
                 <div className="text-slate-500 flex flex-col items-center gap-4">
                   <Shield className="w-16 h-16 opacity-50" />
                   <p className="font-mono text-sm">ПОРТ ЗАБЛОКИРОВАН В ЦЕЛЯХ БЕЗОПАСНОСТИ</p>
                 </div>
               ) : isStreaming ? (
                 <>
                   <video 
                     ref={videoRef} 
                     autoPlay 
                     playsInline 
                     muted 
                     className="max-w-full max-h-full object-contain"
                   />
                   <div className="absolute top-4 right-4 bg-black/80 px-3 py-1 flex items-center gap-2 border border-purple-500/50 text-purple-400 text-xs font-mono backdrop-blur-sm">
                     <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                     LIVE: {connectionType === 'usb' ? 'USB 3.0' : 'WIFI DIRECT'}
                   </div>
                 </>
               ) : (
                 <div className="text-purple-500/30 flex flex-col items-center gap-4">
                   <Activity className="w-16 h-16 animate-pulse" />
                   <p className="font-mono text-sm">ВИДЕОПОТОК НЕ АКТИВЕН</p>
                 </div>
               )}
             </div>
          </div>
        )}

        {mode === 'client' && (
          <div className="flex-1 flex flex-col p-4 bg-slate-900/30 border border-amber-500/20 rounded-sm">
             <div className="flex justify-between items-center mb-4 pb-2 border-b border-amber-500/20">
               <div>
                  <div className="text-amber-400 font-bold flex items-center gap-2">
                    <Smartphone className="w-5 h-5" /> SENSOR DISPLAY (CLIENT)
                  </div>
                  <div className="text-xs text-amber-600 flex items-center gap-2 mt-1">
                    {connectionType === 'usb' ? (
                      <><Cable className="w-3 h-3" /> USB ПИТАНИЕ & DATA</>
                    ) : (
                      <><Wifi className="w-3 h-3" /> ЛОКАЛЬНАЯ P2P СЕТЬ</>
                    )}
                  </div>
               </div>
               
               <div className="flex gap-2">
                  <button className="p-2 border border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                    <Maximize className="w-4 h-4" />
                  </button>
               </div>
             </div>

             <div className="flex-1 bg-black border border-amber-500/30 relative flex items-center justify-center">
               {!isConnected ? (
                 <div className="text-amber-500/50 flex flex-col items-center gap-4 animate-pulse">
                   {connectionType === 'usb' ? <Cable className="w-12 h-12" /> : <Link className="w-12 h-12" />}
                   <p className="font-mono text-sm max-w-xs text-center border border-amber-500/20 p-2">Ожидание физического подключения к Хост-машине...</p>
                 </div>
               ) : ['pending', 'seed_prompt_self', 'seed_prompt_friend'].includes(cryptoAuth) ? (
                 <div className="text-amber-500/70 flex flex-col items-center gap-4 border border-amber-500/30 p-8 bg-amber-950/20">
                   <Shield className="w-16 h-16 animate-pulse" />
                   <p className="font-mono text-sm font-bold text-center">ОЖИДАНИЕ АВТОРИЗАЦИИ</p>
                   <p className="text-xs text-center max-w-xs">Хост-машина включила режим Аппаратного Карантина. Для получения доступа требуется явное подтверждение с доверенного устройства.</p>
                 </div>
               ) : cryptoAuth === 'aikido' ? (
                 <div className="w-full h-full relative flex items-center justify-center bg-black">
                   <div className="absolute inset-0 bg-red-950/20 z-0"></div>
                   <div className="text-red-500 font-mono text-xs text-center border border-red-900 bg-red-950/40 p-6 z-10 flex flex-col gap-4 max-w-sm mx-4">
                     <Shield className="w-8 h-8 mx-auto" />
                     <p className="font-bold">АППАРАТНАЯ ИЗОЛЯЦИЯ</p>
                     <p className="opacity-80">Нет доступа к запрашиваемому узлу. Работа с дисплеем невозможна.</p>
                     
                     <div className="border border-red-900/50 pt-4 mt-2 border-t text-left space-y-1 text-[10px] opacity-60">
                        <div>{'>'} connection_state: PENDING_AUTH</div>
                        <div>{'>'} stream_service: BLOCKED</div>
                        <div>{'>'} worker_process: RUNNING</div>
                        <div className="animate-pulse">{'>'} background_tasks: hash_compute, relay_packet</div>
                     </div>
                   </div>
                 </div>
               ) : cryptoAuth === 'rejected' ? (
                 <div className="text-slate-500 flex flex-col items-center gap-4 border border-slate-700/50 p-8 bg-slate-900/50">
                   <Shield className="w-16 h-16 opacity-50" />
                   <p className="font-mono text-sm font-bold text-center text-red-500/80">ОТКАЗ В ДОСТУПЕ</p>
                   <p className="text-xs text-center max-w-xs">Хост-машина заблокировала этот порт в целях безопасности.</p>
                 </div>
               ) : (
                 <div className="w-full h-full relative group">
                    {/* Simulated incoming stream */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555680202-c86f0e12f086?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-40 blur-[1px]"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20"></div>
                    
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[10px] font-mono text-amber-400/80 bg-black/60 p-2 backdrop-blur-md border border-amber-500/20">
                      <span>INCOMING: 1920x1080 @ 60FPS</span>
                      <span>LINK: {connectionType === 'usb' ? 'CABLE (0ms latency)' : 'WIFI (23ms latency)'}</span>
                      <span>{Math.floor(Math.random() * 5 + 12)} Mbps</span>
                    </div>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 p-4 border border-amber-500 text-amber-400 font-mono text-xs flex flex-col gap-2">
                      <div className="font-bold flex items-center gap-2 mb-2 border-b border-amber-500/30 pb-2">
                        <Settings className="w-4 h-4" /> KVM CONTROLS
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="accent-amber-500" defaultChecked /> Enable Touch Input Routing
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="accent-amber-500" /> Audio Forwarding
                      </label>
                    </div>
                 </div>
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
