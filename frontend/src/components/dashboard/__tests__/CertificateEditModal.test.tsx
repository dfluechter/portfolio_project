import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useExtractCertificateMetadata,
  useProviders,
  useTracks,
  useUpdateCertificate,
} from '../../../hooks/usePortfolio';
import {
  getMockCertificate,
  getMockProvider,
  getMockTrack,
} from '../../../test/factories';
import { renderWithProviders } from '../../../test/testUtils';
import { CertificateEditModal } from '../CertificateEditModal';

vi.mock('../../../hooks/usePortfolio', () => ({
  useProviders: vi.fn(),
  useTracks: vi.fn(),
  useUpdateCertificate: vi.fn(),
  useExtractCertificateMetadata: vi.fn(),
}));

describe('CertificateEditModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnNotify = vi.fn();
  const mockUpdateMutateAsync = vi.fn();
  const mockExtractMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useProviders).mockReturnValue({
      data: [
        getMockProvider({ id: 1, provider: 'Udemy' }),
        getMockProvider({ id: 2, provider: 'Coursera' }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useProviders>);

    vi.mocked(useTracks).mockReturnValue({
      data: [
        getMockTrack({ id: 10, name: 'Python Backend', slug: 'python-backend' }),
        getMockTrack({ id: 20, name: 'Cloud & DevOps', slug: 'cloud-devops' }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useTracks>);

    vi.mocked(useUpdateCertificate).mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateCertificate>);

    vi.mocked(useExtractCertificateMetadata).mockReturnValue({
      mutateAsync: mockExtractMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useExtractCertificateMetadata>);
  });

  it('renders modal dialog with document preview and prefilled values', () => {
    const cert = getMockCertificate({
      id: 5,
      title: 'Kubernetes Administrator',
      provider: 1,
      pdf_file: 'https://example.com/k8s.pdf',
      issued_date: '2024-03-15',
      credential_id: 'CKA-9988',
      tracks: [10],
      is_published: false,
    });

    renderWithProviders(
      <CertificateEditModal
        certificate={cert}
        onClose={mockOnClose}
        onNotify={mockOnNotify}
      />
    );

    expect(screen.getByText('Zertifikat überprüfen & bearbeiten')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Kubernetes Administrator')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-03-15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CKA-9988')).toBeInTheDocument();

    // Dokumentenvorschau Iframe vorhanden
    const iframe = screen.getByTitle('Vorschau für Kubernetes Administrator');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://example.com/k8s.pdf');
  });

  it('triggers on-demand OCR extraction and applies suggested fields', async () => {
    const cert = getMockCertificate({
      id: 5,
      title: 'cert_scanned_raw.pdf',
      provider: 1,
      pdf_file: 'https://example.com/scan.pdf',
      issued_date: '',
      credential_id: '',
      tracks: [],
      is_published: false,
    });

    mockExtractMutateAsync.mockResolvedValueOnce({
      guessed_title: 'AWS Certified Solutions Architect',
      guessed_provider: 'Coursera',
      matched_provider: { id: 2, provider: 'Coursera' },
      credential_id: 'AWS-123456',
      issued_date: '2024-06-01',
      guessed_track_slugs: ['cloud-devops'],
      matched_track_ids: [20],
      extracted_text_preview: 'Certificate of Completion AWS...',
      ocr_pending: false,
      source_type: 'pypdf',
    });

    renderWithProviders(
      <CertificateEditModal
        certificate={cert}
        onClose={mockOnClose}
        onNotify={mockOnNotify}
      />
    );

    const ocrButton = screen.getByRole('button', {
      name: /Metadaten per OCR analysieren/i,
    });
    fireEvent.click(ocrButton);

    await waitFor(() => {
      expect(mockExtractMutateAsync).toHaveBeenCalledWith(5);
    });

    // Vorschläge werden angezeigt
    await waitFor(() => {
      expect(screen.getByText('Erkannte Metadaten')).toBeInTheDocument();
      expect(screen.getByText('AWS Certified Solutions Architect')).toBeInTheDocument();
    });

    // Klick auf "Alle Vorschläge übernehmen"
    const applyAllBtn = screen.getByText('Alle Vorschläge übernehmen');
    fireEvent.click(applyAllBtn);

    expect(screen.getByDisplayValue('AWS Certified Solutions Architect')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-06-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AWS-123456')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Coursera')).toBeInTheDocument();
  });

  it('calls update with is_published: true when clicking "Speichern & Veröffentlichen"', async () => {
    const cert = getMockCertificate({
      id: 5,
      title: 'Django Mastery',
      provider: 1,
      pdf_file: 'https://example.com/cert.pdf',
      tracks: [10],
      is_published: false,
    });

    mockUpdateMutateAsync.mockResolvedValueOnce({ ...cert, is_published: true });

    renderWithProviders(
      <CertificateEditModal
        certificate={cert}
        onClose={mockOnClose}
        onNotify={mockOnNotify}
      />
    );

    const publishBtn = screen.getByRole('button', {
      name: /Speichern & Veröffentlichen/i,
    });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: 5,
        payload: expect.objectContaining({
          title: 'Django Mastery',
          is_published: true,
        }),
      });
    });

    expect(mockOnNotify).toHaveBeenCalledWith({
      type: 'success',
      text: expect.stringContaining('gespeichert & veröffentlicht'),
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
