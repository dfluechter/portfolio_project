import axios from 'axios';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRequestPasswordReset } from '../hooks/usePortfolio';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { PORTFOLIO_OWNER_NAME } from '../constants';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Passwort-Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const resetMutation = useRequestPasswordReset();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    try {
      const res = await resetMutation.mutateAsync();
      setResetSuccess(
        res.detail ||
          'Eine E-Mail mit dem Wiederherstellungslink wurde erfolgreich an die hinterlegte Inhaber-Adresse versendet!'
      );
    } catch (err: unknown) {
      let msg = 'Fehler beim Anfordern des Passwort-Resets.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.detail || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setResetError(msg);
    }
  };

  // Falls bereits eingeloggt, direkt ins Dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (axios.isAxiosError(err)) {
        const detail =
          err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          'Anmeldung fehlgeschlagen. Bitte prüfe E-Mail und Passwort.';
        setError(detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ein unbekannter Fehler ist aufgetreten.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Ambient Grid & Background Glow Orbs */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 z-0" 
        style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.12) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-[110px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-fuchsia-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-3/4 w-80 h-80 rounded-full bg-cyan-500/15 blur-[100px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-all bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 px-3.5 py-1.5 rounded-xl backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Portfolio
        </Link>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>SYS • ONLINE</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
        <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-black/80 space-y-7 relative group">
          
          {/* Subtle glowing card gradient border */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/30 via-purple-500/20 to-cyan-500/30 rounded-3xl -z-10 opacity-70 group-hover:opacity-100 transition-opacity" />

          {/* Hero Emblem & Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-cyan-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20 relative group-hover:scale-105 transition-transform duration-300">
              <Shield className="w-8 h-8 text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '8s' }} />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                Portfolio Admin Login
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Authentifizierung via JWT & Django REST
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                E-Mail-Adresse
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  aria-required="true"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Passwort
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  aria-required="true"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-500 hover:text-indigo-400 focus:outline-none focus:text-indigo-400 focus:ring-2 focus:ring-indigo-500/50 rounded p-1 transition-all"
                  aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Passwort zurücksetzen Trigger */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setResetSuccess(null);
                  setResetError(null);
                  setShowResetModal(true);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-colors focus:outline-none"
              >
                Passwort zurücksetzen?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Wird angemeldet...</span>
                </>
              ) : (
                <span>Sicher Einloggen</span>
              )}
            </button>
          </form>

          {/* Security Spec Note */}
          <div className="pt-2 text-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 bg-slate-950/40 border border-slate-800/80 px-3 py-1 rounded-lg">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>TLS • 256-BIT ENCRYPTED</span>
            </span>
          </div>

        </div>
      </main>

      {/* Passwort zurücksetzen Modal */}
      {showResetModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="reset-modal-title" className="text-base font-bold text-white">
                    Passwort zurücksetzen
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sicheren Wiederherstellungs-Link anfordern
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3.5">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {resetSuccess}
                </p>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-md shadow-emerald-600/20"
                >
                  Verstanden & Schließen
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ein Link zum Zurücksetzen deines Passworts wird direkt an die in der Server-Konfiguration hinterlegte Inhaber-Adresse (<code className="text-indigo-300 bg-slate-800 px-1 py-0.5 rounded">PORTFOLIO_OWNER_EMAIL</code>) versendet.
                </p>

                {resetError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                    {resetError}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={resetMutation.isPending}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resetMutation.isPending ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Wird versendet...</span>
                      </>
                    ) : (
                      <span>E-Mail an Inhaber senden</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-600 font-mono">
        &copy; {new Date().getFullYear()} {PORTFOLIO_OWNER_NAME} • All Rights Reserved
      </footer>
    </div>
  );
};

