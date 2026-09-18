import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App Component', () => {
  it('renders the portfolio brand name and hero title', () => {
    render(<App />);
    const brandElements = screen.getAllByText(/Dominik Flüchter/i);
    expect(brandElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Django & React/i)).toBeInTheDocument();
  });

  it('renders navigation links for main sections', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Über mich' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projekte' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zertifikate' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Werdegang' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kontakt' })).toBeInTheDocument();
  });
});
