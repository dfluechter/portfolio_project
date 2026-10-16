const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

export const resolveProjectImageUrl = (imgUrl?: string | null): string => {
  if (!imgUrl) return '';
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    return imgUrl;
  }
  if (import.meta.env.DEV) {
    return imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`;
  }
  return `${API_BASE_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
};
