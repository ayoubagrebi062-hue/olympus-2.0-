/**
 * OLYMPUS 2.0 - Vitest Environment Setup
 *
 * FIX #21: Proper environment variable mocking for CI tests
 * Instead of excluding tests, we now provide mock env vars.
 */

// Set up test environment variables BEFORE any tests run
// These are dummy values for testing - they won't connect to real services

// Supabase test configuration
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjE1MjAwMCwiZXhwIjoxOTMxNzI4MDAwfQ.test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MTUyMDAwLCJleHAiOjE5MzE3MjgwMDB9.test-service-key';

// AI Provider test keys (these won't work with real APIs but satisfy validation)
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-test-key-for-vitest';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key-for-vitest';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'gsk_test_key_for_vitest';

// Database test configuration
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/olympus_test';

// Stripe test configuration
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_vitest';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock_secret';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock_key';

// App configuration
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
process.env.NODE_ENV = 'test';

// Export for ESM compatibility
export {};
