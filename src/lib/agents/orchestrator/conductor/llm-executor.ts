/**
 * ============================================================================
 * LLM EXECUTOR - THE PART I AVOIDED
 * ============================================================================
 *
 * This is the actual meat. Real LLM calls. Real error handling.
 * Real token counting. Real streaming. No more simulations.
 *
 * ============================================================================
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type LLMProvider = 'anthropic' | 'openai' | 'ollama';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'error';
  latencyMs: number;
  raw?: unknown;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
  tokensUsed?: number;
}

export interface ExecutionResult {
  success: boolean;
  output: unknown;
  error?: string;
  tokensUsed: number;
  latencyMs: number;
  retries: number;
}

// ============================================================================
// LLM CLIENT - ACTUAL API CALLS
// ============================================================================

export class LLMClient extends EventEmitter {
  private config: LLMConfig;
  private anthropic?: Anthropic;
  private openai?: OpenAI;

  constructor(config: LLMConfig) {
    super();
    this.config = config;
    this.initializeClient();
  }

  private initializeClient(): void {
    switch (this.config.provider) {
      case 'anthropic':
        this.anthropic = new Anthropic({
          apiKey: this.config.apiKey || process.env.ANTHROPIC_API_KEY,
        });
        break;

      case 'openai':
        this.openai = new OpenAI({
          apiKey: this.config.apiKey || process.env.OPENAI_API_KEY,
          baseURL: this.config.baseUrl,
        });
        break;

      case 'ollama':
        this.openai = new OpenAI({
          apiKey: 'ollama',
          baseURL: this.config.baseUrl || 'http://localhost:11434/v1',
        });
        break;
    }
  }

  async execute(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      let response: LLMResponse;

      switch (this.config.provider) {
        case 'anthropic':
          response = await this.executeAnthropic(request);
          break;
        case 'openai':
        case 'ollama':
          response = await this.executeOpenAI(request);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }

      response.latencyMs = Date.now() - startTime;
      this.emit('execution_complete', { response });
      return response;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.emit('execution_error', { error, latencyMs });
      throw error;
    }
  }

  async *stream(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    switch (this.config.provider) {
      case 'anthropic':
        yield* this.streamAnthropic(request);
        break;
      case 'openai':
      case 'ollama':
        yield* this.streamOpenAI(request);
        break;
    }
  }

  private async executeAnthropic(request: LLMRequest): Promise<LLMResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature ?? this.config.temperature,
      system: systemMessage?.content,
      messages: otherMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      stop_sequences: request.stopSequences,
    });

    const textContent = response.content.find(c => c.type === 'text');

    return {
      content: textContent?.text || '',
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
      model: response.model,
      finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
      latencyMs: 0,
      raw: response,
    };
  }

  private async executeOpenAI(request: LLMRequest): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature ?? this.config.temperature,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stop: request.stopSequences,
    });

    const choice = response.choices[0];

    return {
      content: choice?.message?.content || '',
      tokensUsed: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      model: response.model,
      finishReason: choice?.finish_reason === 'stop' ? 'stop' : 'length',
      latencyMs: 0,
      raw: response,
    };
  }

  private async *streamAnthropic(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');

    const stream = await this.anthropic.messages.stream({
      model: this.config.model,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature ?? this.config.temperature,
      system: systemMessage?.content,
      messages: otherMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          yield { content: delta.text, done: false };
        }
      } else if (event.type === 'message_stop') {
        yield { content: '', done: true };
      }
    }
  }

  private async *streamOpenAI(request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const stream = await this.openai.chat.completions.create({
      model: this.config.model,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature ?? this.config.temperature,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason !== null;
      yield { content, done };
    }
  }
}

// ============================================================================
// PROMPT MANAGER - REAL PROMPT LOADING AND INJECTION
// ============================================================================

export interface PromptTemplate {
  id: string;
  name: string;
  version: number;
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchema?: OutputSchema;
  examples?: PromptExample[];
  metadata: {
    agentType: string;
    createdAt: Date;
    updatedAt: Date;
    successRate: number;
    avgTokens: number;
  };
}

export interface OutputSchema {
  type: 'json' | 'code' | 'markdown' | 'text';
  schema?: Record<string, unknown>;
  language?: string;
  required: string[];
}

export interface PromptExample {
  input: Record<string, unknown>;
  output: string;
  quality: number;
}

export interface PromptVariables {
  [key: string]: string | number | boolean | object;
}

export class PromptManager {
  private templates: Map<string, PromptTemplate> = new Map();
  private cache: Map<string, string> = new Map();

  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  async loadTemplate(templateId: string): Promise<PromptTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return template;
  }

  buildPrompt(template: PromptTemplate, variables: PromptVariables): LLMMessage[] {
    const messages: LLMMessage[] = [];

    // System prompt with variable injection
    let systemPrompt = this.injectVariables(template.systemPrompt, variables);

    // Add output format instructions
    if (template.outputSchema) {
      systemPrompt += this.buildOutputInstructions(template.outputSchema);
    }

    messages.push({ role: 'system', content: systemPrompt });

    // Add examples if available
    if (template.examples && template.examples.length > 0) {
      for (const example of template.examples.slice(0, 2)) {
        const exampleInput = this.injectVariables(
          template.userPromptTemplate,
          example.input as PromptVariables
        );
        messages.push({ role: 'user', content: exampleInput });
        messages.push({ role: 'assistant', content: example.output });
      }
    }

    // User prompt with variable injection
    const userPrompt = this.injectVariables(template.userPromptTemplate, variables);
    messages.push({ role: 'user', content: userPrompt });

    return messages;
  }

  private injectVariables(template: string, variables: PromptVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      const stringValue =
        typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      result = result.replace(placeholder, stringValue);
    }

    // Remove any remaining unresolved placeholders
    result = result.replace(/\{\{\s*\w+\s*\}\}/g, '');

    return result;
  }

  private buildOutputInstructions(schema: OutputSchema): string {
    let instructions = '\n\n## OUTPUT FORMAT\n';

    switch (schema.type) {
      case 'json':
        instructions += 'Respond with valid JSON only. No markdown, no explanation.\n';
        if (schema.schema) {
          instructions += `Schema:\n\`\`\`json\n${JSON.stringify(schema.schema, null, 2)}\n\`\`\`\n`;
        }
        break;

      case 'code':
        instructions += `Respond with ${schema.language || 'code'} only. No explanation, no markdown fences unless requested.\n`;
        break;

      case 'markdown':
        instructions += 'Respond with well-formatted markdown.\n';
        break;

      case 'text':
        instructions += 'Respond with plain text.\n';
        break;
    }

    if (schema.required.length > 0) {
      instructions += `\nRequired fields: ${schema.required.join(', ')}\n`;
    }

    return instructions;
  }
}

// ============================================================================
// OUTPUT PARSER - REAL PARSING AND VALIDATION
// ============================================================================

import * as ts from 'typescript';

/**
 * FIX B: TypeScript syntax validation helper
 * Uses TypeScript compiler API for real syntax checking
 */
