import '@testing-library/jest-dom/vitest';

// JSDOM Mock für window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// JSDOM Mock für window.scrollTo & Element.prototype.scrollIntoView
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {},
});

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// JSDOM Mock für ResizeObserver (benötigt von react-use-measure)
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof window.ResizeObserver;
}
