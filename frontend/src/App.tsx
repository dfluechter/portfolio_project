import { lazy, Suspense, useState, type ComponentType } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ColdStartBanner } from './components/ColdStartBanner';
import { PortfolioPage } from './pages/PortfolioPage';

/**
 * Lädt dynamische Komponenten resilient nach und fängt temporäre Netzwerkfehler
 * oder veraltete Vite-Chunk-Hashes nach Server-Neustarts via Einmal-Reload ab.
 */
function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((error) => {
      const hasReloaded = sessionStorage.getItem('chunk_reload_retry');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload_retry', 'true');
        window.location.reload();
      }
      sessionStorage.removeItem('chunk_reload_retry');
      throw error;
    })
  );
}

const LoginPage = lazyRetry(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazyRetry(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PasswordResetConfirmPage = lazyRetry(() =>
  import('./pages/PasswordResetConfirmPage').then((m) => ({ default: m.PasswordResetConfirmPage }))
);

const RouteLoadingFallback = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ColdStartBanner />
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<PortfolioPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/password-reset/confirm/:uid/:token"
                  element={<PasswordResetConfirmPage />}
                />
                <Route path="/dashboard" element={<DashboardPage />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
