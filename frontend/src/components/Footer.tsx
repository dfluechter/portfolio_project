import React from 'react';
import { Lock, Mail, Sparkles } from 'lucide-react';
import { PORTFOLIO_OWNER_NAME } from '../constants';
import { StackedCardsInteraction, type StackedCardData } from './ui/stacked-cards-interaction';
import { CinematicFooter } from './ui/motion-footer';

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
    <>
      {/* Interaktiver Kartenstapel im oberen Bereich vor dem Curtain-Reveal-Footer */}
      <section className="relative z-10 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/90 dark:border-slate-800/90 transition-colors py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
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
      </section>

      {/* Cinematic Motion Footer mit Parallax Curtain-Reveal, Magnetic Buttons & Dynamic Marquee */}
      <CinematicFooter
        brandText="FLÜCHTER"
        heading="Let's build something exceptional"
        marqueeItems={[
          "Full-Stack Software Engineering",
          "Cloud & Infrastructure",
          "Django REST & PostgreSQL",
          "React 19 & TypeScript",
          "Gemini AI Integration",
          "DevOps & CI/CD Pipelines",
        ]}
        ctaButtons={[
          {
            label: "Projekt anfragen",
            href: "#contact",
            icon: <Mail className="w-5 h-5 text-indigo-400" aria-hidden="true" />,
          },
          {
            label: "GitHub Profil",
            href: "https://github.com/dfluechter",
            external: true,
            icon: (
              <svg className="w-5 h-5 fill-current text-indigo-400" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            ),
          },
          {
            label: "Admin Login",
            href: "/login",
            icon: <Lock className="w-5 h-5 text-indigo-400" aria-hidden="true" />,
          },
        ]}
        secondaryLinks={[
          { label: "Skills", href: "#skills" },
          { label: "Projekte", href: "#projects" },
          { label: "Zertifikate", href: "#certificates" },
          { label: "Werdegang", href: "#timeline" },
          { label: "Kontakt", href: "#contact" },
          { label: "Admin", href: "/login" },
        ]}
        copyrightYear={new Date().getFullYear()}
        copyrightOwner={PORTFOLIO_OWNER_NAME}
        creatorName={PORTFOLIO_OWNER_NAME}
      />
    </>
  );
};
