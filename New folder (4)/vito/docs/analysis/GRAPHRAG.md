# GraphRAG Integration Guide

OLYMPUS uses a GraphRAG (Graph + Retrieval Augmented Generation) system to provide personalized AI responses based on user history, preferences, and similar past interactions.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      GraphRAG Context Manager                    │
│                 src/lib/agents/context/graphrag.ts               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │  Neo4j   │   │  Qdrant  │   │ MongoDB  │   │  Redis   │     │
│  │  (Graph) │   │ (Vector) │   │  (Docs)  │   │ (Cache)  │     │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘     │
│       │              │              │              │            │
│  Relationships  Embeddings    Build History    Fast Cache       │
│  Preferences    Similarity    Chat Logs        TTL: 5min        │
│  Industries     Prompts       Agent Outputs                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Neo4j (Graph Database)

**Purpose**: Store user relationships, preferences, and industry connections.

**Location**: `src/lib/db/neo4j.ts`

**Node Types**:
- `User` - User profiles
- `Project` - User projects
- `Build` - Build executions
- `Industry` - Domain tags
- `Preference` - Style preferences

**Relationships**:
- `(:User)-[:OWNS]->(:Project)`
- `(:Build)-[:FOR]->(:Project)`
- `(:User)-[:WORKS_IN]->(:Industry)`
- `(:User)-[:PREFERS]->(:Preference)`

**Example Query**:
```cypher
MATCH (u:User {id: $userId})-[:PREFERS]->(p:Preference)
MATCH (u)-[:WORKS_IN]->(i:Industry)
RETURN p, collect(i.name) as industries
```

### 2. Qdrant (Vector Database)

**Purpose**: Semantic similarity search for prompts and code.

**Location**: `src/lib/db/qdrant.ts`

**Collections**:
- `prompts` - User prompt embeddings
- `code` - Code snippet embeddings
- `knowledge` - Knowledge base vectors

**Embedding Model**: `nomic-embed-text` (768 dimensions)

**Usage**:
```typescript
// Find similar prompts
const similar = await qdrant.findSimilarPrompts(
  embedding,  // Current prompt embedding
  5,          // Top 5 results
  userId      // Filter by user
);
```

### 3. MongoDB (Document Database)

**Purpose**: Store build history, chat logs, and agent outputs.

**Location**: `src/lib/db/mongodb.ts`

**Collections**:
- `builds` - Build execution history
- `chats` - Conversation logs
- `outputs` - Agent outputs

**Example Query**:
```typescript
const history = await mongodb.getBuildHistory(userId, 10);
```

### 4. Redis (Cache Layer)

**Purpose**: Fast caching of user context to reduce database queries.

**Location**: `src/lib/db/redis.ts`

**Cache Key Pattern**: `context:user:{userId}`

**TTL**: 5 minutes (300 seconds)

---

## API Reference

### GraphRAGContextManager

```typescript
import { getContextManager, getUserContext } from '@/lib/agents/context/graphrag';

// Get singleton instance
const manager = getContextManager();

// Get user context
const context = await manager.getUserContext(userId, {
  includePromptSearch: true,
  promptEmbedding: [0.1, 0.2, ...],
  maxSimilarPrompts: 5,
  maxRecentBuilds: 10,
  skipCache: false,
  cacheTTL: 300
});
```

### UserContext Interface

```typescript
interface UserContext {
  userId: string;
  preferences: {
    theme?: 'light' | 'dark';
    accentColor?: string;
    fontPreference?: string;
    stylePreference?: string;
    industries?: string[];
  };
  recentBuilds: BuildSummary[];
  similarPrompts: SimilarPrompt[];
  industries: string[];
  successRate: number;
  totalBuilds: number;
  cachedAt?: Date;
}
```

### Recording Builds

```typescript
await manager.recordBuild(
  userId,
  projectId,
  buildId,
  prompt,
  embedding  // Optional: for similarity search
);
```

