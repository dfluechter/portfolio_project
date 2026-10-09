import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SectionEmptyState } from './SectionEmptyState';

describe('SectionEmptyState Component', () => {
  it('renders section name, query and calls onReset on button click', () => {
    const handleReset = vi.fn();

    render(
      <SectionEmptyState
        sectionName="Projekte"
        query="Unbekannt"
        onReset={handleReset}
      />
    );

    expect(screen.getByText('Keine Treffer in Projekte')).toBeInTheDocument();
    expect(screen.getByText('„Unbekannt“')).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: 'Suchfilter zurücksetzen' });
    expect(resetButton).toBeInTheDocument();

    fireEvent.click(resetButton);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
