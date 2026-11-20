import React from 'react';
import { AlertTriangle, Inbox, RotateCcw, SearchX } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface SectionEmptyStateProps {
  sectionName: string;
  query?: string;
  onReset?: () => void;
  isError?: boolean;
  onRetry?: () => void;
}

export const SectionEmptyState: React.FC<SectionEmptyStateProps> = ({
  sectionName,
  query = '',
  onReset,
  isError = false,
  onRetry,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const trimmedQuery = query.trim();

  if (isError) {
    return (
      <motion.div
        role="alert"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
        className="p-8 my-6 text-center rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/25 dark:border-rose-500/30 max-w-xl mx-auto space-y-4 surface-refraction"
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20 shadow-2xs">
          <AlertTriangle className="w-6 h-6" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-block font-mono text-[10px] uppercase tracking-widest text-rose-600 dark:text-rose-400 font-semibold">
            ERR // TELEMETRY_SYNC_FAILED
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('common.sectionErrorTitle', {
              sectionName,
              defaultValue: isEn
                ? `Unable to load ${sectionName}`
                : `${sectionName} konnten nicht geladen werden`,
            })}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {t(
              'common.sectionErrorDesc',
              isEn
                ? 'The backend endpoint did not respond in time. Please check your connection or retry.'
                : 'Die Verbindung zum API-Endpunkt wurde unterbrochen. Bitte prüfen Sie Ihre Verbindung oder versuchen Sie es erneut.'
            )}
          </p>
        </div>

        {onRetry && (
          <div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 hover:border-rose-500 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-[0.98] active:translate-y-[1px] transition-all duration-200 shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {t('common.retry', isEn ? 'Try again' : 'Erneut versuchen')}
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  if (!trimmedQuery) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
        className="p-8 my-6 text-center rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 max-w-xl mx-auto space-y-4 surface-refraction"
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 flex items-center justify-center mx-auto border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <Inbox className="w-6 h-6" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <span className="inline-block font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
            SYS // EMPTY_DATASET
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('search.emptySectionTitle', {
              sectionName,
              defaultValue: isEn
                ? `No entries in ${sectionName}`
                : `Keine Einträge in ${sectionName}`,
            })}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {t(
              'search.emptySectionDesc',
              isEn
                ? 'There are currently no published records available in this module.'
                : 'Derzeit sind in diesem Bereich noch keine veröffentlichten Einträge hinterlegt.'
            )}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="p-8 my-6 text-center rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 max-w-xl mx-auto space-y-4 surface-refraction"
    >
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
        <SearchX className="w-6 h-6" aria-hidden="true" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {t('search.noMatchesInSection', { sectionName, defaultValue: `Keine Treffer in ${sectionName}` })}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isEn ? (
            <>
              No matching entries were found in this section for{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                „{trimmedQuery}“
              </span>
              .
            </>
          ) : (
            <>
              Für den Suchbegriff{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                „{trimmedQuery}“
              </span>{' '}
              wurden in diesem Bereich keine passenden Einträge gefunden.
            </>
          )}
        </p>
      </div>

      {onReset && (
        <div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-[0.98] active:translate-y-[1px] transition-all duration-200 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            {t('search.resetFilter', 'Suchfilter zurücksetzen')}
          </button>
        </div>
      )}
    </motion.div>
  );
};
