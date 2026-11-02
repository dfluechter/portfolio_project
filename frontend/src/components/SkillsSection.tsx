import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSkills } from '../hooks/usePortfolio';
import type { Skill } from '../types';
import { StackBrandIcon } from './StackBrandIcon';

export const SkillsSection: React.FC = () => {
  const { t } = useTranslation();
  const { data: skills, isLoading } = useSkills();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const defaultSkills: Skill[] = [
    { id: 1, name: 'Python 3.13', category: 'backend', category_display: 'Backend', proficiency: 95, icon: 'python', is_featured: true, created_at: '2026-01-01' },
    { id: 2, name: 'Django 6 & DRF', category: 'backend', category_display: 'Backend', proficiency: 92, icon: 'django', is_featured: true, created_at: '2026-01-01' },
    { id: 3, name: 'React 19', category: 'frontend', category_display: 'Frontend', proficiency: 90, icon: 'react', is_featured: true, created_at: '2026-01-01' },
    { id: 4, name: 'TypeScript 5.9', category: 'frontend', category_display: 'Frontend', proficiency: 88, icon: 'typescript', is_featured: true, created_at: '2026-01-01' },
    { id: 5, name: 'PostgreSQL & Neon', category: 'backend', category_display: 'Backend', proficiency: 85, icon: 'postgresql', is_featured: true, created_at: '2026-01-01' },
    { id: 6, name: 'Tailwind CSS 4', category: 'frontend', category_display: 'Frontend', proficiency: 90, icon: 'tailwind', is_featured: false, created_at: '2026-01-01' },
    { id: 7, name: 'Supabase S3', category: 'other', category_display: 'Tools & DevOps', proficiency: 85, icon: 'supabase', is_featured: false, created_at: '2026-01-01' },
    { id: 8, name: 'Docker & Render', category: 'other', category_display: 'Tools & DevOps', proficiency: 82, icon: 'docker', is_featured: false, created_at: '2026-01-01' },
    { id: 9, name: 'Pytest & Vitest (TDD)', category: 'other', category_display: 'Tools & DevOps', proficiency: 88, icon: 'pytest', is_featured: true, created_at: '2026-01-01' },
  ];

  const displaySkills = skills && skills.length > 0 ? skills : isLoading ? [] : defaultSkills;

  const categories = [
    { id: 'all', label: t('skills.categories.all', 'Alle Skills') },
    { id: 'backend', label: t('skills.categories.backend', 'Backend') },
    { id: 'frontend', label: t('skills.categories.frontend', 'Frontend') },
    { id: 'other', label: t('skills.categories.devops', 'Cloud & DevOps') },
  ];

  const filteredSkills =
    activeCategory === 'all'
      ? displaySkills
      : displaySkills.filter((skill) => skill.category === activeCategory);

  return (
    <section
      id="skills"
      className="py-24 bg-background relative overflow-hidden border-t border-border"
    >
      {/* Swiss Architectural Grid Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.04)_1px,transparent_1px)] bg-[size:48px_48px]"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-border pb-8">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent-primary block mb-3">
              {t('skills.eyebrow', '01 // Technical Proficiency')}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
              {t('skills.heading', 'Technologie-Stack')}
            </h2>
          </div>
          <p className="text-base sm:text-lg text-text-secondary max-w-xl leading-relaxed">
            {t(
              'skills.subheading',
              'Fundiertes Wissen in moderner Web-Architektur, Backend-Services, reaktiven Benutzeroberflächen und DevOps.'
            )}
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-200 border cursor-pointer ${
                  isActive
                    ? 'bg-text-primary text-background border-text-primary font-semibold shadow-sm'
                    : 'bg-surface/60 text-text-secondary border-border hover:border-text-muted hover:text-text-primary'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap py-6 px-6 rounded-2xl bg-surface/50 border border-border">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="inline-flex items-center gap-3 pr-6 border-r border-border last:border-r-0 shrink-0"
              >
                <div className="h-11 w-11 rounded-xl bg-surface-hover animate-pulse" />
                <div className="h-5 w-32 rounded bg-surface-hover animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          /* Technologie-Stack in einer Zeile als Fließtext mit großen farbigen Icons */
          <div className="rounded-2xl bg-surface/80 backdrop-blur-md border border-border px-6 py-6 shadow-sm">
            <motion.p
              layout
              className="flex flex-nowrap items-center gap-x-7 overflow-x-auto whitespace-nowrap py-2 text-base sm:text-lg text-text-primary leading-relaxed scrollbar-thin"
            >
              <AnimatePresence mode="popLayout">
                {filteredSkills.map((skill, idx) => (
                  <motion.span
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                    key={skill.id}
                    className="inline-flex items-center gap-3.5 shrink-0 group"
                  >
                    <StackBrandIcon
                      name={skill.name}
                      category={skill.category}
                      className="w-11 h-11 transition-transform duration-200 group-hover:scale-110"
                    />
                    <span className="inline-flex items-baseline gap-2">
                      <strong className="font-bold text-text-primary tracking-tight text-base sm:text-lg group-hover:text-accent-primary transition-colors">
                        {skill.name}
                      </strong>
                      <span
                        role="progressbar"
                        aria-valuenow={skill.proficiency}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${skill.name} ${skill.proficiency}%`}
                        className="font-mono text-xs font-semibold text-accent-primary"
                      >
                        {skill.proficiency}%
                      </span>
                      {skill.is_featured && (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                          {t('skills.topSkill', 'Top Skill')}
                        </span>
                      )}
                    </span>
                    {idx < filteredSkills.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="text-text-muted/50 font-mono text-lg select-none pl-2"
                      >
                        ·
                      </span>
                    )}
                  </motion.span>
                ))}
              </AnimatePresence>
            </motion.p>
          </div>
        )}
      </div>
    </section>
  );
};
