# ADR-002: Use Neo4j for Knowledge Graph

## Status

**Accepted**

Date: 2026-01-12

## Context

OLYMPUS needs to store and query complex relationships between:
- User preferences and style choices
- Generated components and their dependencies
- Build history and evolution
- Concept relationships for RAG

Traditional relational databases struggle with deep relationship queries.
We need a graph database optimized for traversal.

## Decision

Use Neo4j as the primary graph database for storing and querying relationships.
The knowledge graph powers GraphRAG, enabling context-aware code generation based on
user history, preferences, and component relationships.

## Consequences

### Positive

- Natural representation of relationships
- Efficient multi-hop queries
- Cypher query language is intuitive
- Strong community and tooling

### Negative

- Additional database to manage
- Learning curve for Cypher
- Not ideal for simple key-value lookups
- Memory-intensive for large graphs

## Alternatives Considered

### PostgreSQL with recursive CTEs

Performance degrades significantly beyond 3-4 levels of relationship depth.

### MongoDB with $graphLookup

Limited to single collection traversal. Not a true graph database.

### AWS Neptune

Cloud-only solution. Want to support local development without AWS dependency.

---

*This ADR was generated as part of OLYMPUS documentation.*
