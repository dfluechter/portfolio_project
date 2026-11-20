import React, { useMemo } from 'react';
import { AlertTriangle, Briefcase, Calendar, GraduationCap, MapPin, Milestone, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTimeline } from '../hooks/usePortfolio';
import { usePortfolioSearch } from '../hooks/usePortfolioSearch';
import { SectionEmptyState } from './SectionEmptyState';
import type { TimelineEntry } from '../types';

export const TimelineSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { data: timelineData, isLoading, isError, refetch } = useTimeline();
  const { searchTerm, clearSearch } = usePortfolioSearch();
  const dateLocale = i18n.language?.startsWith('en') ? 'en-US' : 'de-DE';

  const defaultTimeline: TimelineEntry[] = useMemo(
    () => [
      {
        id: 1,
        entry_type: 'experience',
        entry_type_display: t('timeline.experience', 'Berufserfahrung'),
        title: 'Full-Stack Software Engineer & Backend Architect',
        organization: t('timeline.selfEmployedOrg', 'Selbstständig / Freiberuflich'),
        location: t('timeline.locationRemote', 'Deutschland (Remote)'),
        start_date: '2023-01-01',
        end_date: null,
        is_current: true,
        description: t(
          'timeline.desc1',
          'Konzeption und Implementierung skalierbarer Webanwendungen mit Django 5, PostgreSQL, Microservices und React/TypeScript Frontends. CI/CD-Automatisierung und Cloud-Deployment.'
        ),
        created_at: '',
      },
      {
        id: 2,
        entry_type: 'education',
        entry_type_display: t('timeline.education', 'Ausbildung & Zertifizierungen'),
        title: 'Continuous Professional Development & Cloud Certification',
        organization: 'Meta, Google Cloud, AWS, IBM',
        location: 'Online',
        start_date: '2022-06-01',
        end_date: '2024-12-31',
        is_current: false,
        description: t(
          'timeline.desc2',
          'Absolvierung fortgeschrittener Zertifizierungsprogramme in den Bereichen Cloud Architecture, Full-Stack Software Engineering, Observability und Machine Learning.'
        ),
        created_at: '',
      },
    ],
    [t]
  );

  const entries = timelineData && timelineData.length > 0 ? timelineData : defaultTimeline;

  const getLocalizedEntryType = (entry: TimelineEntry): string => {
    if (entry.entry_type === 'experience') return t('timeline.experience', 'Berufserfahrung');
    if (entry.entry_type === 'education') return t('timeline.education', 'Ausbildung & Zertifizierungen');
    return entry.entry_type_display || entry.entry_type;
  };

  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    const matchTitle = entry.title.toLowerCase().includes(query);
    const matchOrg = entry.organization.toLowerCase().includes(query);
    const matchDesc = entry.description?.toLowerCase().includes(query);
    const matchSkill = entry.skill_details?.some((s) => s.name.toLowerCase().includes(query));
    return matchTitle || matchOrg || matchDesc || matchSkill;
  });

  return (
    <section
      id="timeline"
      className="scroll-mt-20 py-20 bg-slate-50/70 dark:bg-slate-950 border-t border-slate-200/90 dark:border-slate-800/80 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-indigo-600 dark:text-indigo-400">
              <span className="font-semibold">{t('timeline.eyebrow', '04 // Career Chronology')}</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="inline-flex items-center gap-1.5">
                <Milestone className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('timeline.label', 'Werdegang & Meilensteine')} ({entries.length})</span>
              </span>
              {searchTerm && (
                <span
                  role="status"
                  aria-atomic="true"
                  className="text-slate-500 dark:text-slate-400 font-sans font-normal"
                >
                  • {filteredEntries.length} {t('timeline.filtered', 'gefiltert')}
                </span>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('timeline.heading', 'Beruflicher Werdegang')}
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm leading-relaxed">
            {t('timeline.subheading', 'Stationen meiner beruflichen Laufbahn, praxisrelevante Projekte und kontinuierliche Weiterbildung.')}
          </p>
        </div>

        {/* Inline Error Telemetry Bar */}
        {isError && (
          <div
            role="alert"
            className="mb-8 p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-950/25 border border-rose-500/25 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300 surface-refraction"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" aria-hidden="true" />
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">
                ERR // CHRONOLOGY_SYNC_FALLBACK
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                {t(
                  'timeline.syncErrorNotice',
                  'Live-Chronologie konnte nicht aktualisiert werden. Es wird der verifizierte Referenzbestand angezeigt.'
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1 rounded-lg font-semibold bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 hover:border-rose-500 active:scale-[0.98] active:translate-y-[1px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('common.retry', 'Erneut versuchen')}</span>
            </button>
          </div>
        )}

        {/* Timeline Asymmetric Swiss Ledger */}
        {isLoading ? (
          <div
            data-testid="timeline-skeleton"
            aria-busy="true"
            aria-label={t('common.loading', 'Wird geladen...')}
            className="divide-y divide-slate-200/80 dark:divide-slate-800/80 border-t border-slate-200/80 dark:border-slate-800/80"
          >
            {[1, 2].map((n) => (
              <div key={n} className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
                <div className="lg:col-span-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-14 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    <div className="h-5 w-28 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  </div>
                  <div className="h-4 w-40 rounded bg-slate-200/80 dark:bg-slate-800/70 animate-pulse" />
                </div>
                <div className="lg:col-span-8 space-y-3">
                  <div className="h-6 w-2/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-slate-200/80 dark:bg-slate-800/70 animate-pulse" />
                  <div className="space-y-2 pt-1">
                    <div className="h-3.5 w-full rounded bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
                    <div className="h-3.5 w-4/5 rounded bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <SectionEmptyState
            sectionName={t('nav.timeline', 'Werdegang')}
            query={searchTerm}
            onReset={clearSearch}
          />
        ) : (
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80 border-t border-slate-200/80 dark:border-slate-800/80">
            <AnimatePresence>
              {filteredEntries.map((entry, idx) => {
                const isEducation = entry.entry_type === 'education';
                const Icon = isEducation ? GraduationCap : Briefcase;
                const stepCode = `CHR-${String(idx + 1).padStart(2, '0')}`;

                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="py-8 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start group"
                  >
                    {/* Left Column (4 cols): Telemetry Code, Category Badge & Date Range */}
                    <div className="lg:col-span-4 flex flex-col gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 group-hover:border-indigo-500/50 flex items-center justify-center transition-colors shadow-2xs surface-refraction shrink-0">
                          <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                        </div>
                        <span
                          aria-hidden="true"
                          className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500"
                        >
                          {stepCode}
                        </span>
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                          {getLocalizedEntryType(entry)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono pl-0.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                        <span>
                          {new Date(entry.start_date).toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' })}
                          {' — '}
                          {entry.is_current
                            ? t('timeline.present', 'Heute (Laufend)')
                            : entry.end_date
                            ? new Date(entry.end_date).toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' })
                            : t('timeline.completed', 'Abgeschlossen')}
                        </span>
                      </div>
                    </div>

                    {/* Right Column (8 cols): Role Title, Organization, Location & Description */}
                    <div className="lg:col-span-8 lg:pl-6 lg:border-l lg:border-slate-200/70 dark:lg:border-slate-800/70">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {entry.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mb-3.5 font-medium">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {entry.organization}
                        </span>
                        {entry.location && (
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500/70" aria-hidden="true" />
                            <span>{entry.location}</span>
                          </span>
                        )}
                      </div>

                      {entry.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-[65ch]">
                          {entry.description}
                        </p>
                      )}
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
