import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { resolveTrackIconUrl } from '../utils/mediaUrl';
import { TrackIcon } from './TrackIcon';
import type { Track } from '../types';

describe('TrackIcon Component', () => {
  const sampleTrack: Track = {
    id: 1,
    name: 'Cloud & DevOps',
    slug: 'cloud-devops',
    description: 'Cloud Track',
    icon: 'cloud',
    icon_url: '/static/img/icons/cloud.svg',
    created_at: '2026-01-01T00:00:00Z',
  };

  it('correctly resolves relative icon URLs against API_BASE_URL or dev proxy', () => {
    const resolved = resolveTrackIconUrl('/static/img/icons/cloud.svg');
    expect(resolved).toMatch(/(http:\/\/localhost:8000)?\/static\/img\/icons\/cloud\.svg/);
  });

  it('keeps absolute icon URLs untouched', () => {
    const absolute = 'https://example.com/icons/custom.svg';
    expect(resolveTrackIconUrl(absolute)).toBe(absolute);
  });

  it('renders fallback icon when no track or icon_url is provided', () => {
    const { container } = render(<TrackIcon track={null} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders custom fallback when provided and track has no icon', () => {
    render(<TrackIcon track={null} fallback={<span data-testid="custom-fallback">Fallback</span>} />);
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('renders masked icon span with correct maskImage when icon_url is present', () => {
    const { container } = render(<TrackIcon track={sampleTrack} className="w-5 h-5 text-violet-500" />);
    const span = container.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span).toHaveClass('w-5', 'h-5', 'text-violet-500');
    expect(span?.style.maskImage).toContain('cloud.svg');
  });

  it('switches to fallback when the hidden img triggers onError', () => {
    const { container } = render(
      <TrackIcon track={sampleTrack} fallback={<span data-testid="fallback-after-error">ErrorFallback</span>} />
    );

    const hiddenImg = container.querySelector('img.hidden');
    expect(hiddenImg).toBeInTheDocument();

    if (hiddenImg) {
      fireEvent.error(hiddenImg);
    }

    expect(screen.getByTestId('fallback-after-error')).toBeInTheDocument();
  });

  it('defaults to 24x24 dimension (w-6 h-6)', () => {
    const { container } = render(<TrackIcon track={sampleTrack} />);
    const span = container.querySelector('span');
    expect(span).toHaveClass('w-6', 'h-6');
  });
});
