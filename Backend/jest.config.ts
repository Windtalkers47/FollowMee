import type { Config } from 'jest';

const config: Config = {
  // The root directory of the project
  rootDir: '.',

  // The test environment to use
  testEnvironment: 'node',

  // Transform files with ts-jest
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },

  // File extensions to look for
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Test match pattern
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/integration/'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],

  coverageDirectory: 'coverage',

  coverageReporters: ['text', 'json', 'html', 'lcov'],

  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

  // Module name mapper for path aliases (if any)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Clear mocks between tests
  clearMocks: true,

  // Reset modules between tests
  resetModules: true,

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Test timeout
  testTimeout: 10000,

  // Silent mode (set to false for debugging)
  silent: false,
};

export default config;
