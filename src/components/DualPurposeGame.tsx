import React, { useState, useEffect, useRef } from 'react';
import { globalEntropyPool } from '../core/entropy';
import { Shield, Target, Zap, Hash, Grid3x3, Palette, Orbit } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { WasmCovertOps } from '../core/wasm_bridge';

// ----------------------------------------------------------------------
// ФИЛОСОФИЯ: "Игра — это высшая форма ответственности перед Роем."
// Эти модули выполняют двойное назначение (Dual-Purpose):
// 1. Досуг/отвлечение: Судоку для старших, Раскраска для детей.
// 2. Военная криптография: Истинная генерация энтропии (для Web Crypto API)
//    и стеганографическое внедрение "Цифровых феромонов" в пакеты данных.
// ----------------------------------------------------------------------

const INITIAL_BOARD = [
  5,3,0, 0,7,0, 0,0,0,
  6,0,0, 1,9,5, 0,0,0,
  0,9,8, 0,0,0, 0,6,0,
  8,0,0, 0,6,0, 0,0,3,
  4,0,0, 8,0,3, 0,0,1,
  7,0,0, 0,2,0, 0,0,6,
  0,6,0, 0,0,0, 2,8,0,
  0,0,0, 4,1,9, 0,0,5,
  0,0,0, 0,8,0, 0,7,9
];

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#0f172a'];
const STEGANO_WIDTH = 12;
const STEGANO_HEIGHT = 12;

type GameMode = 'sudoku' | 'stegano';

