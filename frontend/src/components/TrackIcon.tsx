import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import type { Track } from '../types';

interface TrackIconProps {
  track?: Pick<Track, 'name' | 'icon' | 'icon_url'> | null;
  iconUrl?: string | null;
  className?: string;
  fallback?: React.ReactNode;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

/**
 * Löst relative Backend-URLs (/static/...) in vollständige Pfade auf.
 */
export const resolveTrackIconUrl = (iconUrl?: string | null): string => {
  if (!iconUrl) return '';
  if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) {
    return iconUrl;
  }
  // Im Development-Modus nutzen wir den Vite-Proxy für /static/ (CORS-frei)
  if (import.meta.env.DEV) {
    return iconUrl.startsWith('/') ? iconUrl : `/${iconUrl}`;
  }
  return `${API_BASE_URL}${iconUrl.startsWith('/') ? '' : '/'}${iconUrl}`;
};

export const TrackIcon: React.FC<TrackIconProps> = ({
  track,
  iconUrl,
  className = 'w-6 h-6',
  fallback,
}) => {
  const [loadError, setLoadError] = useState(false);
  const rawUrl = iconUrl || track?.icon_url;
  const fullUrl = resolveTrackIconUrl(rawUrl);

  // Fallback, wenn keine Icon-URL vorliegt oder der Ladevorgang fehlschlug
  if (!fullUrl || loadError) {
    if (fallback) return <>{fallback}</>;
    return <Layers className={`shrink-0 ${className}`} aria-hidden="true" />;
  }

  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{
        maskImage: `url("${fullUrl}")`,
        WebkitMaskImage: `url("${fullUrl}")`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        backgroundColor: 'currentColor',
      }}
      aria-hidden="true"
    >
      {/* Unsichtbares img-Tag zur zuverlässigen Fehlererkennung */}
      <img
        src={fullUrl}
        alt=""
        className="hidden"
        onError={() => setLoadError(true)}
      />
    </span>
  );
};
