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

  it('renders composed empty dataset state when query is empty', () => {
    render(<SectionEmptyState sectionName="Zertifikate" query="" />);

    expect(screen.getByText('Keine Einträge in Zertifikate')).toBeInTheDocument();
    expect(screen.getByText(/SYS \/\/ EMPTY_DATASET/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suchfilter zurücksetzen' })).not.toBeInTheDocument();
  });

  it('renders architectural error state and triggers onRetry when isError is true', () => {
    const handleRetry = vi.fn();

    render(
      <SectionEmptyState
        sectionName="Zertifikate"
        isError
        onRetry={handleRetry}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/ERR \/\/ TELEMETRY_SYNC_FAILED/i)).toBeInTheDocument();
    expect(screen.getByText('Zertifikate konnten nicht geladen werden')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Erneut versuchen/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
