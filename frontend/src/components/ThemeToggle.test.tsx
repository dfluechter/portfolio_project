import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/testUtils';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows dark mode by default', () => {
    renderWithProviders(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Design-Modus umschalten' })).toHaveAttribute(
      'title',
      expect.stringContaining('Dunkelmodus')
    );
  });

  it('switches to light mode and persists the choice when clicked', () => {
    renderWithProviders(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Design-Modus umschalten' }));

    expect(screen.getByRole('button', { name: 'Design-Modus umschalten' })).toHaveAttribute(
      'title',
      expect.stringContaining('Hellmodus')
    );
    expect(localStorage.getItem('app-theme')).toBe('light');
  });
});
