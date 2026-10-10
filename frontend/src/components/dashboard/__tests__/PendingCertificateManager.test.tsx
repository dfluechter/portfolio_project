import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useApprovePendingCertificate,
  usePendingCertificates,
  useProviders,
  useRejectPendingCertificate,
  useTracks,
} from '../../../hooks/usePortfolio';
import {
  getMockPendingCertificate,
  getMockProvider,
  getMockTrack,
} from '../../../test/factories';
import { renderWithProviders } from '../../../test/testUtils';
import { PendingCertificateManager } from '../PendingCertificateManager';

vi.mock('../../../hooks/usePortfolio', () => ({
  usePendingCertificates: vi.fn(),
  useProviders: vi.fn(),
  useTracks: vi.fn(),
  useApprovePendingCertificate: vi.fn(),
  useRejectPendingCertificate: vi.fn(),
}));

describe('PendingCertificateManager Component', () => {
  const mockOnNotify = vi.fn();
  const mockApproveMutateAsync = vi.fn();
  const mockRejectMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useProviders).mockReturnValue({
      data: [getMockProvider({ id: 1, provider: 'Udemy' })],
      isLoading: false,
    } as unknown as ReturnType<typeof useProviders>);

    vi.mocked(useTracks).mockReturnValue({
      data: [
        getMockTrack({ id: 10, name: 'Python Backend', slug: 'python-backend' }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useTracks>);

    vi.mocked(useApprovePendingCertificate).mockReturnValue({
      mutateAsync: mockApproveMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useApprovePendingCertificate>);

    vi.mocked(useRejectPendingCertificate).mockReturnValue({
      mutateAsync: mockRejectMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRejectPendingCertificate>);
  });

  it('renders pending certificates with guessed title and status', () => {
    vi.mocked(usePendingCertificates).mockReturnValue({
      data: [
        getMockPendingCertificate({
          id: 1,
          guessed_title: 'Django Mastery',
          guessed_provider: 'Coursera',
          status: 'pending',
        }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof usePendingCertificates>);

    renderWithProviders(<PendingCertificateManager onNotify={mockOnNotify} />);

    expect(screen.getByText('Inbox: Zertifikats-Import')).toBeInTheDocument();
    expect(screen.getByText('Django Mastery')).toBeInTheDocument();
    expect(screen.getByText('Coursera')).toBeInTheDocument();
  });

  it('filters pending list using the search input', () => {
    vi.mocked(usePendingCertificates).mockReturnValue({
      data: [
        getMockPendingCertificate({
          id: 1,
          guessed_title: 'Docker Deep Dive',
          original_file_name: 'docker.pdf',
        }),
        getMockPendingCertificate({
          id: 2,
          guessed_title: 'Kubernetes Hands-on',
          original_file_name: 'k8s.pdf',
        }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof usePendingCertificates>);

    renderWithProviders(<PendingCertificateManager onNotify={mockOnNotify} />);

    expect(screen.getByText('Docker Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('Kubernetes Hands-on')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Nach Datei, Titel, Provider suchen...');
    fireEvent.change(searchInput, { target: { value: 'Docker' } });

    expect(screen.getByText('Docker Deep Dive')).toBeInTheDocument();
    expect(screen.queryByText('Kubernetes Hands-on')).not.toBeInTheDocument();
  });

  it('opens review form and approves a pending certificate', async () => {
    const pendingItem = getMockPendingCertificate({
      id: 42,
      guessed_title: 'FastAPI Microservices',
      guessed_provider: 'Udemy',
      original_file_name: 'fastapi.pdf',
      status: 'pending',
    });

    vi.mocked(usePendingCertificates).mockReturnValue({
      data: [pendingItem],
      isLoading: false,
    } as unknown as ReturnType<typeof usePendingCertificates>);

    mockApproveMutateAsync.mockResolvedValueOnce({
      id: 100,
      title: 'FastAPI Microservices',
      provider: 1,
      is_published: true,
    });

    renderWithProviders(<PendingCertificateManager onNotify={mockOnNotify} />);

    // Klick auf Review-Button
    const reviewBtn = screen.getByRole('button', { name: /Freigeben \/ Bearbeiten/i });
    fireEvent.click(reviewBtn);

    // Review Panel muss sichtbar sein
    expect(screen.getByText('Zertifikat prüfen & freigeben')).toBeInTheDocument();

    // Track auswählen
    const trackCheckbox = screen.getByLabelText('Python Backend');
    fireEvent.click(trackCheckbox);

    // Klick auf "Freigeben & Veröffentlichen"
    const submitBtn = screen.getByRole('button', { name: /Freigeben & Veröffentlichen/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApproveMutateAsync).toHaveBeenCalledWith({
        id: 42,
        payload: {
          title: 'FastAPI Microservices',
          provider: 'Udemy',
          track_ids: [10],
        },
      });
      expect(mockOnNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
        })
      );
    });
  });

  it('rejects a pending certificate with confirmation', async () => {
    const pendingItem = getMockPendingCertificate({
      id: 7,
      guessed_title: 'Spam Document',
      original_file_name: 'spam.pdf',
      status: 'pending',
    });

    vi.mocked(usePendingCertificates).mockReturnValue({
      data: [pendingItem],
      isLoading: false,
    } as unknown as ReturnType<typeof usePendingCertificates>);

    mockRejectMutateAsync.mockResolvedValueOnce(undefined);

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(<PendingCertificateManager onNotify={mockOnNotify} />);

    const rejectBtn = screen.getByRole('button', { name: /Ablehnen/i });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(mockRejectMutateAsync).toHaveBeenCalledWith({ id: 7 });
      expect(mockOnNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          text: expect.stringContaining('abgelehnt'),
        })
      );
    });

    confirmSpy.mockRestore();
  });
});
