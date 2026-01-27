# ADR-001: Use Ollama for Local AI Inference

## Status

**Accepted**

Date: 2026-01-12

## Context

OLYMPUS requires AI inference for 13 specialized agents. Using cloud APIs exclusively
(OpenAI, Anthropic) costs approximately $0.002-0.03 per 1K tokens. At scale with thousands
of builds, this becomes expensive and introduces latency for every API call.

We need a solution that:
- Reduces operational costs
- Provides low-latency inference for simple tasks
- Maintains quality for complex reasoning

## Decision

Use Ollama with DeepSeek-R1 and Llama 3.1 for local inference to handle 80% of
agent tasks. Reserve cloud APIs (Groq, Anthropic) for complex reasoning and oracle consultations.

Local models handle: code generation, validation, simple refinements
Cloud models handle: architecture decisions, complex debugging, quality assessment

## Consequences

### Positive

- Reduced API costs by ~60-80%
- Sub-100ms latency for local inference
- No rate limiting on local models
- Works offline for development

### Negative

- Requires GPU hardware for optimal performance
- Model quality varies compared to cloud
- Need to manage model updates locally
- Initial setup complexity for users

## Alternatives Considered

### Full Cloud (OpenAI/Anthropic)

Rejected due to cost concerns at scale. Would cost $500+/month at moderate usage.

### Self-hosted vLLM

More complex to set up and maintain. Ollama provides simpler developer experience.

### AWS Bedrock

Added cloud dependency and costs. Ollama keeps inference local and free.

---

*This ADR was generated as part of OLYMPUS documentation.*
