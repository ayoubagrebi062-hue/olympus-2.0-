/**
 * OLYMPUS 2.0 - Response Parser
 */

import type { AgentOutput, Artifact, Decision, AgentError, AgentId, AgentStatus } from '../types';

/** Parse agent response into structured output */
export function parseAgentResponse(agentId: AgentId, rawContent: string, duration: number, tokensUsed: number): AgentOutput {
  const artifacts: Artifact[] = [];
  const decisions: Decision[] = [];
  const errors: AgentError[] = [];

  // DEBUG: Log at start of parsing
  console.log(`[Parser] ===== PARSING ${agentId} =====`);
  console.log(`[Parser] Raw content length: ${rawContent?.length || 0}`);
  console.log(`[Parser] Raw content start: ${rawContent?.slice(0, 200)}...`);

  try {
    // Extract JSON from response (may be wrapped in markdown)
    const jsonContent = extractJSON(rawContent);
    console.log(`[Parser] Extracted JSON length: ${jsonContent?.length || 0}`);
    console.log(`[Parser] Extracted JSON start: ${jsonContent?.slice(0, 200)}...`);

    const parsed = JSON.parse(jsonContent);
    console.log(`[Parser] JSON.parse SUCCESS for ${agentId}`);

    // DEBUG: Log what we found
    console.log(`[Parser] Agent ${agentId}: parsed.files exists = ${!!parsed.files}, isArray = ${Array.isArray(parsed.files)}, length = ${parsed.files?.length || 0}`);

    // Extract files as artifacts
    if (parsed.files && Array.isArray(parsed.files)) {
      console.log(`[Parser] Agent ${agentId}: Processing ${parsed.files.length} files`);
      for (const file of parsed.files) {
        const artifactType = getArtifactType(file.path || file.type);
        const hasContent = !!file.content;
        console.log(`[Parser] File: ${file.path}, type=${artifactType}, hasContent=${hasContent}, contentLength=${file.content?.length || 0}`);
        artifacts.push({
          id: `${agentId}-file-${artifacts.length}`,
          type: artifactType,
          path: file.path,
          content: file.content,
          metadata: { ...file, content: undefined },
        });
      }
      console.log(`[Parser] Agent ${agentId}: Added ${parsed.files.length} file artifacts`);
    }

    // Extract other artifact types
    const artifactKeys = ['components', 'templates', 'schemas', 'migrations', 'jobs', 'workflows'];
    for (const key of artifactKeys) {
      if (parsed[key] && Array.isArray(parsed[key])) {
        for (const item of parsed[key]) {
          artifacts.push({
            id: `${agentId}-${key}-${artifacts.length}`,
            type: mapKeyToArtifactType(key),
            content: JSON.stringify(item, null, 2),
            metadata: item,
          });
        }
      }
    }

    // Extract decisions from various fields
    const decisionFields = ['tech_stack', 'architecture', 'business_model', 'mvp_features'];
    for (const field of decisionFields) {
      if (parsed[field]) {
        decisions.push({
          id: `${agentId}-decision-${field}`,
          type: field,
          choice: summarizeDecision(parsed[field]),
          reasoning: parsed[field].reasoning || '',
          alternatives: parsed[field].alternatives || [],
          confidence: parsed[field].confidence || 0.8,
        });
      }
    }

    // Store full parsed output as document artifact
    artifacts.push({
      id: `${agentId}-output`,
      type: 'document',
      content: JSON.stringify(parsed, null, 2),
      metadata: { raw: false },
    });

    return {
      agentId,
      status: 'completed',
      artifacts,
      decisions,
      metrics: { inputTokens: 0, outputTokens: tokensUsed, promptCount: 1, retries: 0, cacheHits: 0 },
      duration,
      tokensUsed,
    };
  } catch (e) {
    // DEBUG: Log parse failure details
    console.error(`[Parser] ===== PARSE FAILED for ${agentId} =====`);
    console.error(`[Parser] Error: ${(e as Error).message}`);
    console.error(`[Parser] Raw content first 500 chars: ${rawContent?.substring(0, 500)}`);

    // Failed to parse - store raw output
    errors.push({
      code: 'PARSE_ERROR',
      message: `Failed to parse agent output: ${(e as Error).message}`,
      recoverable: true,
      context: { raw: rawContent.substring(0, 500) },
    });

    artifacts.push({
      id: `${agentId}-raw`,
      type: 'document',
      content: rawContent,
      metadata: { raw: true, parseError: (e as Error).message },
    });

    return {
      agentId,
      status: 'completed',
      artifacts,
      decisions,
      metrics: { inputTokens: 0, outputTokens: tokensUsed, promptCount: 1, retries: 0, cacheHits: 0 },
      errors,
      duration,
      tokensUsed,
    };
  }
}

