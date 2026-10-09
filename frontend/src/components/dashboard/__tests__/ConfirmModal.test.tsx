import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmModal } from '../ConfirmModal';

const getMockConfirmModalProps = (
  overrides?: Partial<ComponentProps<typeof ConfirmModal>>
): ComponentProps<typeof ConfirmModal> => ({
  isOpen: true,
  title: 'Löschen bestätigen',
  message: 'Wirklich löschen?',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  ...overrides,
});

describe('ConfirmModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(<ConfirmModal {...getMockConfirmModalProps({ isOpen: false })} />);

    expect(screen.queryByText('Löschen bestätigen')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true and triggers onConfirm and onCancel', () => {
    const props = getMockConfirmModalProps({
      confirmText: 'Ja, löschen',
      cancelText: 'Abbrechen',
    });
    render(<ConfirmModal {...props} />);

    expect(screen.getByText('Löschen bestätigen')).toBeInTheDocument();
    expect(screen.getByText('Wirklich löschen?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ja, löschen'));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Abbrechen'));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape key is pressed', () => {
    const props = getMockConfirmModalProps({ message: 'Schließen mit Escape' });
    render(<ConfirmModal {...props} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });
});
