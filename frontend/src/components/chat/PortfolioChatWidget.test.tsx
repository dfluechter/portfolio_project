import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { portfolioService } from '../../services/portfolioService';
import { renderWithProviders } from '../../test/testUtils';
import { PortfolioChatWidget } from './PortfolioChatWidget';

vi.mock('../../services/portfolioService', () => ({
  portfolioService: {
    sendAIChatMessage: vi.fn(),
  },
}));

describe('PortfolioChatWidget Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders closed floating trigger button initially', () => {
    renderWithProviders(<PortfolioChatWidget />);

    const button = screen.getByRole('button', { name: /Portfolio KI-Assistent öffnen/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Frag Dominiks KI')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens chat window with welcome message and quick prompts when clicked', () => {
    renderWithProviders(<PortfolioChatWidget />);

    const trigger = screen.getByRole('button', { name: /Portfolio KI-Assistent öffnen/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Dominik's Copilot/i)).toBeInTheDocument();
    expect(screen.getByText(/Hallo! Ich bin Dominiks Portfolio-Copilot/i)).toBeInTheDocument();
    expect(screen.getByText(/🎯 Welche Top-Skills hat Dominik\?/i)).toBeInTheDocument();
  });

  it('automatically focuses the input field when opening the chat', () => {
    renderWithProviders(<PortfolioChatWidget />);

    const trigger = screen.getByRole('button', { name: /Portfolio KI-Assistent öffnen/i });
    fireEvent.click(trigger);

    const input = screen.getByPlaceholderText(/Frage zu Dominiks Portfolio stellen.../i);
    expect(input).toHaveFocus();
  });

  it('closes chat window when pressing the Escape key', () => {
    renderWithProviders(<PortfolioChatWidget />);

    fireEvent.click(screen.getByRole('button', { name: /Portfolio KI-Assistent öffnen/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders structured source badges and scrolls to target element on click', async () => {
    vi.mocked(portfolioService.sendAIChatMessage).mockResolvedValue({
      reply: 'Hier sind relevante Arbeiten von Dominik:',
      sources: [
        {
          type: 'project',
          id: 1,
          title: 'Portfolio & Certificate Management Hub',
          target_id: 'project-1',
        },
        {
          type: 'certificate',
          id: 2,
          title: 'Meta Backend Developer',
          target_id: 'cert-2',
        },
      ],
    });

    // Dummy DOM Elements für das Deep-Linking
    const dummyProject = document.createElement('div');
    dummyProject.id = 'project-1';
    dummyProject.scrollIntoView = vi.fn();
    document.body.appendChild(dummyProject);

    renderWithProviders(<PortfolioChatWidget />);

    // Chat öffnen
    fireEvent.click(screen.getByRole('button', { name: /Portfolio KI-Assistent öffnen/i }));

    const input = screen.getByPlaceholderText(/Frage zu Dominiks Portfolio stellen.../i);
    fireEvent.change(input, { target: { value: 'Zeige mir deine Projekte und Zertifikate' } });

    const submitBtn = screen.getByRole('button', { name: /Nachricht senden/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Portfolio & Certificate Management Hub')).toBeInTheDocument();
      expect(screen.getByText('Meta Backend Developer')).toBeInTheDocument();
    });

    const projectBadge = screen.getByRole('button', {
      name: /Quelle anzeigen: Portfolio & Certificate Management Hub/i,
    });
    expect(projectBadge).toBeInTheDocument();

    // Klick auf Zitat-Badge löst Deep-Linking scrollIntoView aus
    fireEvent.click(projectBadge);
    expect(dummyProject.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });

    document.body.removeChild(dummyProject);
  });

  it('falls back to section scroll if specific target_id is not in DOM', async () => {
    vi.mocked(portfolioService.sendAIChatMessage).mockResolvedValue({
      reply: 'Infos zum Zertifikat:',
      sources: [
        {
          type: 'certificate',
          id: 99,
          title: 'AWS Solutions Architect',
          target_id: 'cert-99',
        },
      ],
    });

    const sectionCertificates = document.createElement('section');
    sectionCertificates.id = 'certificates';
    sectionCertificates.scrollIntoView = vi.fn();
    document.body.appendChild(sectionCertificates);

    renderWithProviders(<PortfolioChatWidget />);

    fireEvent.click(screen.getByRole('button', { name: /Portfolio KI-Assistent öffnen/i }));
    const input = screen.getByPlaceholderText(/Frage zu Dominiks Portfolio stellen.../i);
    fireEvent.change(input, { target: { value: 'Hast du AWS Zertifikate?' } });
    fireEvent.click(screen.getByRole('button', { name: /Nachricht senden/i }));

    await waitFor(() => {
      expect(screen.getByText('AWS Solutions Architect')).toBeInTheDocument();
    });

    const certBadge = screen.getByRole('button', {
      name: /Quelle anzeigen: AWS Solutions Architect/i,
    });
    fireEvent.click(certBadge);

    expect(sectionCertificates.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });

    document.body.removeChild(sectionCertificates);
  });

  it('copies AI message text to clipboard when copy button is clicked', async () => {
    vi.mocked(portfolioService.sendAIChatMessage).mockResolvedValue({
      reply: 'Antwort zum Kopieren',
      sources: [],
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    renderWithProviders(<PortfolioChatWidget />);
    fireEvent.click(screen.getByRole('button', { name: /Portfolio KI-Assistent öffnen/i }));

    const input = screen.getByPlaceholderText(/Frage zu Dominiks Portfolio stellen.../i);
    fireEvent.change(input, { target: { value: 'Frage' } });
    fireEvent.click(screen.getByRole('button', { name: /Nachricht senden/i }));

    await waitFor(() => {
      expect(screen.getByText('Antwort zum Kopieren')).toBeInTheDocument();
    });

    const copyBtns = await screen.findAllByRole('button', {
      name: /Antwort in die Zwischenablage kopieren/i,
    });
    expect(copyBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(copyBtns[copyBtns.length - 1]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Antwort zum Kopieren');
    expect(await screen.findByText('Kopiert')).toBeInTheDocument();
  });

  it('deactivates input and quick prompts when backend reports token limit reached (disabled: true)', async () => {
    vi.mocked(portfolioService.sendAIChatMessage).mockResolvedValue({
      reply:
        'Das kostenfreie Token-Limit für den KI-Assistenten wurde erreicht. Die KI-Komponente wurde deaktiviert.',
      sources: [],
      disabled: true,
    });

    renderWithProviders(<PortfolioChatWidget />);
    fireEvent.click(screen.getByRole('button', { name: /Portfolio KI-Assistent öffnen/i }));

    const input = screen.getByPlaceholderText(/Frage zu Dominiks Portfolio stellen.../i);
    fireEvent.change(input, { target: { value: 'Testfrage' } });
    fireEvent.click(screen.getByRole('button', { name: /Nachricht senden/i }));

    await waitFor(() => {
      expect(screen.getByText(/Deaktiviert \(Token-Schutz\)/i)).toBeInTheDocument();
    });

    const disabledInput = screen.getByPlaceholderText(
      /KI-Assistent deaktiviert \(Token-Limit geschützt\)/i,
    );
    expect(disabledInput).toBeDisabled();
    expect(screen.getByRole('button', { name: /Nachricht senden/i })).toBeDisabled();
  });
});

