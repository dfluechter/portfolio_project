import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArchitectureTerminal } from './ArchitectureTerminal';

describe('ArchitectureTerminal', () => {
  it('renders default runtime tab and command', () => {
    render(<ArchitectureTerminal />);

    expect(screen.getByText('sys.inspect --runtime')).toBeInTheDocument();
    expect(screen.getByText('Python Engine')).toBeInTheDocument();
    expect(screen.getByText(/3.13.2/)).toBeInTheDocument();
    expect(screen.getByText('OPERATIONAL')).toBeInTheDocument();
  });

  it('switches tabs when tab buttons are clicked', () => {
    render(<ArchitectureTerminal />);

    const qualityTab = screen.getByRole('tab', { name: /Quality & CI\/CD/i });
    fireEvent.click(qualityTab);

    expect(screen.getByText('ci.verify --quality-gates')).toBeInTheDocument();
    expect(screen.getByText('Linter & Formatter')).toBeInTheDocument();
    expect(screen.getByText(/Ruff/)).toBeInTheDocument();

    const cloudTab = screen.getByRole('tab', { name: /Cloud Infrastructure/i });
    fireEvent.click(cloudTab);

    expect(screen.getByText('cloud.status --live')).toBeInTheDocument();
    expect(screen.getByText('Hosting & CDN')).toBeInTheDocument();
  });

  it('copies terminal content to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ArchitectureTerminal />);

    const copyBtn = screen.getByTitle('Terminal-Ausgabe kopieren');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('sys.inspect --runtime'));
    expect(screen.getByLabelText('Ausgabe kopiert')).toBeInTheDocument();
  });
});
