import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

/**
 * Gestochen scharfe Vektor-Flagge Deutschland (Schwarz-Rot-Gold)
 */
export const GermanFlag: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <svg
    viewBox="0 0 640 480"
    className={className}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    data-testid="flag-de"
  >
    <rect width="640" height="160" fill="#000000" />
    <rect y="160" width="640" height="160" fill="#DD0000" />
    <rect y="320" width="640" height="160" fill="#FFCE00" />
  </svg>
);

/**
 * Gestochen scharfe Vektor-Flagge Vereinigtes Königreich (Union Jack)
 */
export const UkFlag: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <svg
    viewBox="0 0 60 30"
    className={className}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    data-testid="flag-en"
  >
    <rect width="60" height="30" fill="#012169" />
    <path d="M0 0 L60 30 M60 0 L0 30" stroke="#ffffff" strokeWidth="6" />
    <path d="M0 0 L60 30 M60 0 L0 30" stroke="#C8102E" strokeWidth="4" />
    <path d="M30 0 v30 M0 15 h60" stroke="#ffffff" strokeWidth="10" />
    <path d="M30 0 v30 M0 15 h60" stroke="#C8102E" strokeWidth="6" />
  </svg>
);

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
      className="relative inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all duration-200"
    >
      {/* Links: Gestochen scharfes Inline-SVG-Flaggen-Icon der gewählten Sprache */}
      <div className="absolute left-2.5 pointer-events-none flex items-center justify-center shrink-0 rounded-xs overflow-hidden shadow-2xs border border-black/10">
        {currentLang === 'de' ? (
          <GermanFlag className="w-4 h-3 object-cover" />
        ) : (
          <UkFlag className="w-4 h-3 object-cover" />
        )}
      </div>

      {/* Natives, barrierefreies Select-Element */}
      <select
        aria-label="Sprachauswahl / Language Selection"
        value={currentLang}
        onChange={(e) => handleLanguageChange(e.target.value as 'de' | 'en')}
        className="appearance-none bg-transparent pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white cursor-pointer focus:outline-none rounded-xl"
      >
        <option
          value="de"
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        >
          🇩🇪 Deutsch (DE)
        </option>
        <option
          value="en"
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        >
          🇬🇧 English (EN)
        </option>
      </select>

      {/* Rechts: Subtiles ChevronDown-Icon */}
      <div className="absolute right-2 pointer-events-none text-slate-400 dark:text-slate-500 flex items-center">
        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
      </div>
    </div>
  );
};

export default LanguageSwitcher;
