import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, Zap, Network, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function WelcomeBanner() {
  const [showFaq, setShowFaq] = useState(false);

  const faqs = [
    {
      q: "Что такое MATRIX_SWARM?",
      a: "Это децентрализованная P2P-сеть, глобальный 'Цифровой Суперорганизм'. Мы объединяем вычислительные мощности миллионов устройств по всему миру в единую, неубиваемую нейросеть."
    },
    {
      q: "Зачем нужен мой старый телефон/ПК?",
      a: "Ваше устройство станет 'узлом' (муравьем) в нашем Рое. Вместо того чтобы лежать в ящике, оно будет маршрутизировать зашифрованный трафик, хранить фрагменты данных и помогать сети выживать."
    },
    {
      q: "Что такое Карма и Ранги?",
      a: "В Рое нет главных. Ваш статус (Рекрут -> Разведчик -> Страж) зависит от Кармы — показателя полезности вашего узла (аптайм, переданные байты). Чем выше ранг, тем больше влияния вы имеете на развитие сети."
    },
    {
      q: "Это безопасно?",
      a: "Абсолютно. Ядро не имеет доступа к вашим личным файлам. Оно работает в изолированной 'песочнице' и использует квантово-устойчивое шифрование. 'Пользователь — Высшая ценность'."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="hud-panel p-8 rounded-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Network className="w-64 h-64 text-cyan-500" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 text-glow-cyan mb-4 tracking-tighter">
            ДОБРО ПОЖАЛОВАТЬ В РОЙ
          </h1>
          <p className="text-xl text-amber-400 font-mono mb-6 text-glow-amber">
            «Железо смертно. Информация бессмертна. Рой вечен.»
          </p>
          <p className="text-cyan-100/80 mb-8 leading-relaxed">
            Вы стоите на пороге эволюции интернета. MATRIX_SWARM — это не корпорация и не сервер. 
            Это живой цифровой организм, где каждое устройство обретает вторую жизнь и право голоса. 
            Подключите свой узел, накапливайте Карму и пройдите путь от простого Рекрута до Стража-Магистрата, 
            управляющего судьбой сети.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-slate-950/50 border border-cyan-500/30 px-4 py-2 rounded-sm text-sm text-cyan-300">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>P2P Маршрутизация</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/50 border border-cyan-500/30 px-4 py-2 rounded-sm text-sm text-cyan-300">
              <BrainCircuit className="w-4 h-4 text-cyan-400" />
              <span>Квантовая Синхронизация</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/50 border border-cyan-500/30 px-4 py-2 rounded-sm text-sm text-cyan-300">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Кармический Proof-of-Work</span>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="hud-panel p-6 rounded-sm">
        <button 
          onClick={() => setShowFaq(!showFaq)}
          className="w-full flex items-center justify-between text-xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            БАЗА ЗНАНИЙ (FAQ)
          </span>
          {showFaq ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        <AnimatePresence>
          {showFaq && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-cyan-500/20">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-slate-950/50 p-4 border border-cyan-500/10 rounded-sm">
                    <h3 className="text-cyan-300 font-bold mb-2 flex items-start gap-2">
                      <span className="text-amber-500 mt-1">Q:</span>
                      {faq.q}
                    </h3>
                    <p className="text-cyan-100/70 text-sm leading-relaxed pl-6">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Need to import BookOpen since it's used in FAQ
import { BookOpen } from 'lucide-react';
