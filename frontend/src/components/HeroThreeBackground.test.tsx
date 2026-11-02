import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../context/ThemeContext';
import { HeroThreeBackground } from './HeroThreeBackground';

// Mock @react-three/fiber Canvas für deterministische JSDOM-Tests, wenn forceWebGL=true gesetzt ist
vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual<typeof import('@react-three/fiber')>('@react-three/fiber');
  return {
    ...actual,
    Canvas: ({ frameloop }: { children: React.ReactNode; frameloop?: string }) => (
      <div data-testid="r3f-mock-canvas" data-canvas-frameloop={frameloop} />
    ),
    useFrame: vi.fn(),
  };
});

describe('HeroThreeBackground Component', () => {
  it('renders safely with auto-detected WebGL environment in JSDOM', () => {
    render(
      <ThemeProvider>
        <HeroThreeBackground />
      </ThemeProvider>
    );

    expect(screen.getByTestId('hero-three-background')).toBeInTheDocument();
  });

  it('renders fallback SVG in headless JSDOM when WebGL is unavailable', () => {
    render(
      <ThemeProvider>
        <HeroThreeBackground forceWebGL={false} />
      </ThemeProvider>
    );

    const wrapper = screen.getByTestId('hero-three-background');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    expect(wrapper).toHaveAttribute('data-webgl-active', 'false');
    expect(screen.getByTestId('hero-three-fallback-svg')).toBeInTheDocument();
  });

  it('renders React Three Fiber Canvas when WebGL is active', () => {
    render(
      <ThemeProvider>
        <HeroThreeBackground forceWebGL={true} />
      </ThemeProvider>
    );

    const wrapper = screen.getByTestId('hero-three-background');
    expect(wrapper).toHaveAttribute('data-webgl-active', 'true');
    expect(wrapper).toHaveAttribute('data-frameloop', 'always');
    expect(screen.getByTestId('r3f-mock-canvas')).toBeInTheDocument();
  });

  it('switches frameloop to demand when document tab is hidden to save GPU/battery', () => {
    render(
      <ThemeProvider>
        <HeroThreeBackground forceWebGL={true} />
      </ThemeProvider>
    );

    const wrapper = screen.getByTestId('hero-three-background');
    expect(wrapper).toHaveAttribute('data-frameloop', 'always');

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(wrapper).toHaveAttribute('data-frameloop', 'demand');

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(wrapper).toHaveAttribute('data-frameloop', 'always');
  });
});
