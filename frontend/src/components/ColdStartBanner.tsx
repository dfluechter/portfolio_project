import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Server,
  X,
} from 'lucide-react';
import { useColdStartTracker, type ColdStartOptions } from '../hooks/useColdStartTracker';

export interface ColdStartBannerProps extends ColdStartOptions {
  /** Optionaler Callback beim Klick auf Retry */
  onRetry?: () => void;
}

export const ColdStartBanner: React.FC<ColdStartBannerProps> = ({
  delayMs = 2000,
  timeoutMs = 30000,
  onRetry,
}) => {
  const { isColdStarting, isTimedOut, isSuccess, retry, dismiss } = useColdStartTracker({
    delayMs,
    timeoutMs,
  });

  const handleRetry = () => {
    retry();
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <AnimatePresence>
      {isColdStarting && (
        <motion.div
          key="cold-start-banner"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 inset-x-0 z-50 shadow-xl"
        >
          <div
            className={`border-b transition-colors duration-300 ${
              isTimedOut
                ? 'bg-amber-950/95 border-amber-500/40 text-amber-100'
                : isSuccess
                ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100'
                : 'bg-slate-900/95 dark:bg-slate-950/95 border-indigo-500/30 text-slate-100'
            } backdrop-blur-md px-4 py-2.5 sm:px-6`}
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              {/* Status & Message */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isTimedOut
                      ? 'bg-amber-500/20 text-amber-400'
                      : isSuccess
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }`}
                >
                  {isTimedOut ? (
                    <AlertTriangle className="w-4 h-4 animate-bounce" />
                  ) : isSuccess ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Server className="w-4 h-4 animate-pulse" />
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-semibold truncate">
                    {isTimedOut
                      ? 'Verbindung dauert ungewöhnlich lange'
                      : isSuccess
                      ? 'Server erfolgreich verbunden!'
                      : 'Server wacht auf (Render Free-Tier)...'}
                  </span>
                  <span className="text-[11px] text-slate-300 dark:text-slate-400 hidden md:inline truncate">
                    {isTimedOut
                      ? 'Der Server hat nach 30 Sekunden nicht geantwortet.'
                      : isSuccess
                      ? 'Alle Daten wurden erfolgreich geladen.'
                      : 'Nach Inaktivität benötigt das Backend ca. 20–30s zum Starten.'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isTimedOut && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Erneut versuchen
                  </button>
                )}

                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Hinweis schließen"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Animierter Ladebalken während des Aufwachens */}
            {!isTimedOut && !isSuccess && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-950 overflow-hidden">
                <div className="h-full w-full bg-gradient-to-r from-indigo-500 via-violet-400 to-indigo-500 animate-pulse" />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
