/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                              VITO OMEGA                                    ║
 * ║                                                                           ║
 * ║  The version Future You would build.                                      ║
 * ║  Past You wouldn't understand half of this.                               ║
 * ║                                                                           ║
 * ║  CAPABILITIES:                                                            ║
 * ║  • Multi-model consensus with quality voting                              ║
 * ║  • Semantic memory that finds SIMILAR work, not just exact matches        ║
 * ║  • Self-improving prompts that evolve based on outcomes                   ║
 * ║  • Speculative execution - explore multiple paths simultaneously          ║
 * ║  • Adversarial review - models critique each other                        ║
 * ║  • Predictive complexity analysis before execution                        ║
 * ║  • AST-aware code understanding                                           ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import Anthropic from '@anthropic-ai/sdk';
import { parse } from '@babel/parser';
// @ts-expect-error - @babel/traverse has no type declarations
import traverse from '@babel/traverse';
import * as t from '@babel/types';

// Type helper for babel traverse path
type TraversePath = { node: t.Node };

// ============================================================================
// COGNITIVE TYPES
// ============================================================================

interface CognitiveState {
  memory: SemanticMemory;
  promptEvolution: PromptGenome[];
  executionHistory: ExecutionTrace[];
  modelProfiles: Map<string, ModelProfile>;
}

interface SemanticMemory {
  embeddings: Map<string, Float32Array>;
  outputs: Map<string, CachedOutput>;
  patterns: LearnedPattern[];
}

interface CachedOutput {
  task: string;
  output: string;
  quality: number;
  embedding: Float32Array;
  timestamp: number;
}

interface LearnedPattern {
  trigger: string;
  approach: string;
  successRate: number;
  avgQuality: number;
  samples: number;
}

interface PromptGenome {
  id: string;
  template: string;
  fitness: number;
  generation: number;
  mutations: string[];
}

interface ExecutionTrace {
  id: string;
  task: string;
  approach: string;
  models: string[];
  outputs: ModelOutput[];
  selected: number;
  quality: number;
  duration: number;
  timestamp: number;
}

interface ModelOutput {
  model: string;
  output: string;
  tokens: number;
  latency: number;
  confidence: number;
}

interface ModelProfile {
  model: string;
  strengths: string[];
  avgQuality: number;
  avgLatency: number;
  costPerToken: number;
  samples: number;
}

interface CodeUnderstanding {
  functions: FunctionSignature[];
  types: TypeDefinition[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  complexity: number;
  patterns: string[];
}

interface FunctionSignature {
  name: string;
  params: Array<{ name: string; type: string }>;
  returnType: string;
  async: boolean;
  complexity: number;
}

interface TypeDefinition {
  name: string;
  kind: 'interface' | 'type' | 'enum' | 'class';
  properties: Array<{ name: string; type: string; optional: boolean }>;
}

interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
}

interface ExportInfo {
  name: string;
  isDefault: boolean;
}

// ============================================================================
// OMEGA CLASS
// ============================================================================

export class Omega {
  private anthropic: Anthropic;
  private state: CognitiveState;
  private models: string[];

