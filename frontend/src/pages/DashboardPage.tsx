import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCertificates, usePendingCertificates, useProjects } from '../hooks/usePortfolio';
import { Award, FolderGit2, Inbox, LayoutDashboard, LogOut, X } from 'lucide-react';
import { CertificateManager } from '../components/dashboard/CertificateManager';
import { PendingCertificateManager } from '../components/dashboard/PendingCertificateManager';
import { ProjectManager } from '../components/dashboard/ProjectManager';

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'certificates' | 'projects' | 'inbox'>('certificates');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: rawCertificates = [] } = useCertificates();
  const certificates = Array.isArray(rawCertificates) ? rawCertificates : [];
  const { data: rawProjects = [] } = useProjects();
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const { data: rawPendingList = [] } = usePendingCertificates();
  const pendingList = Array.isArray(rawPendingList) ? rawPendingList : [];
  const pendingCount = pendingList.filter((p) => p.status === 'pending').length;

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 bg-architectural-grid flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-400">Lade Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-architectural-grid text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Dashboard Top Header */}
      <header className="bg-slate-950/90 border-b border-slate-800/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white leading-tight">Portfolio Admin Dashboard</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  ADMIN CONSOLE // ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-white transition-colors duration-200"
            >
              Zum Portfolio →
            </button>
            <button
              type="button"
              onClick={logout}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold border border-red-500/20 transition-colors duration-200"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Status Message Notification */}
        {statusMessage && (
          <div
            role={statusMessage.type === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 ${statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="cursor-pointer text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors duration-200"
              aria-label="Nachricht schließen"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* KPI Metrics Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('certificates')}
            className="cursor-pointer text-left p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
              <span>ZERTIFIKATE</span>
              <Award className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{certificates.length}</div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              {certificates.filter((c) => c.is_published).length} online · {certificates.filter((c) => !c.is_published).length} entwurf
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className="cursor-pointer text-left p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
              <span>PROJEKTE</span>
              <FolderGit2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{projects.length}</div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Portfolio-Showcases
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className="cursor-pointer text-left p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-900 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
              <span>INBOX / REVIEW</span>
              <Inbox className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">{pendingCount}</span>
              {pendingCount > 0 && (
                <span className="text-[11px] font-mono text-amber-400 font-semibold">neu</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Upload & Scan Pipeline
            </div>
          </button>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
              <span>SYSTEM-STACK</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            </div>
            <div className="text-sm font-bold text-emerald-400 tracking-tight font-mono">
              BEREIT // PROD
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              PostgreSQL · S3 · AI RAG
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Dashboard-Bereiche"
          className="flex items-center gap-2 border-b border-slate-800 pb-4 overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'certificates'}
            onClick={() => setActiveTab('certificates')}
            className={`cursor-pointer min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-200 shrink-0 whitespace-nowrap border ${activeTab === 'certificates'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
          >
            <Award className="w-4 h-4" aria-hidden="true" />
            Zertifikate ({certificates.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'projects'}
            onClick={() => setActiveTab('projects')}
            className={`cursor-pointer min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-200 shrink-0 whitespace-nowrap border ${activeTab === 'projects'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
          >
            <FolderGit2 className="w-4 h-4" aria-hidden="true" />
            Projekte ({projects.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'inbox'}
            onClick={() => setActiveTab('inbox')}
            className={`cursor-pointer min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-200 shrink-0 whitespace-nowrap border ${activeTab === 'inbox'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
          >
            <Inbox className="w-4 h-4" aria-hidden="true" />
            Inbox / Review
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'certificates' && <CertificateManager onNotify={setStatusMessage} />}
        {activeTab === 'projects' && <ProjectManager onNotify={setStatusMessage} />}
        {activeTab === 'inbox' && <PendingCertificateManager onNotify={setStatusMessage} />}
      </main>
    </div>
  );
};

