const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

export const resolveBackendAssetUrl = (assetUrl?: string | null): string => {
  if (!assetUrl) return '';
  if (assetUrl.startsWith('http://') || assetUrl.startsWith('https://')) {
    return assetUrl;
  }
  // Im Development-Modus nutzen wir den Vite-Proxy für /static/ und /media/ (CORS-frei)
  if (import.meta.env.DEV) {
    return assetUrl.startsWith('/') ? assetUrl : `/${assetUrl}`;
  }
  return `${API_BASE_URL}${assetUrl.startsWith('/') ? '' : '/'}${assetUrl}`;
};

export const resolveProjectImageUrl = resolveBackendAssetUrl;
export const resolveTrackIconUrl = resolveBackendAssetUrl;
