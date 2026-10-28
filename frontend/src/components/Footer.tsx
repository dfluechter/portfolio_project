import React from 'react';
import { Lock, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PORTFOLIO_OWNER_EMAIL, PORTFOLIO_OWNER_NAME } from '../constants';
import { CinematicFooter } from './ui/motion-footer';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <CinematicFooter
      brandText="PORTFOLIO"
      heading={t('footer.heading', "Let's build something exceptional")}
      marqueeItems={[
        'Full-Stack Software Engineering',
        'Cloud & Infrastructure',
        'Django REST & PostgreSQL',
        'React 19 & TypeScript',
        'Gemini AI Integration',
        'DevOps & CI/CD Pipelines',
      ]}
      ctaButtons={[
        {
          label: t('footer.writeEmail', 'E-Mail schreiben'),
          href: `mailto:${PORTFOLIO_OWNER_EMAIL}`,
          icon: <Mail className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />,
        },
        {
          label: t('footer.githubProfile', 'GitHub Profil'),
          href: 'https://github.com/dfluechter',
          external: true,
          icon: (
            <svg className="w-5 h-5 fill-current text-muted-foreground group-hover:text-foreground transition-colors" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          ),
        },
        {
          label: t('footer.adminLogin', 'Admin Login'),
          href: '/login',
          icon: <Lock className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />,
        },
      ]}
      secondaryLinks={[
        { label: t('footer.skills', 'Skills'), href: '#skills' },
        { label: t('footer.projects', 'Projekte'), href: '#projects' },
        { label: t('footer.certificates', 'Zertifikate'), href: '#certificates' },
        { label: t('footer.timeline', 'Werdegang'), href: '#timeline' },
        { label: t('footer.contact', 'Kontakt'), href: '#contact' },
        { label: t('footer.admin', 'Admin'), href: '/login' },
      ]}
      copyrightYear={new Date().getFullYear()}
      copyrightOwner={PORTFOLIO_OWNER_NAME}
      creatorName={PORTFOLIO_OWNER_NAME}
    />
  );
};
