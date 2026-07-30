import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/__tests__/integration/**/*.integration.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/setup.ts'],
  clearMocks: true,
  maxWorkers: 1,
  testTimeout: 30000,
};

export default config;
