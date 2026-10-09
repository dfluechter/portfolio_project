import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSkills } from '../hooks/usePortfolio';
import { getMockSkill } from '../test/factories';
import { renderWithProviders } from '../test/testUtils';
import { SkillsSection } from './SkillsSection';

vi.mock('../hooks/usePortfolio', () => ({
  useSkills: vi.fn(),
}));

const mockSkillsQuery = (data: ReturnType<typeof getMockSkill>[] | undefined, isLoading = false) => {
  vi.mocked(useSkills).mockReturnValue({ data, isLoading } as ReturnType<typeof useSkills>);
};

describe('SkillsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skills delivered by the API', () => {
    mockSkillsQuery([getMockSkill({ id: 1, name: 'Rust', proficiency: 70 })]);

    renderWithProviders(<SkillsSection />);

    expect(screen.getByText('Rust')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('marks featured skills as top skill', () => {
    mockSkillsQuery([getMockSkill({ name: 'Go', is_featured: true })]);

    renderWithProviders(<SkillsSection />);

    expect(screen.getByText('Top Skill')).toBeInTheDocument();
  });

  it('falls back to default skills when the API returns no data', () => {
    mockSkillsQuery([]);

    renderWithProviders(<SkillsSection />);

    expect(screen.getByText('Python 3.13')).toBeInTheDocument();
  });

  it('shows no skills while loading', () => {
    mockSkillsQuery(undefined, true);

    renderWithProviders(<SkillsSection />);

    expect(screen.queryByText('Python 3.13')).not.toBeInTheDocument();
  });

  it('filters skills by category', async () => {
    mockSkillsQuery([
      getMockSkill({ id: 1, name: 'Django', category: 'backend' }),
      getMockSkill({ id: 2, name: 'React', category: 'frontend', category_display: 'Frontend' }),
    ]);

    renderWithProviders(<SkillsSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Frontend' }));

    expect(screen.getByText('React')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Django')).not.toBeInTheDocument();
    });
  });
});
