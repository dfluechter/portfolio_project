import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PendingCertificateManager } from '../PendingCertificateManager';
import type { PendingCertificate, Track, Provider } from '../../../types';
import * as portfolioHooks from '../../../hooks/usePortfolio';

vi.mock('../../../hooks/usePortfolio');

const mockPendingList: PendingCertificate[] = [
  {
    id: 1,
    original_file_name: 'cert_without_tracks.pdf',
    guessed_title: 'AWS Certified Cloud Practitioner',
    guessed_provider: 'Amazon Web Services',
    status: 'pending',
    suggested_tracks: [], // Kein Track zugeordnet
    created_at: '2026-03-01T12:00:00Z',
  },
  {
    id: 2,
    original_file_name: 'cert_with_tracks.pdf',
    guessed_title: 'Professional Cloud Architect',
    guessed_provider: 'Google Cloud',
    status: 'pending',
    suggested_tracks: [10], // Track ID 10 zugeordnet
    created_at: '2026-03-02T14:30:00Z',
  },
];

const mockTracks: Track[] = [
  {
    id: 10,
    name: 'Cloud Architecture',
    slug: 'cloud-architecture',
    description: 'Cloud track',
    created_at: '2026-01-01',
  },
  {
    id: 20,
    name: 'DevOps & CI/CD',
    slug: 'devops-cicd',
    description: 'DevOps track',
    created_at: '2026-01-01',
  },
];

const mockProviders: Provider[] = [
  { id: 1, provider: 'Amazon Web Services', aktiv: true },
  { id: 2, provider: 'Google Cloud', aktiv: true },
];

