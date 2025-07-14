const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Add custom Jest configuration here
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  
  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/__tests__/**/*.(ts|tsx|js|jsx)',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx,js,jsx}',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx,js,jsx}',
    '!src/**/*.spec.{ts,tsx,js,jsx}',
    '!src/**/index.{ts,tsx,js,jsx}',
    '!src/app/**/layout.{ts,tsx,js,jsx}',
    '!src/app/**/page.{ts,tsx,js,jsx}',
    '!src/app/**/loading.{ts,tsx,js,jsx}',
    '!src/app/**/error.{ts,tsx,js,jsx}',
    '!src/app/**/not-found.{ts,tsx,js,jsx}',
    '!src/app/**/global-error.{ts,tsx,js,jsx}',
    '!src/app/**/route.{ts,tsx,js,jsx}',
    '!src/middleware.{ts,tsx,js,jsx}',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/firmware/',
    '<rootDir>/Solid-Cad/',
    '<rootDir>/discovery-server/',
    '<rootDir>/mobile-app/',
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Maximum number of concurrent workers
  maxWorkers: '50%',
  
  // Timeout for tests
  testTimeout: 10000,
  
  // Display individual test results
  displayName: 'PETG Tests',
  
  // Global setup
  globalSetup: '<rootDir>/jest.globalSetup.js',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig) 