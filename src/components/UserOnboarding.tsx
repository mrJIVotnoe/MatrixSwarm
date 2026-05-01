import React, { useState } from 'react';
import { Terminal, Shield, User, Globe, Cpu, Radio, Key, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { generateSeedPhrase, getKeysFromSeed, validateSeedPhrase } from '../lib/crypto';

export type UserMode = 'ark' | 'symbiote' | 'magistrate';

interface UserOnboardingProps {
  onComplete: (alias: string, mode: UserMode, seedPhrase: string, publicKey: string) => void;
}

export function UserOnboarding({ onComplete }: UserOnboardingProps) {
  const [alias, setAlias] = useState('');
  const [mode, setMode] = useState<UserMode>('ark');
  const [step, setStep] = useState(1);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [publicKeyStr, setPublicKeyStr] = useState('');
  const [importKeyVal, setImportKeyVal] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const generateKeys = async () => {
    try {
      const phrase = await generateSeedPhrase();
      const keys = getKeysFromSeed(phrase);
      setSeedPhrase(phrase);
      setPublicKeyStr(keys.publicKey);
      setStep(4); // Move to key backup step
    } catch (e) {
      console.error(e);
      setErrorMsg("Ошибка генерации сид-фразы.");
    }
  };

  const handleImport = async () => {
    try {
      const phrase = importKeyVal.trim().toLowerCase();
      if (!phrase) return;
      
      if (!validateSeedPhrase(phrase)) {
        setErrorMsg("Неверная Сид-фраза. Проверьте правильность написания слов.");
        return;
      }

      const keys = getKeysFromSeed(phrase);
      setSeedPhrase(phrase);
      setPublicKeyStr(keys.publicKey);
      setStep(2); // continue to role selection
    } catch (e) {
      console.error(e);
      setErrorMsg("Ошибка восстановления.");
    }
  };

  const handleNext = () => {
    if (step === 1 && alias.trim().length > 2) {
      if (isImporting) {
        handleImport();
      } else {
        generateKeys();
      }
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      onComplete(alias, mode, seedPhrase, publicKeyStr);
    } else if (step === 4) {
      // User copied their key
      setStep(2);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="hud-panel p-8 max-w-2xl w-full relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Terminal className="w-32 h-32 text-cyan-500" />
        </div>

        {step === 1 && (
          <div className="relative z-10 space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
              <User className="w-6 h-6" />
              ИНИЦИАЛИЗАЦИЯ НАБЛЮДАТЕЛЯ
            </h2>
            <p className="text-cyan-600/80 text-sm leading-relaxed">
              Рой не использует централизованные серверы для хранения паролей. Ваша личность подтверждается вашей "Сид-фразой" (Паспортом Души из 12 слов).
            </p>
            
            <div className="flex gap-4 border-b border-cyan-500/20 mb-4">
              <button 
                className={`pb-2 px-2 text-xs font-bold transition-colors ${!isImporting ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-cyan-700 hover:text-cyan-500'}`}
                onClick={() => setIsImporting(false)}
              >
                СОЗДАТЬ ПАСПОРТ
              </button>
              <button 
                className={`pb-2 px-2 text-xs font-bold transition-colors ${isImporting ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-cyan-700 hover:text-cyan-500'}`}
                onClick={() => setIsImporting(true)}
              >
                ВОССТАНОВИТЬ
              </button>
            </div>

            <div>
              <label className="block text-[10px] text-cyan-500 font-bold mb-2 uppercase tracking-widest">ПОЗЫВНОЙ (ALIAS)</label>
              <input 
                type="text" 
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Например: Архитектор, Странник..."
                className="w-full bg-slate-900 border border-cyan-500/30 p-3 text-cyan-400 focus:outline-none focus:border-cyan-400 font-mono transition-colors focus:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              />
            </div>

            {isImporting && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <label className="block text-[10px] text-amber-500 font-bold mb-2 uppercase tracking-widest mt-4">СИД-ФРАЗА (12 СЛОВ)</label>
                <textarea 
                  value={importKeyVal}
                  onChange={(e) => setImportKeyVal(e.target.value)}
                  placeholder="Вставьте ваши 12 секретных слов через пробел..."
                  className="w-full bg-slate-900 border border-amber-500/30 p-3 text-amber-400 focus:outline-none focus:border-amber-400 font-mono text-xs h-24 transition-colors resize-none"
                />
              </motion.div>
            )}

            {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}

            <button 
              onClick={handleNext}
              disabled={alias.trim().length < 3 || (isImporting && importKeyVal.trim().split(/\s+/).length !== 12)}
              className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500 text-cyan-400 font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? 'ИМПОРТИРОВАТЬ И ПРОДОЛЖИТЬ' : 'СГЕНЕРИРОВАТЬ ПАСПОРТ'}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="relative z-10 space-y-6">
            <h2 className="text-2xl font-bold text-amber-500 flex items-center gap-2">
              <Key className="w-6 h-6" />
              ВАШ ПАСПОРТ ДУШИ СОЗДАН
            </h2>
            <div className="space-y-4 text-sm text-cyan-600/80 leading-relaxed">
              <p className="text-amber-400">ВНИМАНИЕ: Это единственный способ восстановить ваш доступ к Рою на других устройствах.</p>
              <p>Запишите эти 12 слов в правильном порядке. Никогда и никому их не передавайте.</p>
              
              <div className="grid grid-cols-3 gap-2 mt-4 map-grid p-4 bg-slate-900 border border-amber-500/30 rounded-sm">
                {seedPhrase.split(' ').map((word, index) => (
                  <div key={index} className="flex gap-2 p-2 bg-slate-950 border border-slate-800 rounded">
                    <span className="text-slate-600 font-mono text-xs w-4">{index + 1}.</span>
                    <span className="text-amber-400 font-mono font-bold tracking-widest">{word}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => {
                navigator.clipboard.writeText(seedPhrase);
                alert("Сид-фраза скопирована в буфер обмена!");
              }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-amber-500/50 text-amber-500 font-bold tracking-widest transition-all mb-2"
            >
              СКОПИРОВАТЬ ПАСПОРТ (СИД-ФРАЗУ)
            </button>

            <button 
              onClick={handleNext}
              className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500 text-amber-400 font-bold tracking-widest transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              Я НАДЁЖНО СОХРАНИЛ ЭТИ 12 СЛОВ
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="relative z-10 space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
              <Radio className="w-6 h-6" />
              ФИЛОСОФИЯ ВЗАИМОДЕЙСТВИЯ
            </h2>
            <p className="text-cyan-600/80 text-sm mb-4">
              Архитектура Роя уважает ваш порог входа. Выберите свою роль в экосистеме.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              <button 
                onClick={() => setMode('ark')}
                className={`p-4 border text-left transition-all relative overflow-hidden ${mode === 'ark' ? 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'border-slate-800 bg-slate-900/50 hover:border-cyan-500/50 text-cyan-700'}`}
              >
                <div className="flex items-center gap-2 mb-2 text-cyan-400">
                  <Globe className="w-5 h-5" />
                  <span className="font-bold">Искатель (Ковчег)</span>
                </div>
                <div className="text-xs space-y-1">
                  <p>• Свободная P2P-связь</p>
                  <p>• Личные файлы и память</p>
                  <p>• Навигационный модуль</p>
                  <p className="mt-2 text-cyan-500/50 italic text-[10px]">Мне нужен простой и надежный интернет без цензуры.</p>
                </div>
              </button>

              <button 
                onClick={() => setMode('symbiote')}
                className={`p-4 border text-left transition-all ${mode === 'symbiote' ? 'border-amber-400 bg-amber-900/20 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-slate-800 bg-slate-900/50 hover:border-amber-500/50 text-cyan-700'}`}
              >
                <div className="flex items-center gap-2 mb-2 text-amber-500">
                  <Cpu className="w-5 h-5" />
                  <span className="font-bold">Адепт (Симбионт)</span>
                </div>
                <div className="text-xs space-y-1">
                  <p>• Делегирование мощности</p>
                  <p>• Видеорегистрация</p>
                  <p>• Торрент-хранилище</p>
                  <p className="mt-2 text-amber-500/50 italic text-[10px]">Я хочу, чтобы мое старое устройство приносило пользу Рою.</p>
                </div>
              </button>

              <button 
                onClick={() => setMode('magistrate')}
                className={`p-4 border text-left transition-all ${mode === 'magistrate' ? 'border-purple-400 bg-purple-900/20 shadow-[0_0_15px_rgba(192,132,252,0.2)]' : 'border-slate-800 bg-slate-900/50 hover:border-purple-500/50 text-cyan-700'}`}
              >
                <div className="flex items-center gap-2 mb-2 text-purple-400">
                  <Terminal className="w-5 h-5" />
                  <span className="font-bold">Магистрат (Инженер)</span>
                </div>
                <div className="text-xs space-y-1">
                  <p>• Топология меш-сетей</p>
                  <p>• P2P-маршрутизация</p>
                  <p>• Управление алгоритмами</p>
                  <p className="mt-2 text-purple-400/50 italic text-[10px]">Я готов держать мосты связи и выстраивать логику системы.</p>
                </div>
              </button>
            </div>

            <button 
              onClick={handleNext}
              className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500 text-cyan-400 font-bold tracking-widest transition-all mt-4"
            >
              ПРОДОЛЖИТЬ
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="relative z-10 space-y-6">
            <h2 className="text-2xl font-bold text-amber-500 flex items-center gap-2">
              <Shield className="w-6 h-6" />
              РИТУАЛ ПРИЧАСТИЯ
            </h2>
            <div className="space-y-4 text-sm text-cyan-600/80 leading-relaxed">
              <p>Как радиохулиганы прошлого берегли эфир, так и мы бережем спокойствие друг друга.</p>
              <div className="p-4 bg-slate-900 border border-amber-500/30 rounded-sm">
                <p className="text-amber-500 font-bold mb-2">ЗАКОН ЦИФРОВОЙ ТИШИНЫ:</p>
                <ul className="list-disc pl-5 space-y-2 text-amber-500/80">
                  <li>Мы уважаем "железо", не вызываем перегрева и лагов.</li>
                  <li>Никакого сбора логов и шпионажа за пользователями.</li>
                  <li>Мы не нарушаем покой соседей по Wi-Fi. Никакого спама в эфире.</li>
                </ul>
              </div>
            </div>
            
            <button 
              onClick={handleNext}
              className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500 text-amber-400 font-bold tracking-widest transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]"
            >
              ПРИНЯТЬ КАНОН И ВОЙТИ В РОЙ
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
