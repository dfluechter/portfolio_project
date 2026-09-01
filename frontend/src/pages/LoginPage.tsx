import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Shield, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    } catch (err: any) {
      console.error('Login error:', err);
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Anmeldung fehlgeschlagen. Bitte prüfe E-Mail und Passwort.';
      setError(detail);
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                E-Mail-Adresse
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Passwort
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-500 hover:text-indigo-400 transition-colors p-1"
                  tabIndex={-1}
                  aria-label="Passwort anzeigen/verbergen"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authentifiziere...</span>
                </>
              ) : (
                <span>Anmelden</span>
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

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-600 font-mono">
        &copy; {new Date().getFullYear()} Dominik Flüchter • All Rights Reserved
      </footer>
    </div>
  );
};

