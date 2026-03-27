/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Global Test Setup File
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file runs before all tests and provides:
 * - Global test utilities
 * - Environment configuration
 * - Mock configurations
 * - Global test helpers
 * - Database connection helpers
 *
 * @link https://vitest.dev/config/#setupfiles
 */

import { beforeAll, afterAll, vi, expect } from 'vitest';
import mongoose from 'mongoose';
import { config } from '../src/config';
import { redisClient } from '../src/helpers/redis/redis';

// ═══════════════════════════════════════════════════════════════════════════════
 * Environment Configuration
 * ═══════════════════════════════════════════════════════════════════════════════

/**
 * Set test environment variables
 * Override production/development values with test-specific values
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random available port

// Test database configuration
process.env.MONGO_URI = config.database?.mongoUri || 'mongodb://localhost:27017/task_management_test';
process.env.REDIS_HOST = config.redis?.host || 'localhost';
process.env.REDIS_PORT = config.redis?.port?.toString() || '6379';

// JWT configuration for tests
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-testing-only-12345';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only-67890';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// OAuth configuration for tests
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

// Email configuration for tests
process.env.EMAIL_FROM = 'test@example.com';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';

// Stripe configuration for tests
process.env.STRIPE_SECRET_KEY = 'sk_test_1234567890';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test1234567890';

// AWS configuration for tests
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET = 'test-bucket';

// ═══════════════════════════════════════════════════════════════════════════════
 * Global Test Helpers
 * ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wait function for async operations
 * Useful for testing timers, retries, etc.
 */
global.waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate unique identifier for tests
 * Prevents conflicts between parallel tests
 */
global.uniqueId = (prefix = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Generate unique email for tests
 * Ensures no email conflicts in database
 */
global.uniqueEmail = () => `${global.uniqueId('user')}@test.com`;

/**
 * Mock console output in tests
 * Prevents console spam during testing
 */
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

/**
 * Enable/disable console output
 * Set to false to hide console logs during tests
 */
const ENABLE_CONSOLE = false;

if (!ENABLE_CONSOLE) {
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();
}

/**
 * Restore console output after tests
 */
afterAll(() => {
  if (!ENABLE_CONSOLE) {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
 * Global Mocks
 * ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mock external services
 * Prevents actual API calls during tests
 */

// Mock nodemailer (email service)
vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: vi.fn().mockResolvedValue(true),
  })),
}));

// Mock google-auth-library
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn().mockResolvedValue({
      getPayload: vi.fn().mockReturnValue({
        sub: 'test-provider-id',
        email: 'test@google.com',
        email_verified: true,
        name: 'Test Google User',
        picture: 'https://test.com/avatar.jpg',
      }),
    }),
  })),
}));

// Mock apple-signin-auth
vi.mock('apple-signin-auth', () => ({
  verifyIdToken: vi.fn().mockResolvedValue({
    sub: 'test-apple-id',
    email: 'test@apple.com',
    email_verified: true,
    name: 'Test Apple User',
  }),
}));

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    initializeApp: vi.fn(),
    messaging: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue('test-message-id'),
    }),
  },
}));

// Mock AWS S3
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ Location: 'https://test.s3.amazonaws.com/file.jpg' }),
  })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

// Mock Stripe
vi.mock('stripe', () => {
  const Stripe = vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ id: 'test-session-id', url: 'https://test.stripe.com' }),
      },
    },
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'test-customer-id' }),
    },
    paymentIntents: {
      create: vi.fn().mockResolvedValue({ id: 'test-payment-intent-id' }),
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({ type: 'checkout.session.completed' }),
    },
  }));
  return { default: Stripe };
});

// ═══════════════════════════════════════════════════════════════════════════════
 * Custom Matchers
 * ═══════════════════════════════════════════════════════════════════════════════

/**
 * Custom matcher for MongoDB ObjectIds
 * Validates if a string is a valid MongoDB ObjectId
 */
expect.extend({
  toBeObjectId(received) {
    const isValid = mongoose.Types.ObjectId.isValid(received);
    return {
      pass: isValid,
      message: () => `expected ${received} ${isValid ? 'not ' : ''}to be a valid ObjectId`,
    };
  },

  /**
   * Custom matcher for JWT tokens
   * Validates if a string looks like a JWT token
   */
  toBeJwt(received) {
    const parts = received.split('.');
    const isValid = parts.length === 3;
    return {
      pass: isValid,
      message: () => `expected ${received} ${isValid ? 'not ' : ''}to be a JWT token`,
    };
  },

  /**
   * Custom matcher for ISO date strings
   * Validates if a string is a valid ISO date
   */
  toBeISODate(received) {
    const date = new Date(received);
    const isValid = !isNaN(date.getTime()) && received.includes('T');
    return {
      pass: isValid,
      message: () => `expected ${received} ${isValid ? 'not ' : ''}to be an ISO date string`,
    };
  },

  /**
   * Custom matcher for email format
   * Validates if a string is a valid email
   */
  toBeEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(received);
    return {
      pass: isValid,
      message: () => `expected ${received} ${isValid ? 'not ' : ''}to be a valid email`,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
 * Global Type Declarations
 * ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extend Vitest's expect with custom matchers
 */
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeObjectId(): T;
    toBeJwt(): T;
    toBeISODate(): T;
    toBeEmail(): T;
  }
  interface AsymmetricMatchersContaining {
    objectId(): any;
    jwt(): any;
    isoDate(): any;
    email(): any;
  }
}

/**
 * Extend NodeJS global object with test helpers
 */
declare global {
  namespace NodeJS {
    interface Global {
      waitFor: (ms: number) => Promise<void>;
      uniqueId: (prefix?: string) => string;
      uniqueEmail: () => string;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
 * Lifecycle Hooks
 * ═══════════════════════════════════════════════════════════════════════════════

/**
 * Before All Tests
 * - Setup test database connection
 * - Setup Redis connection
 * - Clean existing data
 */
beforeAll(async () => {
  console.log('🚀 Setting up test environment...');

  try {
    // Connect to test MongoDB
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to test MongoDB');

    // Connect to test Redis
    await redisClient.connect();
    console.log('✅ Connected to test Redis');

    // Clean database before tests
    console.log('🧹 Cleaning test database...');
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    console.log('✅ Database cleaned');
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
});

/**
 * After All Tests
 * - Disconnect from database
 * - Disconnect from Redis
 * - Clean up all resources
 */
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Disconnect from MongoDB
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    console.log('✅ Disconnected from MongoDB');

    // Disconnect from Redis
    await redisClient.quit();
    console.log('✅ Disconnected from Redis');

    console.log('✅ Test environment cleaned up');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
 * Export for use in tests
 * ═══════════════════════════════════════════════════════════════════════════════

export {};
