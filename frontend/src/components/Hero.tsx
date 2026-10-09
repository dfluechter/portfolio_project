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
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export const Hero: React.FC = () => {
  const techBadges = [
    { name: 'Django 5.2', category: 'Backend' },
    { name: 'Python 3.13', category: 'Backend' },
    { name: 'React 19 & Vite', category: 'Frontend' },
    { name: 'TypeScript', category: 'Frontend' },
    { name: 'Tailwind CSS', category: 'Styling' },
    { name: 'PostgreSQL / Neon', category: 'Database' },
    { name: 'Supabase S3', category: 'Storage' },
    { name: 'Render', category: 'DevOps' },
  ];

  return (
    <section id="about" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden transition-colors duration-300">
      {/* Background Gradients & Animated Mesh */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/15 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-violet-500/10 dark:bg-violet-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-3xl mx-auto space-y-6"
        >
          {/* Status Badge */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Full-Stack Developer & Software Engineer
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight"
          >
            Moderne Web-Architektur mit{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 dark:from-indigo-400 dark:via-violet-400 dark:to-sky-400 bg-clip-text text-transparent">
              Django & React
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto"
          >
            Willkommen auf meinem Entwickler-Portfolio. Hier präsentiere ich praxiserprobte Software-Projekte, 
            zertifizierte Qualifikationen und skalierbare Full-Stack-Architekturen.
          </motion.p>

          {/* Zentrales Hero-Suchfeld */}
          <motion.div variants={itemVariants} className="pt-2">
            <HeroSearch />
          </motion.div>

          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="#projects"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              Projekte entdecken
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#certificates"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-sm transition-all shadow-sm hover:-translate-y-0.5 active:translate-y-0"
            >
              <Award className="w-4 h-4 text-violet-500 dark:text-violet-400" />
              Zertifikate einsehen
            </a>
          </motion.div>
        </motion.div>

        {/* Tech Stack Pills mit Framer Motion Hover */}
        <div className="mt-16 pt-10 border-t border-slate-200 dark:border-slate-800/80">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-6">
            Eingesetzte Technologien & Kernkompetenzen
          </p>
          <div className="flex flex-wrap justify-center items-center gap-2.5 max-w-4xl mx-auto">
            {techBadges.map((tech) => (
              <motion.span
                key={tech.name}
                whileHover={{ scale: 1.08, y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="cursor-default px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-indigo-500/40 transition-colors shadow-sm"
              >
                {tech.name}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Key Highlights Grid mit sanftem Hover Lift */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Cloud Native Backend</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Skalierbare REST-APIs mit Django 5.2, PostgreSQL auf Neon, Djoser JWT-Authentifizierung und Supabase S3 Storage.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-violet-500/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center mb-4 text-violet-600 dark:text-violet-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Modernes Frontend</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Reaktionsschnelle Benutzeroberflächen mit React 19, Vite, TypeScript, Tailwind CSS und optimierter Performance.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Qualität & Sicherheit</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Automatisierte Code-Reviews mit Ruff, strikte Typisierung mit Mypy, End-to-End & Unit-Testing mit Pytest.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
