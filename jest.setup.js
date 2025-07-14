require('@testing-library/jest-dom');
const { configure } = require('@testing-library/react');
const { TextEncoder, TextDecoder } = require('util');

// Set up global test timeout
jest.setTimeout(30000);

// Configure Testing Library
configure({
  // Set custom test ID attribute
  testIdAttribute: 'data-testid',
  
  // Enable React Strict Mode for better testing
  reactStrictMode: true,
  
  // Set default timeout for async operations
  asyncUtilTimeout: 5000,
});

// Global mocks for browser APIs not available in jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver for components that use it
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
});

// Mock geolocation API
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mocked-object-url'),
});

// Mock URL.revokeObjectURL
Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
});

// Mock canvas context for any canvas-related tests
HTMLCanvasElement.prototype.getContext = jest.fn();

// Mock Web Workers
Object.defineProperty(window, 'Worker', {
  value: jest.fn().mockImplementation(() => ({
    postMessage: jest.fn(),
    terminate: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
  },
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
});

// Mock scrollBy
Object.defineProperty(window, 'scrollBy', {
  value: jest.fn(),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));

// Mock cancelAnimationFrame
global.cancelAnimationFrame = jest.fn();

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset localStorage and sessionStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Suppress console errors/warnings from expected errors in tests
jest.spyOn(console, 'error').mockImplementation((...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('Warning: componentWillReceiveProps') ||
     args[0].includes('Warning: componentWillMount') ||
     args[0].includes('Warning: componentWillUpdate'))
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
});

jest.spyOn(console, 'warn').mockImplementation((...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') ||
     args[0].includes('deprecated'))
  ) {
    return;
  }
  originalConsoleWarn.call(console, ...args);
}); 