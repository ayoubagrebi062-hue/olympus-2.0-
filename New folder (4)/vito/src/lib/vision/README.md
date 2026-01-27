# Vision

AI code generation. Production-grade.

## Quick Start

```typescript
import { vision } from './lib/vision';

const code = await vision("Create a login form");
```

## Streaming

```typescript
import { visionStream } from './lib/vision';

for await (const chunk of visionStream("Create a dashboard")) {
  process.stdout.write(chunk.text || '');
}
```

## Full Control

```typescript
import { VisionOrchestratorV2 } from './lib/vision/orchestrator-v2';
import { isOk } from './lib/vision/core';

const orch = new VisionOrchestratorV2();

const result = await orch.generate({
  prompt: "Create a checkout form",
  options: { generateImages: true }
});

if (isOk(result)) {
  console.log(result.value.code);
}
```

## Error Handling

```typescript
// Simple mode throws
try {
  await vision("...");
} catch (e) {
  console.error(e.message); // Includes fix suggestion
}

// Advanced mode returns Result<T, E>
const result = await orch.generate({ prompt });
if (!result.ok) {
  const { code, message, retryable, retryAfterMs } = result.error;
}
```

## Environment

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Limits

| Limit | Value |
|-------|-------|
| Timeout | 2 min |
| Prompt | 10K chars |
| Rate | 20 req burst, 2/sec sustained |

## Architecture

```
vision(prompt)
    ↓
Rate Limit → Validate → Dedup → Circuit Breaker → Generate
    ↓
Result<code, error>
```

See [ADR.md](./ADR.md) for design decisions.
