import axios from 'axios';
import { apiClient } from '../api/client';
import type {
  AIChatResponse,
  Certificate,
  CreateCertificatePayload,
  ExtractedCertificateMetadata,
  PaginatedResponse,
  PendingCertificate,
  PresignedUploadResponse,
  Project,
  Provider,
  Skill,
  TimelineEntry,
  Track,
} from '../types';

export const portfolioService = {
  // Projekte abrufen
  async getProjects(): Promise<Project[]> {
    const { data } = await apiClient.get<Project[] | PaginatedResponse<Project>>('/api/projects/');
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as PaginatedResponse<Project>).results)) {
      return (data as PaginatedResponse<Project>).results;
    }
    return [];
  },

  // Projekt erstellen (Admin)
  async createProject(formData: FormData): Promise<Project> {
    const { data } = await apiClient.post<Project>('/api/projects/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // Projekt bearbeiten (Admin)
  async updateProject(id: number, formData: FormData): Promise<Project> {
    const { data } = await apiClient.patch<Project>(`/api/projects/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // Projekt löschen (Admin)
  async deleteProject(id: number): Promise<void> {
    await apiClient.delete(`/api/projects/${id}/`);
  },

  // Zertifikate abrufen (unterstützt paginierte und unpaginierte DRF-Antworten)
  async getCertificates(params?: {
    all?: boolean;
    page?: number;
    page_size?: number;
    is_published?: boolean;
    search?: string;
  }): Promise<Certificate[]> {
    const { data } = await apiClient.get<Certificate[] | PaginatedResponse<Certificate>>(
      '/api/certificates/',
      {
        params: { all: true, ...params },
      },
    );
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray((data as PaginatedResponse<Certificate>).results)) {
      return (data as PaginatedResponse<Certificate>).results;
    }
    return [];
  },

  // Paginierte Zertifikate abrufen (z. B. für skalierte Tabellen im Dashboard)
  async getCertificatesPaginated(params?: {
    page?: number;
    page_size?: number;
    is_published?: boolean;
    incomplete?: boolean;
    track?: string | number;
    provider?: string | number;
    search?: string;
  }): Promise<PaginatedResponse<Certificate>> {
    const { data } = await apiClient.get<PaginatedResponse<Certificate> | Certificate[]>(
      '/api/certificates/',
      { params },
    );
    if ('results' in data && Array.isArray(data.results)) {
      return data;
    }
    const results = Array.isArray(data) ? data : [];
    return {
      count: results.length,
      total_pages: 1,
      current_page: 1,
      next: null,
      previous: null,
      results,
    };
  },

  // Signierte S3 Upload-URL anfordern (Admin)
  async getPresignedUploadUrl(
    filename: string,
    contentType?: string
  ): Promise<PresignedUploadResponse> {
    const { data } = await apiClient.post<PresignedUploadResponse>(
      '/api/certificates/presigned_upload/',
      { filename, content_type: contentType }
    );
    return data;
  },

  // Datei direkt zu Supabase S3 hochladen (ohne Django-Auth Header)
  async uploadDirectToStorage(
    url: string,
    file: File,
    headers?: Record<string, string>
  ): Promise<void> {
    await axios.put(url, file, {
      headers: {
        'Content-Type': file.type || 'application/pdf',
        ...headers,
      },
    });
  },

  // Zertifikat erstellen (Admin: via FormData oder direktem storage_key)
  async createCertificate(payload: FormData | CreateCertificatePayload): Promise<Certificate> {
    if (payload instanceof FormData) {
      const { data } = await apiClient.post<Certificate>('/api/certificates/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await apiClient.post<Certificate>('/api/certificates/', payload);
    return data;
  },

  // Zertifikat aktualisieren (Admin)
  async updateCertificate(id: number, payload: Partial<Certificate>): Promise<Certificate> {
    const { data } = await apiClient.patch<Certificate>(`/api/certificates/${id}/`, payload);
    return data;
  },

  // Zertifikat veröffentlichen (Admin)
  async publishCertificate(id: number): Promise<{ status: string; is_published: boolean }> {
    const { data } = await apiClient.post<{ status: string; is_published: boolean }>(
      `/api/certificates/${id}/publish/`,
    );
    return data;
  },

  // Zertifikat zurückziehen / unpublish (Admin)
  async unpublishCertificate(id: number): Promise<{ status: string; is_published: boolean }> {
    const { data } = await apiClient.post<{ status: string; is_published: boolean }>(
      `/api/certificates/${id}/unpublish/`,
    );
    return data;
  },

  // Metadaten per On-Demand OCR extrahieren (Admin)
  async extractCertificateMetadata(id: number): Promise<ExtractedCertificateMetadata> {
    const { data } = await apiClient.post<ExtractedCertificateMetadata>(
      `/api/certificates/${id}/extract_metadata/`,
    );
    return data;
  },

  // Zertifikat löschen (Admin)
  async deleteCertificate(id: number): Promise<void> {
    await apiClient.delete(`/api/certificates/${id}/`);
  },

  // Ausstehende Zertifikate (Inbox / Review) abrufen (Admin)
  async getPendingCertificates(): Promise<PendingCertificate[]> {
    const { data } = await apiClient.get<PendingCertificate[] | PaginatedResponse<PendingCertificate>>(
      '/api/pending-certificates/',
    );
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as PaginatedResponse<PendingCertificate>).results)) {
      return (data as PaginatedResponse<PendingCertificate>).results;
    }
    return [];
  },

  // Ausstehendes Zertifikat freigeben und übertragen (Admin)
  async approvePendingCertificate(
    id: number,
    payload?: { title?: string; provider?: string; track_ids?: number[] },
  ): Promise<{ detail: string; certificate_id?: number }> {
    const { data } = await apiClient.post<{ detail: string; certificate_id?: number }>(
      `/api/pending-certificates/${id}/approve/`,
      payload || {},
    );
    return data;
  },

  // Ausstehendes Zertifikat ablehnen (Admin)
  async rejectPendingCertificate(id: number): Promise<{ detail: string }> {
    const { data } = await apiClient.post<{ detail: string }>(
      `/api/pending-certificates/${id}/reject/`,
    );
    return data;
  },

  // Anbieter abrufen
  async getProviders(params?: { has_certificates?: boolean }): Promise<Provider[]> {
    const { data } = await apiClient.get<Provider[] | PaginatedResponse<Provider>>('/api/providers/', {
      params,
    });
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as PaginatedResponse<Provider>).results)) {
      return (data as PaginatedResponse<Provider>).results;
    }
    return [];
  },

  // Tracks abrufen
  async getTracks(): Promise<Track[]> {
    const { data } = await apiClient.get<Track[] | PaginatedResponse<Track>>('/api/tracks/');
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as PaginatedResponse<Track>).results)) {
      return (data as PaginatedResponse<Track>).results;
    }
    return [];
  },

  // Anbieter erstellen (Admin)
  async createProvider(providerName: string): Promise<Provider> {
    const { data } = await apiClient.post<Provider>('/api/providers/', {
      provider: providerName,
      aktiv: true,
    });
    return data;
  },

  // Skills abrufen
  async getSkills(): Promise<Skill[]> {
    const { data } = await apiClient.get<Skill[] | PaginatedResponse<Skill>>('/api/skills/');
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as PaginatedResponse<Skill>).results)) {
      return (data as PaginatedResponse<Skill>).results;
    }
    return [];
  },

  // Werdegang / Timeline abrufen
  async getTimeline(): Promise<TimelineEntry[]> {
    const { data } = await apiClient.get<TimelineEntry[] | PaginatedResponse<TimelineEntry>>('/api/timeline/');
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as PaginatedResponse<TimelineEntry>).results)) {
      return (data as PaginatedResponse<TimelineEntry>).results;
    }
    return [];
  },

  // Portfolio AI Copilot Chat
  async sendAIChatMessage(
    message: string,
    history?: { role: 'user' | 'model'; text: string }[]
  ): Promise<AIChatResponse> {
    const { data } = await apiClient.post<AIChatResponse>('/api/ai/chat/', {
      message,
      history,
    });
    return data;
  },

  // Passwort-Reset anfordern (sendet an PORTFOLIO_OWNER_EMAIL oder angegebene E-Mail)
  async requestPasswordReset(email?: string): Promise<{ detail: string }> {
    const { data } = await apiClient.post<{ detail: string }>('/api/auth/password-reset/', {
      email: email || undefined,
    });
    return data;
  },

  // Neues Passwort mit UID und Token bestätigen
  async confirmPasswordReset(payload: {
    uid: string;
    token: string;
    new_password: string;
    re_new_password?: string;
  }): Promise<void> {
    await apiClient.post('/api/auth/users/reset_password_confirm/', {
      uid: payload.uid,
      token: payload.token,
      new_password: payload.new_password,
      re_new_password: payload.re_new_password || payload.new_password,
    });
  },
};

