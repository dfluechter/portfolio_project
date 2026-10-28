import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import i18n from '../i18n';

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  it('renders select combobox element with accessible aria-label', () => {
    render(<LanguageSwitcher />);
    const select = screen.getByRole('combobox', { name: 'Sprachauswahl / Language Selection' });
    expect(select).toBeInTheDocument();
  });

  it('renders DE and EN options with country flag identifiers', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole('option', { name: /Deutsch \(DE\)/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /English \(EN\)/i })).toBeInTheDocument();
  });

  it('has DE selected initially and displays German SVG flag', () => {
    render(<LanguageSwitcher />);
    const select = screen.getByRole('combobox', { name: 'Sprachauswahl / Language Selection' }) as HTMLSelectElement;
    expect(select.value).toBe('de');
    expect(screen.getByTestId('flag-de')).toBeInTheDocument();
  });

  it('switches to english on select change and updates document.documentElement.lang and SVG flag', async () => {
    render(<LanguageSwitcher />);
    const select = screen.getByRole('combobox', { name: 'Sprachauswahl / Language Selection' });

    fireEvent.change(select, { target: { value: 'en' } });

    expect(i18n.language).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByTestId('flag-en')).toBeInTheDocument();
  });
});
