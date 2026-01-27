import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    exclude: [
      'node_modules',
      'tests/e2e/**',
      'tests/load/**',
      // Exclude tests for unbuilt features
      '**/NotificationBell.test.tsx',
      '**/TeamMemberRow.test.tsx',
      '**/billing/api-routes.test.ts',
      // Exclude vendor tests that need external packages
      '**/svix/*.test.ts',
      '**/svix/**/*.test.ts',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    // P10 fix - consistent timeout values
    teardownTimeout: 10000,
    // P10 fix - add coverage thresholds
    coverage: {
      enabled: false, // Enable with --coverage flag
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/types/**',
        '**/__mocks__/**',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
    // Pool configuration for test isolation
    pool: 'forks',
    // Limit to single worker for consistent results
    maxForks: 1,
    minForks: 1,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
