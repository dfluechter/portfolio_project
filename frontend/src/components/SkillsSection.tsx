import React, { useMemo, useState } from 'react';
import { Check, Code, Cpu, Database, Layers, Sparkles, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSkills } from '../hooks/usePortfolio';
import { usePortfolioSearch } from '../hooks/usePortfolioSearch';
import { SectionEmptyState } from './SectionEmptyState';
import type { Skill } from '../types';

export const SkillsSection: React.FC = () => {
  const { t } = useTranslation();
  const { data: skillsData, isLoading } = useSkills();
  const { searchTerm, clearSearch } = usePortfolioSearch();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const defaultSkills: Skill[] = useMemo(
    () => [
      { id: 1, name: 'Python 3.13', category: 'backend', category_display: t('skills.categories.backend', 'Backend'), proficiency: 95, icon: 'python', is_featured: true, created_at: '' },
      { id: 2, name: 'Django 5.2 / DRF', category: 'backend', category_display: t('skills.categories.backend', 'Backend'), proficiency: 92, icon: 'django', is_featured: true, created_at: '' },
      { id: 3, name: 'React 19 & Vite', category: 'frontend', category_display: t('skills.categories.frontend', 'Frontend'), proficiency: 90, icon: 'react', is_featured: true, created_at: '' },
      { id: 4, name: 'TypeScript', category: 'frontend', category_display: t('skills.categories.frontend', 'Frontend'), proficiency: 88, icon: 'typescript', is_featured: true, created_at: '' },
      { id: 5, name: 'PostgreSQL / Neon', category: 'database', category_display: t('skills.categories.database', 'Datenbanken'), proficiency: 85, icon: 'database', is_featured: true, created_at: '' },
      { id: 6, name: 'Tailwind CSS', category: 'frontend', category_display: t('skills.categories.frontend', 'Frontend'), proficiency: 92, icon: 'tailwind', is_featured: false, created_at: '' },
      { id: 7, name: 'Supabase S3 Storage', category: 'devops', category_display: t('skills.categories.devops', 'Cloud & DevOps'), proficiency: 86, icon: 'cloud', is_featured: false, created_at: '' },
      { id: 8, name: 'Docker & CI/CD', category: 'devops', category_display: t('skills.categories.devops', 'Cloud & DevOps'), proficiency: 84, icon: 'docker', is_featured: false, created_at: '' },
      { id: 9, name: 'Pytest & TDD', category: 'tools', category_display: t('skills.categories.toolsFull', 'Tools & Methodik'), proficiency: 90, icon: 'check', is_featured: true, created_at: '' },
    ],
    [t]
  );

  const skills = skillsData && skillsData.length > 0 ? skillsData : defaultSkills;

  const categories = [
    { key: 'all', label: t('skills.categories.all', 'Alle Skills'), icon: Layers },
    { key: 'backend', label: t('skills.categories.backend', 'Backend'), icon: Cpu },
    { key: 'frontend', label: t('skills.categories.frontend', 'Frontend'), icon: Code },
    { key: 'database', label: t('skills.categories.database', 'Datenbanken'), icon: Database },
    { key: 'devops', label: t('skills.categories.devops', 'Cloud & DevOps'), icon: Sparkles },
    { key: 'tools', label: t('skills.categories.tools', 'Tools'), icon: Wrench },
  ];

  const getLocalizedCategoryDisplay = (skill: Skill): string => {
    switch (skill.category) {
      case 'backend':
        return t('skills.categories.backend', skill.category_display || 'Backend');
      case 'frontend':
        return t('skills.categories.frontend', skill.category_display || 'Frontend');
      case 'database':
        return t('skills.categories.database', skill.category_display || 'Datenbanken');
      case 'devops':
        return t('skills.categories.devops', skill.category_display || 'Cloud & DevOps');
      case 'tools':
        return t('skills.categories.toolsFull', skill.category_display || 'Tools & Methodik');
      default:
        return skill.category_display || skill.category;
    }
  };

  const filteredSkills = skills.filter((s) => {
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    if (!matchesCategory) return false;
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      s.category.toLowerCase().includes(query) ||
      s.category_display.toLowerCase().includes(query)
    );
  });

  return (
    <section id="skills" className="py-20 bg-slate-100/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-indigo-600 dark:text-indigo-400">
              <span>{t('skills.eyebrow', '01 // Technical Proficiency')}</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {t('skills.label', 'Expertise & Fähigkeiten')} ({skills.length})
                </span>
              </span>
              {searchTerm && (
                <span
                  role="status"
                  aria-atomic="true"
                  className="text-slate-500 dark:text-slate-400 font-sans font-normal"
                >
                  • {filteredSkills.length} {t('skills.filtered', 'gefiltert')}
                </span>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('skills.heading', 'Technologie-Stack')}
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm">
            {t(
              'skills.subheading',
              'Fundiertes Wissen in moderner Web-Architektur, Backend-Services, reaktiven Benutzeroberflächen und DevOps.'
            )}
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-10">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                aria-pressed={isActive}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Skills Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-900 animate-pulse" />
            ))}
          </div>
        ) : filteredSkills.length === 0 ? (
          <SectionEmptyState
            sectionName={t('nav.skills', 'Skills')}
            query={searchTerm}
            onReset={clearSearch}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredSkills.map((skill) => (
                <motion.div
                  key={skill.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/40 transition-all hover:-translate-y-0.5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {skill.name}
                      </span>
                      {skill.is_featured && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap">
                          {t('skills.topSkill', 'Top Skill')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {skill.proficiency}%
                    </span>
                  </div>

                  {/* Segmented Proficiency Bar (MASTER.md 1.2 / 2.1) */}
                  <div
                    className="relative w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={skill.proficiency}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('skills.proficiencyAria', { name: skill.name, defaultValue: `Kenntnisstand für ${skill.name}` })}
                  >
                    <div
                      className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-700 ease-out"
                      style={{ width: `${skill.proficiency}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{getLocalizedCategoryDisplay(skill)}</span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="w-3 h-3" aria-hidden="true" /> {t('skills.readyForProduction', 'Produktionsbereit')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
};
