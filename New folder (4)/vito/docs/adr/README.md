# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for OLYMPUS.

## Index

- [ADR-001: Use Ollama for Local AI Inference](ADR-001-use-ollama-for-local-ai-inference.md) - accepted
- [ADR-002: Use Neo4j for Knowledge Graph](ADR-002-use-neo4j-for-knowledge-graph.md) - accepted
- [ADR-003: Use Qdrant for Vector Storage](ADR-003-use-qdrant-for-vector-storage.md) - accepted
- [ADR-004: Multi-Agent Architecture with 13 Specialists](ADR-004-multi-agent-architecture-with-13-specialists.md) - accepted
- [ADR-005: Quality Gate with Automatic Retry](ADR-005-quality-gate-with-automatic-retry.md) - accepted

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

```markdown
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
```

---

*Generated on 2026-01-12*
