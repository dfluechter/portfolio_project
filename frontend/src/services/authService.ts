import { apiClient } from '../api/client';
import type { AuthTokens, User } from '../types';

export const authService = {
  // Login via Djoser JWT Endpunkt
  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/api/auth/jwt/create/', {
      email,
      password,
    });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },

  // Aktuellen User abfragen
  async getCurrentUser(): Promise<User> {
    const { data } = await apiClient.get<User>('/api/auth/users/me/');
    return data;
  },

  // Registrierung
  async register(email: string, password: string, re_password: string): Promise<User> {
    const { data } = await apiClient.post<User>('/api/auth/users/', {
      email,
      password,
      re_password,
    });
    return data;
  },

  // Token manuell erneuern
  async refreshToken(): Promise<string> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) throw new Error('Kein Refresh-Token vorhanden');
    const { data } = await apiClient.post<{ access: string }>('/api/auth/jwt/refresh/', {
      refresh,
    });
    localStorage.setItem('access_token', data.access);
    return data.access;
  },

  // Logout
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  // Prüfen, ob Tokens existieren
  hasTokens(): boolean {
    return !!localStorage.getItem('access_token');
  },
};
