import React from 'react';
import { Mail, MapPin, MessageSquare } from 'lucide-react';

export const ContactSection: React.FC = () => {
  return (
    <section id="contact" className="py-20 bg-slate-100/50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800/80 relative transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <MessageSquare className="w-3.5 h-3.5" />
            Kontakt aufnehmen
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Lass uns in Verbindung treten
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Interesse an einer Zusammenarbeit, einem Projekt oder fachlichem Austausch? Schreib mir gerne direkt eine Nachricht.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Email Card */}
          <a
            href="mailto:kontakt@dfluechter.de"
            className="group p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:bg-slate-900 transition-all text-center flex flex-col items-center justify-center space-y-3 shadow-sm hover:shadow-md hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">E-Mail</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">kontakt@dfluechter.de</p>
          </a>

          {/* GitHub Card */}
          <a
            href="https://github.com/DominikFluechter"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:bg-slate-900 transition-all text-center flex flex-col items-center justify-center space-y-3 shadow-sm hover:shadow-md hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">GitHub</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">@DominikFluechter</p>
          </a>

          {/* Location Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Standort</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Deutschland</p>
          </div>
        </div>
      </div>
    </section>
  );
};
