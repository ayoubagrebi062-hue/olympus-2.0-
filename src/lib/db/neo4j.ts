/**
 * OLYMPUS 2.0 - Neo4j Client
 * Graph database for user preferences, project relationships, and GraphRAG.
 */

import neo4j, { Driver, Session } from 'neo4j-driver';

// Environment variables
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'olympus_password';

// Singleton driver instance
let driver: Driver | null = null;

/**
 * Get or create Neo4j driver instance
 */
export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
    });
  }
  return driver;
}

/**
 * Get a new session
 */
export function getSession(): Session {
  return getDriver().session();
}

/**
 * Execute a read query
 */
export async function readQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const session = getSession();
  try {
    const result = await session.executeRead(async tx => {
      return await tx.run(cypher, params);
    });
    return result.records.map(record => record.toObject() as T);
  } finally {
    await session.close();
  }
}

/**
 * Execute a write query
 */
export async function writeQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const session = getSession();
  try {
    const result = await session.executeWrite(async tx => {
      return await tx.run(cypher, params);
    });
    return result.records.map(record => record.toObject() as T);
  } finally {
    await session.close();
  }
}

/**
 * Check connection health
 */
export async function healthCheck(): Promise<boolean> {
  const session = getSession();
  try {
    await session.run('RETURN 1 as health');
    return true;
  } catch (error) {
    console.error('Neo4j health check failed:', error);
    return false;
  } finally {
    await session.close();
  }
}

/**
 * Close the driver (call on app shutdown)
 */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

// ============================================
// OLYMPUS-SPECIFIC QUERIES
// ============================================

/**
 * Create or update user node
 */
export async function upsertUser(
  userId: string,
  email: string,
  displayName?: string
): Promise<void> {
  await writeQuery(
    `
    MERGE (u:User {id: $userId})
    ON CREATE SET u.createdAt = datetime()
    SET u.email = $email,
        u.displayName = $displayName,
        u.updatedAt = datetime()
    `,
    { userId, email, displayName }
  );
}

/**
 * Set user preferences
 */
export async function setUserPreferences(
  userId: string,
  preferences: {
    theme?: 'light' | 'dark';
    accentColor?: string;
    fontPreference?: string;
    stylePreference?: string;
  }
): Promise<void> {
  await writeQuery(
    `
    MATCH (u:User {id: $userId})
    MERGE (u)-[:HAS_PREFERENCE]->(p:Preference)
    SET p += $preferences,
        p.updatedAt = datetime()
    `,
    { userId, preferences }
  );
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: string): Promise<any> {
  const results = await readQuery(
    `
    MATCH (u:User {id: $userId})-[:HAS_PREFERENCE]->(p:Preference)
    RETURN p
    `,
    { userId }
  );
  return results[0]?.p || null;
}

/**
 * Record a build
 */
export async function recordBuild(
  userId: string,
  projectId: string,
  buildId: string,
  prompt: string
): Promise<void> {
  await writeQuery(
    `
    MATCH (u:User {id: $userId})
    MERGE (p:Project {id: $projectId})
    MERGE (b:Build {id: $buildId})
    MERGE (u)-[:CREATED]->(p)
    MERGE (p)-[:HAS_BUILD]->(b)
    SET b.prompt = $prompt,
        b.createdAt = datetime()
    `,
    { userId, projectId, buildId, prompt }
  );
}

/**
 * Get user's build history
 */
export async function getUserBuilds(userId: string, limit: number = 10): Promise<any[]> {
  return await readQuery(
    `
    MATCH (u:User {id: $userId})-[:CREATED]->(p:Project)-[:HAS_BUILD]->(b:Build)
    RETURN p.id as projectId, b.id as buildId, b.prompt as prompt, b.createdAt as createdAt
    ORDER BY b.createdAt DESC
    LIMIT $limit
    `,
    { userId, limit: neo4j.int(limit) }
  );
}

/**
 * Get full user context for GraphRAG
 */
