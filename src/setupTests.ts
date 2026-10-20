import '@testing-library/jest-dom';

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  global.IntersectionObserver = class IntersectionObserver {
    disconnect() {}
    observe() {}
    takeRecords() { return []; }
    unobserve() {}
  } as any;
}

