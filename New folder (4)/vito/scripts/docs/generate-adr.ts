#!/usr/bin/env npx ts-node

/**
 * OLYMPUS 3.0 - ADR Generator
 * ===========================
 * Generates Architecture Decision Records from predefined decisions
 */

import * as fs from 'fs';
import * as path from 'path';

interface ADRInput {
  title: string;
  context: string;
  decision: string;
  consequences: {
    positive: string[];
    negative: string[];
  };
  alternatives: {
    name: string;
    reason: string;
  }[];
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
}

function formatADR(input: ADRInput, number: number): string {
  const paddedNum = String(number).padStart(3, '0');

  return `# ADR-${paddedNum}: ${input.title}

## Status

**${input.status.charAt(0).toUpperCase() + input.status.slice(1)}**

Date: ${new Date().toISOString().split('T')[0]}

## Context

${input.context}

## Decision

${input.decision}

## Consequences

### Positive

${input.consequences.positive.map(p => `- ${p}`).join('\n')}

### Negative

${input.consequences.negative.map(n => `- ${n}`).join('\n')}

## Alternatives Considered

${input.alternatives.map(a => `### ${a.name}\n\n${a.reason}`).join('\n\n')}

---

*This ADR was generated as part of OLYMPUS documentation.*
`;
}

function generateADRs(rootDir: string): void {
  console.log('Generating Architecture Decision Records...');

  // Predefined decisions based on OLYMPUS architecture
  const decisions: ADRInput[] = [
    {
      title: 'Use Ollama for Local AI Inference',
      status: 'accepted',
      context: `OLYMPUS requires AI inference for 13 specialized agents. Using cloud APIs exclusively
(OpenAI, Anthropic) costs approximately $0.002-0.03 per 1K tokens. At scale with thousands
of builds, this becomes expensive and introduces latency for every API call.

We need a solution that:
- Reduces operational costs
- Provides low-latency inference for simple tasks
- Maintains quality for complex reasoning`,
      decision: `Use Ollama with DeepSeek-R1 and Llama 3.1 for local inference to handle 80% of
agent tasks. Reserve cloud APIs (Groq, Anthropic) for complex reasoning and oracle consultations.

Local models handle: code generation, validation, simple refinements
Cloud models handle: architecture decisions, complex debugging, quality assessment`,
      consequences: {
        positive: [
          'Reduced API costs by ~60-80%',
          'Sub-100ms latency for local inference',
          'No rate limiting on local models',
          'Works offline for development',
        ],
        negative: [
          'Requires GPU hardware for optimal performance',
          'Model quality varies compared to cloud',
          'Need to manage model updates locally',
          'Initial setup complexity for users',
        ],
      },
      alternatives: [
        {
          name: 'Full Cloud (OpenAI/Anthropic)',
          reason: 'Rejected due to cost concerns at scale. Would cost $500+/month at moderate usage.',
        },
        {
          name: 'Self-hosted vLLM',
          reason: 'More complex to set up and maintain. Ollama provides simpler developer experience.',
        },
        {
          name: 'AWS Bedrock',
          reason: 'Added cloud dependency and costs. Ollama keeps inference local and free.',
        },
      ],
    },
    {
      title: 'Use Neo4j for Knowledge Graph',
      status: 'accepted',
      context: `OLYMPUS needs to store and query complex relationships between:
- User preferences and style choices
- Generated components and their dependencies
- Build history and evolution
- Concept relationships for RAG

Traditional relational databases struggle with deep relationship queries.
We need a graph database optimized for traversal.`,
      decision: `Use Neo4j as the primary graph database for storing and querying relationships.
The knowledge graph powers GraphRAG, enabling context-aware code generation based on
user history, preferences, and component relationships.`,
      consequences: {
        positive: [
          'Natural representation of relationships',
          'Efficient multi-hop queries',
          'Cypher query language is intuitive',
          'Strong community and tooling',
        ],
        negative: [
          'Additional database to manage',
          'Learning curve for Cypher',
          'Not ideal for simple key-value lookups',
          'Memory-intensive for large graphs',
        ],
      },
      alternatives: [
        {
          name: 'PostgreSQL with recursive CTEs',
          reason: 'Performance degrades significantly beyond 3-4 levels of relationship depth.',
        },
        {
          name: 'MongoDB with $graphLookup',
          reason: 'Limited to single collection traversal. Not a true graph database.',
        },
        {
          name: 'AWS Neptune',
          reason: 'Cloud-only solution. Want to support local development without AWS dependency.',
        },
      ],
    },
    {
      title: 'Use Qdrant for Vector Storage',
      status: 'accepted',
      context: `OLYMPUS uses embeddings for:
- Semantic search of user queries
- Finding similar components and patterns
- RAG context retrieval
- Style and preference matching

Need a dedicated vector database that can handle high-dimensional embeddings
with fast similarity search.`,
      decision: `Use Qdrant as the vector database for all embedding storage and retrieval.
Embeddings are generated using local models (via Ollama) and stored in Qdrant collections
organized by type (components, styles, user queries).`,
      consequences: {
        positive: [
          'Optimized for vector similarity search',
          'Supports filtering alongside vector search',
          'Good performance on consumer hardware',
          'REST API and gRPC support',
        ],
        negative: [
          'Another service to manage',
          'Less mature than some alternatives',
          'Limited aggregate operations',
        ],
      },
      alternatives: [
        {
          name: 'Pinecone',
          reason: 'Cloud-only and costs scale with usage. Want local-first architecture.',
        },
        {
          name: 'pgvector in PostgreSQL',
          reason: 'Good for simpler use cases but Qdrant offers better performance for our scale.',
        },
        {
          name: 'Weaviate',
          reason: 'More complex setup. Qdrant has simpler API for our needs.',
        },
      ],
    },
    {
      title: 'Multi-Agent Architecture with 13 Specialists',
      status: 'accepted',
      context: `Building complete SaaS applications requires diverse skills:
- Frontend development (React, Next.js)
- Backend API design
- Database schema design
- UI/UX design
- Security review
- Performance optimization
- Content writing

A single AI model struggles to excel at all these domains simultaneously.`,
      decision: `Implement 13 specialized agents, each focused on a specific domain:

1. Intake Agent - Requirement parsing
2. Architect Agent - System design
3. Frontend Agent - React/Next.js code
4. Backend Agent - API endpoints
5. Database Agent - Schema design
6. Design Agent - UI/UX patterns
7. Refinement Agent - Code improvements
8. Validator Agent - Quality checks
9. Security Agent - Vulnerability scanning
10. Performance Agent - Optimization
11. Content Agent - Copy and text
12. Integration Agent - Third-party services
13. Oracle Agent - Complex decisions

An Executor orchestrates these agents based on task requirements.`,
      consequences: {
        positive: [
          'Each agent optimized for its domain',
          'Parallel execution possible',
          'Easier to improve individual capabilities',
          'Clear separation of concerns',
        ],
        negative: [
          'Coordination complexity',
          'More prompts to maintain',
          'Potential for agent conflicts',
          'Higher total token usage',
        ],
      },
      alternatives: [
        {
          name: 'Single Monolithic AI',
          reason: 'Quality degrades when one model handles everything. Jack of all trades, master of none.',
        },
        {
          name: 'Two-Agent (Planner/Executor)',
          reason: 'Too coarse-grained. Misses domain-specific optimizations.',
        },
        {
          name: 'Human-in-the-Loop',
          reason: 'Defeats the purpose of automated building. Reserved only for critical decisions.',
        },
      ],
    },
    {
      title: 'Quality Gate with Automatic Retry',
      status: 'accepted',
      context: `AI-generated code quality varies significantly. Without quality control:
- Syntax errors may ship to users
- Security vulnerabilities go undetected
- Code may not match user requirements
- Performance issues accumulate

Need systematic quality assurance without manual review for every build.`,
      decision: `Implement a multi-layer quality gate:

1. **Syntax Validation** - Parse code, check for errors
2. **Import Validation** - Verify all imports are real packages
3. **Security Scan** - Check for common vulnerabilities
4. **Relevance Check** - Ensure output matches request
5. **Quality Score** - Overall code quality metrics

If score < threshold:
- First retry: Same agent with feedback
- Second retry: Escalate to Oracle agent
- Third failure: Return partial result with warnings`,
      consequences: {
        positive: [
          'Consistent output quality',
          'Automatic error recovery',
          'No hallucinated packages',
          'Security issues caught early',
        ],
        negative: [
          'Increased build time',
          'Additional token usage for retries',
          'May reject valid but unusual code',
          'Threshold tuning required',
        ],
      },
      alternatives: [
        {
          name: 'Accept All Output',
          reason: 'Unacceptable quality variance. Users would encounter broken code frequently.',
        },
        {
          name: 'Human Review Queue',
          reason: 'Does not scale. Would create bottleneck and defeat automation purpose.',
        },
        {
          name: 'Strict Rejection',
          reason: 'Too many false positives. Would frustrate users with rejected builds.',
        },
      ],
    },
  ];

  // Create ADR directory
  const adrDir = path.join(rootDir, 'docs', 'adr');
  if (!fs.existsSync(adrDir)) {
    fs.mkdirSync(adrDir, { recursive: true });
  }

  // Generate each ADR
  for (let i = 0; i < decisions.length; i++) {
    const decision = decisions[i];
    const adrContent = formatADR(decision, i + 1);
    const slug = decision.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const filename = `ADR-${String(i + 1).padStart(3, '0')}-${slug}.md`;

    fs.writeFileSync(path.join(adrDir, filename), adrContent);
    console.log(`  Generated ADR-${String(i + 1).padStart(3, '0')}: ${decision.title}`);
  }

  // Generate index
  const index = `# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for OLYMPUS.

## Index

${decisions.map((d, i) => {
  const slug = d.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `- [ADR-${String(i + 1).padStart(3, '0')}: ${d.title}](ADR-${String(i + 1).padStart(3, '0')}-${slug}.md) - ${d.status}`;
}).join('\n')}

## About ADRs

Architecture Decision Records capture important architectural decisions made during development.

Each ADR documents:
- **Context**: Why the decision was needed
- **Decision**: What was decided
- **Consequences**: Positive and negative outcomes
- **Alternatives**: What else was considered

## Statuses

- **Proposed**: Under discussion
- **Accepted**: Approved and implemented
- **Deprecated**: No longer applies
- **Superseded**: Replaced by another ADR

## Contributing

When making significant architectural decisions:
1. Create a new ADR using the template
2. Number it sequentially
3. Add to the index
4. Get team review before implementation

## Template

\`\`\`markdown
# ADR-XXX: Title

## Status
Proposed/Accepted/Deprecated/Superseded

## Context
Why is this decision needed?

## Decision
What was decided?

## Consequences
### Positive
- Good outcomes

### Negative
- Tradeoffs

## Alternatives Considered
### Alternative 1
Why rejected?
\`\`\`

---

*Generated on ${new Date().toISOString().split('T')[0]}*
`;

  fs.writeFileSync(path.join(adrDir, 'README.md'), index);

  console.log(`\nGenerated ${decisions.length} ADRs in docs/adr/`);
}

// Main execution
async function main(): Promise<void> {
  try {
    const rootDir = process.cwd();
    generateADRs(rootDir);
  } catch (error) {
    console.error('Error generating ADRs:', error);
    process.exit(1);
  }
}

main();
