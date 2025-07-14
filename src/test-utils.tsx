import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Create a simple providers wrapper without Clerk to avoid ES module issues
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Override render method
export { customRender as render };

// Export test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  firstName: 'Test',
  lastName: 'User',
  emailAddress: 'test@example.com',
  imageUrl: 'https://example.com/avatar.jpg',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockCollar = (overrides = {}) => ({
  id: 'test-collar-id',
  name: 'Test Collar',
  macAddress: '00:11:22:33:44:55',
  batteryLevel: 85,
  isOnline: true,
  lastSeen: new Date().toISOString(),
  firmwareVersion: '1.0.0',
  ...overrides,
});

export const createMockPet = (overrides = {}) => ({
  id: 'test-pet-id',
  name: 'Test Pet',
  breed: 'Test Breed',
  age: 3,
  weight: 25.5,
  collarId: 'test-collar-id',
  ownerId: 'test-user-id',
  imageUrl: 'https://example.com/pet.jpg',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockBeacon = (overrides = {}) => ({
  id: 'test-beacon-id',
  name: 'Test Beacon',
  macAddress: '00:AA:BB:CC:DD:EE',
  x: 100,
  y: 200,
  room: 'Living Room',
  batteryLevel: 90,
  isActive: true,
  signalStrength: -45,
  lastSeen: new Date().toISOString(),
  ...overrides,
});

export const createMockLocation = (overrides = {}) => ({
  id: 'test-location-id',
  collarId: 'test-collar-id',
  x: 150,
  y: 250,
  timestamp: new Date().toISOString(),
  accuracy: 2.5,
  room: 'Kitchen',
  nearestBeacons: ['test-beacon-id'],
  ...overrides,
});

// Helper function to wait for async operations
export const waitForTimeout = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Mock intersection observer for testing
export const mockIntersectionObserver = () => {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };
  
  global.IntersectionObserver = jest.fn().mockImplementation(() => mockObserver);
  
  return mockObserver;
};

// Mock resize observer for testing
export const mockResizeObserver = () => {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };
  
  global.ResizeObserver = jest.fn().mockImplementation(() => mockObserver);
  
  return mockObserver;
};

// Mock geolocation for testing
export const mockGeolocation = (position?: Partial<GeolocationPosition>) => {
  const mockPosition: GeolocationPosition = {
    coords: {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    ...position,
  };
  
  const mockGeoService = {
    getCurrentPosition: jest.fn().mockImplementation((success: any) => {
      success(mockPosition);
    }),
    watchPosition: jest.fn().mockReturnValue(1),
    clearWatch: jest.fn(),
  };
  
  Object.defineProperty(navigator, 'geolocation', {
    value: mockGeoService,
    writable: true,
  });
  
  return mockGeoService;
};

// Mock WebSocket for testing
export const mockWebSocket = () => {
  const mockWs = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  };
  
  const MockWebSocket = jest.fn().mockImplementation(() => mockWs);
  MockWebSocket.CONNECTING = 0;
  MockWebSocket.OPEN = 1;
  MockWebSocket.CLOSING = 2;
  MockWebSocket.CLOSED = 3;
  
  (global as any).WebSocket = MockWebSocket;
  
  return mockWs;
}; 