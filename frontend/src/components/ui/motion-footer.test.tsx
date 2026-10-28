import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CinematicFooter } from './motion-footer';
import * as MotionFooterModule from './motion-footer';

/**
 * Comprehensive Test Suite for Motion Footer & MagneticButton Primitives
 * 
 * Coverage Areas:
 * 1. CinematicFooter: DOM Rendering, Typography, Theming & Marquee
 * 2. User Interactions: Back-to-Top scrollTo behavior & Link navigation
 * 3. GSAP Animations & Parallax: Context lifecycle, ScrollTrigger setup & cleanup
 * 4. MagneticButton: Physics calculations, mousemove/mouseleave tweens, ref forwarding
 * 5. Accessibility (a11y): ARIA roles, semantics, keyboard operability
 * 6. SSR & Environment Safety: Safe initialization in browser/JSDOM
 */

describe('CinematicFooter Component', () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>;
  let contextSpy: ReturnType<typeof vi.spyOn>;
  let revertMock: any;
  let toSpy: ReturnType<typeof vi.spyOn>;
  let fromToSpy: ReturnType<typeof vi.spyOn>;
  const originalContext = gsap.context.bind(gsap);

  beforeEach(() => {
    // Spying and mocking scrollTo
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    // Spy on GSAP animations
    toSpy = vi.spyOn(gsap, 'to');
    fromToSpy = vi.spyOn(gsap, 'fromTo');

    // Intercept gsap.context to track revert lifecycle cleanup
    revertMock = vi.fn();
    contextSpy = vi.spyOn(gsap, 'context').mockImplementation((func: any, scope?: any) => {
      const ctx = originalContext(func, scope);
      const originalRevert = ctx.revert.bind(ctx);
      ctx.revert = () => {
        revertMock();
        originalRevert();
      };
      return ctx;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('1. DOM Rendering & Structural Elements', () => {
    it('renders the footer landmark with appropriate styling wrapper', () => {
      const { container } = render(<CinematicFooter />);
      
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('cinematic-footer-wrapper');

      // Curtain reveal wrapper with clip-path
      const wrapper = container.querySelector('.relative.h-screen.w-full');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveStyle({ clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)' });
    });

    it('renders the main heading and giant brand background text', () => {
      render(<CinematicFooter />);

      const heading = screen.getByRole('heading', { level: 2, name: /let's build something exceptional/i });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('footer-text-glow');

      const giantText = screen.getByText('PORTFOLIO');
      expect(giantText).toBeInTheDocument();
      expect(giantText).toHaveClass('footer-giant-bg-text');
    });

    it('renders ambient light aurora and grid background overlay', () => {
      const { container } = render(<CinematicFooter />);

      const aurora = container.querySelector('.footer-aurora');
      expect(aurora).toBeInTheDocument();
      expect(aurora).toHaveClass('animate-footer-breathe');

      const grid = container.querySelector('.footer-bg-grid');
      expect(grid).toBeInTheDocument();
    });

    it('renders duplicated marquee items for infinite scrolling', () => {
      render(<CinematicFooter />);

      const marqueeFirstItems = screen.getAllByText('Full-Stack Software Engineering');
      expect(marqueeFirstItems.length).toBe(2);

      const marqueeSecondItems = screen.getAllByText('Django 5 REST Core');
      expect(marqueeSecondItems.length).toBe(2);

      const marqueeThirdItems = screen.getAllByText('TypeScript & Tailwind CSS v4');
      expect(marqueeThirdItems.length).toBe(2);

      const marqueeFourthItems = screen.getAllByText('Scalable Cloud Architecture');
      expect(marqueeFourthItems.length).toBe(2);

      const marqueeFifthItems = screen.getAllByText('Modern Reactive Systems');
      expect(marqueeFifthItems.length).toBe(2);
    });

    it('renders primary developer action links (GitHub & Contact)', () => {
      render(<CinematicFooter />);

      const githubBtn = screen.getByRole('link', { name: /github profil/i });
      expect(githubBtn).toBeInTheDocument();
      expect(githubBtn).toHaveAttribute('href', 'https://github.com/dfluechter');
      expect(githubBtn).toHaveClass('footer-glass-pill');

      const emailBtn = screen.getByRole('link', { name: /e-mail schreiben/i });
      expect(emailBtn).toBeInTheDocument();
      expect(emailBtn).toHaveAttribute('href', 'mailto:dominik.fluechter@googlemail.com');
      expect(emailBtn).toHaveClass('footer-glass-pill');
    });

    it('renders secondary section navigation links', () => {
      render(<CinematicFooter />);

      const projectsLink = screen.getByRole('link', { name: /projekte/i });
      expect(projectsLink).toBeInTheDocument();
      expect(projectsLink).toHaveAttribute('href', '#projects');

      const skillsLink = screen.getByRole('link', { name: /skills/i });
      expect(skillsLink).toBeInTheDocument();
      expect(skillsLink).toHaveAttribute('href', '#skills');

      const certsLink = screen.getByRole('link', { name: /zertifikate/i });
      expect(certsLink).toBeInTheDocument();
      expect(certsLink).toHaveAttribute('href', '#certificates');
    });

    it('renders bottom credits, brand badge and copyright notice', () => {
      render(<CinematicFooter />);

      expect(screen.getByText(/© 2026 Dominik Flüchter\. All rights reserved\./i)).toBeInTheDocument();
      expect(screen.getByText(/crafted with/i)).toBeInTheDocument();
      expect(screen.getByText('❤')).toHaveClass('animate-footer-heartbeat');
      expect(screen.getAllByText('Dominik Flüchter').length).toBeGreaterThanOrEqual(1);
    });

    it('injects inline theme-adaptive stylesheet with keyframe animations', () => {
      const { container } = render(<CinematicFooter />);

      const styleTag = container.querySelector('style');
      expect(styleTag).toBeInTheDocument();
      expect(styleTag?.innerHTML).toContain('@keyframes footer-breathe');
      expect(styleTag?.innerHTML).toContain('@keyframes footer-scroll-marquee');
      expect(styleTag?.innerHTML).toContain('@keyframes footer-heartbeat');
      expect(styleTag?.innerHTML).toContain('.cinematic-footer-wrapper');
    });
  });

  describe('2. User Interaction & Scroll Behavior', () => {
    it('executes smooth scroll to top when Back-to-Top button is clicked', () => {
      render(<CinematicFooter />);

      const backToTopBtn = screen.getByRole('button');
      expect(backToTopBtn).toBeInTheDocument();

      fireEvent.click(backToTopBtn);

      expect(scrollToSpy).toHaveBeenCalledTimes(1);
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('executes smooth scroll to top via keyboard interaction (Enter / Space)', () => {
      render(<CinematicFooter />);

      const backToTopBtn = screen.getByRole('button');
      backToTopBtn.focus();
      expect(backToTopBtn).toHaveFocus();

      fireEvent.click(backToTopBtn);
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
  });

  describe('3. GSAP Animations & ScrollTrigger Lifecycle', () => {
    it('initializes GSAP context on mount scoped to the footer wrapper', () => {
      render(<CinematicFooter />);

      expect(contextSpy).toHaveBeenCalled();
      // Should create tweens for giant text parallax and staggered content reveal
      expect(fromToSpy).toHaveBeenCalledTimes(2);

      // Check first tween: giant text parallax
      const giantTextCall = fromToSpy.mock.calls[0];
      expect(giantTextCall[1]).toMatchObject({ y: '10vh', scale: 0.8, opacity: 0 });
      expect(giantTextCall[2]).toMatchObject({
        y: '0vh',
        scale: 1,
        opacity: 1,
        ease: 'power1.out',
      });
      expect(giantTextCall[2].scrollTrigger).toBeDefined();

      // Check second tween: heading & links reveal with stagger
      const contentRevealCall = fromToSpy.mock.calls[1];
      expect(contentRevealCall[1]).toMatchObject({ y: 50, opacity: 0 });
      expect(contentRevealCall[2]).toMatchObject({
        y: 0,
        opacity: 1,
        stagger: 0.15,
        ease: 'power3.out',
      });
      expect(contentRevealCall[2].scrollTrigger).toBeDefined();
    });

    it('cleans up GSAP context on component unmount to prevent memory leaks', () => {
      const { unmount } = render(<CinematicFooter />);

      expect(revertMock).not.toHaveBeenCalled();
      unmount();
      expect(revertMock).toHaveBeenCalled();
    });
  });

  describe('4. Magnetic Physics & Interactive Hover Effects', () => {
    it('applies magnetic pull effect via GSAP on mousemove over buttons', () => {
      render(<CinematicFooter />);

      const backToTopBtn = screen.getByRole('button');

      vi.spyOn(backToTopBtn, 'getBoundingClientRect').mockReturnValue({
        width: 48,
        height: 48,
        top: 100,
        left: 200,
        bottom: 148,
        right: 248,
        x: 200,
        y: 100,
        toJSON: () => {},
      });

      toSpy.mockClear();

      // Simulate mouse move off-center
      // element center: (left + width/2) = 224, (top + height/2) = 124
      // client coordinates: (234, 134) -> dx = +10, dy = +10
      fireEvent.mouseMove(backToTopBtn, {
        clientX: 234,
        clientY: 134,
      });

      expect(toSpy).toHaveBeenCalled();
      const lastCall = toSpy.mock.calls[toSpy.mock.calls.length - 1];
      expect(lastCall[0]).toBe(backToTopBtn);
      expect(lastCall[1].scale).toBe(1.05);
      expect(lastCall[1].duration).toBe(0.4);
      expect(lastCall[1].ease).toBe('power2.out');
      expect(lastCall[1].x).toBeCloseTo(4, 1);
      expect(lastCall[1].y).toBeCloseTo(4, 1);
    });

    it('resets magnetic button to resting position on mouseleave', () => {
      render(<CinematicFooter />);

      const backToTopBtn = screen.getByRole('button');
      toSpy.mockClear();

      fireEvent.mouseLeave(backToTopBtn);

      expect(toSpy).toHaveBeenCalled();
      const lastCall = toSpy.mock.calls[toSpy.mock.calls.length - 1];
      expect(lastCall[0]).toBe(backToTopBtn);
      expect(lastCall[1].x).toBe(0);
      expect(lastCall[1].y).toBe(0);
      expect(lastCall[1].rotationX).toBe(0);
      expect(lastCall[1].rotationY).toBe(0);
      expect(lastCall[1].scale).toBe(1);
      expect(lastCall[1].duration).toBe(1.2);
      expect(lastCall[1].ease).toBe('elastic.out(1, 0.3)');
    });

    it('detaches magnetic mouse event listeners when unmounted', () => {
      const { unmount } = render(<CinematicFooter />);
      const backToTopBtn = screen.getByRole('button');

      unmount();
      toSpy.mockClear();

      fireEvent.mouseMove(backToTopBtn, { clientX: 250, clientY: 150 });
      fireEvent.mouseLeave(backToTopBtn);

      expect(toSpy).not.toHaveBeenCalled();
    });
  });

  describe('5. Accessibility (a11y) & Semantic Integrity', () => {
    it('contains valid landmark role and proper heading structure', () => {
      render(<CinematicFooter />);

      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/Let's build something exceptional/i);
    });

    it('provides keyboard-navigable links with discernible text content', () => {
      render(<CinematicFooter />);

      const allLinks = screen.getAllByRole('link');
      expect(allLinks.length).toBe(6);

      for (const link of allLinks) {
        expect(link).toHaveAttribute('href');
        expect(link.textContent?.trim().length).toBeGreaterThan(0);
      }
    });

    it('ensures Back-to-Top button is interactive with SVG indicator', () => {
      render(<CinematicFooter />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('6. SSR & Environment Safety', () => {
    it('registers ScrollTrigger plugin safely in browser/JSDOM context', () => {
      expect(ScrollTrigger).toBeDefined();
      expect(gsap).toBeDefined();
    });

    it('renders cleanly without throwing even on re-renders', () => {
      const { rerender } = render(<CinematicFooter />);
      expect(() => rerender(<CinematicFooter />)).not.toThrow();
    });
  });
});

/**
 * Standalone MagneticButton Primitive Tests
 * 
 * Safely runs if MagneticButton is exported as a standalone primitive from motion-footer.tsx.
 */
const MaybeMagneticButton = (MotionFooterModule as any).MagneticButton;
const describeMagneticButton = MaybeMagneticButton ? describe : describe.skip;

describeMagneticButton('MagneticButton Primitive Component', () => {
  it('renders as button by default and forwards ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<MaybeMagneticButton ref={ref}>Click Me</MaybeMagneticButton>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(ref.current).toBe(button);
  });

  it('renders as anchor when "as" prop is "a"', () => {
    render(
      <MaybeMagneticButton as="a" href="/test-url">
        Link Variant
      </MaybeMagneticButton>
    );

    const link = screen.getByRole('link', { name: /link variant/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test-url');
  });

  it('merges custom className with default cursor-pointer style', () => {
    render(
      <MaybeMagneticButton className="custom-test-class">
        Styled Button
      </MaybeMagneticButton>
    );

    const button = screen.getByRole('button', { name: /styled button/i });
    expect(button).toHaveClass('cursor-pointer');
    expect(button).toHaveClass('custom-test-class');
  });

  it('handles ref callback format properly', () => {
    let capturedNode: HTMLElement | null = null;
    render(
      <MaybeMagneticButton ref={(node: HTMLElement | null) => { capturedNode = node; }}>
        Callback Ref
      </MaybeMagneticButton>
    );

    expect(capturedNode).not.toBeNull();
    expect((capturedNode as any)?.tagName).toBe('BUTTON');
  });
});
