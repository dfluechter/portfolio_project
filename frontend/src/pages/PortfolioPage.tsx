import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { ProjectsSection } from '../components/ProjectsSection';
import { CertificatesSection } from '../components/CertificatesSection';
import { TimelineSection } from '../components/TimelineSection';
import { ContactSection } from '../components/ContactSection';
import { Footer } from '../components/Footer';
import { PortfolioChatWidget } from '../components/chat/PortfolioChatWidget';

export const PortfolioPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      {/* WCAG 2.2 AA Skip-to-Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[60] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-indigo-600 focus:text-white focus:font-semibold focus:text-xs focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        {t('nav.skipToContent', 'Direkt zum Hauptinhalt springen')}
      </a>

      <Navbar />

      <main
        id="main-content"
        className="relative z-10 bg-slate-50 dark:bg-slate-950 shadow-2xl border-b border-slate-200/80 dark:border-slate-800/80"
      >
        <Hero />
        <ProjectsSection />
        <CertificatesSection />
        <TimelineSection />
        <ContactSection />
      </main>

      <Footer />
      <PortfolioChatWidget />
    </div>
  );
};
