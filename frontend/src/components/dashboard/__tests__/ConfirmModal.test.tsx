import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmModal } from '../ConfirmModal';

describe('ConfirmModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ConfirmModal
        isOpen={false}
        title="Löschen"
        message="Wirklich löschen?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByText('Löschen')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true and triggers onConfirm and onCancel', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Löschen bestätigen"
        message="Wirklich löschen?"
        confirmText="Ja, löschen"
        cancelText="Abbrechen"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    expect(screen.getByText('Löschen bestätigen')).toBeInTheDocument();
    expect(screen.getByText('Wirklich löschen?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ja, löschen'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Abbrechen'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape key is pressed', () => {
    const handleCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Test Modal"
        message="Schließen mit Escape"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
