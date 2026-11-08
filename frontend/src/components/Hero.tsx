import { motion, useReducedMotion, type Variants } from 'framer-motion';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeroThreeBackground } from './HeroThreeBackground';

export const Hero: React.FC = () => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section
      id="hero"
      className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden bg-background pt-10 pb-20 md:py-24 border-b border-border"
    >
      {/* Swiss Architectural Grid Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.05)_1px,transparent_1px)] bg-[size:48px_48px]"
      />

      {/* Interactive React Three Fiber 3D Architectural Scene */}
      <HeroThreeBackground />

      {/* Subtle Ambient Radial Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-1/4 w-[36rem] h-[36rem] rounded-full bg-accent-primary/8 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-1/4 w-[30rem] h-[30rem] rounded-full bg-accent-secondary/8 blur-[120px]"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <motion.div
          className="flex flex-col items-start text-left max-w-4xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Status Telemetry Pill */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface/90 border border-border mb-7 shadow-2xs backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-xs font-medium tracking-wider uppercase text-text-secondary">
              {t('hero.statusBadge', 'Full-Stack Developer & Software Engineer')}
            </span>
          </motion.div>

          {/* Primary Display Typography */}
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-5xl xl:text-6xl font-bold text-text-primary tracking-tight leading-[1.06] mb-6"
          >
            <span className="block text-text-secondary font-medium text-xl sm:text-2xl mb-2 tracking-normal">
              Dominik Flüchter — {t('hero.badge', 'Full-Stack Software Engineer')}
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-orange-500 to-accent-secondary">
              {t('hero.title', 'Moderne Web-Architektur mit Django & React')}
            </span>
          </motion.h1>

          {/* Concise Engineering Summary */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg md:text-xl text-text-secondary mb-9 max-w-2xl leading-relaxed font-normal"
          >
            {t(
              'hero.subtitle',
              'Entwicklung robuster Backend-Services und reaktiven Benutzeroberflächen. Spezialisiert auf wartbare REST-APIs, strikte Typisierung und nachvollziehbare Testabdeckung.'
            )}
          </motion.p>

          {/* Action Bar */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-4 w-full sm:w-auto"
          >
            <a
              href="#projects"
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm sm:text-base font-semibold rounded-xl text-white bg-accent-primary hover:bg-accent-primary/90 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              <span>{t('hero.exploreProjects', 'Projekte entdecken')}</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>

            <a
              href="#certificates"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm sm:text-base font-semibold rounded-xl text-text-primary bg-surface/90 hover:bg-surface-hover border border-border transition-all duration-200 cursor-pointer backdrop-blur-md"
            >
              <span>{t('hero.viewCertificates', 'Zertifikate einsehen')}</span>
            </a>

            <a
              href="#contact"
              className="inline-flex items-center justify-center px-5 py-3.5 text-sm sm:text-base font-medium rounded-xl text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer"
            >
              {t('hero.contactMe', 'Kontakt aufnehmen')}
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
