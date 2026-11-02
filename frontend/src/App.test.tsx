import { render, screen, act, within, fireEvent } from '@testing-library/react';
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

  it('switches the entire portfolio page between German (DE) and English (EN) via the flag selectbox', async () => {
    await act(async () => {
      render(<App />);
    });

    const nav = screen.getByRole('navigation');
    const langSelects = screen.getAllByRole('combobox', {
      name: /Sprachauswahl \/ Language Selection/i,
    });
    expect(langSelects.length).toBeGreaterThanOrEqual(1);

    // Switch to English
    await act(async () => {
      fireEvent.change(langSelects[0], { target: { value: 'en' } });
    });

    expect(within(nav).getByRole('link', { name: 'Skills' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Certificates' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Timeline' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Contact' })).toBeInTheDocument();

    expect(screen.getByText(/Modern Web Architecture with Django & React/i)).toBeInTheDocument();
    expect(screen.getByText(/Projects & Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/Certifications & Credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/Career Timeline & Education/i)).toBeInTheDocument();
    expect(screen.getByText(/Let's Connect/i)).toBeInTheDocument();

    // Switch back to German
    await act(async () => {
      fireEvent.change(langSelects[0], { target: { value: 'de' } });
    });

    expect(within(nav).getByRole('link', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByText(/Moderne Web-Architektur mit Django & React/i)).toBeInTheDocument();
  });
});
