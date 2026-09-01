import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all duration-200 shadow-sm hover:scale-105 active:scale-95"
      title={`Aktuell: ${resolvedTheme === 'dark' ? 'Dunkelmodus' : 'Hellmodus'} (Klicken zum Wechseln)`}
      aria-label="Design-Modus umschalten"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 animate-in spin-in-180 duration-300" />
      )}
    </button>
  );
};
