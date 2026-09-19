import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should attach access token from localStorage', async () => {
    localStorage.setItem('access_token', 'test-token');
    
    // Wir mocken den request call nicht tiefgreifend, sondern prüfen nur die Interceptor-Logik,
    // indem wir einen dummy request durch den axios interceptor jagen.
    // Da dies ein Integration-Detail ist, ist es einfacher, das Verhalten des Interceptors direkt zu prüfen:
    const config = { headers: {} } as any;
    const requestInterceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
    const result = await requestInterceptor(config);
    
    expect(result.headers.Authorization).toBe('Bearer test-token');
  });

  it('should not attach token if missing', async () => {
    const config = { headers: {} } as any;
    const requestInterceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
    const result = await requestInterceptor(config);
    
    expect(result.headers.Authorization).toBeUndefined();
  });
});