export async function getUserContext(userId: string): Promise<{
  preferences: any;
  recentBuilds: any[];
  industries: string[];
}> {
  const preferences = await getUserPreferences(userId);
  const recentBuilds = await getUserBuilds(userId, 5);

  const industries = await readQuery<{ name: string }>(
    `
    MATCH (u:User {id: $userId})-[:WORKS_IN]->(i:Industry)
    RETURN i.name as name
    `,
    { userId }
  );

  return {
    preferences,
    recentBuilds,
    industries: industries.map(i => i.name),
  };
}

// ============================================
// SCHEMA INITIALIZATION
// ============================================

/**
 * Initialize Neo4j schema with constraints and indexes
 * Run this on application startup
 */
export async function initializeSchema(): Promise<void> {
  console.log('[Neo4j] Initializing schema...');

  // Create constraints for unique IDs
  const constraints = [
    'CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
    'CREATE CONSTRAINT project_id IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE',
    'CREATE CONSTRAINT build_id IF NOT EXISTS FOR (b:Build) REQUIRE b.id IS UNIQUE',
    'CREATE CONSTRAINT industry_name IF NOT EXISTS FOR (i:Industry) REQUIRE i.name IS UNIQUE',
    'CREATE CONSTRAINT tech_name IF NOT EXISTS FOR (t:TechStack) REQUIRE t.name IS UNIQUE',
    'CREATE CONSTRAINT pattern_name IF NOT EXISTS FOR (d:DesignPattern) REQUIRE d.name IS UNIQUE',
    'CREATE CONSTRAINT component_name IF NOT EXISTS FOR (c:Component) REQUIRE c.name IS UNIQUE',
  ];

  // Create indexes for faster lookups
  const indexes = [
    'CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email)',
    'CREATE INDEX build_created IF NOT EXISTS FOR (b:Build) ON (b.createdAt)',
    'CREATE INDEX project_created IF NOT EXISTS FOR (p:Project) ON (p.createdAt)',
  ];

  for (const constraint of constraints) {
    try {
      await writeQuery(constraint);
    } catch (error) {
      // Constraint might already exist
    }
  }

  for (const index of indexes) {
    try {
      await writeQuery(index);
    } catch (error) {
      // Index might already exist
    }
  }

  // Seed default industries
  const defaultIndustries = [
    'E-commerce',
    'SaaS',
    'Healthcare',
    'Finance',
    'Education',
    'Social',
    'Entertainment',
    'Productivity',
    'Marketing',
    'Real Estate',
  ];

  for (const industry of defaultIndustries) {
    await writeQuery('MERGE (i:Industry {name: $name}) ON CREATE SET i.createdAt = datetime()', {
      name: industry,
    });
  }

  // Seed default tech stacks
  const defaultTechStacks = [
    { name: 'Next.js', category: 'framework', popularity: 95 },
    { name: 'React', category: 'framework', popularity: 98 },
    { name: 'TypeScript', category: 'language', popularity: 90 },
    { name: 'Tailwind CSS', category: 'styling', popularity: 88 },
    { name: 'PostgreSQL', category: 'database', popularity: 85 },
    { name: 'Supabase', category: 'backend', popularity: 75 },
    { name: 'Vercel', category: 'hosting', popularity: 80 },
    { name: 'Prisma', category: 'orm', popularity: 70 },
    { name: 'shadcn/ui', category: 'components', popularity: 72 },
    { name: 'Stripe', category: 'payments', popularity: 82 },
  ];

  for (const tech of defaultTechStacks) {
    await writeQuery(
      `MERGE (t:TechStack {name: $name})
       ON CREATE SET t.category = $category, t.popularity = $popularity, t.createdAt = datetime()`,
      tech
    );
  }

  // Seed default design patterns
  const defaultPatterns = [
    { name: 'modern-minimal', description: 'Clean, minimal design with lots of whitespace' },
    { name: 'bold-colorful', description: 'Vibrant colors and bold typography' },
    { name: 'dark-mode-first', description: 'Dark theme as the primary design' },
    { name: 'glassmorphism', description: 'Frosted glass effects and transparency' },
    { name: 'neomorphism', description: 'Soft shadows and extruded elements' },
    { name: 'brutalist', description: 'Raw, unpolished aesthetic' },
    { name: 'corporate', description: 'Professional, business-oriented design' },
    { name: 'playful', description: 'Fun, animated, and interactive' },
  ];

  for (const pattern of defaultPatterns) {
    await writeQuery(
      `MERGE (d:DesignPattern {name: $name})
       ON CREATE SET d.description = $description, d.createdAt = datetime()`,
      pattern
    );
  }

  console.log('[Neo4j] Schema initialized successfully');
}

