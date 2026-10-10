export interface User {
  id: number;
  email: string;
  is_staff?: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  category_display: string;
  proficiency: number;
  icon: string;
  is_featured: boolean;
  created_at: string;
}

export interface TimelineEntry {
  id: number;
  entry_type: 'experience' | 'education' | 'other';
  entry_type_display: string;
  title: string;
  organization: string;
  location?: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  description?: string;
  skills?: number[];
  skill_details?: Skill[];
  created_at: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  image?: string | null;
  skills?: number[];
  skill_details?: Skill[];
  github_url?: string | null;
  live_url?: string | null;
  created_at: string;
}

export interface Provider {
  id: number;
  provider: string;
  logo?: string | null;
  aktiv: boolean;
  url?: string | null;
}

export interface Track {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
}

export interface Certificate {
  id: number;
  title: string;
  provider: number;
  provider_details?: Provider;
  tracks?: number[];
  pdf_file: string;
  uploaded_at: string;
  sha256_hash?: string;
  is_published?: boolean;
}

export type PendingCertificateStatus = 'pending' | 'approved' | 'rejected';

export interface PendingCertificate {
  id: number;
  original_file_name: string;
  extracted_text?: string;
  guessed_title: string;
  guessed_provider: string;
  status: PendingCertificateStatus;
  created_at: string;
}

export type ImportRunStatus = 'running' | 'success' | 'partial' | 'failed';

export interface CertificateImportRun {
  id: number;
  started_at: string;
  finished_at?: string | null;
  files_found: number;
  files_imported: number;
  files_skipped: number;
  files_errored: number;
  status: ImportRunStatus;
  status_display?: string;
  log?: string;
  inbox_path: string;
}
