import { render, screen, act, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App Component', () => {
  it('renders the portfolio brand name and hero title', async () => {
    await act(async () => {
      render(<App />);
    });
    const brandElements = screen.getAllByText(/Dominik Flüchter/i);
    expect(brandElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Django & React/i)).toBeInTheDocument();
  });

  it('renders navigation links for main sections', async () => {
    await act(async () => {
      render(<App />);
    });
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: 'Über mich' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Skills' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Projekte' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Zertifikate' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Werdegang' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Kontakt' })).toBeInTheDocument();
  });
});
