import React, { useState } from 'react';
import { Activity, Database, ExternalLink } from 'lucide-react';

interface HeroBannerProps {
  className?: string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ className = '' }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const bannerSrc = '/static/img/background/banner_big_data.jpg';

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-900 shadow-xl transition-all duration-300 hover:border-indigo-500/40 ${className}`}
    >
      {/* Subtiles architektonisches Raster über dem Banner */}
      <div className="absolute inset-0 bg-architectural-grid opacity-25 pointer-events-none z-10" />

      {/* Bildcontainer im 16:9 Format */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
        <img
          src={bannerSrc}
          alt="Big Data Analytics & Cloud Architecture Visualisierung"
          onLoad={() => setImageLoaded(true)}
          className={`h-full w-full object-cover transition-all duration-700 ${
            imageLoaded ? 'opacity-90 contrast-105' : 'opacity-0'
          }`}
          loading="eager"
        />

        {/* Schweizer Gradient Vignette für optimalen Kontrast (WCAG 2.2 AA) */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20 pointer-events-none z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/40 pointer-events-none z-10" />
      </div>

      {/* Kopfleiste mit architektonischem Metadaten-Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3.5 sm:p-4 backdrop-blur-xs bg-slate-950/50 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" aria-hidden="true" />
          <span className="font-mono text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
            Architecture // Data Systems
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
          <Activity className="w-3 h-3 text-emerald-400" aria-hidden="true" />
          <span>LIVE PIPELINES</span>
        </span>
      </div>

      {/* Fußbereich mit Spezifikationen und Schnellverlinkung */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 sm:p-5 flex flex-col justify-end space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-slate-300 bg-slate-900/80 border border-slate-700/80 backdrop-blur-sm whitespace-nowrap">
            High-Throughput Analytics
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-800/80 backdrop-blur-sm whitespace-nowrap">
            Django 5 & PostgreSQL
          </span>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
          Verteilte Datenverarbeitung & Skalierbare Cloud-Services
        </h3>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
            Neon PostgreSQL + Supabase S3
          </span>
          <a
            href="#projects"
            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            <span>Details</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
};
