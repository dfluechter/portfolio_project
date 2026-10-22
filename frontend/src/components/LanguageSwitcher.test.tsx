import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import i18n from '../i18n';

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  it('renders DE and EN language buttons', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button', { name: 'DE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
  });

  it('has DE marked as active initially when language is de', () => {
    render(<LanguageSwitcher />);
    const deBtn = screen.getByRole('button', { name: 'DE' });
    const enBtn = screen.getByRole('button', { name: 'EN' });

    expect(deBtn).toHaveAttribute('aria-pressed', 'true');
    expect(enBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to english on EN click and updates document.documentElement.lang', async () => {
    render(<LanguageSwitcher />);
    const enBtn = screen.getByRole('button', { name: 'EN' });

    fireEvent.click(enBtn);

    expect(i18n.language).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(enBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
