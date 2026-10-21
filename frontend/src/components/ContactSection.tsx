import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Mail, MapPin } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const emailAddress = 'kontakt@dfluechter.de';

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(emailAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section
      id="contact"
      className="py-24 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/90 dark:border-slate-800/90 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Direct editorial heading & copy */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-semibold">
              05 // Direct Communication
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Lass uns in Verbindung treten
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed max-w-md">
              Interesse an einer technischen Zusammenarbeit, einem Architektur-Review oder fachlichem Austausch? Schreib mir direkt per E-Mail oder vernetze dich über GitHub.
            </p>
          </div>

          {/* Right Column: Structured Contact Ledger */}
          <div className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 divide-y divide-slate-200/80 dark:divide-slate-800/80 overflow-hidden shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 hover:bg-slate-50/80 dark:hover:bg-slate-900 transition-colors">
              <a
                href={`mailto:${emailAddress}`}
                className="group flex items-center gap-4 focus:outline-none"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center transition-colors">
                  <Mail className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    E-Mail schreiben
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {emailAddress}
                  </p>
                </div>
              </a>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  title="E-Mail-Adresse kopieren"
                  aria-label={copied ? 'E-Mail kopiert' : 'E-Mail kopieren'}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Kopiert!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                      <span>Kopieren</span>
                    </>
                  )}
                </button>
                <a
                  href={`mailto:${emailAddress}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <span>Öffnen</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>

            <a
              href="https://github.com/DominikFluechter"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-4 p-6 hover:bg-slate-50/80 dark:hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    GitHub-Profil
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    github.com/DominikFluechter
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline">
                Repositories ansehen
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </a>

            <div className="flex items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    Standort
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Deutschland (Remote & Hybrid)
                  </p>
                </div>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Verfügbar für Projekte
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
