import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCertificates, useProjects, useSkills, useTimeline } from '../hooks/usePortfolio';
import { getMockCertificate, getMockProject, getMockSkill, getMockTimelineEntry } from '../test/factories';
import { renderWithProviders } from '../test/testUtils';
import { HeroSearch } from './HeroSearch';

vi.mock('../hooks/usePortfolio', () => ({
  useProjects: vi.fn(),
  useSkills: vi.fn(),
  useCertificates: vi.fn(),
  useTimeline: vi.fn(),
}));

describe('HeroSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProjects).mockReturnValue({ data: [getMockProject({ id: 1, title: 'Django CRM' })] } as any);
    vi.mocked(useSkills).mockReturnValue({ data: [getMockSkill({ id: 1, name: 'Python' })] } as any);
    vi.mocked(useCertificates).mockReturnValue({ data: [getMockCertificate({ id: 1, title: 'AWS Cloud Practitioner' })] } as any);
    vi.mocked(useTimeline).mockReturnValue({ data: [getMockTimelineEntry({ id: 1, title: 'Senior Architect' })] } as any);
  });

  it('renders search input and placeholder', () => {
    renderWithProviders(<HeroSearch />);

    const input = screen.getByRole('textbox', { name: 'Portfolio durchsuchen' });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('displays matching results in live dropdown when typing', () => {
    renderWithProviders(<HeroSearch />, { route: '/?q=django' });

    expect(screen.getByText('Django CRM')).toBeInTheDocument();
    expect(screen.getByText(/1 Treffer/i)).toBeInTheDocument();
  });

  it('clears search when clear button is clicked', () => {
    renderWithProviders(<HeroSearch />, { route: '/?q=python' });

    const clearButton = screen.getByRole('button', { name: 'Suchbegriff löschen' });
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    const input = screen.getByRole('textbox', { name: 'Portfolio durchsuchen' });
    expect(input).toHaveValue('');
  });

  it('navigates results with keyboard arrow keys', async () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [
        getMockProject({ id: 1, title: 'Django CRM' }),
        getMockProject({ id: 2, title: 'Django E-Commerce' }),
      ],
    } as any);

    renderWithProviders(<HeroSearch />, { route: '/?q=django' });

    const input = screen.getByRole('textbox', { name: 'Portfolio durchsuchen' });
    expect(screen.getByText('Django CRM')).toBeInTheDocument();
    expect(screen.getByText('Django E-Commerce')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
