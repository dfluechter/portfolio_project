import React, { useMemo } from 'react';
import { Briefcase, Calendar, GraduationCap, MapPin, Milestone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTimeline } from '../hooks/usePortfolio';
import { usePortfolioSearch } from '../hooks/usePortfolioSearch';
import { SectionEmptyState } from './SectionEmptyState';
import type { TimelineEntry } from '../types';

export const TimelineSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { data: timelineData, isLoading } = useTimeline();
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
    <section id="timeline" className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-indigo-600 dark:text-indigo-400">
              <span>{t('timeline.eyebrow', '04 // Career Chronology')}</span>
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
          <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm">
            {t('timeline.subheading', 'Stationen meiner beruflichen Laufbahn, praxisrelevante Projekte und kontinuierliche Weiterbildung.')}
          </p>
        </div>

        {/* Timeline Container */}
        {isLoading ? (
          <div className="space-y-6 max-w-3xl mx-auto">
            {[1, 2].map((n) => (
              <div key={n} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-900 animate-pulse" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <SectionEmptyState
            sectionName={t('nav.timeline', 'Werdegang')}
            query={searchTerm}
            onReset={clearSearch}
          />
        ) : (
          <div className="relative max-w-3xl mx-auto">
            {/* Vertical Line — Schweizer Hairline Grid Divider */}
            <div className="absolute left-4 sm:left-6 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-800" />

            <div className="space-y-8">
              <AnimatePresence>
                {filteredEntries.map((entry) => {
                  const isEducation = entry.entry_type === 'education';
                  const Icon = isEducation ? GraduationCap : Briefcase;

                  return (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="relative flex items-start gap-4 sm:gap-6 group"
                    >
                      {/* Node Dot */}
                      <div className="relative z-10 flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500 shadow-md shadow-indigo-500/20 flex items-center justify-center transition-colors">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                      </div>

                      {/* Content Card */}
                      <div className="flex-1 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/40 transition-all">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                            {getLocalizedEntryType(entry)}
                          </span>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
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

                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                          {entry.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mb-4 font-medium">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {entry.organization}
                          </span>
                          {entry.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                              {entry.location}
                            </span>
                          )}
                        </div>

                        {entry.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {entry.description}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
