import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { Code2, LayoutDashboard, LogIn, LogOut, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
            Dominik Flüchter
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          {isHome ? (
            <>
              <a href="#about" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">
                Über mich
              </a>
              <a href="#skills" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">
                Skills
              </a>
              <a href="#projects" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">
                Projekte
              </a>
              <a href="#certificates" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">
                Zertifikate
              </a>
              <a href="#timeline" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">
                Werdegang
              </a>
              <a href="#contact" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">
                Kontakt
              </a>
            </>
          ) : (
            <Link to="/" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">
              ← Zurück zum Portfolio
            </Link>
          )}
        </nav>

        {/* Action Buttons: Theme Toggle + Auth */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard ({user?.email?.split('@')[0]})
              </Link>
              <button
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                title="Abmelden"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-900 dark:text-slate-200 border border-slate-700 hover:bg-slate-800 text-xs font-semibold transition-all shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-400" />
              Admin Login
            </Link>
          )}
        </div>

        {/* Mobile menu and theme toggle */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 pt-2 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2">
          {isHome ? (
            <>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
              >
                Über mich
              </a>
              <a
                href="#skills"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
              >
                Skills
              </a>
              <a
                href="#projects"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
              >
                Projekte
              </a>
              <a
                href="#certificates"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
              >
                Zertifikate
              </a>
              <a
                href="#timeline"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
              >
                Werdegang
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
              >
                Kontakt
              </a>
            </>
          ) : (
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
            >
              ← Zurück zum Portfolio
            </Link>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-medium text-red-500"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
              >
                <LogIn className="w-4 h-4" />
                Admin Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
