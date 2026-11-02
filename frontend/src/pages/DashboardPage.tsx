import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Award,
  Building2,
  CheckCircle,
  Database,
  FolderKanban,
  HardDrive,
  Inbox,
  LogOut,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CertificateManager } from '../components/dashboard/CertificateManager';
import { PendingCertificateManager } from '../components/dashboard/PendingCertificateManager';
import { ProjectManager } from '../components/dashboard/ProjectManager';
import { useAuth } from '../context/AuthContext';
import {
  useCertificates,
  usePendingCertificates,
  useProjects,
  useProviders,
} from '../hooks/usePortfolio';

type ActiveTab = 'certificates' | 'projects' | 'pending';

export const DashboardPage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const { data: certificates = [] } = useCertificates();
  const { data: projects = [] } = useProjects();
  const { data: providers = [] } = useProviders();
  const { data: pendingCerts = [] } = usePendingCertificates();

  const [activeTab, setActiveTab] = useState<ActiveTab>('certificates');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const pendingCount = pendingCerts.filter((p) => p.status === 'pending').length;
  const publishedCertsCount = certificates.filter((c) => c.is_published).length;
  const draftCertsCount = Math.max(0, certificates.length - publishedCertsCount);
  const publishedCertRatio =
    certificates.length > 0
      ? Math.round((publishedCertsCount / certificates.length) * 100)
      : 0;

  const featuredProjectsCount = projects.filter((p) => p.is_featured).length;
  const featuredProjectRatio =
    projects.length > 0
      ? Math.round((featuredProjectsCount / projects.length) * 100)
      : 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const showNotification = (msg: { type: 'success' | 'error'; text: string }) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((prev) => (prev?.text === msg.text ? null : prev));
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative selection:bg-indigo-500 selection:text-white">
      {/* Subtle Architectural Grid & Ambient Illumination */}
      <div
        className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-35 z-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[320px] bg-indigo-600/10 blur-[130px] rounded-full z-0"
        aria-hidden="true"
      />

      {/* Sticky Top Command Console Bar */}
      <header className="bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/90 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Identity & Portfolio Return */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ArrowLeft
                className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform"
                aria-hidden="true"
              />
              <span>Portfolio</span>
            </Link>

            <div className="h-5 w-px bg-slate-800 hidden sm:block" aria-hidden="true" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <Terminal className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm tracking-tight">
                    Admin Command Center
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    SYS.OPS // LIVE
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
                  Swiss Precision Operations Console · v2.4
                </p>
              </div>
            </div>
          </div>

          {/* Right: Infrastructure Telemetry Pills & Logout */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/90 text-[11px] font-mono text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Database className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                Neon PG
              </span>
              <span className="text-slate-700">•</span>
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                Supabase S3
              </span>
              <span className="text-slate-700">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                JWT Auth
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-slate-800 hover:border-red-500/30 transition-all text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Global Status Toast / Notification Banner */}
        {notification && (
          <div
            role={notification.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-xl backdrop-blur-md transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200 shadow-emerald-950/30'
                : 'bg-red-950/60 border-red-500/40 text-red-200 shadow-red-950/30'
            }`}
          >
            <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  notification.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {notification.type === 'success' ? (
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                )}
              </div>
              <span>{notification.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Benachrichtigung schließen"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Telemetry Bento KPI Grid / Modul-Umschalter */}
        <section aria-label="System-Kennzahlen" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI-01: Certificates */}
          <button
            type="button"
            onClick={() => setActiveTab('certificates')}
            className={`group text-left p-5 rounded-2xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeTab === 'certificates'
                ? 'bg-slate-900/95 border-indigo-500/50 shadow-lg shadow-indigo-950/30'
                : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                MOD-01 // S3 DOCS
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Award className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-400">Zertifikate (S3)</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums mt-0.5">
                  {certificates.length}
                </p>
              </div>
              <div className="text-right font-mono text-[11px]">
                <span className="text-emerald-400 font-semibold">{publishedCertsCount} Live</span>
                <span className="text-slate-600 mx-1">/</span>
                <span className="text-slate-400">{draftCertsCount} Entwurf</span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${publishedCertRatio}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Publikationsquote</span>
                <span className="text-slate-300">{publishedCertRatio}%</span>
              </div>
            </div>
          </button>

          {/* KPI-02: Projects */}
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`group text-left p-5 rounded-2xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeTab === 'projects'
                ? 'bg-slate-900/95 border-indigo-500/50 shadow-lg shadow-indigo-950/30'
                : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                MOD-02 // REPOS
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <FolderKanban className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-400">Projekte</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums mt-0.5">
                  {projects.length}
                </p>
              </div>
              <div className="text-right font-mono text-[11px]">
                <span className="text-amber-400 font-semibold">
                  {featuredProjectsCount} Featured
                </span>
              </div>
            </div>
            <div className="mt-3.5 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(15, featuredProjectRatio)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Highlight-Abdeckung</span>
                <span className="text-slate-300">{featuredProjectRatio}%</span>
              </div>
            </div>
          </button>

          {/* KPI-03: Providers */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/90 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  KPI-03 // ISSUERS
                </span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Building2 className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-400">Zertifikatsanbieter</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums mt-0.5">
                    {providers.length}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-cyan-400 font-semibold">
                  Verifiziert
                </span>
              </div>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" aria-hidden="true" />
                Ø{' '}
                {providers.length > 0
                  ? (certificates.length / providers.length).toFixed(1)
                  : '0.0'}{' '}
                Certs / Issuer
              </span>
              <span className="text-slate-300">Active</span>
            </div>
          </div>

          {/* KPI-04: Pending Review Queue */}
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`group text-left p-5 rounded-2xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              activeTab === 'pending'
                ? 'bg-slate-900/95 border-amber-500/50 shadow-lg shadow-amber-950/20'
                : pendingCount > 0
                  ? 'bg-slate-900/80 hover:bg-slate-900 border-amber-500/30 hover:border-amber-500/50'
                  : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                MOD-03 // INBOX QUEUE
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Inbox className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-400">Ausstehende Reviews</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums mt-0.5">
                  {pendingCount}
                </p>
              </div>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {pendingCount > 0 ? 'Prüfung offen' : 'Inbox leer'}
              </span>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" aria-hidden="true" />
                OCR & Auto-Track Pipeline
              </span>
              <span className="text-indigo-400 group-hover:underline">Öffnen →</span>
            </div>
          </button>
        </section>

        {/* Active Module Workspace */}
        <div className="pb-12">
          {activeTab === 'certificates' && (
            <CertificateManager onNotify={showNotification} />
          )}
          {activeTab === 'projects' && (
            <ProjectManager onNotify={showNotification} />
          )}
          {activeTab === 'pending' && (
            <PendingCertificateManager onNotify={showNotification} />
          )}
        </div>
      </main>
    </div>
  );
};
