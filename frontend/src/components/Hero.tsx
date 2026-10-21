import React from 'react';
import { ArrowRight, Award, Database, Layers, ShieldCheck } from 'lucide-react';
import type { Variants } from 'framer-motion';
import { motion } from 'framer-motion';
import { HeroSearch } from './HeroSearch';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const techBadges = [
  'Django 5.2',
  'Python 3.13',
  'React 19 & Vite',
  'TypeScript',
  'Tailwind CSS',
  'PostgreSQL / Neon',
  'Supabase S3',
  'Render DevOps',
];

export const Hero: React.FC = () => {
  return (
    <section id="about" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden transition-colors duration-300">
      {/* Subtiles architektonisches Raster im Hintergrund */}
      <div className="absolute inset-0 bg-architectural-grid opacity-60 dark:opacity-40 pointer-events-none -z-10 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-3xl space-y-6"
        >
          {/* Status-Zeile mit Live-System-Indikator */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Full-Stack Developer & Software Engineer</span>
            </div>
          </motion.div>

          {/* Heading: Einheitliche kraftvolle Typografie, kein Teil-Gradient */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
          >
            Moderne Web-Architektur mit Django & React
          </motion.h1>

          {/* Subtitle: ruhig, diszipliniert, unter 80 Zeichen pro Zeile */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl"
          >
            Entwicklung robuster Backend-Services und reaktiver Benutzeroberflächen.
            Spezialisiert auf wartbare REST-APIs, strikte Typisierung und nachvollziehbare Testabdeckung.
          </motion.p>

          {/* Zentrales Hero-Suchfeld als Command Center */}
          <motion.div variants={itemVariants} className="pt-2">
            <HeroSearch />
          </motion.div>

          {/* Action Buttons: klare Verben, keine Pfeile im Text */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#projects"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors shadow-sm"
            >
              <span>Projekte entdecken</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
            <a
              href="#certificates"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-medium text-sm transition-colors shadow-sm"
            >
              <Award className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span>Zertifikate einsehen</span>
            </a>
          </motion.div>
        </motion.div>

        {/* Technologien: ruhige Tag-Leiste ohne ALL-CAPS */}
        <div className="mt-14 pt-8 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
            Eingesetzte Kerntechnologien
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {techBadges.map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-mono border border-slate-200 dark:border-slate-800"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* 3-Spalten Architektur-Spezifikations-Grid ohne künstliche 01/02/03 Nummern */}
        <div className="grid grid-cols-1 md:grid-cols-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 shadow-sm mt-10">
          {/* Backend Core */}
          <div className="p-6 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Backend Core
              </span>
              <Database className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
              Cloud Native Backend
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Skalierbare REST-APIs mit Django 5.2, PostgreSQL auf Neon, Djoser JWT-Authentifizierung und Supabase S3 Storage.
            </p>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Django 5.2, PostgreSQL, S3
            </div>
          </div>

          {/* Reactive Client */}
          <div className="p-6 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Reactive Client
              </span>
              <Layers className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
              Modernes Frontend
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Reaktionsschnelle Benutzeroberflächen mit React 19, Vite, TypeScript, Tailwind CSS und TanStack Query.
            </p>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              React 19, TypeScript, Vite
            </div>
          </div>

          {/* Quality & Security */}
          <div className="p-6 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Quality & Security
              </span>
              <ShieldCheck className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
              Qualität & Sicherheit
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Automatisierte Code-Reviews mit Ruff, strikte Typisierung mit Mypy, End-to-End und Unit-Testing mit Pytest und Vitest.
            </p>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Ruff, Mypy, Pytest ≥96%
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
