/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Vitest Configuration File
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Configuration for Vitest testing framework
 * Includes settings for:
 * - Test environment (Node.js)
 * - Coverage reporting
 * - Test file patterns
 * - Global test setup
 * - Mock configurations
 *
 * @link https://vitest.dev/config/
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Test configuration
  test: {
    /**
     * Global timeout for tests (in milliseconds)
     * Increased for integration tests that interact with database
     */
    testTimeout: 30000, // 30 seconds

    /**
     * Timeout for hooks (beforeAll, afterAll, etc.)
     */
    hookTimeout: 30000,

    /**
     * Test environment
     * 'node' for backend API testing
     */
    environment: 'node',

    /**
     * Test file patterns
     * Matches files ending with .test.ts or .spec.ts
     */
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],

    /**
     * Files to exclude from testing
     */
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/types/**',
    ],

    /**
     * Coverage configuration
     */
    coverage: {
      /**
       * Coverage provider
       * 'v8' is faster and more accurate than 'istanbul'
       */
      provider: 'v8',

      /**
       * Coverage reporter
       * - text: Console output
       * - json: Machine-readable format
       * - html: Visual HTML report
       * - lcov: Standard coverage format
       */
      reporter: ['text', 'json', 'html', 'lcov'],

      /**
       * Coverage output directory
       */
      reportsDirectory: './coverage',

      /**
       * Files to include in coverage
       */
      include: ['src/**/*.ts'],

      /**
       * Files to exclude from coverage
       */
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types/**',
        'src/**/*.d.ts',
        'src/config/**',
        'src/shared/**',
      ],

      /**
       * Coverage thresholds
       * Fails if coverage falls below these values
       */
      thresholds: {
        global: {
          statements: 70,
          branches: 60,
          functions: 70,
          lines: 70,
        },
      },
    },

    /**
     * Global test setup file
     * Runs before all tests
     */
    setupFiles: ['./src/test/setup.ts'],

    /**
     * Global test teardown
     * Runs after all tests
     */
    teardownTimeout: 10000,

    /**
     * Silent mode
     * Set to false to see all console logs
     */
    silent: false,

    /**
     * Restore mocks after each test
     * Prevents mock pollution between tests
     */
    restoreMocks: true,

    /**
     * Clear mocks after each test
     */
    clearMocks: true,

    /**
     * Mock modules
     */
    mockReset: true,

    /**
     * Sequence configuration
     */
    sequence: {
      /**
       * Run tests in sequence (not parallel)
       * Important for integration tests with shared database
       */
      concurrent: false,

      /**
       * Shuffle test order
       * Set to true to catch order-dependent bugs
       */
      shuffle: false,
    },

    /**
     * Pool configuration
     * 'threads' for parallel execution
     * 'forks' for isolated execution
     */
    pool: 'threads',

    /**
     * Pool options
     */
    poolOptions: {
      threads: {
        /**
         * Number of threads
         * Set based on CPU cores
         */
        minThreads: 2,
        maxThreads: 4,
      },
    },

    /**
     * Reporters for test output
     */
    reporters: ['default', 'json'],

    /**
     * Output file for JSON reporter
     */
    outputFile: {
      json: './test-results.json',
    },

    /**
     * Watch mode (disabled for CI/CD)
     */
    watch: false,

    /**
     * Isolate tests
     * Each test file runs in its own context
     */
    isolate: true,

    /**
     * Pass with no tests
     * Prevents failure when no tests found
     */
    passWithNoTests: true,

    /**
     * Allow only tests with .only
     * Useful for debugging specific tests
     */
    allowOnly: true,
  },

  /**
   * Path aliases
   * Allows using @/ instead of relative paths
   */
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@middlewares': path.resolve(__dirname, './src/middlewares'),
      '@helpers': path.resolve(__dirname, './src/helpers'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@config': path.resolve(__dirname, './src/config'),
      '@errors': path.resolve(__dirname, './src/errors'),
      '@types': path.resolve(__dirname, './src/types'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },
});