describe('PendingCertificateManager Component', () => {
  const onNotify = vi.fn();
  let mockBulkApproveMutateAsync: ReturnType<typeof vi.fn>;
  let mockBulkRejectMutateAsync: ReturnType<typeof vi.fn>;
  let mockApproveMutateAsync: ReturnType<typeof vi.fn>;
  let mockRejectMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

<<<<<<< HEAD
    mockBulkApproveMutateAsync = vi.fn().mockResolvedValue({
=======
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

    renderWithProviders(<PendingCertificateManager onNotify={mockOnNotify} />);

    const rejectBtn = screen.getByRole('button', { name: /Ablehnen/i });
    fireEvent.click(rejectBtn);

    const confirmBtn = screen.getByRole('button', { name: /Ja, ablehnen/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockRejectMutateAsync).toHaveBeenCalledWith(7);
      expect(mockOnNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          text: expect.stringContaining('abgelehnt'),
        })
      );
    });
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
>>>>>>> 57004a6 (feat: add backend ocr processing, cert mang, and ci workflows)
      approved_count: 2,
      failed_count: 0,
      results: [],
      errors: [],
    });

    mockBulkRejectMutateAsync = vi.fn().mockResolvedValue({
      rejected_count: 2,
      failed_count: 0,
      results: [],
      errors: [],
    });

    mockApproveMutateAsync = vi.fn().mockResolvedValue({
      detail: 'Erfolgreich freigegeben.',
      certificate_id: 100,
    });

    mockRejectMutateAsync = vi.fn().mockResolvedValue({
      detail: 'Abgelehnt.',
    });

    vi.mocked(portfolioHooks.usePendingCertificates).mockReturnValue({
      data: mockPendingList,
      isLoading: false,
    } as unknown as ReturnType<typeof portfolioHooks.usePendingCertificates>);

    vi.mocked(portfolioHooks.useTracks).mockReturnValue({
      data: mockTracks,
      isLoading: false,
    } as unknown as ReturnType<typeof portfolioHooks.useTracks>);

    vi.mocked(portfolioHooks.useProviders).mockReturnValue({
      data: mockProviders,
      isLoading: false,
    } as unknown as ReturnType<typeof portfolioHooks.useProviders>);

    vi.mocked(portfolioHooks.useBulkApprovePendingCertificates).mockReturnValue({
      mutateAsync: mockBulkApproveMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof portfolioHooks.useBulkApprovePendingCertificates>);

    vi.mocked(portfolioHooks.useBulkRejectPendingCertificates).mockReturnValue({
      mutateAsync: mockBulkRejectMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof portfolioHooks.useBulkRejectPendingCertificates>);

    vi.mocked(portfolioHooks.useApprovePendingCertificate).mockReturnValue({
      mutateAsync: mockApproveMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof portfolioHooks.useApprovePendingCertificate>);

    vi.mocked(portfolioHooks.useRejectPendingCertificate).mockReturnValue({
      mutateAsync: mockRejectMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof portfolioHooks.useRejectPendingCertificate>);
  });

  it('rendert die Liste der ausstehenden Zertifikate mit Mock-Daten', () => {
    render(<PendingCertificateManager onNotify={onNotify} />);

    expect(screen.getByText('Inbox & Zertifikats-Review')).toBeInTheDocument();
    expect(screen.getByText('AWS Certified Cloud Practitioner')).toBeInTheDocument();
    expect(screen.getByText('Professional Cloud Architect')).toBeInTheDocument();
    expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
    expect(screen.getByText('Google Cloud')).toBeInTheDocument();
    expect(screen.getAllByText('Ausstehend').length).toBeGreaterThanOrEqual(2);
  });

  it('erlaubt Einzel- und Alle-Auswahl von Zertifikaten', () => {
    render(<PendingCertificateManager onNotify={onNotify} />);

    const checkboxItem1 = screen.getByLabelText('Zertifikat AWS Certified Cloud Practitioner auswählen');
    const checkboxItem2 = screen.getByLabelText('Zertifikat Professional Cloud Architect auswählen');
    expect(checkboxItem1).not.toBeChecked();
    expect(checkboxItem2).not.toBeChecked();

    // Einzel-Auswahl
    fireEvent.click(checkboxItem1);
    expect(checkboxItem1).toBeChecked();
    expect(checkboxItem2).not.toBeChecked();
    expect(screen.getByText('1 von 2 ausgewählt')).toBeInTheDocument();

    // Alle sichtbaren auswählen
    const selectAllBtn = screen.getByRole('button', { name: /Alle sichtbaren auswählen/i });
    fireEvent.click(selectAllBtn);
    expect(checkboxItem1).toBeChecked();
    expect(checkboxItem2).toBeChecked();
    expect(screen.getByText('2 von 2 ausgewählt')).toBeInTheDocument();

    // Auswahl aufheben
    const deselectAllBtn = screen.getByRole('button', { name: /Auswahl für alle aufheben/i });
    fireEvent.click(deselectAllBtn);
    expect(checkboxItem1).not.toBeChecked();
    expect(checkboxItem2).not.toBeChecked();
  });

  it('blendet die Bulk-Action-Bar erst ab mindestens einem ausgewählten Item ein', () => {
    render(<PendingCertificateManager onNotify={onNotify} />);

    expect(screen.queryByRole('button', { name: /Genehmigen \(/i })).not.toBeInTheDocument();

    const checkboxItem2 = screen.getByLabelText('Zertifikat Professional Cloud Architect auswählen');
    fireEvent.click(checkboxItem2);

    expect(screen.getByRole('button', { name: /Genehmigen \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ablehnen \(1\)/i })).toBeInTheDocument();

    fireEvent.click(checkboxItem2);
    expect(screen.queryByRole('button', { name: /Genehmigen \(/i })).not.toBeInTheDocument();
  });

  it('deaktiviert Genehmigen und zeigt Hinweistext, wenn ein Item ohne Tracks ausgewählt ist', () => {
    render(<PendingCertificateManager onNotify={onNotify} />);

    const checkboxItem1 = screen.getByLabelText('Zertifikat AWS Certified Cloud Practitioner auswählen');
    fireEvent.click(checkboxItem1); // Item 1 hat keine Tracks

    const approveBtn = screen.getByRole('button', { name: /Genehmigen \(1\)/i });
    expect(approveBtn).toBeDisabled();

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(
      'Bitte weise mindestens einen Track zu (oder wähle gemeinsame Tracks), da mindestens ein Zertifikat keinen Track besitzt.'
    );
  });

  it('aktiviert Genehmigen, wenn nur Items mit vorhandenen Tracks ausgewählt sind', () => {
    render(<PendingCertificateManager onNotify={onNotify} />);

    const checkboxItem2 = screen.getByLabelText('Zertifikat Professional Cloud Architect auswählen');
    fireEvent.click(checkboxItem2); // Item 2 hat suggested_tracks: [10]

    const approveBtn = screen.getByRole('button', { name: /Genehmigen \(1\)/i });
    expect(approveBtn).not.toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('aktiviert Genehmigen und entfernt Hinweistext, sobald gemeinsame Tracks im Bulk-Picker gewählt werden', () => {
    render(<PendingCertificateManager onNotify={onNotify} />);

    const checkboxItem1 = screen.getByLabelText('Zertifikat AWS Certified Cloud Practitioner auswählen');
    fireEvent.click(checkboxItem1); // Item 1 ohne Tracks

    const approveBtn = screen.getByRole('button', { name: /Genehmigen \(1\)/i });
    expect(approveBtn).toBeDisabled();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Bulk Track-Picker öffnen
    const trackPickerBtn = screen.getByRole('button', { name: /Tracks zuweisen/i });
    fireEvent.click(trackPickerBtn);

    // Track "Cloud Architecture" wählen
    const cloudTrackBtn = screen.getByRole('button', { name: 'Cloud Architecture' });
    fireEvent.click(cloudTrackBtn);

    // Jetzt ist Genehmigen aktiviert und Alert verschwunden
    expect(approveBtn).not.toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('1 Track(s) gewählt')).toBeInTheDocument();
  });

  it('führt Bulk-Approve mit { ids, track_ids: undefined } aus, wenn alle Items eigene Tracks haben', async () => {
    render(<PendingCertificateManager onNotify={onNotify} />);

    const checkboxItem2 = screen.getByLabelText('Zertifikat Professional Cloud Architect auswählen');
    fireEvent.click(checkboxItem2);

    const approveBtn = screen.getByRole('button', { name: /Genehmigen \(1\)/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockBulkApproveMutateAsync).toHaveBeenCalledWith({
        ids: [2],
        track_ids: undefined,
      });
      expect(onNotify).toHaveBeenCalledWith({
        type: 'success',
        text: '2 Zertifikat(e) erfolgreich freigegeben und übertragen.',
      });
    });
  });

  it('führt Bulk-Approve mit { ids, track_ids } aus, wenn gemeinsame Tracks gewählt wurden', async () => {
    render(<PendingCertificateManager onNotify={onNotify} />);

    const checkboxItem1 = screen.getByLabelText('Zertifikat AWS Certified Cloud Practitioner auswählen');
    fireEvent.click(checkboxItem1);

    // Track zuweisen
    fireEvent.click(screen.getByRole('button', { name: /Tracks zuweisen/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cloud Architecture' }));

    const approveBtn = screen.getByRole('button', { name: /Genehmigen \(1\)/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockBulkApproveMutateAsync).toHaveBeenCalledWith({
        ids: [1],
        track_ids: [10],
      });
    });
  });

<<<<<<< HEAD
  it('bestätigt und führt Bulk-Reject mit ids aus', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<PendingCertificateManager onNotify={onNotify} />);

=======
    renderWithProviders(<PendingCertificateManager onNotify={mockOnNotify} />);

    // Beide markieren
>>>>>>> 57004a6 (feat: add backend ocr processing, cert mang, and ci workflows)
    const selectAllBtn = screen.getByRole('button', { name: /Alle sichtbaren auswählen/i });
    fireEvent.click(selectAllBtn);

    const rejectBtn = screen.getByRole('button', { name: /Ablehnen \(2\)/i });
    fireEvent.click(rejectBtn);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Möchtest du die 2 ausgewählten Zertifikate wirklich ablehnen?'
    );

    const confirmBtn = screen.getByRole('button', { name: /Ja, ablehnen/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockBulkRejectMutateAsync).toHaveBeenCalledWith([1, 2]);
      expect(onNotify).toHaveBeenCalledWith({
        type: 'success',
        text: '2 Zertifikat(e) abgelehnt.',
      });
    });
<<<<<<< HEAD
    confirmSpy.mockRestore();
=======
>>>>>>> 57004a6 (feat: add backend ocr processing, cert mang, and ci workflows)
  });

  it('bricht Bulk-Reject ab, wenn window.confirm abgelehnt wird', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<PendingCertificateManager onNotify={onNotify} />);

    const selectAllBtn = screen.getByRole('button', { name: /Alle sichtbaren auswählen/i });
    fireEvent.click(selectAllBtn);

    const rejectBtn = screen.getByRole('button', { name: /Ablehnen \(2\)/i });
    fireEvent.click(rejectBtn);

    expect(mockBulkRejectMutateAsync).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('zeigt Backend-400-Fehlermeldung im Fehler-Toast bei Fehlschlag von Bulk-Approve', async () => {
    const backendError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          detail: 'Zertifikat "cert_without_tracks.pdf" (ID: 1) hat keine zugeordneten Tracks.',
        },
      },
    };
    mockBulkApproveMutateAsync.mockRejectedValueOnce(backendError);

    render(<PendingCertificateManager onNotify={onNotify} />);

    const checkboxItem2 = screen.getByLabelText('Zertifikat Professional Cloud Architect auswählen');
    fireEvent.click(checkboxItem2);

    const approveBtn = screen.getByRole('button', { name: /Genehmigen \(1\)/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(onNotify).toHaveBeenCalledWith({
        type: 'error',
        text: 'Zertifikat "cert_without_tracks.pdf" (ID: 1) hat keine zugeordneten Tracks.',
      });
    });
  });

  it('zeigt Backend-400-Fehlermeldung im Fehler-Toast bei Fehlschlag von Bulk-Reject', async () => {
    const backendError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          detail: 'Datensatz hat Status "rejected", nur "pending" kann abgelehnt werden.',
        },
      },
    };
    mockBulkRejectMutateAsync.mockRejectedValueOnce(backendError);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<PendingCertificateManager onNotify={onNotify} />);

    const checkboxItem2 = screen.getByLabelText('Zertifikat Professional Cloud Architect auswählen');
    fireEvent.click(checkboxItem2);

    const rejectBtn = screen.getByRole('button', { name: /Ablehnen \(1\)/i });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(onNotify).toHaveBeenCalledWith({
        type: 'error',
        text: 'Datensatz hat Status "rejected", nur "pending" kann abgelehnt werden.',
      });
    });
  });
});
