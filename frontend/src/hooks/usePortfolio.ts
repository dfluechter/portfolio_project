import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '../services/portfolioService';
import type { BulkApprovePayload, Certificate, CreateCertificatePayload } from '../types';

export const portfolioKeys = {
  all: ['portfolio'] as const,
  skills: () => [...portfolioKeys.all, 'skills'] as const,
  projects: () => [...portfolioKeys.all, 'projects'] as const,
  certificates: () => [...portfolioKeys.all, 'certificates'] as const,
  providers: () => [...portfolioKeys.all, 'providers'] as const,
  tracks: () => [...portfolioKeys.all, 'tracks'] as const,
  timeline: () => [...portfolioKeys.all, 'timeline'] as const,
  pendingCertificates: () => [...portfolioKeys.all, 'pendingCertificates'] as const,
};

// ── QUERIES ──

export const useSkills = () => {
  return useQuery({
    queryKey: portfolioKeys.skills(),
    queryFn: portfolioService.getSkills,
    staleTime: 1000 * 60 * 5, // 5 Minuten Cache
  });
};

export const useTracks = () => {
  return useQuery({
    queryKey: portfolioKeys.tracks(),
    queryFn: portfolioService.getTracks,
    staleTime: 1000 * 60 * 5,
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
    queryKey: [...portfolioKeys.certificates(), 'all'] as const,
    queryFn: () => portfolioService.getCertificates(),
    staleTime: 1000 * 60 * 5,
  });
};

// Öffentliche Startseite: ausschließlich veröffentlichte Zertifikate –
// auch wenn im Browser ein Admin-Token vorhanden ist.
export const usePublishedCertificates = () => {
  return useQuery({
    queryKey: [...portfolioKeys.certificates(), 'published'] as const,
    queryFn: async () => {
      const certs = await portfolioService.getCertificates({ is_published: true });
      return certs.filter((c) => c.is_published);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCertificatesPaginated = (params?: {
  page?: number;
  page_size?: number;
  is_published?: boolean;
  incomplete?: boolean;
  track?: string | number;
  provider?: string | number;
  search?: string;
}) => {
  return useQuery({
    queryKey: [...portfolioKeys.certificates(), 'paginated', params] as const,
    queryFn: () => portfolioService.getCertificatesPaginated(params),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 2,
  });
};

export const usePendingCertificates = () => {
  return useQuery({
    queryKey: portfolioKeys.pendingCertificates(),
    queryFn: portfolioService.getPendingCertificates,
    staleTime: 1000 * 60 * 1, // 1 Minute Cache
  });
};

export const useProviders = (params?: { has_certificates?: boolean }) => {
  return useQuery({
    queryKey: params ? [...portfolioKeys.providers(), params] : portfolioKeys.providers(),
    queryFn: () => portfolioService.getProviders(params),
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

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      portfolioService.updateProject(id, formData),
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
    mutationFn: (payload: FormData | CreateCertificatePayload) =>
      portfolioService.createCertificate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificates() });
    },
  });
};

export const useDirectCertificateUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      payload,
    }: {
      file: File;
      payload: Omit<CreateCertificatePayload, 'storage_key'>;
    }) => {
      // 1. Signierte S3 Upload-URL via POST /api/certificates/presigned_upload/ holen
      const presigned = await portfolioService.getPresignedUploadUrl(file.name, file.type);
      // 2. Datei direkt in den S3-Storage (Supabase) hochladen
      await portfolioService.uploadDirectToStorage(presigned.url, file, presigned.headers);
      // 3. Django-Backend mit dem storage_key informieren
      return portfolioService.createCertificate({
        ...payload,
        storage_key: presigned.storage_key,
      });
    },
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

export const useUpdateCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Certificate> }) =>
      portfolioService.updateCertificate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificates() });
      queryClient.invalidateQueries({ queryKey: portfolioKeys.tracks() });
    },
  });
};

export const usePublishCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => portfolioService.publishCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificates() });
    },
  });
};

export const useUnpublishCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => portfolioService.unpublishCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificates() });
    },
  });
};

export const useExtractCertificateMetadata = () => {
  return useMutation({
    mutationFn: (id: number) => portfolioService.extractCertificateMetadata(id),
  });
};


export const useApprovePendingCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload?: { title?: string; provider?: string; track_ids?: number[] };
    }) => portfolioService.approvePendingCertificate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.pendingCertificates() });
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificates() });
      queryClient.invalidateQueries({ queryKey: portfolioKeys.providers() });
    },
  });
};

export const useRejectPendingCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => portfolioService.rejectPendingCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.pendingCertificates() });
    },
  });
};

export const useBulkApprovePendingCertificates = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkApprovePayload) =>
      portfolioService.bulkApprovePendingCertificates(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.pendingCertificates() });
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificates() });
      queryClient.invalidateQueries({ queryKey: portfolioKeys.tracks() });
      queryClient.invalidateQueries({ queryKey: portfolioKeys.providers() });
    },
  });
};

export const useBulkRejectPendingCertificates = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) =>
      portfolioService.bulkRejectPendingCertificates(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.pendingCertificates() });
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

export const useSendAIChatMessage = () => {
  return useMutation({
    mutationFn: ({
      message,
      history,
      language,
    }: {
      message: string;
      history?: { role: 'user' | 'model'; text: string }[];
      language?: string;
    }) => portfolioService.sendAIChatMessage(message, history, language),
  });
};

export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: (email?: string) => portfolioService.requestPasswordReset(email),
  });
};

export const useConfirmPasswordReset = () => {
  return useMutation({
    mutationFn: (payload: {
      uid: string;
      token: string;
      new_password: string;
      re_new_password?: string;
    }) => portfolioService.confirmPasswordReset(payload),
  });
};
