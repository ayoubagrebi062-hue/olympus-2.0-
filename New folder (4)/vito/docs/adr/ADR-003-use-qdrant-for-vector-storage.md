# ADR-003: Use Qdrant for Vector Storage

## Status

**Accepted**

Date: 2026-01-12

## Context

OLYMPUS uses embeddings for:
- Semantic search of user queries
- Finding similar components and patterns
- RAG context retrieval
- Style and preference matching

Need a dedicated vector database that can handle high-dimensional embeddings
with fast similarity search.

## Decision

Use Qdrant as the vector database for all embedding storage and retrieval.
Embeddings are generated using local models (via Ollama) and stored in Qdrant collections
organized by type (components, styles, user queries).

## Consequences

### Positive

- Optimized for vector similarity search
- Supports filtering alongside vector search
- Good performance on consumer hardware
- REST API and gRPC support

### Negative

- Another service to manage
- Less mature than some alternatives
- Limited aggregate operations

## Alternatives Considered

### Pinecone

Cloud-only and costs scale with usage. Want local-first architecture.

### pgvector in PostgreSQL

Good for simpler use cases but Qdrant offers better performance for our scale.

### Weaviate

More complex setup. Qdrant has simpler API for our needs.

---

*This ADR was generated as part of OLYMPUS documentation.*
