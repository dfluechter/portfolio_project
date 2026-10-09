import React from 'react';
import { RotateCcw, SearchX } from 'lucide-react';
import { motion } from 'framer-motion';

interface SectionEmptyStateProps {
  sectionName: string;
  query: string;
  onReset: () => void;
}

export const SectionEmptyState: React.FC<SectionEmptyStateProps> = ({
  sectionName,
  query,
  onReset,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="p-8 my-6 text-center rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 max-w-xl mx-auto space-y-4"
    >
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
        <SearchX className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Keine Treffer in {sectionName}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Für den Suchbegriff{' '}
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            „{query}“
          </span>{' '}
          wurden in diesem Bereich keine passenden Einträge gefunden.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm hover:-translate-y-0.5 active:translate-y-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Suchfilter zurücksetzen
        </button>
      </div>
    </motion.div>
  );
};
