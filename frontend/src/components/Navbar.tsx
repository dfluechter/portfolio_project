import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LayoutDashboard, LogIn, LogOut, Menu, X } from 'lucide-react';
import { PORTFOLIO_OWNER_NAME } from '../constants';

const LOGO_SRC = import.meta.env.DEV
  ? '/static/img/icons/logo_df_1.png'
  : `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/static/img/icons/logo_df_1.png`;

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo - kein scale-105 Shift, stattdessen dezenter Border-Hover */}
        <Link to="/" className="flex items-center gap-2.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-0.5">
          <img
            src={LOGO_SRC}
            alt={`${PORTFOLIO_OWNER_NAME} Logo`}
            className="w-10 h-10 rounded-xl object-contain shadow-md shadow-indigo-500/10 border border-slate-200/80 dark:border-slate-800 group-hover:border-indigo-500/50 transition-colors duration-200 bg-black"
          />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
            {PORTFOLIO_OWNER_NAME}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          {isHome ? (
            <>
              <a href="#about" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                {t('nav.about')}
              </a>
              <a href="#skills" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                {t('nav.skills')}
              </a>
              <a href="#projects" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                {t('nav.projects')}
              </a>
              <a href="#certificates" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                {t('nav.certificates')}
              </a>
              <a href="#timeline" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                {t('nav.timeline')}
              </a>
              <a href="#contact" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                {t('nav.contact')}
              </a>
            </>
          ) : (
            <Link to="/" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
              {t('nav.backToPortfolio')}
            </Link>
          )}
        </nav>

        {/* Action Buttons: Language Switcher + Theme Toggle + Auth */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-900 dark:text-slate-200 border border-slate-700 hover:bg-slate-800 text-xs font-semibold transition-colors duration-200 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={mobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
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
          className="md:hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 pt-2 pb-6 space-y-1 animate-in fade-in slide-in-from-top-2"
        >
          {isHome ? (
            <>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] py-2 px-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-lg cursor-pointer"
              >
                {t('nav.about')}
              </a>
              <a
                href="#skills"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] py-2 px-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-lg cursor-pointer"
              >
                {t('nav.skills')}
              </a>
              <a
                href="#projects"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] py-2 px-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-lg cursor-pointer"
              >
                {t('nav.projects')}
              </a>
              <a
                href="#certificates"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] py-2 px-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-lg cursor-pointer"
              >
                {t('nav.certificates')}
              </a>
              <a
                href="#timeline"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] py-2 px-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-lg cursor-pointer"
              >
                {t('nav.timeline')}
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] py-2 px-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-lg cursor-pointer"
              >
                {t('nav.contact')}
              </a>
            </>
          ) : (
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center min-h-[44px] py-2 px-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-lg cursor-pointer"
            >
              {t('nav.backToPortfolio')}
            </Link>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
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
