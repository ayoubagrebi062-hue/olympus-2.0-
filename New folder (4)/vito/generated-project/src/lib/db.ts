// src/lib/db.ts
// Database client - re-exports Prisma for consistency
// Some modules prefer 'db' import, others 'prisma' - both work

import { prisma } from './prisma';

// Export prisma as db for modules that expect this naming
export const db = prisma;

// Re-export everything from prisma
export * from './prisma';

// Type-safe db client alias
export type Database = typeof prisma;
