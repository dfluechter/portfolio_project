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
  is_published?: boolean;
  is_featured?: boolean;
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
  icon?: string;
  icon_url?: string;
  created_at: string;
}

export interface Certificate {
  id: number;
  title: string;
  provider: number;
  provider_details?: Provider;
  tracks?: number[];
  pdf_file: string;
  storage_key?: string;
  uploaded_at: string;
  sha256_hash?: string;
  is_published?: boolean;
  credential_id?: string;
  credential_url?: string | null;
  issued_date?: string | null;
}

export interface PresignedUploadResponse {
  url: string;
  storage_key: string;
  method: string;
  headers?: Record<string, string>;
}

export interface CreateCertificatePayload {
  title: string;
  provider: number;
  storage_key: string;
  tracks?: number[];
  issued_date?: string | null;
  credential_id?: string;
  credential_url?: string | null;
  sha256_hash?: string;
}

export interface ExtractedCertificateMetadata {
  guessed_title: string;
  guessed_provider: string;
  matched_provider?: { id: number; provider: string } | null;
  credential_id: string;
  issued_date: string;
  guessed_track_slugs: string[];
  matched_track_ids: number[];
  extracted_text_preview: string;
  ocr_pending: boolean;
  source_type: string;
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

export interface BulkApprovePayload {
  ids: number[];
  track_ids?: number[];
}

export interface BulkApproveResultItem {
  id: number;
  certificate_id: number;
  status: string;
  title: string;
}

export interface BulkErrorItem {
  id: number;
  error: string;
}

export interface BulkApproveResponse {
  approved_count: number;
  failed_count: number;
  results: BulkApproveResultItem[];
  errors: BulkErrorItem[];
}

export interface BulkRejectResultItem {
  id: number;
  status: string;
}

export interface BulkRejectResponse {
  rejected_count: number;
  failed_count: number;
  results: BulkRejectResultItem[];
  errors: BulkErrorItem[];
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

export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CitationSource {
  type: 'project' | 'certificate' | 'skill' | 'general';
  id?: number;
  title: string;
  target_id?: string;
}

export type ChatSourceItem = string | CitationSource;

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  sources?: ChatSourceItem[];
}

export interface AIChatResponse {
  reply: string;
  sources: ChatSourceItem[];
  disabled?: boolean;
}