// ============================================
// INDUSTRY & TECH PREFERENCES
// ============================================

/**
 * Set user's industry
 */
export async function setUserIndustry(userId: string, industryName: string): Promise<void> {
  await writeQuery(
    `
    MATCH (u:User {id: $userId})
    MERGE (i:Industry {name: $industryName})
    MERGE (u)-[r:WORKS_IN]->(i)
    SET r.updatedAt = datetime()
    `,
    { userId, industryName }
  );
}

/**
 * Set user's preferred tech stack
 */
export async function setUserTechPreference(
  userId: string,
  techName: string,
  weight: number = 1.0
): Promise<void> {
  await writeQuery(
    `
    MATCH (u:User {id: $userId})
    MERGE (t:TechStack {name: $techName})
    MERGE (u)-[r:PREFERS_TECH]->(t)
    SET r.weight = $weight, r.updatedAt = datetime()
    `,
    { userId, techName, weight }
  );
}

/**
 * Get user's tech preferences
 */
export async function getUserTechPreferences(userId: string): Promise<
  Array<{
    name: string;
    category: string;
    weight: number;
  }>
> {
  return await readQuery(
    `
    MATCH (u:User {id: $userId})-[r:PREFERS_TECH]->(t:TechStack)
    RETURN t.name as name, t.category as category, r.weight as weight
    ORDER BY r.weight DESC
    `,
    { userId }
  );
}

/**
 * Set user's design pattern preference
 */
export async function setUserDesignPattern(
  userId: string,
  patternName: string,
  weight: number = 1.0
): Promise<void> {
  await writeQuery(
    `
    MATCH (u:User {id: $userId})
    MERGE (d:DesignPattern {name: $patternName})
    MERGE (u)-[r:PREFERS_PATTERN]->(d)
    SET r.weight = $weight, r.updatedAt = datetime()
    `,
    { userId, patternName, weight }
  );
}

/**
 * Get user's design pattern preferences
 */
export async function getUserDesignPatterns(userId: string): Promise<
  Array<{
    name: string;
    description: string;
    weight: number;
  }>
> {
  return await readQuery(
    `
    MATCH (u:User {id: $userId})-[r:PREFERS_PATTERN]->(d:DesignPattern)
    RETURN d.name as name, d.description as description, r.weight as weight
    ORDER BY r.weight DESC
    `,
    { userId }
  );
}

// ============================================
// PROJECT TECH TRACKING
// ============================================

/**
 * Record tech used in a project
 */
export async function recordProjectTech(projectId: string, techNames: string[]): Promise<void> {
  for (const techName of techNames) {
    await writeQuery(
      `
      MATCH (p:Project {id: $projectId})
      MERGE (t:TechStack {name: $techName})
      MERGE (t)-[r:USED_IN]->(p)
      SET r.addedAt = datetime()
      `,
      { projectId, techName }
    );
  }
}

/**
 * Get tech used in a project
 */
export async function getProjectTech(projectId: string): Promise<string[]> {
  const results = await readQuery<{ name: string }>(
    `
    MATCH (t:TechStack)-[:USED_IN]->(p:Project {id: $projectId})
    RETURN t.name as name
    `,
    { projectId }
  );
  return results.map(r => r.name);
}

// ============================================
// SIMILARITY & RECOMMENDATIONS
// ============================================

/**
 * Find similar projects based on tech stack and industry
 */
export async function findSimilarProjects(
  userId: string,
  limit: number = 5
): Promise<
  Array<{
    projectId: string;
    prompt: string;
    similarity: number;
    sharedTech: string[];
  }>
