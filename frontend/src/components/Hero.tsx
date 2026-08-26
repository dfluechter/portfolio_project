import React from 'react';
import { ArrowRight, Award, Database, Layers, ShieldCheck } from 'lucide-react';

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
    <section id="about" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background Gradients & Mesh */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Full-Stack Developer & Software Engineer
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Moderne Web-Architektur mit{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">
              Django & React
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
            Willkommen auf meinem Entwickler-Portfolio. Hier präsentiere ich aktuelle Software-Projekte, 
            zertifizierte Qualifikationen und robuste Backend- sowie Frontend-Lösungen.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a
              href="#projects"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5"
            >
              Projekte entdecken
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#certificates"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 font-semibold text-sm transition-all hover:-translate-y-0.5"
            >
              <Award className="w-4 h-4 text-violet-400" />
              Zertifikate einsehen
            </a>
          </div>
        </div>

        {/* Tech Stack Pills */}
        <div className="mt-16 pt-10 border-t border-slate-800/80">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">
            Eingesetzte Technologien & Kernkompetenzen
          </p>
          <div className="flex flex-wrap justify-center items-center gap-2.5 max-w-4xl mx-auto">
            {techBadges.map((tech) => (
              <span
                key={tech.name}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-medium hover:border-indigo-500/40 hover:text-white transition-all shadow-sm"
              >
                {tech.name}
              </span>
            ))}
          </div>
        </div>

        {/* Key Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Cloud Native Backend</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Skalierbare REST-APIs mit Django 5.2, PostgreSQL auf Neon, Djoser JWT-Authentifizierung und Supabase S3 Object Storage.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Layers className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Modernes Frontend</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Reaktionsschnelle Benutzeroberflächen mit React 19, Vite, TypeScript, Tailwind CSS und optimierter Core Web Vitals Performance.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Qualität & Sicherheit</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automatisierte Code-Reviews mit Ruff, strikte Typisierung mit Mypy, End-to-End & Unit-Testing mit Pytest.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