/** Extract JSON from potentially markdown-wrapped content */
function extractJSON(content: string): string {
  // DEBUG: Log raw content end to detect truncation
  console.log(`[Parser] Raw content LAST 200 chars: ...${content?.slice(-200)}`);

  // Try to find JSON in code blocks
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    console.log(`[Parser] Found code block, extracted length: ${codeBlockMatch[1].length}`);
    return sanitizeJSONString(codeBlockMatch[1].trim());
  }

  // Try to find raw JSON object/array
  const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    console.log(`[Parser] Found raw JSON via regex, extracted length: ${jsonMatch[1].length}`);
    console.log(`[Parser] Extracted JSON LAST 200 chars: ...${jsonMatch[1].slice(-200)}`);
    return sanitizeJSONString(jsonMatch[1]);
  }

  console.log(`[Parser] No JSON pattern found, using raw content`);
  return sanitizeJSONString(content);
}

/**
 * Sanitize JSON string to fix common LLM issues:
 * - Unescaped newlines inside string values
 * - Unescaped tabs and other control characters
 * - Unescaped quotes inside string values (from code)
 *
 * This fixes JSON parsing errors from LLM-generated content.
 */
function sanitizeJSONString(json: string): string {
  // Track if we're inside a string
  let result = '';
  let inString = false;
  let escapeNext = false;

  // Characters that are valid immediately after a closing quote in JSON
  const validAfterQuote = new Set([',', '}', ']', ':', ' ', '\n', '\r', '\t']);

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (escapeNext) {
      // Previous char was backslash, this char is escaped
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      if (!inString) {
        // Starting a string
        inString = true;
        result += char;
      } else {
        // Potentially ending a string OR an unescaped quote in the middle
        // Look ahead to determine which case
        const nextChar = json[i + 1];
        const nextNonWhitespace = findNextNonWhitespace(json, i + 1);

        // If next non-whitespace is valid after closing quote, this is a real close
        if (!nextChar || validAfterQuote.has(nextNonWhitespace)) {
          inString = false;
          result += char;
        } else {
          // This is an unescaped quote inside a string - escape it
          result += '\\"';
        }
      }
      continue;
    }

    if (inString) {
      // Inside a string - escape control characters
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else if (char.charCodeAt(0) < 32) {
        // Other control characters - escape as unicode
        result += '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }

  return result;
}

/** Find the next non-whitespace character in a string */
function findNextNonWhitespace(str: string, startIndex: number): string {
  for (let i = startIndex; i < str.length; i++) {
    const char = str[i];
    if (char !== ' ' && char !== '\n' && char !== '\r' && char !== '\t') {
      return char;
    }
  }
  return '';
}

/** Get artifact type from file path */
function getArtifactType(path: string): Artifact['type'] {
  if (!path) return 'document';
  if (path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.js')) return 'code';
  if (path.endsWith('.sql')) return 'schema';
  if (path.endsWith('.json') || path.endsWith('.yaml') || path.endsWith('.yml')) return 'config';
  if (path.endsWith('.test.ts') || path.endsWith('.spec.ts')) return 'test';
  if (path.endsWith('.md')) return 'document';
  return 'code';
}

/** Map key to artifact type */
function mapKeyToArtifactType(key: string): Artifact['type'] {
  const map: Record<string, Artifact['type']> = {
    components: 'code', templates: 'code', schemas: 'schema',
    migrations: 'schema', jobs: 'config', workflows: 'config',
  };
  return map[key] || 'document';
}

/** Summarize a decision object */
function summarizeDecision(obj: unknown): string {
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object' && obj !== null) {
    const o = obj as Record<string, unknown>;
    return (o.name || o.choice || o.selected || JSON.stringify(obj).substring(0, 100)) as string;
  }
  return String(obj);
}
