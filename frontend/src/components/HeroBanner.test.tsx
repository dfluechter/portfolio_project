import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroBanner } from './HeroBanner';

describe('HeroBanner', () => {
  it('renders banner with image and architectural metadata', () => {
    render(<HeroBanner />);

    const img = screen.getByAltText(/Big Data Analytics/i);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/static/img/background/banner_big_data.jpg');

    expect(screen.getByText(/Architecture \/\/ Data Systems/i)).toBeInTheDocument();
    expect(screen.getByText('LIVE PIPELINES')).toBeInTheDocument();
    expect(screen.getByText(/Verteilte Datenverarbeitung/i)).toBeInTheDocument();
  });

  it('reveals loaded state when image onLoad fires', () => {
    render(<HeroBanner />);

    const img = screen.getByAltText(/Big Data Analytics/i);
    fireEvent.load(img);

    expect(img).toHaveClass('opacity-90');
  });
});
