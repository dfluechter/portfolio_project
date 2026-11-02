import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../context/ThemeContext';
import { NotFoundPage } from '../NotFoundPage';

describe('NotFoundPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 404 error header, status chip and requested path', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/unknown-deep-route-test']}>
          <NotFoundPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    // Status Chip
    expect(screen.getByText(/SYS \/\/ 404: ROUTE_NOT_RESOLVED/i)).toBeInTheDocument();

    // Large 404
    expect(screen.getAllByText('404').length).toBeGreaterThanOrEqual(1);

    // Title & description
    expect(
      screen.getByRole('heading', { level: 1, name: /Zieladresse nicht auffindbar|Resource Not Found/i })
    ).toBeInTheDocument();

    // Requested path
    expect(screen.getByText('/unknown-deep-route-test')).toBeInTheDocument();
  });

  it('renders home button and previous page button with history navigation', () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/invalid-path']}>
          <NotFoundPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    // Home Link
    const homeLink = screen.getByRole('link', { name: /Zur Startseite|Back to Home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');

    // Back button
    const backBtn = screen.getByRole('button', { name: /Vorherige Seite|Previous Page/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('renders quick navigation links for system modules', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/missing']}>
          <NotFoundPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByRole('link', { name: /Skills/i })).toHaveAttribute('href', '/#skills');
    expect(screen.getByRole('link', { name: /Projekte|Projects/i })).toHaveAttribute('href', '/#projects');
    expect(screen.getByRole('link', { name: /Zertifikate|Certificates/i })).toHaveAttribute('href', '/#certificates');
    expect(screen.getByRole('link', { name: /Werdegang|Timeline/i })).toHaveAttribute('href', '/#timeline');
    expect(screen.getByRole('link', { name: /Kontakt|Contact/i })).toHaveAttribute('href', '/#contact');
  });
});
