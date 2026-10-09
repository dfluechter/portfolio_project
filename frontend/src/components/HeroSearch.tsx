import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Briefcase,
  ChevronRight,
  Code2,
  FolderGit2,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCertificates, useProjects, useSkills, useTimeline } from '../hooks/usePortfolio';
import { usePortfolioSearch } from '../hooks/usePortfolioSearch';

interface SearchResultItem {
  id: string | number;
  category: 'project' | 'skill' | 'certificate' | 'timeline';
  title: string;
  subtitle?: string;
  targetSection: string;
}

export const HeroSearch: React.FC = () => {
  const { searchTerm, setSearchTerm, clearSearch } = usePortfolioSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: projects = [] } = useProjects();
  const { data: skills = [] } = useSkills();
  const { data: certificates = [] } = useCertificates();
  const { data: timeline = [] } = useTimeline();

  // Gefilterte Ergebnisse über alle Datensätze hinweg
  const results = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    const items: SearchResultItem[] = [];

    // Projekte
    projects.forEach((p) => {
      const matchTitle = p.title.toLowerCase().includes(query);
      const matchDesc = p.description.toLowerCase().includes(query);
      const matchSkill = p.skill_details?.some((s) => s.name.toLowerCase().includes(query));
      if (matchTitle || matchDesc || matchSkill) {
        items.push({
          id: `project-${p.id}`,
          category: 'project',
          title: p.title,
          subtitle: p.description.slice(0, 60) + '...',
          targetSection: 'projects',
        });
      }
    });

    // Skills
    skills.forEach((s) => {
      const matchName = s.name.toLowerCase().includes(query);
      const matchCat = s.category_display?.toLowerCase().includes(query) || s.category.toLowerCase().includes(query);
      if (matchName || matchCat) {
        items.push({
          id: `skill-${s.id}`,
          category: 'skill',
          title: s.name,
          subtitle: `${s.category_display || s.category} • ${s.proficiency}%`,
          targetSection: 'skills',
        });
      }
    });

    // Zertifikate
    certificates.forEach((c) => {
      const providerName = c.provider_details?.provider || '';
      const matchTitle = c.title.toLowerCase().includes(query);
      const matchProvider = providerName.toLowerCase().includes(query);
      if (matchTitle || matchProvider) {
        items.push({
          id: `cert-${c.id}`,
          category: 'certificate',
          title: c.title,
          subtitle: providerName,
          targetSection: 'certificates',
        });
      }
    });

    // Timeline
    timeline.forEach((t) => {
      const matchTitle = t.title.toLowerCase().includes(query);
      const matchOrg = t.organization.toLowerCase().includes(query);
      if (matchTitle || matchOrg) {
        items.push({
          id: `timeline-${t.id}`,
          category: 'timeline',
          title: t.title,
          subtitle: `${t.organization} (${t.entry_type_display || t.entry_type})`,
          targetSection: 'timeline',
        });
      }
    });

    return items;
  }, [searchTerm, projects, skills, certificates, timeline]);

  // Schließen bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Zurücksetzen des aktiven Index bei neuer Suche ohne cascading useEffect
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  if (searchTerm !== prevSearchTerm) {
    setPrevSearchTerm(searchTerm);
    setActiveIndex(0);
    if (searchTerm.trim().length > 0) {
      setIsOpen(true);
    }
  }

  const handleSelectItem = (item: SearchResultItem) => {
    setIsOpen(false);
    const element = document.getElementById(item.targetSection);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results[activeIndex];
      if (selected) {
        handleSelectItem(selected);
      }
    }
  };

  const getCategoryMeta = (category: SearchResultItem['category']) => {
    switch (category) {
      case 'project':
        return { label: 'Projekt', icon: FolderGit2, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' };
      case 'skill':
        return { label: 'Skill', icon: Code2, color: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10' };
      case 'certificate':
        return { label: 'Zertifikat', icon: Award, color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10' };
      case 'timeline':
        return { label: 'Werdegang', icon: Briefcase, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' };
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto z-30">
      {/* Search Input Container mit animiertem Glow */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 rounded-2xl blur-md opacity-25 group-focus-within:opacity-60 transition duration-500" />

        <div className="relative flex items-center bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-indigo-950/20 px-4 py-3">
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors mr-3 shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (searchTerm.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Portfolio durchsuchen (z.B. Django, React, S3, Docker)..."
            aria-label="Portfolio durchsuchen"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                clearSearch();
                inputRef.current?.focus();
              }}
              aria-label="Suchbegriff löschen"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-2 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-400 shrink-0">
            <span>ESC</span>
          </div>
        </div>
      </div>

      {/* Live Dropdown mit AnimatePresence */}
      <AnimatePresence>
        {isOpen && searchTerm.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute left-0 right-0 mt-3 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto"
            role="listbox"
          >
            {results.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <Sparkles className="w-5 h-5 mx-auto text-slate-400/80" />
                <p>Keine direkten Treffer für „{searchTerm}“ gefunden.</p>
                <p className="text-[11px] text-slate-500">
                  Die Sektionen unten werden trotzdem weiterhin gefiltert.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Suchergebnisse</span>
                  <span className="font-mono text-indigo-500">{results.length} Treffer</span>
                </div>

                {results.map((item, index) => {
                  const meta = getCategoryMeta(item.category);
                  const Icon = meta.icon;
                  const isSelected = index === activeIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-900 dark:text-indigo-200'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${meta.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {meta.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
