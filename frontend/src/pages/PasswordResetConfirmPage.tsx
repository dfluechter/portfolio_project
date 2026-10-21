import axios from 'axios';
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Shield } from 'lucide-react';
import { useConfirmPasswordReset } from '../hooks/usePortfolio';
import { PORTFOLIO_OWNER_NAME } from '../constants';

export const PasswordResetConfirmPage: React.FC = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const confirmMutation = useConfirmPasswordReset();

  const [newPassword, setNewPassword] = useState('');
  const [reNewPassword, setReNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!uid || !token) {
      setError('Ungültiger oder unvollständiger Wiederherstellungs-Link.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    if (newPassword !== reNewPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    try {
      await confirmMutation.mutateAsync({
        uid,
        token,
        new_password: newPassword,
        re_new_password: reNewPassword,
      });
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3500);
    } catch (err: unknown) {
      let msg = 'Fehler beim Zurücksetzen des Passworts. Der Link ist möglicherweise abgelaufen.';
      if (axios.isAxiosError(err)) {
        msg =
          err.response?.data?.new_password?.[0] ||
          err.response?.data?.detail ||
          err.response?.data?.token?.[0] ||
          msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-architectural-grid text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Top Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors duration-200 bg-slate-900/90 border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Zurück zum Login
        </Link>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
          <span>SECURITY • RESET</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
        <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 p-8 sm:p-10 rounded-2xl shadow-2xl space-y-7 relative">
          {/* Icon & Title */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            </div>

            <div>
              <span className="block text-[10px] font-mono uppercase tracking-widest text-indigo-400 mb-1">
                AUTH // CREDENTIAL RECOVERY
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Neues Passwort vergeben
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Wähle ein sicheres neues Passwort für deinen Portfolio-Admin-Zugang.
              </p>
            </div>
          </div>

          {isSuccess ? (
            <div
              role="status"
              aria-atomic="true"
              className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 animate-in fade-in"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold text-white">Passwort erfolgreich geändert!</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Du wirst in wenigen Sekunden automatisch zur Login-Seite weitergeleitet...
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors duration-200 shadow-sm"
              >
                Jetzt direkt anmelden
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Neues Passwort (min. 8 Zeichen)
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" aria-hidden="true" />
                    <input
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="cursor-pointer absolute right-3 text-slate-500 hover:text-indigo-400 rounded p-1 transition-colors duration-200"
                      aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5"
                  >
                    Neues Passwort bestätigen
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" aria-hidden="true" />
                    <input
                      id="reset-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={reNewPassword}
                      onChange={(e) => setReNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors duration-200"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={confirmMutation.isPending}
                  className="cursor-pointer w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {confirmMutation.isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Wird gespeichert...</span>
                    </>
                  ) : (
                    <span>Neues Passwort speichern</span>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="pt-2 text-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg">
              <Shield className="w-3 h-3 text-emerald-400" aria-hidden="true" />
              <span>TLS • END-TO-END VERIFIED</span>
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-500 font-mono">
        &copy; {CURRENT_YEAR} {PORTFOLIO_OWNER_NAME} • All Rights Reserved
      </footer>
    </div>
  );
};

const CURRENT_YEAR = new Date().getFullYear();
