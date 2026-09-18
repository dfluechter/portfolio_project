import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '../services/portfolioService';

export const portfolioKeys = {
  all: ['portfolio'] as const,
  skills: () => [...portfolioKeys.all, 'skills'] as const,
  projects: () => [...portfolioKeys.all, 'projects'] as const,
  certificates: () => [...portfolioKeys.all, 'certificates'] as const,
  providers: () => [...portfolioKeys.all, 'providers'] as const,
  timeline: () => [...portfolioKeys.all, 'timeline'] as const,
};

// ── QUERIES ──

export const useSkills = () => {
  return useQuery({
    queryKey: portfolioKeys.skills(),
    queryFn: portfolioService.getSkills,
    staleTime: 1000 * 60 * 5, // 5 Minuten Cache
  });
};

export const useProjects = () => {
  return useQuery({
    queryKey: portfolioKeys.projects(),
    queryFn: portfolioService.getProjects,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCertificates = () => {
  return useQuery({
    queryKey: portfolioKeys.certificates(),
    queryFn: portfolioService.getCertificates,
    staleTime: 1000 * 60 * 5,
  });
};

export const useProviders = () => {
  return useQuery({
    queryKey: portfolioKeys.providers(),
    queryFn: portfolioService.getProviders,
    staleTime: 1000 * 60 * 5,
  });
};

export const useTimeline = () => {
  return useQuery({
    queryKey: portfolioKeys.timeline(),
    queryFn: portfolioService.getTimeline,
    staleTime: 1000 * 60 * 5,
  });
};

// ── MUTATIONS (DASHBOARD) ──

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => portfolioService.createProject(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.projects() });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => portfolioService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.projects() });
    },
  });
};

export const useCreateCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => portfolioService.createCertificate(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificates() });
    },
  });
};

export const useDeleteCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => portfolioService.deleteCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificates() });
    },
  });
};

export const useCreateProvider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerName: string) => portfolioService.createProvider(providerName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.providers() });
    },
  });
};
