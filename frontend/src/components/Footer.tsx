import React from 'react';
import { Code2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PORTFOLIO_OWNER_NAME } from '../constants';
import { StackedCardsInteraction, type StackedCardData } from './ui/stacked-cards-interaction';

const FOOTER_CARDS: StackedCardData[] = [
  {
    title: 'Cloud & Infrastructure',
    description: 'Kubernetes, AWS, Docker & automatisierte Deployment-Pipelines.',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Backend Core Architecture',
    description: 'Skalierbare Django REST APIs, PostgreSQL auf Neon & Supabase S3 Object Storage.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Reactive Frontend Engineering',
    description: 'Performante React 19 Benutzeroberflächen mit TypeScript, Tailwind CSS & Framer Motion.',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
  },
];

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200/90 dark:border-slate-800/90 transition-colors overflow-hidden">
      {/* Interaktiver Kartenstapel im oberen Bereich des Footers */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 flex flex-col items-center justify-center">
        <div className="text-center mb-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-mono mb-2">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Interactive Stack Showcase</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Architektur & Entwicklungsschwerpunkte
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Fahre mit der Maus über die Karten, um die Kernbereiche aufzufächern.
          </p>
        </div>

        <div className="w-full flex justify-center py-4">
          <StackedCardsInteraction cards={FOOTER_CARDS} spreadDistance={48} rotationAngle={6} />
        </div>
      </div>

      {/* Untere Leiste: Copyright, Tech-Credits & Admin */}
      <div className="border-t border-slate-200/80 dark:border-slate-800/80 py-8 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              {PORTFOLIO_OWNER_NAME}
            </span>
            <span className="text-slate-400 dark:text-slate-600">/</span>
            <span className="text-slate-500 dark:text-slate-400">
              Full-Stack Software Engineering
            </span>
          </div>

          <div className="flex items-center gap-6">
            <span>Django 5.2, PostgreSQL & React 19</span>
            <Link
              to="/login"
              className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
