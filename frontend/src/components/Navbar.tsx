import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LayoutDashboard, LogIn, LogOut, Menu, X } from 'lucide-react';
import { PORTFOLIO_OWNER_NAME } from '../constants';

const LOGO_SRC = '/static/img/icons/logo_df_3.png';

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === '/';

  const navItems = [
    { href: '#skills', index: '01', label: t('nav.skills') },
    { href: '#projects', index: '02', label: t('nav.projects') },
    { href: '#certificates', index: '03', label: t('nav.certificates') },
    { href: '#timeline', index: '04', label: t('nav.timeline') },
    { href: '#contact', index: '05', label: t('nav.contact') },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo — Swiss Precision Frame ohne scale-105 Shift */}
        <Link
          to="/"
          className="flex items-center gap-3 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl p-1"
        >
          <div className="relative flex items-center justify-center">
            <img
              src={LOGO_SRC}
              alt={`${PORTFOLIO_OWNER_NAME} Logo`}
              className="w-9 h-9 rounded-xl object-contain shadow-sm border border-slate-200/90 dark:border-slate-800 group-hover:border-indigo-500/60 transition-colors duration-200 bg-slate-950"
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950"
              aria-hidden="true"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 leading-tight">
              {PORTFOLIO_OWNER_NAME}
            </span>
            <span
              aria-hidden="true"
              className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-none mt-0.5"
            >
              SYS // ARCHITECTURE
            </span>
          </div>
        </Link>

        {/* Desktop Navigation — Tactile Pill Bar */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800/80">
          {isHome ? (
            navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group/nav px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/90 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span
                  aria-hidden="true"
                  className="hidden xl:inline font-mono text-[10px] text-slate-400 dark:text-slate-500 group-hover/nav:text-indigo-500 dark:group-hover/nav:text-indigo-400 transition-colors"
                >
                  {item.index}
                </span>
                <span>{item.label}</span>
              </a>
            ))
          ) : (
            <Link
              to="/"
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/90 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {t('nav.backToPortfolio')}
            </Link>
          )}
        </nav>

        {/* Action Buttons: Language Switcher + Theme Toggle + Auth */}
        <div className="hidden md:flex items-center gap-2.5">
          <LanguageSwitcher />
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('nav.dashboard')} ({user?.email?.split('@')[0]})</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title={t('nav.logout')}
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">{t('nav.logout')}</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-900 dark:text-slate-200 border border-slate-700 hover:bg-slate-800 hover:border-indigo-500/40 text-xs font-semibold transition-colors duration-200 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
              <span>{t('nav.login')}</span>
            </Link>
          )}
        </div>

        {/* Mobile menu and controls */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={mobileMenuOpen ? t('nav.closeMenu', 'Menü schließen') : t('nav.openMenu', 'Menü öffnen')}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown mit min-h-[44px] Touch Targets */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 pt-2 pb-6 space-y-1 animate-in fade-in slide-in-from-top-2"
        >
          {isHome ? (
            navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between min-h-[44px] py-2 px-3 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-xl cursor-pointer transition-colors"
              >
                <span>{item.label}</span>
                <span aria-hidden="true" className="font-mono text-xs text-slate-400 dark:text-slate-500">
                  {item.index}
                </span>
              </a>
            ))
          ) : (
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center min-h-[44px] py-2 px-3 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-xl cursor-pointer"
            >
              {t('nav.backToPortfolio')}
            </Link>
          )}

          <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-1">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 min-h-[44px] px-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                  <span>{t('nav.dashboard')}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="min-h-[44px] px-2 text-sm font-medium text-red-500 cursor-pointer"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 min-h-[44px] px-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>{t('nav.login')}</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
