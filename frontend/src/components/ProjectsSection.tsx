import React, { useEffect, useState } from 'react';
import { ExternalLink, FolderGit2, Sparkles } from 'lucide-react';
import { portfolioService } from '../services/portfolioService';
import type { Project } from '../types';

export const ProjectsSection: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await portfolioService.getProjects();
        setProjects(data);
      } catch (err) {
        console.warn('API-Fehler beim Laden der Projekte:', err);
        setProjects([
          {
            id: 1,
            title: 'Portfolio & Certificate Management Hub',
            description:
              'Enterprise-taugliches Portfolio-System mit Django 5.2, Neon PostgreSQL, Supabase S3 Media Storage und React/Vite Frontend.',
            github_url: 'https://github.com/DominikFluechter/portfolio_project',
            live_url: 'https://dfluechter.onrender.com',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            title: 'Automated Certificate Scanner & Importer',
            description:
              'Intelligenter PDF- & Bild-Parser für Zertifikatsaussteller mit Cloudflare Rate-Limit-Handling und automatischer Metadatenextraktion.',
            github_url: 'https://github.com/DominikFluechter',
            created_at: new Date().toISOString(),
          },
          {
            id: 3,
            title: 'JWT Auth & RBAC Security Suite',
            description:
              'Sicherheitsarchitektur mit Djoser, SimpleJWT, HttpOnly Refresh Token Rotation und granularen Rollenrechten.',
            github_url: 'https://github.com/DominikFluechter',
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <section id="projects" className="py-20 bg-slate-950/60 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Ausgewählte Arbeiten
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Projekte & Entwicklungen
            </h2>
          </div>
          <p className="text-slate-400 max-w-md text-sm">
            Eine Auswahl an Webanwendungen, Microservices und Open-Source-Beiträgen mit Fokus auf Skalierbarkeit und Codequalität.
          </p>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group flex flex-col justify-between rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 hover:border-indigo-500/40 hover:bg-slate-900/70 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-indigo-500/5"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <FolderGit2 className="w-6 h-6 text-indigo-400" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                    {project.title}
                  </h3>

                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-4 mb-6">
                    {project.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center gap-3">
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      Code
                    </a>
                  )}

                  {project.live_url && (
                    <a
                      href={project.live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-semibold text-indigo-300 hover:text-white transition-colors ml-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Live Demo
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
