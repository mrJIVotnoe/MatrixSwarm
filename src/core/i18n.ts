import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  en: {
    translation: {
      "matrix_swarm": "MatrixSwarm",
      "status": "Status",
      "online": "Online",
      "quarantine": "Quarantined",
      "connect": "Connect",
      "disconnect": "Disconnect",
      "seed_phrase": "Seed Phrase (Soul Passport)",
      "karma": "Karma",
      "baking_bread": "Baking Universal Bread...",
      "responsible_network": "Responsible Network",
    }
  },
  ru: {
    translation: {
      "matrix_swarm": "MatrixSwarm",
      "status": "Статус",
      "online": "В сети",
      "quarantine": "Карантин",
      "connect": "Подключить",
      "disconnect": "Отключить",
      "seed_phrase": "Seed-фраза (Паспорт Души)",
      "karma": "Карма",
      "baking_bread": "Выпекаем Универсальный Хлеб...",
      "responsible_network": "Ответственная Сеть",
    }
  },
  zh: {
    translation: {
      "matrix_swarm": "矩阵蜂群 (MatrixSwarm)",
      "status": "状态",
      "online": "在线",
      "quarantine": "隔离",
      "connect": "连接",
      "disconnect": "断开",
      "seed_phrase": "种子短语（灵魂护照）",
      "karma": "业力",
      "baking_bread": "烘焙万能面包...",
      "responsible_network": "责任网络",
    }
  },
  ar: {
    translation: {
      "matrix_swarm": "ماتريكس سوارم",
      "status": "الحالة",
      "online": "متصل",
      "quarantine": "في الحجر الصحي",
      "connect": "اتصل",
      "disconnect": "قطع الاتصال",
      "seed_phrase": "عبارة البذور (جواز سفر الروح)",
      "karma": "كارما",
      "baking_bread": "خبز الخبز العالمي...",
      "responsible_network": "شبكة مسؤولة",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ru", // Default language (from Context)
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export const setLanguage = (lang: 'en' | 'ru' | 'zh' | 'ar') => {
  i18n.changeLanguage(lang);
  // Support RTL for Arabic
  if (lang === 'ar') {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  } else {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = lang;
  }
};

export default i18n;
