/**
 * OLYMPUS 2.0 - Database Clients Index
 * Unified exports for all infrastructure clients.
 */

export * as neo4j from './neo4j';
export * as qdrant from './qdrant';
export * as mongodb from './mongodb';
export * as redis from './redis';

// Re-export default clients
export { default as neo4jClient } from './neo4j';
export { default as qdrantClient } from './qdrant';
export { default as mongodbClient } from './mongodb';
export { default as redisClient } from './redis';

// Health check all databases
export async function healthCheckAll(): Promise<{
  neo4j: boolean;
  qdrant: boolean;
  mongodb: boolean;
  redis: boolean;
  allHealthy: boolean;
}> {
  const [neo4jHealth, qdrantHealth, mongodbHealth, redisHealth] =
    await Promise.all([
      import('./neo4j').then((m) => m.healthCheck()),
      import('./qdrant').then((m) => m.healthCheck()),
      import('./mongodb').then((m) => m.healthCheck()),
      import('./redis').then((m) => m.healthCheck()),
    ]);

  return {
    neo4j: neo4jHealth,
    qdrant: qdrantHealth,
    mongodb: mongodbHealth,
    redis: redisHealth,
    allHealthy: neo4jHealth && qdrantHealth && mongodbHealth && redisHealth,
  };
}

// Graceful shutdown
export async function closeAll(): Promise<void> {
  await Promise.all([
    import('./neo4j').then((m) => m.closeDriver()),
    import('./mongodb').then((m) => m.closeClient()),
    import('./redis').then((m) => m.closeClient()),
  ]);
}
