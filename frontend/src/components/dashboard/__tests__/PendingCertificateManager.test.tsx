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

    mockBulkApproveMutateAsync = vi.fn().mockResolvedValue({
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

  it('bestätigt und führt Bulk-Reject mit ids aus', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<PendingCertificateManager onNotify={onNotify} />);

    const selectAllBtn = screen.getByRole('button', { name: /Alle sichtbaren auswählen/i });
    fireEvent.click(selectAllBtn);

    const rejectBtn = screen.getByRole('button', { name: /Ablehnen \(2\)/i });
    fireEvent.click(rejectBtn);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Möchtest du die 2 ausgewählten Zertifikate wirklich ablehnen?'
    );

    await waitFor(() => {
      expect(mockBulkRejectMutateAsync).toHaveBeenCalledWith([1, 2]);
      expect(onNotify).toHaveBeenCalledWith({
        type: 'success',
        text: '2 Zertifikat(e) abgelehnt.',
      });
    });
    confirmSpy.mockRestore();
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
