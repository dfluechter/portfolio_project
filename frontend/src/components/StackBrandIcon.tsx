import React, { useId } from 'react';

export interface StackBrandIconProps {
  name: string;
  category?: string;
  className?: string;
}

/**
 * Große, farbige Marken-Icons für den Technologie-Stack (SVG mit offiziellen Brand-Farben).
 */
export const StackBrandIcon: React.FC<StackBrandIconProps> = ({
  name,
  category = 'other',
  className = 'w-10 h-10',
}) => {
  const uid = useId().replace(/:/g, '');
  const lower = name.toLowerCase();

  if (lower.includes('python')) {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={`${className} shrink-0 drop-shadow-[0_4px_12px_rgba(55,118,171,0.35)]`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`py-blue-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#387EB8" />
            <stop offset="100%" stopColor="#366994" />
          </linearGradient>
          <linearGradient id={`py-yellow-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE052" />
            <stop offset="100%" stopColor="#FFC331" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="12" fill="#0F172A" fillOpacity="0.08" />
        <path
          d="M23.8 7C16.7 7 17.2 10.1 17.2 10.1V13.3H24V14.4H14.4C14.4 14.4 10 13.9 10 20.9C10 27.9 13.8 27.6 13.8 27.6H16.1V24.3C16.1 24.3 16 20.4 19.9 20.4H26.5C26.5 20.4 30.2 20.5 30.2 16.8V10.8C30.2 10.8 30.8 7 23.8 7ZM20.1 9.2C20.8 9.2 21.4 9.8 21.4 10.5C21.4 11.2 20.8 11.8 20.1 11.8C19.4 11.8 18.8 11.2 18.8 10.5C18.8 9.8 19.4 9.2 20.1 9.2Z"
          fill={`url(#py-blue-${uid})`}
        />
        <path
          d="M24.2 41C31.3 41 30.8 37.9 30.8 37.9V34.7H24V33.6H33.6C33.6 33.6 38 34.1 38 27.1C38 20.1 34.2 20.4 34.2 20.4H31.9V23.7C31.9 23.7 32 27.6 28.1 27.6H21.5C21.5 27.6 17.8 27.5 17.8 31.2V37.2C17.8 37.2 17.2 41 24.2 41ZM27.9 38.8C27.2 38.8 26.6 38.2 26.6 37.5C26.6 36.8 27.2 36.2 27.9 36.2C28.6 36.2 29.2 36.8 29.2 37.5C29.2 38.2 28.6 38.8 27.9 38.8Z"
          fill={`url(#py-yellow-${uid})`}
        />
      </svg>
    );
  }

  if (lower.includes('django')) {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={`${className} shrink-0 drop-shadow-[0_4px_12px_rgba(68,183,139,0.35)]`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`dj-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#065F46" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="11" fill={`url(#dj-grad-${uid})`} />
        <path
          d="M22.2 12H26.6V31.3C24.3 31.8 22.6 32 20.7 32C15.2 32 12.3 29.5 12.3 24.7C12.3 20.1 15.4 17.1 20.2 17.1C20.9 17.1 21.6 17.2 22.2 17.4V12ZM22.2 21C21.6 20.8 21.1 20.7 20.5 20.7C18 20.7 16.6 22.2 16.6 24.8C16.6 27.4 17.9 28.8 20.4 28.8C21 28.8 21.6 28.7 22.2 28.6V21Z"
          fill="#ECFDF5"
        />
        <path
          d="M34.2 17.4V27.6C34.2 31.1 33.9 32.8 33.1 34.3C32.3 35.7 31.2 36.6 29 37.6L25.4 35.9C27.5 34.9 28.5 34.1 29.1 32.9C29.7 31.7 29.9 30.2 29.9 26.9V17.4H34.2ZM29.9 12H34.2V15.5H29.9V12Z"
          fill="#6EE7B7"
        />
      </svg>
    );
  }

  if (lower.includes('react')) {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={`${className} shrink-0 drop-shadow-[0_4px_12px_rgba(97,218,251,0.4)]`}
        aria-hidden="true"
      >
        <rect x="3" y="3" width="42" height="42" rx="11" fill="#0B192C" />
        <circle cx="24" cy="24" r="3.6" fill="#61DAFB" />
        <g stroke="#61DAFB" strokeWidth="2.2" fill="none">
          <ellipse cx="24" cy="24" rx="16" ry="6.2" />
          <ellipse cx="24" cy="24" rx="16" ry="6.2" transform="rotate(60 24 24)" />
          <ellipse cx="24" cy="24" rx="16" ry="6.2" transform="rotate(120 24 24)" />
        </g>
      </svg>
    );
  }

  if (lower.includes('typescript')) {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={`${className} shrink-0 drop-shadow-[0_4px_12px_rgba(49,120,198,0.4)]`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`ts-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="10" fill={`url(#ts-grad-${uid})`} />
        <path
          d="M20.5 23.2H15.5V37H11.5V23.2H6.5V19.8H20.5V23.2ZM38.8 24.1C37.6 23.3 36.1 22.8 34.6 22.8C33 22.8 32 23.5 32 24.5C32 25.4 32.9 25.9 35.1 26.7C38.6 27.9 40.5 29.4 40.5 32.3C40.5 35.5 37.7 37.4 33.6 37.4C31.1 37.4 28.8 36.7 27.2 35.6L28.8 32.4C30.2 33.4 31.9 34 33.5 34C35.3 34 36.5 33.3 36.5 32.2C36.5 31.2 35.6 30.6 33.2 29.8C29.9 28.6 28.1 27.1 28.1 24.5C28.1 21.5 30.7 19.4 34.6 19.4C36.8 19.4 38.8 19.9 40.3 20.8L38.8 24.1Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  if (lower.includes('postgres') || lower.includes('neon')) {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={`${className} shrink-0 drop-shadow-[0_4px_12px_rgba(0,229,153,0.35)]`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`pg-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#336791" />
            <stop offset="100%" stopColor="#00E599" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="11" fill={`url(#pg-grad-${uid})`} />
        <ellipse cx="24" cy="14" rx="12" ry="4.5" fill="#FFFFFF" fillOpacity="0.95" />
        <path
          d="M12 14V24C12 26.5 17.4 28.5 24 28.5C30.6 28.5 36 26.5 36 24V14"
          stroke="#FFFFFF"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M12 24V34C12 36.5 17.4 38.5 24 38.5C30.6 38.5 36 36.5 36 34V24"
          stroke="#A7F3D0"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (lower.includes('tailwind')) {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={`${className} shrink-0 drop-shadow-[0_4px_12px_rgba(56,189,248,0.4)]`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`tw-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="11" fill="#0F172A" />
        <path
          d="M24 15C19.2 15 16.2 17.4 15 22.2C16.8 19.8 18.9 18.9 21.3 19.5C22.7 19.8 23.7 20.9 24.8 22C26.6 23.8 28.7 26 33 26C37.8 26 40.8 23.6 42 18.8C40.2 21.2 38.1 22.1 35.7 21.5C34.3 21.2 33.3 20.1 32.2 19C30.4 17.2 28.3 15 24 15ZM15 26C10.2 26 7.2 28.4 6 33.2C7.8 30.8 9.9 29.9 12.3 30.5C13.7 30.8 14.7 31.9 15.8 33C17.6 34.8 19.7 37 24 37C28.8 37 31.8 34.6 33 29.8C31.2 32.2 29.1 33.1 26.7 32.5C25.3 32.2 24.3 31.1 23.2 30C21.4 28.2 19.3 26 15 26Z"
          fill={`url(#tw-grad-${uid})`}
        />
      </svg>
    );
  }

  if (lower.includes('supabase') || lower.includes('s3')) {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={`${className} shrink-0 drop-shadow-[0_4px_12px_rgba(62,207,142,0.4)]`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`sb-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3ECF8E" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="11" fill="#06281E" />
        <path
          d="M26.5 9L11.5 27.5H23.5L21.5 39L36.5 20.5H24.5L26.5 9Z"
          fill={`url(#sb-grad-${uid})`}
        />
      </svg>
    );
  }

  if (lower.includes('docker') || lower.includes('render')) {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={`${className} shrink-0 drop-shadow-[0_4px_12px_rgba(36,150,237,0.4)]`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`dk-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#2496ED" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="11" fill={`url(#dk-grad-${uid})`} />
        <rect x="11" y="20" width="5" height="5" rx="1" fill="#FFFFFF" />
        <rect x="17.5" y="20" width="5" height="5" rx="1" fill="#FFFFFF" />
        <rect x="24" y="20" width="5" height="5" rx="1" fill="#FFFFFF" />
        <rect x="17.5" y="13.5" width="5" height="5" rx="1" fill="#E0F2FE" />
        <rect x="24" y="13.5" width="5" height="5" rx="1" fill="#E0F2FE" />
        <path
          d="M9 27.5H36.5C36.5 33.5 31 37 22.5 37C14.5 37 9.5 33.5 9 27.5Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  if (lower.includes('pytest') || lower.includes('vitest') || lower.includes('tdd')) {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={`${className} shrink-0 drop-shadow-[0_4px_12px_rgba(245,158,11,0.38)]`}
        aria-hidden="true"
      >
        <rect x="3" y="3" width="42" height="42" rx="11" fill="#1E1B4B" />
        <rect x="10" y="11" width="6" height="26" rx="3" fill="#0A9EDC" />
        <rect x="18" y="11" width="6" height="26" rx="3" fill="#F59E0B" />
        <rect x="26" y="11" width="6" height="26" rx="3" fill="#EF4444" />
        <rect x="34" y="11" width="5" height="26" rx="2.5" fill="#22C55E" />
      </svg>
    );
  }

  const palette =
    category === 'backend'
      ? ['#F97316', '#EA580C']
      : category === 'frontend'
        ? ['#EC4899', '#8B5CF6']
        : ['#06B6D4', '#3B82F6'];

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={`${className} shrink-0 drop-shadow-[0_4px_12px_rgba(249,115,22,0.35)]`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`gen-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="100%" stopColor={palette[1]} />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="11" fill={`url(#gen-grad-${uid})`} />
      <path
        d="M18 16L11 24L18 32M30 16L37 24L30 32M26 14L22 34"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
