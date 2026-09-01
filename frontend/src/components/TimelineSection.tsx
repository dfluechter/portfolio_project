import React, { useEffect, useState } from 'react';
import { Briefcase, Calendar, GraduationCap, MapPin, Milestone } from 'lucide-react';
import { portfolioService } from '../services/portfolioService';
import type { TimelineEntry } from '../types';

export const TimelineSection: React.FC = () => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const data = await portfolioService.getTimeline();
        setEntries(data);
      } catch (err) {
        console.warn('Timeline API Fallback:', err);
        setEntries([
          {
            id: 1,
            entry_type: 'experience',
            entry_type_display: 'Berufserfahrung',
            title: 'Full-Stack Software Engineer & Backend Architect',
            organization: 'Selbstständig / Freiberuflich',
            location: 'Deutschland (Remote)',
            start_date: '2023-01-01',
            end_date: null,
            is_current: true,
            description:
              'Konzeption und Implementierung skalierbarer Webanwendungen mit Django 5, PostgreSQL, Microservices und React/TypeScript Frontends. CI/CD-Automatisierung und Cloud-Deployment.',
            created_at: '',
          },
          {
            id: 2,
            entry_type: 'education',
            entry_type_display: 'Ausbildung & Zertifizierungen',
            title: 'Continuous Professional Development & Cloud Certification',
            organization: 'Meta, Google Cloud, AWS, IBM',
            location: 'Online',
            start_date: '2022-06-01',
            end_date: '2024-12-31',
            is_current: false,
            description:
              'Absolvierung fortgeschrittener Zertifizierungsprogramme in den Bereichen Cloud Architecture, Full-Stack Software Engineering, Observability und Machine Learning.',
            created_at: '',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, []);

  return (
    <section id="timeline" className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-3">
              <Milestone className="w-3.5 h-3.5" />
              Erfahrung & Meilensteine
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Beruflicher Werdegang
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm">
            Stationen meiner beruflichen Laufbahn, praxisrelevante Projekte und kontinuierliche Weiterbildung.
          </p>
        </div>

        {/* Timeline Container */}
        {loading ? (
          <div className="space-y-6 max-w-3xl mx-auto">
            {[1, 2].map((n) => (
              <div key={n} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-900 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="relative max-w-3xl mx-auto">
            {/* Vertical Line */}
            <div className="absolute left-4 sm:left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-500 via-violet-500 to-transparent" />

            <div className="space-y-8">
              {entries.map((entry) => {
                const isEducation = entry.entry_type === 'education';
                const Icon = isEducation ? GraduationCap : Briefcase;

                return (
                  <div key={entry.id} className="relative flex items-start gap-4 sm:gap-6 group">
                    {/* Node Dot */}
                    <div className="relative z-10 flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500 shadow-md shadow-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>

                    {/* Content Card */}
                    <div className="flex-1 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/40 transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md">
                          {entry.entry_type_display || entry.entry_type}
                        </span>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(entry.start_date).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}
                            {' — '}
                            {entry.is_current
                              ? 'Heute (Laufend)'
                              : entry.end_date
                              ? new Date(entry.end_date).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })
                              : 'Abgeschlossen'}
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
                            <MapPin className="w-3 h-3 text-slate-400" />
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
