import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';

interface ProviderOptions {
  /** Initiale Route für den MemoryRouter. */
  route?: string;
}

/** Frischer QueryClient pro Render, ohne Retries, damit Fehler sofort sichtbar sind. */
export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', ...options }: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {}
) => {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
};