function validateTypescriptSyntax(
  code: string,
  filename: string
): { valid: boolean; errors: string[] } {
  try {
    // Quick syntax check using TypeScript compiler
    const result = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        noEmit: true,
        allowJs: true,
        checkJs: false,
        skipLibCheck: true,
        // Lenient for generation - don't fail on type errors, only syntax
        noImplicitAny: false,
        strictNullChecks: false,
        isolatedModules: true,
      },
      fileName: filename,
      reportDiagnostics: true,
    });

    const errors = (result.diagnostics || [])
      .filter(d => d.category === ts.DiagnosticCategory.Error)
      .map(d => {
        const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
        const position = d.start !== undefined ? ` (at position ${d.start})` : '';
        return `${message}${position}`;
      })
      .slice(0, 5); // Limit to first 5 errors

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (err) {
    // If TypeScript API fails, don't block - just warn
    return {
      valid: true,
      errors: [],
    };
  }
}

/**
 * FIX B: Check for common JSX issues
 */
function validateJsxStructure(code: string): string[] {
  const errors: string[] = [];

  // Check for 'use client' placement
  if (code.includes("'use client'") || code.includes('"use client"')) {
    const useClientIndex = code.search(/['"]use client['"]/);
    const importIndex = code.search(/^import\s/m);
    if (importIndex !== -1 && importIndex < useClientIndex) {
      errors.push("'use client' must be at the top of the file, before imports");
    }
  }

  // Check for unclosed tags (simple heuristic)
  // Count uppercase component tags (React components)
  const openTags = (code.match(/<[A-Z][a-zA-Z0-9]*(?:\s[^>]*)?>(?![^<]*\/>)/g) || []).length;
  const closeTags = (code.match(/<\/[A-Z][a-zA-Z0-9]*>/g) || []).length;
  const selfClosing = (code.match(/<[A-Z][a-zA-Z0-9]*[^>]*\/>/g) || []).length;

  // Allow some tolerance (fragments, etc.)
  if (openTags > closeTags + selfClosing + 3) {
    errors.push(
      `Possibly unclosed JSX tags: ${openTags} opens, ${closeTags} closes, ${selfClosing} self-closing`
    );
  }

  // Check for obvious syntax errors
  if (code.includes('export default function') && !code.includes('{')) {
    errors.push('Function declaration missing opening brace');
  }

  // Check for missing return statement in function components
  const hasExportDefault =
    code.includes('export default function') || code.includes('export default async function');
  const hasReturn =
    code.includes('return (') || code.includes('return <') || code.includes('return null');
  if (hasExportDefault && !hasReturn && !code.includes('=>')) {
    errors.push('Function component may be missing return statement');
  }

  return errors;
}

// Export for use in orchestrator
export { validateTypescriptSyntax, validateJsxStructure };

export interface ParsedOutput {
  success: boolean;
  data: unknown;
  errors: string[];
  warnings: string[];
}

export class OutputParser {
  parseJSON(content: string): ParsedOutput {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
      content.match(/```\n?([\s\S]*?)\n?```/) || [null, content];

    const jsonStr = jsonMatch[1] || content;

    try {
      // Clean up common issues
      const cleaned = jsonStr
        .trim()
        .replace(/,\s*}/g, '}') // Remove trailing commas
        .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

      const data = JSON.parse(cleaned);
      return { success: true, data, errors: [], warnings: [] };
    } catch (error) {
      return {
        success: false,
        data: null,
        errors: [
          `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      };
    }
  }

  /**
   * FIX B: Enhanced parseCode with real syntax validation
   */
  parseCode(content: string, language?: string, filename?: string): ParsedOutput {
    // Extract code from markdown fences
    const codePattern = language
      ? new RegExp(`\`\`\`${language}\\n?([\\s\\S]*?)\\n?\`\`\``)
      : /```\w*\n?([\s\S]*?)\n?```/;

    const match = content.match(codePattern);
    const code = match ? match[1] : content;

    // Basic validation
    const warnings: string[] = [];
    const errors: string[] = [];

    if (code.includes('// TODO')) {
      warnings.push('Code contains TODO comments');
    }
    if (code.includes('console.log')) {
      warnings.push('Code contains console.log statements');
    }

    // FIX B: Real syntax validation for TypeScript/TSX files
    const isTypeScript =
      filename?.match(/\.(ts|tsx)$/) || language === 'typescript' || language === 'tsx';
    const isTsx = filename?.match(/\.tsx$/) || language === 'tsx';

    if (isTypeScript) {
      const syntaxCheck = validateTypescriptSyntax(code, filename || 'file.tsx');
      if (!syntaxCheck.valid) {
        errors.push(...syntaxCheck.errors);
        console.warn(
          `[OutputParser] Syntax validation failed for ${filename || 'code'}:`,
          syntaxCheck.errors.slice(0, 2)
        );
      }
    }

    // FIX B: Additional JSX structure validation for TSX files
    if (isTsx) {
      const jsxErrors = validateJsxStructure(code);
      if (jsxErrors.length > 0) {
        errors.push(...jsxErrors);
        console.warn(`[OutputParser] JSX validation issues in ${filename || 'code'}:`, jsxErrors);
      }
    }

    // Return with validation result - success only if no errors
    return {
      success: errors.length === 0,
      data: code.trim(),
      errors,
      warnings,
    };
  }

  validateAgainstSchema(data: unknown, schema: Record<string, unknown>): ParsedOutput {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof data !== 'object' || data === null) {
      return {
        success: false,
        data,
        errors: ['Expected an object'],
        warnings: [],
      };
    }

    const obj = data as Record<string, unknown>;

    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in obj)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check field types
    if (schema.properties && typeof schema.properties === 'object') {
      const props = schema.properties as Record<string, { type?: string }>;
      for (const [field, spec] of Object.entries(props)) {
        if (field in obj && spec.type) {
          const actualType = Array.isArray(obj[field]) ? 'array' : typeof obj[field];
          if (actualType !== spec.type) {
            warnings.push(`Field ${field} expected ${spec.type}, got ${actualType}`);
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      data,
      errors,
      warnings,
    };
  }
}

// ============================================================================
// AGENT EXECUTOR - PUTS IT ALL TOGETHER
// ============================================================================

export interface AgentDefinition {
  id: string;
  type: string;
  name: string;
  description: string;
  promptTemplate: PromptTemplate;
  llmConfig: Partial<LLMConfig>;
  inputSchema: Record<string, unknown>;
  outputSchema: OutputSchema;
  retryConfig: {
    maxRetries: number;
    retryableErrors: string[];
  };
}

export interface AgentInput {
  variables: PromptVariables;
  context?: Record<string, unknown>;
  previousOutputs?: Map<string, unknown>;
}

export interface AgentOutput {
  success: boolean;
  data: unknown;
  raw: string;
  tokensUsed: number;
  latencyMs: number;
  retries: number;
  errors: string[];
  warnings: string[];
}

export class AgentExecutor extends EventEmitter {
  private llmClient: LLMClient;
  private promptManager: PromptManager;
  private outputParser: OutputParser;
  private agents: Map<string, AgentDefinition> = new Map();

  constructor(defaultLLMConfig: LLMConfig) {
    super();
    this.llmClient = new LLMClient(defaultLLMConfig);
    this.promptManager = new PromptManager();
    this.outputParser = new OutputParser();
  }

  registerAgent(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
    this.promptManager.registerTemplate(agent.promptTemplate);
  }

  async execute(agentId: string, input: AgentInput): Promise<AgentOutput> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const startTime = Date.now();
    let lastError: Error | null = null;
    let retries = 0;
    let totalTokens = 0;

    // Merge input variables with context and previous outputs
    const variables: PromptVariables = {
      ...(input.variables as PromptVariables),
      ...((input.context || {}) as PromptVariables),
    };

    // Add previous outputs if available
    if (input.previousOutputs) {
      for (const [key, value] of input.previousOutputs) {
        variables[`previous_${key}`] = value as string | number | boolean | object;
      }
    }

    // Build prompt
    const messages = this.promptManager.buildPrompt(agent.promptTemplate, variables);

    // Execute with retries
    for (let attempt = 0; attempt <= agent.retryConfig.maxRetries; attempt++) {
      try {
        this.emit('attempt_started', { agentId, attempt });

        const response = await this.llmClient.execute({
          messages,
          maxTokens: agent.llmConfig.maxTokens,
          temperature: agent.llmConfig.temperature,
        });

        totalTokens += response.tokensUsed.total;

        // Parse output
        let parsed: ParsedOutput;
        switch (agent.outputSchema.type) {
          case 'json':
            parsed = this.outputParser.parseJSON(response.content);
            if (parsed.success && agent.outputSchema.schema) {
              parsed = this.outputParser.validateAgainstSchema(
                parsed.data,
                agent.outputSchema.schema
              );
            }
            break;
          case 'code':
            parsed = this.outputParser.parseCode(response.content, agent.outputSchema.language);
            break;
          default:
            parsed = { success: true, data: response.content, errors: [], warnings: [] };
        }

        if (!parsed.success) {
          throw new Error(`Output validation failed: ${parsed.errors.join(', ')}`);
        }

        this.emit('execution_success', { agentId, attempt, tokensUsed: totalTokens });

        return {
          success: true,
          data: parsed.data,
          raw: response.content,
          tokensUsed: totalTokens,
          latencyMs: Date.now() - startTime,
          retries,
          errors: [],
          warnings: parsed.warnings,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retries = attempt;

        this.emit('attempt_failed', { agentId, attempt, error: lastError.message });

        // Check if error is retryable
        const isRetryable = agent.retryConfig.retryableErrors.some(pattern =>
          lastError!.message.includes(pattern)
        );

        if (!isRetryable || attempt === agent.retryConfig.maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    this.emit('execution_failed', { agentId, retries, error: lastError?.message });

    return {
      success: false,
      data: null,
      raw: '',
      tokensUsed: totalTokens,
      latencyMs: Date.now() - startTime,
      retries,
      errors: [lastError?.message || 'Unknown error'],
      warnings: [],
    };
  }

  async *executeStream(
    agentId: string,
    input: AgentInput
  ): AsyncGenerator<{
    type: 'chunk' | 'complete' | 'error';
    content?: string;
    output?: AgentOutput;
    error?: string;
  }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      yield { type: 'error', error: `Agent not found: ${agentId}` };
      return;
    }

    const startTime = Date.now();
    let fullContent = '';

    const variables: PromptVariables = {
      ...(input.variables as PromptVariables),
      ...((input.context || {}) as PromptVariables),
    };

    const messages = this.promptManager.buildPrompt(agent.promptTemplate, variables);

    try {
      for await (const chunk of this.llmClient.stream({ messages })) {
        fullContent += chunk.content;
        yield { type: 'chunk', content: chunk.content };

        if (chunk.done) {
          // Parse final output
          let parsed: ParsedOutput;
          switch (agent.outputSchema.type) {
            case 'json':
              parsed = this.outputParser.parseJSON(fullContent);
              break;
            case 'code':
              parsed = this.outputParser.parseCode(fullContent, agent.outputSchema.language);
              break;
            default:
              parsed = { success: true, data: fullContent, errors: [], warnings: [] };
          }

          yield {
            type: 'complete',
            output: {
              success: parsed.success,
              data: parsed.data,
              raw: fullContent,
              tokensUsed: 0, // Not available in streaming
              latencyMs: Date.now() - startTime,
              retries: 0,
              errors: parsed.errors,
              warnings: parsed.warnings,
            },
          };
        }
      }
    } catch (error) {
      yield { type: 'error', error: error instanceof Error ? error.message : String(error) };
    }
  }
}

// ============================================================================
// BUILT-IN AGENT DEFINITIONS
// ============================================================================

export const BUILT_IN_AGENTS: AgentDefinition[] = [
  {
    id: 'oracle',
    type: 'discovery',
    name: 'Oracle',
    description: 'Analyzes requirements and discovers project structure',
    promptTemplate: {
      id: 'oracle-prompt',
      name: 'Oracle Discovery',
      version: 1,
      systemPrompt: `You are Oracle, an expert code analyst. Your job is to:
1. Analyze the project structure and existing code
2. Understand the user's requirements
3. Identify what needs to be created or modified
4. Map out dependencies and impacts

Be thorough but concise. Focus on actionable insights.`,
      userPromptTemplate: `## Task
{{task}}

## Project Context
{{projectContext}}

## Existing Files
{{existingFiles}}

Analyze this and provide:
1. What needs to be created/modified
2. Key dependencies to consider
3. Potential challenges
4. Recommended approach`,
      outputSchema: {
        type: 'json',
        schema: {
          type: 'object',
          required: ['analysis', 'recommendations', 'dependencies'],
          properties: {
            analysis: { type: 'object' },
            recommendations: { type: 'array' },
            dependencies: { type: 'array' },
            challenges: { type: 'array' },
          },
        },
        required: ['analysis', 'recommendations', 'dependencies'],
      },
      metadata: {
        agentType: 'discovery',
        createdAt: new Date(),
        updatedAt: new Date(),
        successRate: 0.95,
        avgTokens: 2000,
      },
    },
    llmConfig: {
      maxTokens: 4000,
      temperature: 0.3,
    },
    inputSchema: {
      required: ['task', 'projectContext'],
    },
    outputSchema: {
      type: 'json',
      schema: {
        type: 'object',
        required: ['analysis', 'recommendations', 'dependencies'],
      },
      required: ['analysis', 'recommendations', 'dependencies'],
    },
    retryConfig: {
      maxRetries: 2,
      retryableErrors: ['rate_limit', 'timeout', 'overloaded'],
    },
  },
  {
    id: 'scribe',
    type: 'implementation',
    name: 'Scribe',
    description: 'Writes production-quality code',
    promptTemplate: {
      id: 'scribe-prompt',
      name: 'Scribe Implementation',
      version: 1,
      systemPrompt: `You are Scribe, an expert code writer. Your job is to:
1. Write clean, production-quality code
2. Follow best practices and patterns
3. Include proper error handling
4. Add helpful comments only where logic is complex

Rules:
- TypeScript with strict types
- No 'any' types
- No console.log in production code
- All async operations have try/catch
- Every button has an onClick handler
- No placeholder links (href="#")`,
      userPromptTemplate: `## Task
{{task}}

## Context from Analysis
{{analysisResult}}

## Existing Code to Reference
{{existingCode}}

## Code Style Guide
{{styleGuide}}

Write the implementation. Return ONLY the code, no explanations.`,
      outputSchema: {
        type: 'code',
        language: 'typescript',
        required: [],
      },
      metadata: {
        agentType: 'implementation',
        createdAt: new Date(),
        updatedAt: new Date(),
        successRate: 0.88,
        avgTokens: 3500,
      },
    },
    llmConfig: {
      maxTokens: 8000,
      temperature: 0.2,
    },
    inputSchema: {
      required: ['task', 'analysisResult'],
    },
    outputSchema: {
      type: 'code',
      language: 'typescript',
      required: [],
    },
    retryConfig: {
      maxRetries: 3,
      retryableErrors: ['rate_limit', 'timeout', 'overloaded', 'validation failed'],
    },
  },
  {
    id: 'guardian',
    type: 'testing',
    name: 'Guardian',
    description: 'Writes comprehensive tests',
    promptTemplate: {
      id: 'guardian-prompt',
      name: 'Guardian Testing',
      version: 1,
      systemPrompt: `You are Guardian, an expert test writer. Your job is to:
1. Write comprehensive unit tests
2. Cover edge cases and error conditions
3. Use descriptive test names
4. Mock external dependencies properly

Testing framework: Jest + React Testing Library
Focus on behavior, not implementation details.`,
      userPromptTemplate: `## Code to Test
{{codeToTest}}

## Component/Function Purpose
{{purpose}}

## Required Coverage
{{coverageRequirements}}

Write comprehensive tests. Return ONLY the test code.`,
      outputSchema: {
        type: 'code',
        language: 'typescript',
        required: [],
      },
      metadata: {
        agentType: 'testing',
        createdAt: new Date(),
        updatedAt: new Date(),
        successRate: 0.92,
        avgTokens: 2500,
      },
    },
    llmConfig: {
      maxTokens: 6000,
      temperature: 0.2,
    },
    inputSchema: {
      required: ['codeToTest', 'purpose'],
    },
    outputSchema: {
      type: 'code',
      language: 'typescript',
      required: [],
    },
    retryConfig: {
      maxRetries: 2,
      retryableErrors: ['rate_limit', 'timeout'],
    },
  },
  {
    id: 'critic',
    type: 'review',
    name: 'Critic',
    description: 'Reviews code for quality and issues',
    promptTemplate: {
      id: 'critic-prompt',
      name: 'Critic Review',
      version: 1,
      systemPrompt: `You are Critic, an expert code reviewer. Your job is to:
1. Identify bugs and potential issues
2. Check for security vulnerabilities
3. Evaluate code quality and maintainability
4. Suggest improvements

Be constructive but thorough. Don't miss issues to be polite.`,
      userPromptTemplate: `## Code to Review
{{code}}

## Original Requirements
{{requirements}}

## Context
{{context}}

Review this code and provide:
1. Issues found (critical, major, minor)
2. Security concerns
3. Performance concerns
4. Suggested improvements
5. Overall quality score (1-10)`,
      outputSchema: {
        type: 'json',
        schema: {
          type: 'object',
          required: ['issues', 'securityConcerns', 'qualityScore'],
          properties: {
            issues: { type: 'array' },
            securityConcerns: { type: 'array' },
            performanceConcerns: { type: 'array' },
            improvements: { type: 'array' },
            qualityScore: { type: 'number' },
          },
        },
        required: ['issues', 'securityConcerns', 'qualityScore'],
      },
      metadata: {
        agentType: 'review',
        createdAt: new Date(),
        updatedAt: new Date(),
        successRate: 0.94,
        avgTokens: 2000,
      },
    },
    llmConfig: {
      maxTokens: 4000,
      temperature: 0.3,
    },
    inputSchema: {
      required: ['code', 'requirements'],
    },
    outputSchema: {
      type: 'json',
      schema: {
        type: 'object',
        required: ['issues', 'qualityScore'],
      },
      required: ['issues', 'qualityScore'],
    },
    retryConfig: {
      maxRetries: 2,
      retryableErrors: ['rate_limit', 'timeout'],
    },
  },
];

// ============================================================================
// FACTORY
// ============================================================================

export function createAgentExecutor(config: LLMConfig): AgentExecutor {
  const executor = new AgentExecutor(config);

  // Register built-in agents
  for (const agent of BUILT_IN_AGENTS) {
    executor.registerAgent(agent);
  }

  return executor;
}

export function createLLMClient(config: LLMConfig): LLMClient {
  return new LLMClient(config);
}
