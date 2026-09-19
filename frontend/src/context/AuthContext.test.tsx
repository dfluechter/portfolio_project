import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as api from '../api/client';
import React from 'react';

// Wir mocken die API calls
vi.mock('../api/client', () => ({
  loginUser: vi.fn(),
  refreshUser: vi.fn(),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('provides initial loading state', async () => {
    // Wenn refreshUser fehlschlägt, landen wir in setUser(null)
    (api.refreshUser as any).mockRejectedValue(new Error('no auth'));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    // Zuerst lädt der Kontext, bis refreshUser fertig ist
    // Note: da der useEffect asynchron läuft, sind wir nach dem ersten Render im loading Zustand
    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('listens to auth:unauthorized event and logs out', async () => {
    (api.refreshUser as any).mockRejectedValue(new Error('no auth'));
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    act(() => {
      window.dispatchEvent(new Event('auth:unauthorized'));
    });

    expect(result.current.user).toBeNull();
  });
});
