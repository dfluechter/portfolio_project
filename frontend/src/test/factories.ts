import type {
  Certificate,
  Project,
  Provider,
  Skill,
  TimelineEntry,
  Track,
  User,
} from '../types';

export const getMockUser = (overrides?: Partial<User>): User => ({
  id: 1,
  email: 'user@example.com',
  is_staff: false,
  ...overrides,
});

export const getMockSkill = (overrides?: Partial<Skill>): Skill => ({
  id: 1,
  name: 'Python',
  category: 'backend',
  category_display: 'Backend',
  proficiency: 80,
  icon: 'python',
  is_featured: false,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const getMockTimelineEntry = (
  overrides?: Partial<TimelineEntry>
): TimelineEntry => ({
  id: 1,
  entry_type: 'experience',
  entry_type_display: 'Berufserfahrung',
  title: 'Softwareentwickler',
  organization: 'Beispiel GmbH',
  start_date: '2022-01-01',
  end_date: null,
  is_current: true,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const getMockProject = (overrides?: Partial<Project>): Project => ({
  id: 1,
  title: 'Portfolio',
  description: 'Beispielprojekt',
  image: null,
  github_url: null,
  live_url: null,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const getMockProvider = (overrides?: Partial<Provider>): Provider => ({
  id: 1,
  provider: 'Udemy',
  logo: null,
  aktiv: true,
  url: null,
  ...overrides,
});

export const getMockTrack = (overrides?: Partial<Track>): Track => ({
  id: 1,
  name: 'Backend',
  slug: 'backend',
  description: 'Backend-Track',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const getMockCertificate = (
  overrides?: Partial<Certificate>
): Certificate => ({
  id: 1,
  title: 'Django Grundlagen',
  provider: 1,
  provider_details: getMockProvider(),
  pdf_file: 'https://example.com/certificate.pdf',
  uploaded_at: '2024-01-01T00:00:00Z',
  is_published: true,
  ...overrides,
});

export const getMockPendingCertificate = (
  overrides?: Partial<PendingCertificate>
): PendingCertificate => ({
  id: 1,
  original_file_name: 'django_course.pdf',
  file_hash: 'abc123hash',
  s3_key: 'inbox/django_course.pdf',
  file_size: 1024,
  guessed_title: 'Django Profikurs',
  guessed_provider: 'Udemy',
  status: 'pending',
  status_display: 'Ausstehend',
  ocr_status: 'completed',
  ocr_status_display: 'Abgeschlossen',
  rejection_reason: null,
  promoted_certificate: null,
  ocr_extracted_text: '',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});
