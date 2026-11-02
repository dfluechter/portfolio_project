import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Award,
  Briefcase,
  Compass,
  FileCode2,
  FolderGit2,
  Home,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { PORTFOLIO_OWNER_NAME } from '../constants';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Button } from '../components/ui/button';

const LOGO_SRC = '/static/img/icons/logo_df_3.png';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const quickLinks = [
    {
      to: '/#skills',
      index: '01',
      title: t('nav.skills', 'Skills'),
      desc: t('notfound.linkSkills', 'Technologie-Stack & Frameworks'),
      icon: FileCode2,
    },
    {
      to: '/#projects',
      index: '02',
      title: t('nav.projects', 'Projekte'),
      desc: t('notfound.linkProjects', 'Architektur & Web-Applikationen'),
      icon: FolderGit2,
    },
    {
      to: '/#certificates',
      index: '03',
      title: t('nav.certificates', 'Zertifikate'),
      desc: t('notfound.linkCertificates', 'Verifizierte Nachweise & OCR'),
      icon: Award,
    },
    {
      to: '/#timeline',
      index: '04',
      title: t('nav.timeline', 'Werdegang'),
      desc: t('notfound.linkTimeline', 'Chronologie & Meilensteine'),
      icon: Briefcase,
    },
    {
      to: '/#contact',
      index: '05',
      title: t('nav.contact', 'Kontakt'),
      desc: t('notfound.linkContact', 'Direkte Kommunikation & Formmailer'),
      icon: Mail,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden transition-colors duration-200">
      {/* Background Architectural Grid Pattern */}
      <div
        className="absolute inset-0 bg-architectural-grid opacity-35 dark:opacity-20 pointer-events-none select-none"
        aria-hidden="true"
      />

      {/* Top Header Bar */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md">
        <Link
          to="/"
          className="flex items-center gap-3 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl p-1"
          aria-label={t('nav.backToPortfolio', 'Zurück zum Portfolio')}
        >
          <div className="relative flex items-center justify-center">
            <img
              src={LOGO_SRC}
              alt={`${PORTFOLIO_OWNER_NAME} Logo`}
              className="size-8 sm:size-9 rounded-xl object-contain shadow-sm border border-slate-200/90 dark:border-slate-800 group-hover:border-indigo-500/60 transition-colors duration-200 bg-slate-950"
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950"
              aria-hidden="true"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
              {PORTFOLIO_OWNER_NAME}
            </span>
            <span
              className="hidden sm:inline-block font-mono text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-none mt-0.5"
              aria-hidden="true"
            >
              SYS // ARCHITECTURE
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-2xl w-full text-center flex flex-col gap-6">
          {/* Status Chip */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 dark:bg-red-950/40 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
            <span>SYS // 404: ROUTE_NOT_RESOLVED</span>
          </div>

          {/* Large Architectural 404 Display */}
          <div className="relative py-2 select-none" aria-hidden="true">
            <div className="text-7xl sm:text-9xl font-black tracking-tighter text-slate-200 dark:text-slate-900/90 font-mono">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-500 dark:from-indigo-400 dark:via-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
                404
              </span>
            </div>
          </div>

          {/* Heading & Explanatory Text */}
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('notfound.heading', 'Zieladresse nicht auffindbar')}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
              {t(
                'notfound.subheading',
                'Der angeforderte Endpunkt existiert nicht im Routing-System oder wurde im Rahmen eines Updates verschoben.'
              )}
            </p>
          </div>

          {/* Route Inspector Pill */}
          <div className="inline-block max-w-full overflow-hidden text-left bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-2xs">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
              REQUESTED // PATH
            </div>
            <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 truncate max-w-xs sm:max-w-md">
              {location.pathname}
            </div>
          </div>

          {/* Action Buttons via shadcn/ui Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild size="default" className="w-full sm:w-auto min-h-[44px] gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm">
              <Link to="/">
                <Home className="w-4 h-4" aria-hidden="true" />
                <span>{t('notfound.homeBtn', 'Zur Startseite')}</span>
              </Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => window.history.back()}
              className="w-full sm:w-auto min-h-[44px] gap-2 rounded-xl border-slate-200/90 dark:border-slate-800 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>{t('notfound.backBtn', 'Vorherige Seite')}</span>
            </Button>
          </div>

          {/* Fast Navigation Hub */}
          <div className="pt-8 border-t border-slate-200/70 dark:border-slate-800/80 text-left flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <Compass className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
              <span>{t('notfound.quickLinksHeading', 'Verfügbare Systemmodule')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {quickLinks.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="group p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:bg-slate-50/80 dark:hover:bg-slate-900 transition-all shadow-2xs flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <IconComponent className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                          {item.index}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Technical Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
        <div>
          SYS // ERROR_HANDLER • {new Date().getFullYear()} {PORTFOLIO_OWNER_NAME}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>HTTP_STATUS // 404 NOT_FOUND</span>
        </div>
      </footer>
    </div>
  );
};
