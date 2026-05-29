import { Request, Response, NextFunction } from 'express';

// Mock console.error during tests to reduce noise
const originalConsoleError = console.error;
console.error = (...args) => {
  // Only log actual errors, not warnings
  if (args[0] instanceof Error || args[0]?.includes('ERROR')) {
    originalConsoleError(...args);
  }
};

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USERNAME = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_NAME = 'followmee_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.FRONTEND_URL = 'http://localhost:5173';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mocked-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 1, email: 'test@example.com' }),
  decode: jest.fn().mockReturnValue({ userId: 1, email: 'test@example.com' }),
}));

// Mock cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/test/image/upload/v1234567890/test.jpg',
        public_id: 'test_image',
      }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
  },
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

// Mock TypeORM DataSource
jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    destroy: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn().mockReturnValue({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        getCount: jest.fn(),
        delete: jest.fn().mockReturnThis(),
        execute: jest.fn(),
      }),
    }),
  },
}));

// Global test utilities
global.testRequest = (method: string, path: string, data?: any) => ({
  method,
  path,
  body: data,
  headers: {},
  set: function(key: string, value: string) {
    this.headers[key] = value;
    return this;
  },
  send: function(data: any) {
    this.body = data;
    return this;
  },
});

// Cleanup after all tests
afterAll(async () => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Restore console.error
  console.error = originalConsoleError;
  
  // Clean up environment
  delete process.env.NODE_ENV;
  delete process.env.PORT;
  delete process.env.DB_HOST;
  delete process.env.DB_PORT;
  delete process.env.DB_USERNAME;
  delete process.env.DB_PASSWORD;
  delete process.env.DB_NAME;
  delete process.env.JWT_SECRET;
  delete process.env.FRONTEND_URL;
});