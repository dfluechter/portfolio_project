import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
// @ts-ignore - Mock setup
import * as api from '../api/client';

// Wir mocken die API calls
vi.mock('../api/client', () => ({
  loginUser: vi.fn(),
  refreshUser: vi.fn(),
}));

// Wir mocken auch den authService, falls er genutzt wird
vi.mock('../services/authService', () => ({
  authService: {
    hasTokens: vi.fn().mockReturnValue(false),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    login: vi.fn(),
  }
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('provides initial loading state', async () => {
    // Wenn refreshUser fehlschlägt, landen wir in setUser(null)
    // @ts-ignore
    (api.refreshUser as any).mockRejectedValue(new Error('no auth'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    // Zuerst lädt der Kontext, bis refreshUser fertig ist
    // Note: da der useEffect asynchron läuft, sind wir nach dem ersten Render im loading Zustand
    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();

    // Warten, bis der asynchrone initAuth-Effekt abgeschlossen ist
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('listens to auth:unauthorized event and logs out', async () => {
    // @ts-ignore
    (api.refreshUser as any).mockRejectedValue(new Error('no auth'));
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    // Warten, bis das initiale Laden abgeschlossen ist
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    act(() => {
      window.dispatchEvent(new Event('auth:unauthorized'));
    });

    expect(result.current.user).toBeNull();
  });
});
