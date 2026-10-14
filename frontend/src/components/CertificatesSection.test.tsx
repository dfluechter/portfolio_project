import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePublishedCertificates, useTracks } from '../hooks/usePortfolio';
import { getMockCertificate, getMockTrack } from '../test/factories';
import { renderWithProviders } from '../test/testUtils';
import { CertificatesSection } from './CertificatesSection';

vi.mock('../hooks/usePortfolio', () => ({
  usePublishedCertificates: vi.fn(),
  useTracks: vi.fn(),
}));

describe('CertificatesSection Component', () => {
  const trackBackend = getMockTrack({ id: 1, name: 'Python Backend', slug: 'python-backend' });
  const trackCloud = getMockTrack({ id: 2, name: 'Cloud & DevOps', slug: 'cloud-devops' });
  const trackFrontend = getMockTrack({ id: 3, name: 'Frontend React', slug: 'frontend-react' });

  const cert1 = getMockCertificate({
    id: 101,
    title: 'Django Enterprise Architekturen',
    tracks: [1],
    is_published: true,
  });

  const cert2 = getMockCertificate({
    id: 102,
    title: 'Kubernetes Administrator CKA',
    tracks: [2],
    is_published: true,
  });

  const cert3 = getMockCertificate({
    id: 103,
    title: 'Fullstack React & Python',
    tracks: [1, 3],
    is_published: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useTracks).mockReturnValue({
      data: [trackBackend, trackCloud, trackFrontend],
      isLoading: false,
    } as unknown as ReturnType<typeof useTracks>);

    vi.mocked(usePublishedCertificates).mockReturnValue({
      data: [cert1, cert2, cert3],
      isLoading: false,
    } as unknown as ReturnType<typeof usePublishedCertificates>);
  });

  it('renders all certificates and track chips with counts by default', () => {
    renderWithProviders(<CertificatesSection />);

    expect(screen.getByText(/Zertifikate & Qualifikationen/i)).toBeInTheDocument();
    expect(screen.getByText('Django Enterprise Architekturen')).toBeInTheDocument();
    expect(screen.getByText('Kubernetes Administrator CKA')).toBeInTheDocument();
    expect(screen.getByText('Fullstack React & Python')).toBeInTheDocument();

    // Track Filter Chips vorhanden
    expect(screen.getByRole('button', { name: /Track-Filter: Python Backend \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Track-Filter: Cloud & DevOps \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Track-Filter: Frontend React \(1\)/i })).toBeInTheDocument();
  });

  it('filters certificates by selecting a single track chip', async () => {
    renderWithProviders(<CertificatesSection />);

    const cloudBtn = screen.getByRole('button', { name: /Track-Filter: Cloud & DevOps \(1\)/i });
    fireEvent.click(cloudBtn);

    // Nur Cloud-Zertifikat sichtbar
    expect(screen.getByText('Kubernetes Administrator CKA')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Django Enterprise Architekturen')).not.toBeInTheDocument();
    });

    // Active Track Banner wird angezeigt
    expect(screen.getByText(/Lernpfad: Cloud & DevOps/i)).toBeInTheDocument();
  });

  it('filters certificates with multi-select (OR-logic) across tracks', async () => {
    renderWithProviders(<CertificatesSection />);

    // 1. Cloud auswählen
    fireEvent.click(screen.getByRole('button', { name: /Track-Filter: Cloud & DevOps \(1\)/i }));
    // 2. Frontend auswählen (Multi-Select)
    fireEvent.click(screen.getByRole('button', { name: /Track-Filter: Frontend React \(1\)/i }));

    // CKA (Track 2) und Fullstack (Track 3) sichtbar, Django (Track 1) nicht sichtbar
    expect(screen.getByText('Kubernetes Administrator CKA')).toBeInTheDocument();
    expect(screen.getByText('Fullstack React & Python')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Django Enterprise Architekturen')).not.toBeInTheDocument();
    });

    // Banner für Multi-Selection
    expect(screen.getByText(/Ausgewählte Lernpfade \(2\)/i)).toBeInTheDocument();
  });

  it('resets track selection when clicking "Alle" or "Alle Tracks anzeigen"', async () => {
    renderWithProviders(<CertificatesSection />);

    fireEvent.click(screen.getByRole('button', { name: /Track-Filter: Cloud & DevOps \(1\)/i }));
    await waitFor(() => {
      expect(screen.queryByText('Django Enterprise Architekturen')).not.toBeInTheDocument();
    });

    // Reset via "Alle Tracks anzeigen"
    const resetBtn = screen.getByRole('button', { name: /Alle Tracks anzeigen/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText('Django Enterprise Architekturen')).toBeInTheDocument();
    expect(screen.getByText('Kubernetes Administrator CKA')).toBeInTheDocument();
  });

  it('combines text search with track filter correctly', async () => {
    renderWithProviders(<CertificatesSection />);

    // Track 1 (Backend) auswählen -> cert1 und cert3 passen
    fireEvent.click(screen.getByRole('button', { name: /Track-Filter: Python Backend \(2\)/i }));

    // Suchbegriff eingeben -> "Fullstack"
    const searchInput = screen.getByPlaceholderText('Titel, Aussteller suchen...');
    fireEvent.change(searchInput, { target: { value: 'Fullstack' } });

    expect(screen.getByText('Fullstack React & Python')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Django Enterprise Architekturen')).not.toBeInTheDocument();
      expect(screen.queryByText('Kubernetes Administrator CKA')).not.toBeInTheDocument();
    });
  });
});
