export interface User {
  id: number;
  email: string;
  is_staff?: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  image?: string | null;
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

export interface Certificate {
  id: number;
  title: string;
  issuer: string;
  pdf_file: string;
  uploaded_at: string;
}