> {
  return await readQuery(
    `
    MATCH (u:User {id: $userId})-[:CREATED]->(myProject:Project)
    MATCH (t:TechStack)-[:USED_IN]->(myProject)
    MATCH (t)-[:USED_IN]->(otherProject:Project)
    WHERE otherProject <> myProject
    WITH otherProject, collect(DISTINCT t.name) as sharedTech
    MATCH (otherProject)<-[:HAS_BUILD]-(b:Build)
    RETURN
      otherProject.id as projectId,
      b.prompt as prompt,
      size(sharedTech) as similarity,
      sharedTech
    ORDER BY similarity DESC
    LIMIT $limit
    `,
    { userId, limit: neo4j.int(limit) }
  );
}

/**
 * Get recommended tech for a user based on their history
 */
export async function getRecommendedTech(
  userId: string,
  limit: number = 5
): Promise<
  Array<{
    name: string;
    category: string;
    reason: string;
  }>
> {
  return await readQuery(
    `
    MATCH (u:User {id: $userId})-[:PREFERS_TECH]->(preferredTech:TechStack)
    MATCH (preferredTech)-[:USED_IN]->(p:Project)<-[:USED_IN]-(relatedTech:TechStack)
    WHERE NOT (u)-[:PREFERS_TECH]->(relatedTech)
    WITH relatedTech, count(*) as coOccurrence
    RETURN
      relatedTech.name as name,
      relatedTech.category as category,
      'Often used with your preferred stack' as reason
    ORDER BY coOccurrence DESC
    LIMIT $limit
    `,
    { userId, limit: neo4j.int(limit) }
  );
}

// ============================================
// LEARNED COMPONENTS
// ============================================

/**
 * Record a learned component from a build
 */
export async function recordLearnedComponent(
  userId: string,
  componentName: string,
  componentType: string,
  buildId: string
): Promise<void> {
  await writeQuery(
    `
    MATCH (u:User {id: $userId})
    MATCH (b:Build {id: $buildId})
    MERGE (c:Component {name: $componentName})
    ON CREATE SET c.type = $componentType, c.createdAt = datetime()
    MERGE (u)-[r:LEARNED_COMPONENT]->(c)
    ON CREATE SET r.firstSeen = datetime(), r.useCount = 1
    ON MATCH SET r.useCount = r.useCount + 1, r.lastUsed = datetime()
    MERGE (c)-[:CREATED_IN]->(b)
    `,
    { userId, componentName, componentType, buildId }
  );
}

/**
 * Get user's learned components
 */
export async function getUserLearnedComponents(
  userId: string,
  limit: number = 20
): Promise<
  Array<{
    name: string;
    type: string;
    useCount: number;
  }>
> {
  return await readQuery(
    `
    MATCH (u:User {id: $userId})-[r:LEARNED_COMPONENT]->(c:Component)
    RETURN c.name as name, c.type as type, r.useCount as useCount
    ORDER BY r.useCount DESC
    LIMIT $limit
    `,
    { userId, limit: neo4j.int(limit) }
  );
}

// ============================================
// EXTENDED USER CONTEXT
// ============================================

/**
 * Get extended user context including tech and design preferences
 */
export async function getExtendedUserContext(userId: string): Promise<{
  preferences: any;
  recentBuilds: any[];
  industries: string[];
  techPreferences: Array<{ name: string; category: string; weight: number }>;
  designPatterns: Array<{ name: string; weight: number }>;
  learnedComponents: Array<{ name: string; type: string; useCount: number }>;
}> {
  const [basicContext, techPreferences, designPatterns, learnedComponents] = await Promise.all([
    getUserContext(userId),
    getUserTechPreferences(userId),
    getUserDesignPatterns(userId),
    getUserLearnedComponents(userId, 10),
  ]);

  return {
    ...basicContext,
    techPreferences,
    designPatterns,
    learnedComponents,
  };
}

export default {
  getDriver,
  getSession,
  readQuery,
  writeQuery,
  healthCheck,
  closeDriver,
  initializeSchema,
  upsertUser,
  setUserPreferences,
  getUserPreferences,
  setUserIndustry,
  setUserTechPreference,
  getUserTechPreferences,
  setUserDesignPattern,
  getUserDesignPatterns,
  recordBuild,
  getUserBuilds,
  getUserContext,
  getExtendedUserContext,
  recordProjectTech,
  getProjectTech,
  findSimilarProjects,
  getRecommendedTech,
  recordLearnedComponent,
  getUserLearnedComponents,
};