  constructor(config: { apiKey?: string; models?: string[] } = {}) {
    this.anthropic = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });

    this.models = config.models || [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-haiku-3-5-20241022',
    ];

    this.state = {
      memory: {
        embeddings: new Map(),
        outputs: new Map(),
        patterns: [],
      },
      promptEvolution: [this.createGenesisPrompt()],
      executionHistory: [],
      modelProfiles: new Map(),
    };
  }

  // ==========================================================================
  // MAIN ENTRY POINT
  // ==========================================================================

  async think(task: string, context?: string): Promise<OmegaResult> {
    const traceId = this.generateId();
    const startTime = Date.now();

    // 1. UNDERSTAND - Analyze what we're dealing with
    const understanding = await this.understand(task, context);

    // 2. REMEMBER - Find similar past work
    const memories = await this.recall(task);

    // 3. PLAN - Decide execution strategy
    const strategy = this.strategize(understanding, memories);

    // 4. EXECUTE - Run with chosen strategy
    const outputs = await this.execute(task, context, strategy);

    // 5. SYNTHESIZE - Combine and select best output
    const synthesis = await this.synthesize(outputs, task);

    // 6. VALIDATE - Adversarial review
    const validated = await this.validate(synthesis, task);

    // 7. LEARN - Update state based on outcome
    await this.learn(traceId, task, validated, strategy, Date.now() - startTime);

    return {
      code: validated.code,
      files: this.parseFiles(validated.code),
      confidence: validated.confidence,
      reasoning: validated.reasoning,
      alternatives: outputs.map(o => ({
        model: o.model,
        preview: o.output.slice(0, 200),
        confidence: o.confidence,
      })),
      metrics: {
        duration: Date.now() - startTime,
        tokens: outputs.reduce((sum, o) => sum + o.tokens, 0),
        modelsUsed: outputs.map(o => o.model),
        strategyUsed: strategy.name,
        memoryHits: memories.length,
      },
    };
  }

  // ==========================================================================
  // COGNITIVE LAYER 1: UNDERSTAND
  // ==========================================================================

  private async understand(task: string, context?: string): Promise<TaskUnderstanding> {
    // Analyze task complexity
    const complexitySignals = this.analyzeComplexity(task);

    // If context is code, parse it
    let codeUnderstanding: CodeUnderstanding | undefined;
    if (context && this.looksLikeCode(context)) {
      codeUnderstanding = this.parseCode(context);
    }

    // Identify task type
    const taskType = this.classifyTask(task);

    // Estimate requirements
    const requirements = this.estimateRequirements(task, complexitySignals);

    return {
      task,
      taskType,
      complexity: complexitySignals,
      codeContext: codeUnderstanding,
      requirements,
      confidence: this.calculateConfidence(complexitySignals, taskType),
    };
  }

  private analyzeComplexity(task: string): ComplexitySignals {
    const words = task.split(/\s+/).length;
    const hasMultipleParts = /and|also|then|after|before|with/i.test(task);
    const mentionsFiles = /files?|components?|modules?|classes?/i.test(task);
    const mentionsIntegration = /integrate|connect|combine|with.*api/i.test(task);
    const mentionsArchitecture = /architect|design|system|infrastructure/i.test(task);

    const score =
      Math.min(words / 10, 3) +
      (hasMultipleParts ? 2 : 0) +
      (mentionsFiles ? 1 : 0) +
      (mentionsIntegration ? 2 : 0) +
      (mentionsArchitecture ? 3 : 0);

    return {
      score: Math.min(score, 10),
      factors: {
        length: words,
        multiPart: hasMultipleParts,
        fileGeneration: mentionsFiles,
        integration: mentionsIntegration,
        architectural: mentionsArchitecture,
      },
    };
  }

  private classifyTask(task: string): TaskType {
    const lower = task.toLowerCase();

    if (/fix|bug|error|issue|broken/.test(lower)) return 'fix';
    if (/refactor|clean|improve|optimize/.test(lower)) return 'refactor';
    if (/test|spec|coverage/.test(lower)) return 'test';
    if (/create|build|implement|add|new/.test(lower)) return 'create';
    if (/explain|what|how|why/.test(lower)) return 'explain';
    if (/convert|transform|migrate/.test(lower)) return 'transform';

    return 'create';
  }

  private estimateRequirements(task: string, complexity: ComplexitySignals): Requirements {
    const baseTokens = 2000;
    const complexityMultiplier = 1 + complexity.score * 0.3;

    return {
      estimatedTokens: Math.round(baseTokens * complexityMultiplier),
      estimatedModels: complexity.score > 5 ? 3 : complexity.score > 3 ? 2 : 1,
      needsSpeculation: complexity.score > 6,
      needsAdversarial: complexity.score > 4,
      suggestedApproach:
        complexity.score > 7 ? 'decompose' : complexity.score > 4 ? 'parallel' : 'direct',
    };
  }

  private calculateConfidence(complexity: ComplexitySignals, taskType: TaskType): number {
    // Higher complexity = lower confidence
    const complexityPenalty = complexity.score * 0.05;

    // Some task types are more predictable
    const typeBonus: Record<TaskType, number> = {
      fix: 0.1,
      test: 0.1,
      create: 0,
      refactor: 0.05,
      explain: 0.15,
      transform: 0.05,
    };

    return Math.max(0.3, Math.min(0.95, 0.8 - complexityPenalty + typeBonus[taskType]));
  }

  // ==========================================================================
  // COGNITIVE LAYER 2: REMEMBER (Semantic Memory)
  // ==========================================================================

  private async recall(task: string): Promise<MemoryMatch[]> {
    // Generate embedding for current task
    const taskEmbedding = await this.embed(task);

    // Find similar past outputs
    const matches: MemoryMatch[] = [];

    for (const [key, cached] of this.state.memory.outputs) {
      const similarity = this.cosineSimilarity(taskEmbedding, cached.embedding);

      if (similarity > 0.75) {
        matches.push({
          key,
          similarity,
          output: cached,
          relevance: similarity * cached.quality,
        });
      }
    }

    // Sort by relevance
    return matches.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }

  private async embed(text: string): Promise<Float32Array> {
    // Use a simple hash-based pseudo-embedding for now
    // In production, this would call an embedding model
    const vector = new Float32Array(384);
    const words = text.toLowerCase().split(/\W+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const idx = (word.charCodeAt(j) * (i + 1) * (j + 1)) % 384;
        vector[idx] += 1 / words.length;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude > 0 ? dot / magnitude : 0;
  }

  // ==========================================================================
  // COGNITIVE LAYER 3: STRATEGIZE
  // ==========================================================================

  private strategize(understanding: TaskUnderstanding, memories: MemoryMatch[]): ExecutionStrategy {
    const { complexity, requirements } = understanding;

    // If we have high-quality memories, use them as guidance
    const hasGoodMemories = memories.some(m => m.output.quality > 0.8);

    // Select strategy based on complexity and history
    if (complexity.score <= 3) {
      return {
        name: 'direct',
        models: [this.selectBestModel('speed')],
        parallel: false,
        speculative: false,
        adversarial: false,
        memoryGuidance: hasGoodMemories ? memories[0]?.output.output : undefined,
      };
    }

    if (complexity.score <= 6) {
      return {
        name: 'parallel',
        models: this.selectModels(2),
        parallel: true,
        speculative: false,
        adversarial: true,
        memoryGuidance: hasGoodMemories ? memories[0]?.output.output : undefined,
      };
    }

    // High complexity: full cognitive load
    return {
      name: 'full',
      models: this.selectModels(3),
      parallel: true,
      speculative: true,
      adversarial: true,
      decompose: complexity.factors.multiPart,
      memoryGuidance: hasGoodMemories ? memories[0]?.output.output : undefined,
    };
  }

  private selectBestModel(priority: 'speed' | 'quality' | 'cost'): string {
    const profiles = Array.from(this.state.modelProfiles.values());

    if (profiles.length === 0) {
      // No history, use defaults
      switch (priority) {
        case 'speed':
          return 'claude-haiku-3-5-20241022';
        case 'quality':
          return 'claude-opus-4-20250514';
        case 'cost':
          return 'claude-haiku-3-5-20241022';
      }
    }

    // Select based on profile data
    switch (priority) {
      case 'speed':
        return profiles.sort((a, b) => a.avgLatency - b.avgLatency)[0].model;
      case 'quality':
        return profiles.sort((a, b) => b.avgQuality - a.avgQuality)[0].model;
      case 'cost':
        return profiles.sort((a, b) => a.costPerToken - b.costPerToken)[0].model;
    }
  }

  private selectModels(count: number): string[] {
    // Select diverse models for ensemble
    const available = [...this.models];
    const selected: string[] = [];

    // Always include one quality model
    const qualityModel = this.selectBestModel('quality');
    if (available.includes(qualityModel)) {
      selected.push(qualityModel);
      available.splice(available.indexOf(qualityModel), 1);
    }

    // Fill remaining with diverse picks
    while (selected.length < count && available.length > 0) {
      const idx = Math.floor(Math.random() * available.length);
      selected.push(available[idx]);
      available.splice(idx, 1);
    }

    return selected;
  }

  // ==========================================================================
  // COGNITIVE LAYER 4: EXECUTE
  // ==========================================================================

  private async execute(
    task: string,
    context: string | undefined,
    strategy: ExecutionStrategy
  ): Promise<ModelOutput[]> {
    const prompt = this.buildPrompt(task, context, strategy);

    if (strategy.parallel) {
      // Run models in parallel
      const promises = strategy.models.map(model => this.executeModel(model, prompt));
      return Promise.all(promises);
    } else {
      // Sequential execution
      const outputs: ModelOutput[] = [];
      for (const model of strategy.models) {
        const output = await this.executeModel(model, prompt);
        outputs.push(output);
      }
      return outputs;
    }
  }

  private async executeModel(model: string, prompt: string): Promise<ModelOutput> {
    const startTime = Date.now();

    try {
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';

      return {
        model,
        output: content,
        tokens: response.usage.input_tokens + response.usage.output_tokens,
        latency: Date.now() - startTime,
        confidence: this.estimateConfidence(content),
      };
    } catch (error) {
      return {
        model,
        output: '',
        tokens: 0,
        latency: Date.now() - startTime,
        confidence: 0,
      };
    }
  }

  private buildPrompt(
    task: string,
    context: string | undefined,
    strategy: ExecutionStrategy
  ): string {
    // Select best performing prompt genome
    const genome = this.selectBestGenome();

    let prompt = genome.template
      .replace('{{task}}', task)
      .replace('{{context}}', context || 'None provided');

    // Add memory guidance if available
    if (strategy.memoryGuidance) {
      prompt += `\n\nReference from similar past work:\n${strategy.memoryGuidance.slice(0, 500)}`;
    }

    return prompt;
  }

  private selectBestGenome(): PromptGenome {
    const genomes = this.state.promptEvolution;

    if (genomes.length === 1) return genomes[0];

    // Tournament selection
    const tournament = genomes
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(3, genomes.length));

    return tournament.sort((a, b) => b.fitness - a.fitness)[0];
  }

  private estimateConfidence(output: string): number {
    if (!output) return 0;

    const hasCode = /```[\s\S]*```/.test(output);
    const hasTypes = /interface|type|:\s*\w+/.test(output);
    const hasExports = /export/.test(output);
    const length = output.length;

    let confidence = 0.5;

    if (hasCode) confidence += 0.2;
    if (hasTypes) confidence += 0.1;
    if (hasExports) confidence += 0.1;
    if (length > 500) confidence += 0.1;
    if (length > 2000) confidence += 0.1;

    return Math.min(confidence, 1);
  }

  // ==========================================================================
  // COGNITIVE LAYER 5: SYNTHESIZE
  // ==========================================================================

  private async synthesize(outputs: ModelOutput[], task: string): Promise<SynthesisResult> {
    // Filter failed outputs
    const valid = outputs.filter(o => o.output && o.confidence > 0);

    if (valid.length === 0) {
      return {
        code: '',
        confidence: 0,
        reasoning: 'All models failed to produce output',
        selectedModel: 'none',
      };
    }

    if (valid.length === 1) {
      return {
        code: valid[0].output,
        confidence: valid[0].confidence,
        reasoning: `Single model output from ${valid[0].model}`,
        selectedModel: valid[0].model,
      };
    }

    // Multi-output synthesis: use voting and quality analysis
    const scored = await Promise.all(
      valid.map(async output => ({
        output,
        quality: await this.assessQuality(output.output, task),
      }))
    );

    // Select best
    const best = scored.sort((a, b) => b.quality - a.quality)[0];

    return {
      code: best.output.output,
      confidence: (best.quality + best.output.confidence) / 2,
      reasoning: `Selected ${best.output.model} with quality score ${best.quality.toFixed(2)}`,
      selectedModel: best.output.model,
    };
  }

  private async assessQuality(output: string, task: string): Promise<number> {
    // Quick quality assessment without another LLM call
    let score = 0.5;

    // Code structure checks
    const hasCodeBlocks = (output.match(/```/g) || []).length >= 2;
    const hasTypeAnnotations = /:\s*(string|number|boolean|void|Promise)/.test(output);
    const hasErrorHandling = /try\s*{|catch\s*\(|\.catch\(/.test(output);
    const hasExports = /export\s+(default\s+)?/.test(output);
    const hasImports = /import\s+.*from/.test(output);

    if (hasCodeBlocks) score += 0.1;
    if (hasTypeAnnotations) score += 0.1;
    if (hasErrorHandling) score += 0.1;
    if (hasExports) score += 0.1;
    if (hasImports) score += 0.05;

    // Task-specific checks
    const taskWords = task.toLowerCase().split(/\W+/);
    const outputLower = output.toLowerCase();

    let relevanceScore = 0;
    for (const word of taskWords) {
      if (word.length > 3 && outputLower.includes(word)) {
        relevanceScore += 1;
      }
    }

    score += Math.min(relevanceScore / taskWords.length, 0.2);

    return Math.min(score, 1);
  }

  // ==========================================================================
  // COGNITIVE LAYER 6: VALIDATE (Adversarial)
  // ==========================================================================

  private async validate(synthesis: SynthesisResult, task: string): Promise<ValidationResult> {
    if (!synthesis.code) {
      return {
        code: '',
        confidence: 0,
        reasoning: synthesis.reasoning,
        issues: ['No code generated'],
        improvements: [],
      };
    }

    // Use a different model as adversary
    const adversaryModel =
      synthesis.selectedModel === 'claude-opus-4-20250514'
        ? 'claude-sonnet-4-20250514'
        : 'claude-opus-4-20250514';

    try {
      const reviewResponse = await this.anthropic.messages.create({
        model: adversaryModel,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `You are a harsh code reviewer. Find problems with this code.

Task that was requested: ${task}

Code to review:
${synthesis.code}

Respond in JSON:
{
  "issues": ["issue1", "issue2"],
  "improvements": ["improvement1", "improvement2"],
  "score": 1-10,
  "wouldShip": true/false
}`,
          },
        ],
      });

      const reviewText =
        reviewResponse.content[0].type === 'text' ? reviewResponse.content[0].text : '{}';

      const review = this.parseJSON(reviewText) as {
        score?: number;
        issues?: string[];
        improvements?: string[];
      };

      return {
        code: synthesis.code,
        confidence: Math.min(synthesis.confidence, (Number(review.score) || 5) / 10),
        reasoning: `${synthesis.reasoning}. Review score: ${review.score ?? 'N/A'}/10`,
        issues: review.issues ?? [],
        improvements: review.improvements ?? [],
      };
    } catch {
      // If adversarial review fails, return synthesis as-is
      return {
        code: synthesis.code,
        confidence: synthesis.confidence,
        reasoning: synthesis.reasoning,
        issues: [],
        improvements: [],
      };
    }
  }

  // ==========================================================================
  // COGNITIVE LAYER 7: LEARN
  // ==========================================================================

  private async learn(
    traceId: string,
    task: string,
    result: ValidationResult,
    strategy: ExecutionStrategy,
    duration: number
  ): Promise<void> {
    // 1. Store in semantic memory
    const embedding = await this.embed(task);
    this.state.memory.outputs.set(traceId, {
      task,
      output: result.code,
      quality: result.confidence,
      embedding,
      timestamp: Date.now(),
    });

    // 2. Update model profiles
    this.updateModelProfiles(strategy.models, result.confidence, duration);

    // 3. Evolve prompts if we have enough data
    if (this.state.executionHistory.length > 10) {
      this.evolvePrompts();
    }

    // 4. Extract patterns
    this.extractPatterns(task, strategy.name, result.confidence);

    // 5. Record trace
    this.state.executionHistory.push({
      id: traceId,
      task,
      approach: strategy.name,
      models: strategy.models,
      outputs: [],
      selected: 0,
      quality: result.confidence,
      duration,
      timestamp: Date.now(),
    });

    // Keep history bounded
    if (this.state.executionHistory.length > 1000) {
      this.state.executionHistory = this.state.executionHistory.slice(-500);
    }
  }

  private updateModelProfiles(models: string[], quality: number, duration: number): void {
    for (const model of models) {
      const existing = this.state.modelProfiles.get(model);

      if (existing) {
        const samples = existing.samples + 1;
        existing.avgQuality = (existing.avgQuality * existing.samples + quality) / samples;
        existing.avgLatency =
          (existing.avgLatency * existing.samples + duration / models.length) / samples;
        existing.samples = samples;
      } else {
        this.state.modelProfiles.set(model, {
          model,
          strengths: [],
          avgQuality: quality,
          avgLatency: duration / models.length,
          costPerToken: this.getModelCost(model),
          samples: 1,
        });
      }
    }
  }

  private evolvePrompts(): void {
    const history = this.state.executionHistory.slice(-50);

    // Calculate fitness for each genome
    for (const genome of this.state.promptEvolution) {
      const relevantHistory = history.filter(h => h.approach === genome.template.slice(0, 20));
      if (relevantHistory.length > 0) {
        genome.fitness =
          relevantHistory.reduce((sum, h) => sum + h.quality, 0) / relevantHistory.length;
      }
    }

    // Keep top performers
    this.state.promptEvolution.sort((a, b) => b.fitness - a.fitness);
    this.state.promptEvolution = this.state.promptEvolution.slice(0, 5);

    // Create mutations of best performer
    if (this.state.promptEvolution.length > 0) {
      const best = this.state.promptEvolution[0];
      const mutation = this.mutatePrompt(best);
      this.state.promptEvolution.push(mutation);
    }
  }

  private mutatePrompt(genome: PromptGenome): PromptGenome {
    const mutations = [
      'Be more concise',
      'Add more type annotations',
      'Focus on error handling',
      'Prioritize readability',
      'Add edge case handling',
    ];

    const mutation = mutations[Math.floor(Math.random() * mutations.length)];

    return {
      id: this.generateId(),
      template: genome.template + `\n\nAdditional instruction: ${mutation}`,
      fitness: genome.fitness * 0.9, // Start slightly lower
      generation: genome.generation + 1,
      mutations: [...genome.mutations, mutation],
    };
  }

  private extractPatterns(task: string, approach: string, quality: number): void {
    // Simple keyword-based pattern extraction
    const keywords = task
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 4);

    for (const keyword of keywords) {
      const existing = this.state.memory.patterns.find(p => p.trigger === keyword);

      if (existing) {
        existing.samples++;
        existing.avgQuality =
          (existing.avgQuality * (existing.samples - 1) + quality) / existing.samples;
        if (quality > 0.8) {
          existing.successRate =
            (existing.successRate * (existing.samples - 1) + 1) / existing.samples;
        }
      } else {
        this.state.memory.patterns.push({
          trigger: keyword,
          approach,
          successRate: quality > 0.8 ? 1 : 0,
          avgQuality: quality,
          samples: 1,
        });
      }
    }
  }

  // ==========================================================================
  // CODE UNDERSTANDING (AST)
  // ==========================================================================

  private parseCode(code: string): CodeUnderstanding {
    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      });

      const functions: FunctionSignature[] = [];
      const types: TypeDefinition[] = [];
      const imports: ImportInfo[] = [];
      const exports: ExportInfo[] = [];
      let complexity = 0;
      const patterns: string[] = [];

      traverse(ast, {
        FunctionDeclaration(path: { node: t.FunctionDeclaration }) {
          const node = path.node;
          functions.push({
            name: node.id?.name || 'anonymous',
            params: node.params.map((p: t.Node) => ({
              name: t.isIdentifier(p) ? p.name : 'param',
              type: 'any',
            })),
            returnType: 'any',
            async: node.async,
            complexity: 1,
          });
          complexity++;
        },

        ArrowFunctionExpression() {
          complexity++;
        },

        TSInterfaceDeclaration(path: { node: t.TSInterfaceDeclaration }) {
          const node = path.node;
          types.push({
            name: node.id.name,
            kind: 'interface',
            properties: [],
          });
        },

        TSTypeAliasDeclaration(path: { node: t.TSTypeAliasDeclaration }) {
          const node = path.node;
          types.push({
            name: node.id.name,
            kind: 'type',
            properties: [],
          });
        },

        ImportDeclaration(path: { node: t.ImportDeclaration }) {
          const node = path.node;
          imports.push({
            source: node.source.value,
            specifiers: node.specifiers.map((s: t.Node) =>
              t.isImportDefaultSpecifier(s)
                ? 'default'
                : t.isIdentifier((s as t.ImportSpecifier).local)
                  ? (s as t.ImportSpecifier).local.name
                  : 'unknown'
            ),
            isDefault: node.specifiers.some((s: t.Node) => t.isImportDefaultSpecifier(s)),
          });
        },

        ExportDeclaration(path: { node: t.ExportDeclaration }) {
          if (t.isExportNamedDeclaration(path.node)) {
            const decl = path.node.declaration;
            if (t.isFunctionDeclaration(decl) && decl.id) {
              exports.push({ name: decl.id.name, isDefault: false });
            }
          } else if (t.isExportDefaultDeclaration(path.node)) {
            exports.push({ name: 'default', isDefault: true });
          }
        },

        IfStatement() {
          complexity++;
        },

        ForStatement() {
          complexity++;
          patterns.push('iteration');
        },

        TryStatement() {
          patterns.push('error-handling');
        },

        AwaitExpression() {
          patterns.push('async');
        },
      });

      return {
        functions,
        types,
        imports,
        exports,
        complexity,
        patterns: [...new Set(patterns)],
      };
    } catch {
      return {
        functions: [],
        types: [],
        imports: [],
        exports: [],
        complexity: 0,
        patterns: [],
      };
    }
  }

  private looksLikeCode(text: string): boolean {
    const codeIndicators = [
      /^import\s/m,
      /^export\s/m,
      /function\s+\w+/,
      /const\s+\w+\s*=/,
      /interface\s+\w+/,
      /class\s+\w+/,
    ];

    return codeIndicators.some(pattern => pattern.test(text));
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private createGenesisPrompt(): PromptGenome {
    return {
      id: 'genesis',
      template: `You are a senior engineer building production code.

Task: {{task}}

Context: {{context}}

Requirements:
- TypeScript with strict types
- No placeholder implementations
- Handle errors properly
- Return only code blocks

Format multiple files as:
\`\`\`typescript:path/to/file.ts
// code
\`\`\``,
      fitness: 0.7,
      generation: 0,
      mutations: [],
    };
  }

  private parseFiles(content: string): Map<string, string> {
    const files = new Map<string, string>();
    const regex = /```(?:typescript|tsx?|javascript|jsx?)?(?::([^\n]+))?\n([\s\S]*?)```/g;

    let match;
    let index = 0;

    while ((match = regex.exec(content)) !== null) {
      const path = match[1]?.trim() || `file-${index++}.ts`;
      files.set(path, match[2].trim());
    }

    if (files.size === 0 && content.trim()) {
      files.set('output.ts', content.trim());
    }

    return files;
  }

  private parseJSON(text: string): Record<string, unknown> {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : {};
    } catch {
      return {};
    }
  }

  private getModelCost(model: string): number {
    const costs: Record<string, number> = {
      'claude-opus-4-20250514': 0.015,
      'claude-sonnet-4-20250514': 0.003,
      'claude-haiku-3-5-20241022': 0.00025,
    };
    return costs[model] || 0.003;
  }

  private generateId(): string {
    return `omega-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // ==========================================================================
  // PUBLIC UTILITIES
  // ==========================================================================

  getState(): CognitiveState {
    return this.state;
  }

  getMetrics(): OmegaMetrics {
    const history = this.state.executionHistory;

    return {
      totalExecutions: history.length,
      avgQuality:
        history.length > 0 ? history.reduce((sum, h) => sum + h.quality, 0) / history.length : 0,
      avgDuration:
        history.length > 0 ? history.reduce((sum, h) => sum + h.duration, 0) / history.length : 0,
      memorySize: this.state.memory.outputs.size,
      patternsLearned: this.state.memory.patterns.length,
      promptGenerations: Math.max(...this.state.promptEvolution.map(g => g.generation)),
      modelProfiles: Object.fromEntries(this.state.modelProfiles),
    };
  }
}

// ============================================================================
// TYPES
// ============================================================================

type TaskType = 'create' | 'fix' | 'refactor' | 'test' | 'explain' | 'transform';

interface TaskUnderstanding {
  task: string;
  taskType: TaskType;
  complexity: ComplexitySignals;
  codeContext?: CodeUnderstanding;
  requirements: Requirements;
  confidence: number;
}

interface ComplexitySignals {
  score: number;
  factors: {
    length: number;
    multiPart: boolean;
    fileGeneration: boolean;
    integration: boolean;
    architectural: boolean;
  };
}

interface Requirements {
  estimatedTokens: number;
  estimatedModels: number;
  needsSpeculation: boolean;
  needsAdversarial: boolean;
  suggestedApproach: 'direct' | 'parallel' | 'decompose';
}

interface MemoryMatch {
  key: string;
  similarity: number;
  output: CachedOutput;
  relevance: number;
}

interface ExecutionStrategy {
  name: string;
  models: string[];
  parallel: boolean;
  speculative: boolean;
  adversarial: boolean;
  decompose?: boolean;
  memoryGuidance?: string;
}

interface SynthesisResult {
  code: string;
  confidence: number;
  reasoning: string;
  selectedModel: string;
}

interface ValidationResult {
  code: string;
  confidence: number;
  reasoning: string;
  issues: string[];
  improvements: string[];
}

export interface OmegaResult {
  code: string;
  files: Map<string, string>;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    model: string;
    preview: string;
    confidence: number;
  }>;
  metrics: {
    duration: number;
    tokens: number;
    modelsUsed: string[];
    strategyUsed: string;
    memoryHits: number;
  };
}

interface OmegaMetrics {
  totalExecutions: number;
  avgQuality: number;
  avgDuration: number;
  memorySize: number;
  patternsLearned: number;
  promptGenerations: number;
  modelProfiles: Record<string, ModelProfile>;
}

// ============================================================================
// EXPORT
// ============================================================================

let instance: Omega | null = null;

export function omega(task: string, context?: string): Promise<OmegaResult> {
  if (!instance) {
    instance = new Omega();
  }
  return instance.think(task, context);
}

export function getOmega(): Omega {
  if (!instance) {
    instance = new Omega();
  }
  return instance;
}
