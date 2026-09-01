import React, { useEffect, useState } from 'react';
import { Check, Code, Cpu, Database, Layers, Sparkles, Wrench } from 'lucide-react';
import { portfolioService } from '../services/portfolioService';
import type { Skill } from '../types';

export const SkillsSection: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const data = await portfolioService.getSkills();
        setSkills(data);
      } catch (err) {
        console.warn('Skills API Fallback:', err);
        setSkills([
          { id: 1, name: 'Python 3.13', category: 'backend', category_display: 'Backend', proficiency: 95, icon: 'python', is_featured: true, created_at: '' },
          { id: 2, name: 'Django 5.2 / DRF', category: 'backend', category_display: 'Backend', proficiency: 92, icon: 'django', is_featured: true, created_at: '' },
          { id: 3, name: 'React 19 & Vite', category: 'frontend', category_display: 'Frontend', proficiency: 90, icon: 'react', is_featured: true, created_at: '' },
          { id: 4, name: 'TypeScript', category: 'frontend', category_display: 'Frontend', proficiency: 88, icon: 'typescript', is_featured: true, created_at: '' },
          { id: 5, name: 'PostgreSQL / Neon', category: 'database', category_display: 'Datenbanken', proficiency: 85, icon: 'database', is_featured: true, created_at: '' },
          { id: 6, name: 'Tailwind CSS', category: 'frontend', category_display: 'Frontend', proficiency: 92, icon: 'tailwind', is_featured: false, created_at: '' },
          { id: 7, name: 'Supabase S3 Storage', category: 'devops', category_display: 'Cloud & DevOps', proficiency: 86, icon: 'cloud', is_featured: false, created_at: '' },
          { id: 8, name: 'Docker & CI/CD', category: 'devops', category_display: 'Cloud & DevOps', proficiency: 84, icon: 'docker', is_featured: false, created_at: '' },
          { id: 9, name: 'Pytest & TDD', category: 'tools', category_display: 'Tools & Methodik', proficiency: 90, icon: 'check', is_featured: true, created_at: '' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, []);

  const categories = [
    { key: 'all', label: 'Alle Skills', icon: Layers },
    { key: 'backend', label: 'Backend', icon: Cpu },
    { key: 'frontend', label: 'Frontend', icon: Code },
    { key: 'database', label: 'Datenbanken', icon: Database },
    { key: 'devops', label: 'Cloud & DevOps', icon: Sparkles },
    { key: 'tools', label: 'Tools', icon: Wrench },
  ];

  const filteredSkills = skills.filter((s) => {
    if (activeCategory === 'all') return true;
    return s.category === activeCategory;
  });

  return (
    <section id="skills" className="py-20 bg-slate-100/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Expertise & Fähigkeiten
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Technologie-Stack
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm">
            Fundiertes Wissen in moderner Web-Architektur, Backend-Services, reaktiven Benutzeroberflächen und DevOps.
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
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Skills Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-900 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/40 transition-all hover:-translate-y-0.5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {skill.name}
                    </span>
                    {skill.is_featured && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                        Top Skill
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {skill.proficiency}%
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700 ease-out"
                    style={{ width: `${skill.proficiency}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{skill.category_display || skill.category}</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-3 h-3" /> Produktionsbereit
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
