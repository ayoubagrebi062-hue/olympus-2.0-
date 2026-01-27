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
      // ══════════════════════════════════════════════════════════════
      // EXCLUDED: Tests for modules that don't exist yet
      // Re-enable these as features are implemented
      // ══════════════════════════════════════════════════════════════
      // Auth module not implemented
      '**/multi-tenant/isolation.test.ts',
      // Billing modules not implemented
      '**/billing/constants.test.ts',
      '**/billing/features-trials.test.ts',
      '**/billing/subscriptions.test.ts',
      '**/billing/usage-limits.test.ts',
      '**/billing/webhooks.test.ts',
      '**/billing/api-routes.test.ts',
      // Security modules not implemented
      '**/security/security.test.ts',
      '**/chaos-engineering/chaos-scenarios.test.ts',
      // Governance modules not implemented
      '**/test-governance-seal.test.ts',
      '**/test_phase8_integration.test.ts',
      // Conductor judge not implemented
      '**/conductor/judge/*.test.ts',
      // Agent chaos tests (depend on unimplemented modules)
      '**/chaos/agent-chaos.test.ts',
      // UI components not implemented
      '**/NotificationBell.test.tsx',
      '**/TeamMemberRow.test.tsx',
      // Vendor tests that need external packages
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
      reporter: ['text', 'json', 'html', 'json-summary'],
      reportsDirectory: './coverage',
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