export const DualPurposeGame = ({ onEarnKarma }: { onEarnKarma: (amount: number) => void }) => {
  const { t } = useTranslation();
  const [entropyLevel, setEntropyLevel] = useState(0);
  const [seedSequence, setSeedSequence] = useState<string>("WAITING FOR ENTROPY...");
  const [sessionKarma, setSessionKarma] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('sudoku');

  // --- Sudoku State ---
  const [sudokuBoard, setSudokuBoard] = useState([...INITIAL_BOARD]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  // --- Stegano State ---
  const [pixels, setPixels] = useState<string[]>(Array(STEGANO_WIDTH * STEGANO_HEIGHT).fill('#0f172a'));
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [steganoPackets, setSteganoPackets] = useState<number>(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setEntropyLevel(globalEntropyPool.getLevel());
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const generateSeed = async () => {
    const s = await globalEntropyPool.generateSeed();
    setSeedSequence(s.substring(0, 16).toUpperCase());
  };

  const earnKarma = () => {
    setSessionKarma(k => {
      const newK = k + 1;
      if (newK % 5 === 0) generateSeed();
      return newK;
    });
    onEarnKarma(1);
  };

  const handleSudokuClick = (index: number, e: React.MouseEvent) => {
    setSelectedCell(index);
    globalEntropyPool.addEntropy('sudoku_cell', e.clientX, e.clientY, performance.now());
  };

  const handleSudokuInput = (num: number) => {
    if (selectedCell !== null && INITIAL_BOARD[selectedCell] === 0) {
      const newBoard = [...sudokuBoard];
      newBoard[selectedCell] = num;
      setSudokuBoard(newBoard);
      
      // Истинная энтропия для Web Crypto API:
      // Паттерны выбора числа, тайминг и координаты подмешиваются в ядро
      globalEntropyPool.addEntropy('sudoku_num', num, selectedCell, performance.now());
      
      earnKarma();
    }
  };

  const handlePixelClick = (index: number, e: React.MouseEvent) => {
    const newPixels = [...pixels];
    newPixels[index] = activeColor;
    setPixels(newPixels);
    
    // Внедрение скрытых "Цифровых феромонов" (метаданных L3)
    globalEntropyPool.addEntropy('stegano_pixel', e.clientX, e.clientY, performance.now());
    
    // Rust-Core WASM LSB processing simulation
    const wasmProcessing = WasmCovertOps.inject_pheromone("0FA9C3"); 
    if (wasmProcessing) {
       setSteganoPackets(p => p + 1);
       earnKarma();
    }
  };

  return (
    <div className="hud-panel p-6 rounded-sm relative flex flex-col h-[650px] border border-cyan-500/30">
      
      {/* HEADER */}
      <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-400 z-10">
        <Hash className="w-5 h-5" />
        ИГРОВАЯ ЭНТРОПИЯ (DUAL-PURPOSE L3/L5)
      </h2>
      <p className="text-xs text-cyan-600/80 mb-4 z-10 w-3/4">
        Игра — это высшая форма ответственности перед Роем. Взаимодействие человека генерирует криптографическую энтропию и скрывает L3 пакеты маршрутизации (Стеганография).
      </p>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2 mb-4 z-10">
         <div className="bg-slate-950 p-2 border border-cyan-500/30">
            <div className="text-[10px] text-cyan-500 mb-1">KPoW КАРМА (НАСЛЕДИЕ)</div>
            <div className="text-sm text-cyan-300 font-bold">+{sessionKarma}</div>
         </div>
         <div className="bg-slate-950 p-2 border border-cyan-500/30">
            <div className="text-[10px] text-cyan-500 mb-1">УРОВЕНЬ ЭНТРОПИИ</div>
            <div className="w-full bg-slate-900 h-2 mt-1 rounded-sm overflow-hidden">
               <div 
                  className="bg-cyan-500 h-full transition-all" 
                  style={{ width: `${entropyLevel}%` }}
               />
            </div>
         </div>
         <div className="bg-slate-950 p-2 border border-cyan-500/30">
            <div className="text-[10px] text-cyan-500 mb-1">SEED (Web Crypto API)</div>
            <div className="font-mono text-xs text-cyan-400 break-all">{seedSequence}</div>
         </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setGameMode('sudoku')}
          className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm border transition-colors ${gameMode === 'sudoku' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-cyan-900 text-cyan-700'}`}
        >
          <Grid3x3 className="w-4 h-4" />
          EntropySudoku (L2)
        </button>
        <button 
          onClick={() => setGameMode('stegano')}
          className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm border transition-colors ${gameMode === 'stegano' ? 'bg-fuchsia-900/50 border-fuchsia-500 text-fuchsia-300' : 'bg-slate-900 border-fuchsia-900 text-cyan-700'}`}
        >
          <Palette className="w-4 h-4" />
          SteganoColoring (L5)
        </button>
      </div>

      {/* GAME AREA */}
      <div className="flex-1 bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-4">
        
        {/* SUDOKU MODE */}
        {gameMode === 'sudoku' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
            <div className="text-center mb-4 text-cyan-500/70 text-xs tracking-widest uppercase flex items-center gap-2">
              <Orbit className="w-4 h-4" />
              Стабильные Стражи: Генерация ключей Ed25519
            </div>
            <div className="grid grid-cols-9 gap-0 border-2 border-cyan-500 bg-slate-900 w-fit">
              {sudokuBoard.map((cell, idx) => {
                const isGiven = INITIAL_BOARD[idx] !== 0;
                return (
                  <div 
                    key={idx}
                    onClick={(e) => handleSudokuClick(idx, e)}
                    className={`w-10 h-10 flex items-center justify-center border border-cyan-800/50 text-sm cursor-pointer
                      ${selectedCell === idx ? 'bg-cyan-500/30' : ''}
                      ${isGiven ? 'text-cyan-200 font-bold' : 'text-fuchsia-400'}
                      ${idx % 3 === 2 && idx % 9 !== 8 ? 'border-r-cyan-500/80 border-r-2' : ''}
                      ${Math.floor(idx / 9) % 3 === 2 && Math.floor(idx / 9) !== 8 ? 'border-b-cyan-500/80 border-b-2' : ''}
                    `}
                  >
                    {cell !== 0 ? cell : ''}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-6">
              {[1,2,3,4,5,6,7,8,9].map(num => (
                <button 
                  key={num}
                  onClick={() => handleSudokuInput(num)}
                  className="w-10 h-10 bg-slate-800 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                >
                  {num}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEGANO MODE */}
        {gameMode === 'stegano' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
             <div className="text-center mb-4 text-fuchsia-500/70 text-xs tracking-widest uppercase flex items-center gap-2">
              <Orbit className="w-4 h-4" />
              Рекруты (Дети): Метаданные = Скрытый трафик
            </div>
            <div 
              className="grid gap-px bg-slate-800 border-2 border-fuchsia-500 p-1 mb-6 shadow-[0_0_20px_rgba(217,70,164,0.15)]" 
              style={{ gridTemplateColumns: `repeat(${STEGANO_WIDTH}, 1fr)` }}
            >
              {pixels.map((color, idx) => (
                <div 
                  key={idx}
                  onClick={(e) => handlePixelClick(idx, e)}
                  className="w-8 h-8 cursor-crosshair hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            <div className="flex gap-4 items-center">
              {COLORS.map(color => (
                <button 
                  key={color}
                  onClick={() => setActiveColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${activeColor === color ? 'border-white scale-125' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="text-[10px] text-fuchsia-500/60 font-mono mt-4">
              Внедрено цифровых феромонов (L3 Packets): [{steganoPackets}]
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
};

