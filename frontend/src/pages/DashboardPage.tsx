import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { portfolioService } from '../services/portfolioService';
import { Certificate, Project } from '../types';
import {
  Award,
  CheckCircle,
  ExternalLink,
  FolderGit2,
  Github,
  LayoutDashboard,
  LogOut,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'projects' | 'certificates'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Project Form State
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectGithub, setProjectGithub] = useState('');
  const [projectLive, setProjectLive] = useState('');
  const [submittingProject, setSubmittingProject] = useState(false);

  // New Certificate Form State
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [submittingCert, setSubmittingCert] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [projData, certData] = await Promise.all([
        portfolioService.getProjects(),
        portfolioService.getCertificates(),
      ]);
      setProjects(projData);
      setCertificates(certData);
    } catch (err) {
      console.error('Fehler beim Laden der Dashboard-Daten:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProject(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('title', projectTitle);
    formData.append('description', projectDesc);
    if (projectGithub) formData.append('github_url', projectGithub);
    if (projectLive) formData.append('live_url', projectLive);

    try {
      await portfolioService.createProject(formData);
      setStatusMessage({ type: 'success', text: 'Projekt erfolgreich angelegt!' });
      setProjectTitle('');
      setProjectDesc('');
      setProjectGithub('');
      setProjectLive('');
      await loadData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Fehler beim Erstellen des Projekts.',
      });
    } finally {
      setSubmittingProject(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm('Möchtest du dieses Projekt wirklich löschen?')) return;
    try {
      await portfolioService.deleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
      setStatusMessage({ type: 'success', text: 'Projekt gelöscht.' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Fehler beim Löschen des Projekts.' });
    }
  };

  const handleCreateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFile) {
      setStatusMessage({ type: 'error', text: 'Bitte wähle eine PDF-, PNG- oder JPG-Datei aus.' });
      return;
    }

    setSubmittingCert(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('title', certTitle);
    formData.append('issuer', certIssuer);
    formData.append('pdf_file', certFile);

    try {
      await portfolioService.createCertificate(formData);
      setStatusMessage({ type: 'success', text: 'Zertifikat erfolgreich hochgeladen!' });
      setCertTitle('');
      setCertIssuer('');
      setCertFile(null);
      await loadData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Fehler beim Hochladen des Zertifikats.',
      });
    } finally {
      setSubmittingCert(false);
    }
  };

  const handleDeleteCertificate = async (id: number) => {
    if (!window.confirm('Möchtest du dieses Zertifikat wirklich löschen?')) return;
    try {
      await portfolioService.deleteCertificate(id);
      setCertificates(certificates.filter((c) => c.id !== id));
      setStatusMessage({ type: 'success', text: 'Zertifikat gelöscht.' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Fehler beim Löschen des Zertifikats.' });
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-400">Lade Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Dashboard Top Header */}
      <header className="bg-slate-900/60 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Admin Dashboard</h1>
              <p className="text-[11px] text-slate-400 font-mono">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Zum Portfolio →
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold border border-red-500/20 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
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
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'projects'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            Projekte ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'certificates'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            Zertifikate ({certificates.length})
          </button>
        </div>

        {/* TAB 1: PROJECTS */}
        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Project Form */}
            <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-fit space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Plus className="w-5 h-5 text-indigo-400" />
                Neues Projekt hinzufügen
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Titel</label>
                  <input
                    type="text"
                    required
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="z. B. Cloud Architecture Tool"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Beschreibung</label>
                  <textarea
                    rows={4}
                    required
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="Details zum Projekt, Technologien, etc."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">GitHub URL (optional)</label>
                  <input
                    type="url"
                    value={projectGithub}
                    onChange={(e) => setProjectGithub(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Live URL (optional)</label>
                  <input
                    type="url"
                    value={projectLive}
                    onChange={(e) => setProjectLive(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingProject}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submittingProject ? 'Wird gespeichert...' : 'Projekt speichern'}
                </button>
              </form>
            </div>

            {/* Existing Projects List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-base font-bold text-white">Vorhandene Projekte ({projects.length})</h2>
              {loadingData ? (
                <div className="p-8 text-center text-slate-500 text-xs">Lade Projekte...</div>
              ) : projects.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 text-xs">
                  Noch keine Projekte in der Datenbank angelegt.
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <h3 className="font-bold text-white text-sm">{proj.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2">{proj.description}</p>
                        <div className="flex items-center gap-3 pt-2">
                          {proj.github_url && (
                            <a
                              href={proj.github_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <Github className="w-3 h-3" /> GitHub
                            </a>
                          )}
                          {proj.live_url && (
                            <a
                              href={proj.live_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-violet-400 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Live Demo
                            </a>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteProject(proj.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                        title="Projekt löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CERTIFICATES */}
        {activeTab === 'certificates' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Certificate Form */}
            <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-fit space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Upload className="w-5 h-5 text-indigo-400" />
                Zertifikat hochladen
              </div>

              <form onSubmit={handleCreateCertificate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Titel des Zertifikats</label>
                  <input
                    type="text"
                    required
                    value={certTitle}
                    onChange={(e) => setCertTitle(e.target.value)}
                    placeholder="z. B. Meta Full-Stack Certificate"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Aussteller / Organisation</label>
                  <input
                    type="text"
                    required
                    value={certIssuer}
                    onChange={(e) => setCertIssuer(e.target.value)}
                    placeholder="z. B. Coursera, Meta, IBM, Google"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Datei (PDF, PNG, JPG ≤ 5 MB)
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-300 hover:file:bg-indigo-600/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingCert}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submittingCert ? 'Wird hochgeladen...' : 'Zertifikat hochladen'}
                </button>
              </form>
            </div>

            {/* Existing Certificates List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-base font-bold text-white">Vorhandene Zertifikate ({certificates.length})</h2>
              {loadingData ? (
                <div className="p-8 text-center text-slate-500 text-xs">Lade Zertifikate...</div>
              ) : certificates.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 text-xs">
                  Noch keine Zertifikate vorhanden.
                </div>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20">
                          {cert.issuer}
                        </span>
                        <h3 className="font-bold text-white text-sm mt-1">{cert.title}</h3>
                        <p className="text-[11px] text-slate-500">
                          Hochgeladen am {new Date(cert.uploaded_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {cert.pdf_file && (
                          <a
                            href={cert.pdf_file}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800"
                            title="Zertifikat ansehen"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteCertificate(cert.id)}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                          title="Zertifikat löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
