import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useIsFetching } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColdStartBanner } from './ColdStartBanner';

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useIsFetching: vi.fn(),
  };
});

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: ({ children, className, role, style, ...props }: any) => (
        <div className={className} role={role} style={style} {...props}>
          {children}
        </div>
      ),
    },
  };
});

describe('ColdStartBanner Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    queryClient = new QueryClient();
    vi.mocked(useIsFetching).mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ColdStartBanner delayMs={2000} timeoutMs={30000} {...props} />
      </QueryClientProvider>
    );
  };

  it('does not render banner when there are no active background queries', () => {
    vi.mocked(useIsFetching).mockReturnValue(0);
    renderComponent();

    expect(screen.queryByText(/Server wacht auf/i)).not.toBeInTheDocument();
  });

  it('does not render banner if query resolves within delay threshold (< 2000ms)', () => {
    vi.mocked(useIsFetching).mockReturnValue(1);
    const { rerender } = renderComponent();

    // 1 Sekunde vergeht
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText(/Server wacht auf/i)).not.toBeInTheDocument();

    // Query beendet
    vi.mocked(useIsFetching).mockReturnValue(0);
    rerender(
      <QueryClientProvider client={queryClient}>
        <ColdStartBanner delayMs={2000} timeoutMs={30000} />
      </QueryClientProvider>
    );

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByText(/Server wacht auf/i)).not.toBeInTheDocument();
  });

  it('displays cold start banner when query takes longer than 2000ms', () => {
    vi.mocked(useIsFetching).mockReturnValue(1);
    renderComponent();

    // Vor Ablauf der 2 Sekunden: noch nicht sichtbar
    expect(screen.queryByText(/Server wacht auf/i)).not.toBeInTheDocument();

    // 2 Sekunden vergehen
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText(/Server wacht auf \(Render Free-Tier\)\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows success message and then hides banner when query succeeds after cold start', () => {
    vi.mocked(useIsFetching).mockReturnValue(1);
    const { rerender } = renderComponent();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/Server wacht auf/i)).toBeInTheDocument();

    // Query beendet erfolgreich
    vi.mocked(useIsFetching).mockReturnValue(0);
    rerender(
      <QueryClientProvider client={queryClient}>
        <ColdStartBanner delayMs={2000} timeoutMs={30000} />
      </QueryClientProvider>
    );

    // Erfolgsmeldung sichtbar
    expect(screen.getByText(/Server erfolgreich verbunden!/i)).toBeInTheDocument();

    // Nach 1.5s blendet sich der Banner aus
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.queryByText(/Server erfolgreich verbunden!/i)).not.toBeInTheDocument();
  });

  it('transitions to timeout state with retry button after 30 seconds', () => {
    const handleRetry = vi.fn();
    vi.mocked(useIsFetching).mockReturnValue(1);
    renderComponent({ onRetry: handleRetry });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/Server wacht auf/i)).toBeInTheDocument();

    // 30 Sekunden verstreichen
    act(() => {
      vi.advanceTimersByTime(28000);
    });

    expect(screen.getByText(/Verbindung dauert ungewöhnlich lange/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Erneut versuchen/i });
    expect(retryBtn).toBeInTheDocument();

    // Klick auf Retry
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('allows user to dismiss banner manually', () => {
    vi.mocked(useIsFetching).mockReturnValue(1);
    renderComponent();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/Server wacht auf/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Hinweis schließen/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Server wacht auf/i)).not.toBeInTheDocument();
  });
});
