import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDirectCertificateUpload,
  useProviders,
  useTracks,
} from '../../../hooks/usePortfolio';
import { getMockProvider } from '../../../test/factories';
import { renderWithProviders } from '../../../test/testUtils';
import { UploadCertificateModal } from '../UploadCertificateModal';

vi.mock('../../../hooks/usePortfolio', () => ({
  useProviders: vi.fn(),
  useTracks: vi.fn(),
  useDirectCertificateUpload: vi.fn(),
}));

describe('UploadCertificateModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnNotify = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useProviders).mockReturnValue({
      data: [
        getMockProvider({ id: 1, provider: 'Amazon Web Services' }),
        getMockProvider({ id: 2, provider: 'Google Cloud' }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useProviders>);

    vi.mocked(useTracks).mockReturnValue({
      data: [
        { id: 10, name: 'Cloud & DevOps', slug: 'cloud-devops', description: '', created_at: '' },
        { id: 20, name: 'Security', slug: 'security', description: '', created_at: '' },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useTracks>);

    vi.mocked(useDirectCertificateUpload).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDirectCertificateUpload>);
  });

  it('does not render when isOpen is false', () => {
    renderWithProviders(
      <UploadCertificateModal isOpen={false} onClose={mockOnClose} onNotify={mockOnNotify} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal dialog when isOpen is true', () => {
    renderWithProviders(
      <UploadCertificateModal isOpen={true} onClose={mockOnClose} onNotify={mockOnNotify} />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Neues Zertifikat hochladen (Direct-to-Storage)')).toBeInTheDocument();
    expect(screen.getByLabelText(/Titel des Zertifikats/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aussteller \/ Anbieter/i)).toBeInTheDocument();
    expect(screen.getByText('Cloud & DevOps')).toBeInTheDocument();
  });

  it('shows error if submitted without a file', async () => {
    renderWithProviders(
      <UploadCertificateModal isOpen={true} onClose={mockOnClose} onNotify={mockOnNotify} />
    );

    fireEvent.change(screen.getByLabelText(/Titel des Zertifikats/i), {
      target: { value: 'AWS Solutions Architect' },
    });
    fireEvent.change(screen.getByLabelText(/Aussteller \/ Anbieter/i), {
      target: { value: '1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Direct-Upload starten/i }));

    expect(
      screen.getByText('Bitte wähle eine Zertifikatsdatei (PDF, PNG, JPG) aus.')
    ).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('successfully triggers direct upload mutation and closes modal', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      id: 99,
      title: 'AWS Solutions Architect',
    });

    renderWithProviders(
      <UploadCertificateModal isOpen={true} onClose={mockOnClose} onNotify={mockOnNotify} />
    );

    const file = new File(['%PDF-test-data'], 'aws_cert.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.change(screen.getByLabelText(/Titel des Zertifikats/i), {
      target: { value: 'AWS Solutions Architect Associate' },
    });
    fireEvent.change(screen.getByLabelText(/Aussteller \/ Anbieter/i), {
      target: { value: '1' },
    });

    // Track auswählen
    fireEvent.click(screen.getByText('Cloud & DevOps'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Direct-Upload starten/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        file,
        payload: {
          title: 'AWS Solutions Architect Associate',
          provider: 1,
          tracks: [10],
          credential_id: undefined,
          issued_date: null,
        },
      });
    });

    expect(mockOnNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
      })
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes on Escape key press', () => {
    renderWithProviders(
      <UploadCertificateModal isOpen={true} onClose={mockOnClose} onNotify={mockOnNotify} />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
