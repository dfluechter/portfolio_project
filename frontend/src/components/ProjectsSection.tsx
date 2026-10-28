import React, { useMemo } from 'react';
import { Calendar, ExternalLink, FolderGit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useProjects } from '../hooks/usePortfolio';
import { usePortfolioSearch } from '../hooks/usePortfolioSearch';
import { SectionEmptyState } from './SectionEmptyState';
import { resolveProjectImageUrl } from '../utils/mediaUrl';
import type { Project } from '../types';

export const ProjectsSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { data: projectsData, isLoading } = useProjects();
  const { searchTerm, clearSearch } = usePortfolioSearch();

  const dateLocale = i18n.language && i18n.language.startsWith('en') ? 'en-US' : 'de-DE';

  const defaultProjects: Project[] = useMemo(
    () => [
      {
        id: 1,
        title: 'Portfolio & Certificate Management Hub',
        description: t(
          'projects.defaultHubDesc',
          'Enterprise-taugliches Portfolio-System mit Django 5.2, Neon PostgreSQL, Supabase S3 Media Storage und React/Vite Frontend.'
        ),
        github_url: 'https://github.com/dfluechter/portfolio_project',
        live_url: 'https://dfluechter.onrender.com',
        created_at: '2026-01-15T12:00:00Z',
      },
      {
        id: 2,
        title: 'Automated Certificate Scanner & Importer',
        description: t(
          'projects.defaultScannerDesc',
          'Intelligenter PDF- & Bild-Parser für Zertifikatsaussteller mit Cloudflare Rate-Limit-Handling und automatischer Metadatenextraktion.'
        ),
        github_url: 'https://github.com/dfluechter',
        created_at: '2026-02-10T14:30:00Z',
      },
      {
        id: 3,
        title: 'JWT Auth & RBAC Security Suite',
        description: t(
          'projects.defaultAuthDesc',
          'Sicherheitsarchitektur mit Djoser, SimpleJWT, HttpOnly Refresh Token Rotation und granularen Rollenrechten.'
        ),
        github_url: 'https://github.com/dfluechter',
        created_at: '2026-03-01T09:15:00Z',
      },
    ],
    [t]
  );

  const allProjects = projectsData && projectsData.length > 0 ? projectsData : defaultProjects;

  const filteredProjects = allProjects.filter((project) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    const matchTitle = project.title.toLowerCase().includes(query);
    const matchDesc = project.description.toLowerCase().includes(query);
    const matchSkill = project.skill_details?.some((s) => s.name.toLowerCase().includes(query));
    return matchTitle || matchDesc || matchSkill;
  });

  return (
    <section id="projects" className="py-20 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-indigo-600 dark:text-indigo-400">
              <span>{t('projects.eyebrow', '02 // System Implementations')}</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span>
                {t('projects.label', 'Projekte')} ({allProjects.length})
              </span>
              {searchTerm && (
                <span
                  role="status"
                  aria-atomic="true"
                  className="text-slate-500 dark:text-slate-400 font-sans font-normal"
                >
                  • {filteredProjects.length} {t('projects.filtered', 'gefiltert')}
                </span>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('projects.heading', 'Projekte & Entwicklungen')}
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm leading-relaxed">
            {t(
              'projects.subheading',
              'Eine Auswahl an Webanwendungen, Microservices und Open-Source-Beiträgen mit Fokus auf Architektur, Typensicherheit und Performance.'
            )}
          </p>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 rounded-xl bg-slate-200 dark:bg-slate-900 animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <SectionEmptyState
            sectionName={t('projects.label', 'Projekte')}
            query={searchTerm}
            onReset={clearSearch}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredProjects.map((project) => {
                const imageUrl = resolveProjectImageUrl(project.image);
                const formattedDate = project.created_at
                  ? new Date(project.created_at).toLocaleDateString(dateLocale, {
                      month: 'short',
                      year: 'numeric',
                    })
                  : null;

                return (
                  <motion.div
                    key={project.id}
                    id={`project-${project.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="group flex flex-col justify-between rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 shadow-sm overflow-hidden transition-all duration-200"
                  >
                    {/* Dedizierter Medien-Header oben */}
                    {imageUrl ? (
                      <div className="h-40 overflow-hidden border-b border-slate-200 dark:border-slate-800 relative bg-slate-100 dark:bg-slate-900">
                        <img
                          src={imageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {formattedDate && (
                          <div className="absolute bottom-2.5 left-3 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-[11px] font-mono text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                            <span>{formattedDate}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-28 overflow-hidden border-b border-slate-200 dark:border-slate-800 relative p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 bg-blueprint-grid">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                          <FolderGit2 className="w-4 h-4" aria-hidden="true" />
                        </div>
                        {formattedDate && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800">
                            <Calendar className="w-3 h-3 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
                            <span>{formattedDate}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 mb-4">
                          {project.description}
                        </p>
                        {project.skill_details && project.skill_details.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {project.skill_details.map((skill) => (
                              <span
                                key={skill.id}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                              >
                                {skill.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                        {project.github_url && (
                          <a
                            href={project.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            <span>{t('projects.viewCode', 'Code')}</span>
                          </a>
                        )}

                        {project.live_url && (
                          <a
                            href={project.live_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-xs font-semibold text-indigo-600 dark:text-indigo-300 transition-colors ml-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t('projects.liveDemo', 'Live Demo')}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
};
