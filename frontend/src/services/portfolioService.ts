import { apiClient } from '../api/client';
import type { Certificate, Project, Provider } from '../types';

export const portfolioService = {
  // Projekte abrufen
  async getProjects(): Promise<Project[]> {
    const { data } = await apiClient.get<Project[]>('/api/projects/');
    return data;
  },

  // Projekt erstellen (Admin)
  async createProject(formData: FormData): Promise<Project> {
    const { data } = await apiClient.post<Project>('/api/projects/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // Projekt löschen (Admin)
  async deleteProject(id: number): Promise<void> {
    await apiClient.delete(`/api/projects/${id}/`);
  },

  // Zertifikate abrufen
  async getCertificates(): Promise<Certificate[]> {
    const { data } = await apiClient.get<Certificate[]>('/api/certificates/');
    return data;
  },

  // Zertifikat erstellen (Admin)
  async createCertificate(formData: FormData): Promise<Certificate> {
    const { data } = await apiClient.post<Certificate>('/api/certificates/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // Zertifikat löschen (Admin)
  async deleteCertificate(id: number): Promise<void> {
    await apiClient.delete(`/api/certificates/${id}/`);
  },

  // Anbieter abrufen
  async getProviders(): Promise<Provider[]> {
    const { data } = await apiClient.get<Provider[]>('/api/providers/');
    return data;
  },
};
