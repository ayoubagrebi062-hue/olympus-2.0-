/**
 * OLYMPUS 2.0 - MongoDB Client
 * Document database for build history, chat logs, and agent outputs.
 */

import { MongoClient, Db, Collection, ObjectId, Document } from 'mongodb';

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/olympus';
const DB_NAME = 'olympus';

// Singleton client instance
let client: MongoClient | null = null;

/**
 * Get or create MongoDB client instance
 */
export async function getClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

/**
 * Get database instance
 */
export async function getDb(): Promise<Db> {
  const mongoClient = await getClient();
  return mongoClient.db(DB_NAME);
}

/**
 * Get a collection
 */
export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

/**
 * Check connection health
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const mongoClient = await getClient();
    await mongoClient.db().admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB health check failed:', error);
    return false;
  }
}

/**
 * Close the client (call on app shutdown)
 */
export async function closeClient(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}

// ============================================
// OLYMPUS-SPECIFIC COLLECTIONS
// ============================================

// Collection names
export const COLLECTIONS = {
  BUILD_HISTORY: 'build_history',
  CHAT_LOGS: 'chat_logs',
  AGENT_OUTPUTS: 'agent_outputs',
  RAW_FILES: 'raw_files',
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface BuildHistory {
  _id?: ObjectId;
  buildId: string;
  userId: string;
  projectId: string;
  prompt: string;
  status: 'pending' | 'building' | 'completed' | 'failed';
  phases: BuildPhase[];
  startedAt: Date;
  completedAt?: Date;
  totalTokens?: number;
  error?: string;
}

export interface BuildPhase {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agent?: string;
  startedAt?: Date;
  completedAt?: Date;
  output?: string;
}

export interface ChatLog {
  _id?: ObjectId;
  buildId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent?: string;
  timestamp: Date;
  tokens?: number;
}

export interface AgentOutput {
  _id?: ObjectId;
  buildId: string;
  agentId: string;
  agentName: string;
  input: string;
  output: string;
  model: string;
  tokens: number;
  latencyMs: number;
  timestamp: Date;
}

export interface RawFile {
  _id?: ObjectId;
  buildId: string;
  projectId: string;
  path: string;
  content: string;
  language: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// BUILD HISTORY OPERATIONS
// ============================================

/**
 * Log a new build
 */
export async function logBuild(
  buildId: string,
  userId: string,
  projectId: string,
  prompt: string
): Promise<void> {
  const collection = await getCollection<BuildHistory>(COLLECTIONS.BUILD_HISTORY);

  await collection.insertOne({
    buildId,
    userId,
    projectId,
    prompt,
    status: 'pending',
    phases: [],
    startedAt: new Date(),
  });
}

/**
 * Update build status
 */
export async function updateBuildStatus(
  buildId: string,
  status: BuildHistory['status'],
  error?: string
): Promise<void> {
  const collection = await getCollection<BuildHistory>(COLLECTIONS.BUILD_HISTORY);

  const update: any = { status };
  if (status === 'completed' || status === 'failed') {
    update.completedAt = new Date();
  }
  if (error) {
    update.error = error;
  }

  await collection.updateOne({ buildId }, { $set: update });
}

/**
 * Add a phase to build
 */
export async function addBuildPhase(buildId: string, phase: BuildPhase): Promise<void> {
  const collection = await getCollection<BuildHistory>(COLLECTIONS.BUILD_HISTORY);

  await collection.updateOne({ buildId }, { $push: { phases: phase } });
}

/**
 * Update phase status
 */
export async function updatePhaseStatus(
  buildId: string,
  phaseName: string,
  status: BuildPhase['status'],
  output?: string
): Promise<void> {
  const collection = await getCollection<BuildHistory>(COLLECTIONS.BUILD_HISTORY);

  const update: any = {
    'phases.$.status': status,
  };
  if (status === 'completed' || status === 'failed') {
    update['phases.$.completedAt'] = new Date();
  }
  if (output) {
    update['phases.$.output'] = output;
  }

  await collection.updateOne({ buildId, 'phases.name': phaseName }, { $set: update });
}

/**
 * Get build by ID
 */
export async function getBuild(buildId: string): Promise<BuildHistory | null> {
  const collection = await getCollection<BuildHistory>(COLLECTIONS.BUILD_HISTORY);
  return await collection.findOne({ buildId });
}

/**
 * Get build history for user
 */
export async function getBuildHistory(userId: string, limit: number = 10): Promise<BuildHistory[]> {
  const collection = await getCollection<BuildHistory>(COLLECTIONS.BUILD_HISTORY);

  return await collection.find({ userId }).sort({ startedAt: -1 }).limit(limit).toArray();
}

// ============================================
// CHAT LOG OPERATIONS
// ============================================

/**
 * Log a chat message
 */
export async function logChatMessage(
  buildId: string,
  userId: string,
  role: ChatLog['role'],
  content: string,
  agent?: string,
  tokens?: number
): Promise<void> {
  const collection = await getCollection<ChatLog>(COLLECTIONS.CHAT_LOGS);

  await collection.insertOne({
    buildId,
    userId,
    role,
    content,
    agent,
    timestamp: new Date(),
    tokens,
  });
}

/**
 * Get chat history for build
 */
export async function getChatHistory(buildId: string): Promise<ChatLog[]> {
  const collection = await getCollection<ChatLog>(COLLECTIONS.CHAT_LOGS);

  return await collection.find({ buildId }).sort({ timestamp: 1 }).toArray();
}

// ============================================
// AGENT OUTPUT OPERATIONS
// ============================================

/**
 * Log agent output
 */
export async function logAgentOutput(
  buildId: string,
  agentId: string,
  agentName: string,
  input: string,
  output: string,
  model: string,
  tokens: number,
  latencyMs: number
): Promise<void> {
  const collection = await getCollection<AgentOutput>(COLLECTIONS.AGENT_OUTPUTS);

  await collection.insertOne({
    buildId,
    agentId,
    agentName,
    input,
    output,
    model,
    tokens,
    latencyMs,
    timestamp: new Date(),
  });
}

/**
 * Get agent outputs for build
 */
export async function getAgentOutputs(buildId: string): Promise<AgentOutput[]> {
  const collection = await getCollection<AgentOutput>(COLLECTIONS.AGENT_OUTPUTS);

  return await collection.find({ buildId }).sort({ timestamp: 1 }).toArray();
}

// ============================================
// RAW FILE OPERATIONS
// ============================================

/**
 * Store a raw file
 */
export async function storeFile(
  buildId: string,
  projectId: string,
  path: string,
  content: string,
  language: string
): Promise<void> {
  const collection = await getCollection<RawFile>(COLLECTIONS.RAW_FILES);

  const existing = await collection.findOne({ projectId, path });

  if (existing) {
    await collection.updateOne(
      { projectId, path },
      {
        $set: {
          content,
          updatedAt: new Date(),
        },
        $inc: { version: 1 },
      }
    );
  } else {
    await collection.insertOne({
      buildId,
      projectId,
      path,
      content,
      language,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Get file by path
 */
export async function getFile(projectId: string, path: string): Promise<RawFile | null> {
  const collection = await getCollection<RawFile>(COLLECTIONS.RAW_FILES);
  return await collection.findOne({ projectId, path });
}

/**
 * Get all files for project
 */
export async function getProjectFiles(projectId: string): Promise<RawFile[]> {
  const collection = await getCollection<RawFile>(COLLECTIONS.RAW_FILES);

  return await collection.find({ projectId }).sort({ path: 1 }).toArray();
}

export default {
  getClient,
  getDb,
  getCollection,
  healthCheck,
  closeClient,
  COLLECTIONS,
  logBuild,
  updateBuildStatus,
  addBuildPhase,
  updatePhaseStatus,
  getBuild,
  getBuildHistory,
  logChatMessage,
  getChatHistory,
  logAgentOutput,
  getAgentOutputs,
  storeFile,
  getFile,
  getProjectFiles,
};
