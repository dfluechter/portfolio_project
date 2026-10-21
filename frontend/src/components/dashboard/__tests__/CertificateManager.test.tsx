import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCertificatesPaginated,
  useDeleteCertificate,
  useProviders,
  usePublishCertificate,
  useUnpublishCertificate,
} from '../../../hooks/usePortfolio';
import {
  getMockCertificate,
  getMockProvider,
} from '../../../test/factories';
import { renderWithProviders } from '../../../test/testUtils';
import { CertificateManager } from '../CertificateManager';

vi.mock('../../../hooks/usePortfolio', () => ({
  useCertificatesPaginated: vi.fn(),
  useProviders: vi.fn(),
  useDeleteCertificate: vi.fn(),
  usePublishCertificate: vi.fn(),
  useUnpublishCertificate: vi.fn(),
  useTracks: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useUpdateCertificate: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  useExtractCertificateMetadata: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  useDirectCertificateUpload: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('CertificateManager Component', () => {
  const mockOnNotify = vi.fn();
  const mockDeleteMutateAsync = vi.fn();
  const mockPublishMutateAsync = vi.fn();
  const mockUnpublishMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useProviders).mockReturnValue({
      data: [
        getMockProvider({ id: 1, provider: 'Udemy' }),
        getMockProvider({ id: 2, provider: 'Coursera' }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useProviders>);

    vi.mocked(useDeleteCertificate).mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteCertificate>);

    vi.mocked(usePublishCertificate).mockReturnValue({
      mutateAsync: mockPublishMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof usePublishCertificate>);

    vi.mocked(useUnpublishCertificate).mockReturnValue({
      mutateAsync: mockUnpublishMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUnpublishCertificate>);
  });

  it('renders paginated certificate list and pagination controls', () => {
    const cert1 = getMockCertificate({
      id: 1,
      title: 'Python Bootcamp',
      is_published: true,
      issued_date: '2024-02-10',
    });
    const cert2 = getMockCertificate({
      id: 2,
      title: 'Docker Deep Dive',
      is_published: false,
      issued_date: '',
    });

    vi.mocked(useCertificatesPaginated).mockReturnValue({
      data: {
        count: 25,
        total_pages: 2,
        current_page: 1,
        next: 'http://api/?page=2',
        previous: null,
        results: [cert1, cert2],
      },
      isLoading: false,
      isPlaceholderData: false,
    } as unknown as ReturnType<typeof useCertificatesPaginated>);

    renderWithProviders(<CertificateManager onNotify={mockOnNotify} />);

    expect(screen.getByText(/Zertifikate verwalten/i)).toBeInTheDocument();
    expect(screen.getByText('Python Bootcamp')).toBeInTheDocument();
    expect(screen.getByText('Docker Deep Dive')).toBeInTheDocument();

    // Badges
    expect(screen.getByText(/Veröffentlicht \(S3\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('Entwurf').length).toBeGreaterThan(0);
    expect(screen.getByText('Unvollständig')).toBeInTheDocument();

    // Paginierungs-Anzeige
    expect(screen.getByText(/Seite 1 von 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Vorherige/i)).toBeInTheDocument();
    expect(screen.getByText(/Nächste/i)).toBeInTheDocument();
    expect(
      screen.getAllByText((_: string, element: Element | null) => {
        return element?.textContent?.includes('Zeige 1 bis 20 von 25 Zertifikaten') === true;
      }).length
    ).toBeGreaterThan(0);
  });

  it('filters by status tabs when clicked', () => {
    vi.mocked(useCertificatesPaginated).mockReturnValue({
      data: {
        count: 10,
        total_pages: 1,
        current_page: 1,
        next: null,
        previous: null,
        results: [],
      },
      isLoading: false,
      isPlaceholderData: false,
    } as unknown as ReturnType<typeof useCertificatesPaginated>);

    renderWithProviders(<CertificateManager onNotify={mockOnNotify} />);

    const incompleteTab = screen.getByRole('button', {
      name: /Unvollständig \(Prüfbedarf\)/i,
    });
    fireEvent.click(incompleteTab);

    expect(useCertificatesPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        incomplete: true,
        page: 1,
      })
    );

    const publishedTab = screen.getByRole('button', {
      name: /Veröffentlicht/i,
    });
    fireEvent.click(publishedTab);

    expect(useCertificatesPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        is_published: true,
        incomplete: undefined,
        page: 1,
      })
    );
  });

  it('opens review modal when clicking on a certificate row', () => {
    const cert = getMockCertificate({
      id: 10,
      title: 'PostgreSQL Architecture',
      is_published: false,
    });

    vi.mocked(useCertificatesPaginated).mockReturnValue({
      data: {
        count: 1,
        total_pages: 1,
        current_page: 1,
        next: null,
        previous: null,
        results: [cert],
      },
      isLoading: false,
      isPlaceholderData: false,
    } as unknown as ReturnType<typeof useCertificatesPaginated>);

    renderWithProviders(<CertificateManager onNotify={mockOnNotify} />);

    const row = screen.getByText('PostgreSQL Architecture');
    fireEvent.click(row);

    // Review-Modal öffnet sich
    expect(screen.getByText('Zertifikat überprüfen & bearbeiten')).toBeInTheDocument();
  });

  it('handles toggle publish action directly from the list', async () => {
    const cert = getMockCertificate({
      id: 15,
      title: 'AWS Certified Developer',
      tracks: [10],
      is_published: false,
    });

    vi.mocked(useCertificatesPaginated).mockReturnValue({
      data: {
        count: 1,
        total_pages: 1,
        current_page: 1,
        next: null,
        previous: null,
        results: [cert],
      },
      isLoading: false,
      isPlaceholderData: false,
    } as unknown as ReturnType<typeof useCertificatesPaginated>);

    mockPublishMutateAsync.mockResolvedValueOnce({ ...cert, is_published: true });

    renderWithProviders(<CertificateManager onNotify={mockOnNotify} />);

    const publishBtn = screen.getByRole('button', { name: /Veröffentlichen/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(mockPublishMutateAsync).toHaveBeenCalledWith(15);
    });

    expect(mockOnNotify).toHaveBeenCalledWith({
      type: 'success',
      text: expect.stringContaining('erfolgreich veröffentlicht'),
    });
  });

  it('disables publish button for unpublished certificates without tracks', () => {
    const certWithoutTracks = getMockCertificate({
      id: 16,
      title: 'Docker Associate',
      tracks: [],
      is_published: false,
    });

    vi.mocked(useCertificatesPaginated).mockReturnValue({
      data: {
        count: 1,
        total_pages: 1,
        current_page: 1,
        next: null,
        previous: null,
        results: [certWithoutTracks],
      },
      isLoading: false,
      isPlaceholderData: false,
    } as unknown as ReturnType<typeof useCertificatesPaginated>);

    renderWithProviders(<CertificateManager onNotify={mockOnNotify} />);

    const publishBtn = screen.getByRole('button', { name: /Veröffentlichen/i });
    expect(publishBtn).toBeDisabled();
    expect(publishBtn).toHaveAttribute(
      'title',
      'Mindestens ein Track erforderlich für Veröffentlichung'
    );
  });
});