### Updating Preferences

```typescript
await manager.updatePreferences(userId, {
  theme: 'dark',
  stylePreference: 'minimal'
});
```

### Getting Context Summary (for prompts)

```typescript
const summary = await manager.getContextSummary(userId);
// Returns formatted string for AI prompt injection
```

---

## Configuration

### Environment Variables

```bash
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional-api-key

# MongoDB
MONGODB_URI=mongodb://localhost:27017/olympus

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Feature flag
ENABLE_GRAPHRAG=true
```

### Docker Compose

```yaml
services:
  neo4j:
    image: neo4j:5.15.0
    ports:
      - "7474:7474"  # Browser
      - "7687:7687"  # Bolt
    environment:
      NEO4J_AUTH: neo4j/password
    volumes:
      - neo4j-data:/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"  # REST API
      - "6334:6334"  # gRPC
    volumes:
      - qdrant-data:/qdrant/storage

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
```

---

## Usage in Agents

### Injecting Context into Agent Prompts

```typescript
// In agent executor
const contextSummary = await getContextSummary(userId);

const systemPrompt = `
You are an AI assistant helping build applications.

${contextSummary}

Based on the user's history and preferences above, tailor your responses.
`;
```

### Example Context Summary Output

```
[User Context]
User Preferences: {"theme":"dark","stylePreference":"minimal"}

Industries: SaaS, E-commerce

Build History: 45 builds, 87% success rate

Recent Requests:
- "Build a dashboard for tracking sales..."
- "Create an authentication system with..."
- "Add a payment integration with Stripe..."
```

---

## Best Practices

### 1. Cache Management

```typescript
// Force cache refresh when user updates preferences
await manager.invalidateUserCache(userId);

// Skip cache for critical operations
const context = await getUserContext(userId, { skipCache: true });
```

### 2. Embedding Generation

```typescript
// Generate embedding before recording build
import { generateEmbedding } from '@/lib/ai/embeddings';

const embedding = await generateEmbedding(prompt);
await manager.recordBuild(userId, projectId, buildId, prompt, embedding);
```

### 3. Error Handling

The GraphRAG system is designed to be resilient:
- Individual database failures don't crash the system
- Missing context returns sensible defaults
- Errors are logged but not propagated

```typescript
// All methods handle errors gracefully
const context = await getUserContext(userId);
// Returns empty preferences/arrays if databases unavailable
```

### 4. Privacy Considerations

- User data is isolated by `userId`
- Qdrant searches are filtered by user
- Context is not shared between users
- Cache keys are user-specific

---

## Monitoring

### Health Checks

```bash
# Neo4j
curl http://localhost:7474

# Qdrant
curl http://localhost:6333/health

# MongoDB
mongosh --eval "db.runCommand({ ping: 1 })"
```

### Metrics

Monitor these metrics:
- Cache hit rate (Redis)
- Query latency (Neo4j, Qdrant, MongoDB)
- Context retrieval time
- Embedding generation time

---

## Troubleshooting

### Neo4j Connection Issues

```bash
# Test connection
cypher-shell -u neo4j -p password "RETURN 1"

# Check logs
docker logs olympus-graph
```

### Qdrant Collection Missing

```bash
# Create collection
curl -X PUT http://localhost:6333/collections/prompts \
  -H "Content-Type: application/json" \
  -d '{"vectors": {"size": 768, "distance": "Cosine"}}'
```

### Cache Not Working

```bash
# Verify Redis connection
redis-cli ping

# Check cache key
redis-cli GET "context:user:user-id-here"
```

---

## References

- Neo4j: https://neo4j.com/docs/
- Qdrant: https://qdrant.tech/documentation/
- MongoDB: https://www.mongodb.com/docs/
- GraphRAG Manager: `src/lib/agents/context/graphrag.ts`
- Database Clients: `src/lib/db/`

---

*Last updated: 2026-01-22*
