import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useApprovePendingCertificate,
  useBulkApprovePendingCertificates,
  useBulkRejectPendingCertificates,
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
  useBulkApprovePendingCertificates: vi.fn(),
  useBulkRejectPendingCertificates: vi.fn(),
}));

describe('PendingCertificateManager Component', () => {
  const mockOnNotify = vi.fn();
  const mockApproveMutateAsync = vi.fn();
  const mockRejectMutateAsync = vi.fn();
  const mockBulkApproveMutateAsync = vi.fn();
  const mockBulkRejectMutateAsync = vi.fn();

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

    vi.mocked(useBulkApprovePendingCertificates).mockReturnValue({
      mutateAsync: mockBulkApproveMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useBulkApprovePendingCertificates>);

    vi.mocked(useBulkRejectPendingCertificates).mockReturnValue({
      mutateAsync: mockBulkRejectMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useBulkRejectPendingCertificates>);
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

    expect(screen.getByText('Inbox & Zertifikats-Review')).toBeInTheDocument();
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

    const searchInput = screen.getByPlaceholderText('Kandidaten durchsuchen...');
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
    const reviewBtn = screen.getByRole('button', { name: /Prüfen & Freigeben/i });
    fireEvent.click(reviewBtn);

    // Review Panel muss sichtbar sein
    expect(screen.getByText(/Zertifikat freigeben:/i)).toBeInTheDocument();

    // Track auswählen
    const trackButton = screen.getByRole('button', { name: 'Python Backend' });
    fireEvent.click(trackButton);

    // Klick auf "Freigeben & Übertragen"
    const submitBtn = screen.getByRole('button', { name: /Freigeben & Übertragen/i });
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
      expect(mockRejectMutateAsync).toHaveBeenCalledWith(7);
      expect(mockOnNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          text: expect.stringContaining('abgelehnt'),
        })
      );
    });

    confirmSpy.mockRestore();
  });

  it('handles multi-select and selects all items with the header toggle', () => {
    const items = [
      getMockPendingCertificate({ id: 101, guessed_title: 'AWS SysOps', status: 'pending' }),
      getMockPendingCertificate({ id: 102, guessed_title: 'GCP Engineer', status: 'pending' }),
    ];

    vi.mocked(usePendingCertificates).mockReturnValue({
      data: items,
      isLoading: false,
    } as unknown as ReturnType<typeof usePendingCertificates>);

    renderWithProviders(<PendingCertificateManager onNotify={mockOnNotify} />);

    // Initial ist kein Floating Action Bar sichtbar
    expect(screen.queryByText(/ausgewählt/i)).not.toBeInTheDocument();

    // Einzelnes Item auswählen
    const selectFirst = screen.getByRole('checkbox', { name: /Zertifikat AWS SysOps auswählen/i });
    fireEvent.click(selectFirst);

    // Floating Bar erscheint mit "1 ausgewählt"
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('ausgewählt')).toBeInTheDocument();

    // Alle auswählen per Header-Toggle
    const selectAllBtn = screen.getByRole('button', { name: /Alle sichtbaren auswählen/i });
    fireEvent.click(selectAllBtn);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('performs bulk approve on selected certificates with assigned tracks', async () => {
    const items = [
      getMockPendingCertificate({ id: 201, guessed_title: 'Kubernetes Admin', status: 'pending' }),
      getMockPendingCertificate({ id: 202, guessed_title: 'CKA Certified', status: 'pending' }),
    ];

    vi.mocked(usePendingCertificates).mockReturnValue({
      data: items,
      isLoading: false,
    } as unknown as ReturnType<typeof usePendingCertificates>);

    mockBulkApproveMutateAsync.mockResolvedValueOnce({
      approved_count: 2,
      failed_count: 0,
      errors: [],
    });

    renderWithProviders(<PendingCertificateManager onNotify={mockOnNotify} />);

    // Alle auswählen
    const selectAllBtn = screen.getByRole('button', { name: /Alle sichtbaren auswählen/i });
    fireEvent.click(selectAllBtn);

    // Tracks Picker öffnen & Track zuweisen
    const trackPickerBtn = screen.getByRole('button', { name: /Tracks zuweisen/i });
    fireEvent.click(trackPickerBtn);

    const trackOption = screen.getByRole('button', { name: 'Python Backend' });
    fireEvent.click(trackOption);

    // Genehmigen-Button klicken
    const bulkApproveBtn = screen.getByRole('button', { name: /Genehmigen \(2\)/i });
    fireEvent.click(bulkApproveBtn);

    await waitFor(() => {
      expect(mockBulkApproveMutateAsync).toHaveBeenCalledWith({
        ids: [201, 202],
        track_ids: [10],
      });
      expect(mockOnNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          text: expect.stringContaining('2 Zertifikat(e) erfolgreich freigegeben'),
        })
      );
    });
  });

  it('performs bulk reject on selected certificates with confirmation', async () => {
    const items = [
      getMockPendingCertificate({ id: 301, guessed_title: 'Spam 1', status: 'pending' }),
      getMockPendingCertificate({ id: 302, guessed_title: 'Spam 2', status: 'pending' }),
    ];

    vi.mocked(usePendingCertificates).mockReturnValue({
      data: items,
      isLoading: false,
    } as unknown as ReturnType<typeof usePendingCertificates>);

    mockBulkRejectMutateAsync.mockResolvedValueOnce({
      rejected_count: 2,
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(<PendingCertificateManager onNotify={mockOnNotify} />);

    // Beide markieren
    const selectAllBtn = screen.getByRole('button', { name: /Alle sichtbaren auswählen/i });
    fireEvent.click(selectAllBtn);

    // Bulk Reject auslösen
    const bulkRejectBtn = screen.getByRole('button', { name: /Ablehnen \(2\)/i });
    fireEvent.click(bulkRejectBtn);

    await waitFor(() => {
      expect(mockBulkRejectMutateAsync).toHaveBeenCalledWith([301, 302]);
      expect(mockOnNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          text: expect.stringContaining('2 Zertifikat(e) abgelehnt'),
        })
      );
    });

    confirmSpy.mockRestore();
  });
});
