import React, { useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PORTFOLIO_OWNER_EMAIL } from '../constants';
import { portfolioService } from '../services/portfolioService';

export const ContactSection: React.FC = () => {
  const { t } = useTranslation();
  const emailAddress = PORTFOLIO_OWNER_EMAIL;

  // Formmailer State: 'Ihre Name', 'Ihre Email Adresse', 'Nachricht'
  const [name, setName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedEmail = senderEmail.trim();
    const trimmedMessage = message.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      trimmedName.length < 2 ||
      !emailRegex.test(trimmedEmail) ||
      trimmedMessage.length < 10
    ) {
      setFormError(
        t(
          'contact.validationError',
          'Bitte füllen Sie Ihre Name, Ihre Email Adresse und eine Nachricht (mind. 10 Zeichen) aus.'
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await portfolioService.sendContactMessage({
        name: trimmedName,
        email: trimmedEmail,
        subject: `Formmailer Anfrage von ${trimmedName}`,
        message: trimmedMessage,
        website: honeypot,
      });
      setIsSubmitted(true);
      setName('');
      setSenderEmail('');
      setMessage('');
    } catch {
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="relative z-10 scroll-mt-20 py-24 bg-white dark:bg-slate-950 border-t border-slate-200/90 dark:border-slate-800/90 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header: Titel, Subtitel & Statusbox auf einer Ebene */}
        <div className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src="/static/img/background/picture.jpg"
                  alt="Dominik Flüchter"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-200/90 dark:border-slate-800 shadow-sm"
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950"
                  aria-hidden="true"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                  <span>{t('contact.eyebrow', '05 // Direct Communication')}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {t('contact.heading', 'Lass uns in Verbindung treten')}
                </h2>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
              {t(
                'contact.subheading',
                'Interesse an einer technischen Zusammenarbeit, einem Architektur-Review oder fachlichem Austausch? Nutze direkt den Formmailer oder vernetze dich über GitHub und Credly.'
              )}
            </p>
          </div>

          {/* Architectural Availability Status Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800/90 space-y-2.5 shadow-2xs shrink-0 lg:max-w-xs w-full">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>
                  {t('contact.availableForProjects', 'Verfügbar für Projekte')}
                </span>
              </span>
              <span
                className="font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                aria-hidden="true"
              >
                SLA // DIRECT
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck
                className="w-4 h-4 text-indigo-500 shrink-0"
                aria-hidden="true"
              />
              <span>Full-Stack Architecture · Cloud & DevOps · Remote & Hybrid</span>
            </div>
          </div>
        </div>

        {/* 2-Spalten-Layout: Linker Verified-Profiles-Ledger und Rechter Formmailer exakt auf selber Höhe */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Verified Profiles & Location Ledger */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-slate-50/60 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/90 divide-y divide-slate-200/80 dark:divide-slate-800/80 overflow-hidden shadow-xs">
              {/* Row 1: GitHub */}
              <a
                href="https://github.com/dfluechter"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-500/40 flex items-center justify-center transition-colors shrink-0">
                    <svg
                      className="w-5 h-5 fill-current"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {t('contact.githubProfile', 'GitHub-Profil')}
                    </h3>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      github.com/dfluechter
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline whitespace-nowrap">
                  <span>{t('contact.viewRepos', 'Repositories ansehen')}</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </a>

              {/* Row 2: Credly Link (https://credly.com/users/dfluechter) */}
              <a
                href="https://credly.com/users/dfluechter"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 group-hover:border-amber-500/50 flex items-center justify-center transition-colors shrink-0">
                    <Award className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {t('contact.credlyProfile', 'Credly-Profil')}
                    </h3>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      https://credly.com/users/dfluechter
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline whitespace-nowrap">
                  <span>{t('contact.viewBadges', 'Badges auf Credly ansehen')}</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </a>

              {/* Row 3: Location & Embedded Map */}
              <div className="p-5 bg-white dark:bg-slate-900/60 space-y-3.5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                      <MapPin
                        className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        {t('contact.location', 'Standort')}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {t(
                          'contact.locationVal',
                          'Deutschland (Remote & Hybrid) · 59556 Lippstadt'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Google Maps Ausschnitt für 59556 Lippstadt */}
                <div className="relative rounded-xl overflow-hidden border border-slate-200/90 dark:border-slate-800/90 bg-slate-100 dark:bg-slate-900">
                  <iframe
                    title={t('contact.mapsTitle', 'Google Maps Standort 59556 Lippstadt')}
                    src="https://maps.google.com/maps?q=59556%20Lippstadt,%20Deutschland&t=&z=13&ie=UTF8&iwloc=&output=embed"
                    className="w-full h-44 sm:h-48 border-0 dark:invert-[90%] dark:hue-rotate-180 dark:brightness-95 dark:contrast-90 transition-all"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                  <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-[11px]">
                      {t('contact.mapsCaption', '59556 Lippstadt, Nordrhein-Westfalen')}
                    </span>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=59556+Lippstadt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <span>{t('contact.viewLargerMap', 'Größere Karte ansehen')}</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Formmailer ('Ihre Name', 'Ihre Email Adresse', 'Nachricht') */}
          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900/75 border border-slate-200/90 dark:border-slate-800/90 overflow-hidden shadow-sm">
            {/* Formmailer Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 bg-slate-50/80 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {t('contact.formTitle', 'Formmailer')}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {emailAddress}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Body or Confirmation State */}
            <div className="p-6 sm:p-8">
              {isSubmitted ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="py-10 px-6 text-center rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                      {t('contact.successTitle', 'Nachricht erfolgreich übermittelt')}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t(
                        'contact.successText',
                        'Vielen Dank für Ihre Nachricht! Ich melde mich zeitnah bei Ihnen zurück.'
                      )}
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(false)}
                      className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <span>
                        {t('contact.sendAnother', 'Weitere Nachricht verfassen')}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* Honeypot field against automated bots */}
                  <div className="sr-only" aria-hidden="true">
                    <label htmlFor="contact-website">Website</label>
                    <input
                      id="contact-website"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-medium"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Field 1: Ihre Name */}
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      {t('contact.nameLabel', 'Ihre Name')} <span className="text-indigo-500">*</span>
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('contact.namePlaceholder', 'Ihre Name')}
                      disabled={isSubmitting}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200/90 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Field 2: Ihre Email Adresse */}
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      {t('contact.emailLabel', 'Ihre Email Adresse')}{' '}
                      <span className="text-indigo-500">*</span>
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder={t('contact.emailPlaceholder', 'Ihre Email Adresse')}
                      disabled={isSubmitting}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200/90 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Field 3: Nachricht */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="contact-message"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        {t('contact.messageLabel', 'Nachricht')}{' '}
                        <span className="text-indigo-500">*</span>
                      </label>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        {message.length} / 2000
                      </span>
                    </div>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      maxLength={2000}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('contact.messagePlaceholder', 'Ihre Nachricht...')}
                      disabled={isSubmitting}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200/90 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors resize-y"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-200/70 dark:border-slate-800/80">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      TLS Encrypted · Formmailer Direct-to-Inbox
                    </span>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          <span>{t('contact.sending', 'Wird gesendet...')}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" aria-hidden="true" />
                          <span>{t('contact.submitButton', 'Nachricht senden')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
