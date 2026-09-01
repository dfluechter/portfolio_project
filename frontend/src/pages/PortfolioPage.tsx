import React from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { SkillsSection } from '../components/SkillsSection';
import { ProjectsSection } from '../components/ProjectsSection';
import { CertificatesSection } from '../components/CertificatesSection';
import { TimelineSection } from '../components/TimelineSection';
import { ContactSection } from '../components/ContactSection';
import { Footer } from '../components/Footer';

export const PortfolioPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <Navbar />
      <main>
        <Hero />
        <SkillsSection />
        <ProjectsSection />
        <CertificatesSection />
        <TimelineSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};
