import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language && i18n.language.startsWith('en') ? 'en' : 'de';

  useEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  const handleLanguageChange = (lang: 'de' | 'en') => {
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  };

  return (
    <div
      role="group"
      aria-label="Sprachauswahl / Language Selection"
      className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      <button
        type="button"
        onClick={() => handleLanguageChange('de')}
        aria-pressed={currentLang === 'de'}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          currentLang === 'de'
            ? 'bg-indigo-600 text-white shadow'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        DE
      </button>
      <button
        type="button"
        onClick={() => handleLanguageChange('en')}
        aria-pressed={currentLang === 'en'}
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          currentLang === 'en'
            ? 'bg-indigo-600 text-white shadow'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;
