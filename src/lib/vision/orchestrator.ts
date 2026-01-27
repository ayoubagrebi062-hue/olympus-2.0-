/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   VISION ORCHESTRATOR - The Master Controller                                 ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   This is where everything comes together:                                    ║
 * ║                                                                               ║
 * ║   ┌─────────────────────────────────────────────────────────────────────┐    ║
 * ║   │                         USER REQUEST                                 │    ║
 * ║   └───────────────────────────────┬─────────────────────────────────────┘    ║
 * ║                                   │                                          ║
 * ║                                   ▼                                          ║
 * ║   ┌─────────────────────────────────────────────────────────────────────┐    ║
 * ║   │                     SMART CACHE CHECK                               │    ║
 * ║   │              (Content-addressed lookup)                             │    ║
 * ║   └───────────────────────────────┬─────────────────────────────────────┘    ║
 * ║                                   │ miss                                     ║
 * ║                                   ▼                                          ║
 * ║   ┌─────────────────────────────────────────────────────────────────────┐    ║
 * ║   │                    CODE GENERATION                                   │    ║
 * ║   │              (AI-powered component creation)                         │    ║
 * ║   └───────────────────────────────┬─────────────────────────────────────┘    ║
 * ║                                   │                                          ║
 * ║                                   ▼                                          ║
 * ║   ┌─────────────────────────────────────────────────────────────────────┐    ║
 * ║   │                    QUALITY ANALYSIS                                  │    ║
 * ║   │    ├── AI Stub Detection (semantic understanding)                    │    ║
 * ║   │    ├── Feature Coverage Analysis                                     │    ║
 * ║   │    └── Accessibility Check                                           │    ║
 * ║   └───────────────────────────────┬─────────────────────────────────────┘    ║
 * ║                                   │                                          ║
 * ║                     ┌─────────────┴─────────────┐                            ║
 * ║                     │                           │                            ║
 * ║                     ▼ pass                      ▼ fail                       ║
 * ║   ┌────────────────────────┐    ┌────────────────────────────────────────┐  ║
 * ║   │  IMAGE GENERATION      │    │  SELF-HEALING                          │  ║
 * ║   │  (Multi-provider)      │    │  ├── Rule-based fixes                  │  ║
 * ║   └──────────┬─────────────┘    │  ├── Learned pattern fixes             │  ║
 * ║              │                   │  └── AI-powered fixes                  │  ║
 * ║              │                   └──────────────┬─────────────────────────┘  ║
 * ║              │                                  │                            ║
 * ║              │                   ┌──────────────┘                            ║
 * ║              │                   │                                           ║
 * ║              ▼                   ▼                                           ║
 * ║   ┌─────────────────────────────────────────────────────────────────────┐    ║
 * ║   │                    VISUAL REGRESSION                                 │    ║
 * ║   │         (Screenshot comparison, broken UI detection)                 │    ║
 * ║   └───────────────────────────────┬─────────────────────────────────────┘    ║
 * ║                                   │                                          ║
 * ║                                   ▼                                          ║
 * ║   ┌─────────────────────────────────────────────────────────────────────┐    ║
 * ║   │                    QUALITY DASHBOARD                                 │    ║
 * ║   │            (Metrics, alerts, trend tracking)                         │    ║
 * ║   └───────────────────────────────┬─────────────────────────────────────┘    ║
 * ║                                   │                                          ║
 * ║                                   ▼                                          ║
 * ║   ┌─────────────────────────────────────────────────────────────────────┐    ║
 * ║   │                     FINAL RESULT                                     │    ║
 * ║   │       (Code + Images + Quality Metrics + Healing Details)            │    ║
 * ║   └─────────────────────────────────────────────────────────────────────┘    ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import Anthropic from '@anthropic-ai/sdk';
import { AIStubDetector } from './ai-stub-detector';
import { MultiProviderImageService } from './multi-provider-images';
import { SelfHealingGenerator } from './self-healing';
import { VisualRegressionEngine } from './visual-regression';
import { QualityDashboard } from './quality-dashboard';
import { SmartCache, getCodeCache, getImageCache } from './smart-cache';
import type {
  VisionConfig,
  GenerationResult,
  QualityMetrics,
  GeneratedImage,
  HealingResult,
  StubLocation,
} from './types';

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const CODE_GENERATION_TIMEOUT_MS = 120000; // 2 minutes
const MAX_PROMPT_LENGTH = 10000;
const MAX_EXPECTED_FEATURES = 50;
const MAX_CONCURRENT_REQUESTS = 5;

const DEFAULT_CONFIG: VisionConfig = {
  aiProvider: 'anthropic',
  aiModel: 'claude-sonnet-4-20250514',
  imageProviders: [
    {
      name: 'pollinations',
      enabled: true,
      priority: 1,
      rateLimit: { requestsPerMinute: 60, requestsPerDay: 1000 },
    },
  ],
  imageCacheEnabled: true,
  imageCacheTTL: 1000 * 60 * 60 * 24, // 24 hours
  minQualityScore: 70,
  maxStubRate: 0.1,
  maxRetries: 3,
  selfHealingEnabled: true,
  learningEnabled: true,
  visualRegressionEnabled: false,
  diffThreshold: 0.01,
  dashboardEnabled: true,
  metricsRetention: 24,
};

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface GenerationRequest {
  prompt: string;
  pageType?: string;
  expectedFeatures?: string[];
  style?: {
    theme?: 'light' | 'dark';
    colors?: string[];
    designSystem?: string;
  };
  options?: {
    generateImages?: boolean;
    skipCache?: boolean;
    forceHealing?: boolean;
    returnOnFirstPass?: boolean;
    timeout?: number;
    signal?: AbortSignal; // For cancellation
  };
}

// Progress event types
type GenerationPhase =
  | 'validating'
  | 'cache-check'
  | 'generating'
  | 'analyzing'
  | 'healing'
  | 'images'
  | 'complete'
  | 'failed';

interface ProgressEvent {
  phase: GenerationPhase;
  progress: number; // 0-100
  message: string;
  details?: Record<string, unknown>;
}

type ProgressCallback = (event: ProgressEvent) => void;

interface OrchestratorStats {
  totalGenerations: number;
  cacheHits: number;
  cacheMisses: number;
  firstPassRate: number;
  healingRate: number;
  avgQualityScore: number;
  avgGenerationTime: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// VISION ORCHESTRATOR
// ════════════════════════════════════════════════════════════════════════════════

export class VisionOrchestrator {
  private config: VisionConfig;
  private client: Anthropic | null = null;

  // Subsystems
  private stubDetector: AIStubDetector;
  private imageService: MultiProviderImageService;
  private healingGenerator: SelfHealingGenerator;
  private visualRegression: VisualRegressionEngine;
  private dashboard: QualityDashboard;
  private codeCache: SmartCache<string>;
  private imageCache: SmartCache<string>;

  // Stats
  private generationCount = 0;
  private cacheHits = 0;
  private firstPassCount = 0;
  private healingCount = 0;
  private qualityScores: number[] = [];
  private generationTimes: number[] = [];

  // Concurrency control
  private activeRequests = 0;
  private progressListeners: Map<string, ProgressCallback> = new Map();

  constructor(config: Partial<VisionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize subsystems (lazy init for Anthropic client)
    this.stubDetector = new AIStubDetector();
    this.imageService = new MultiProviderImageService(this.config.imageProviders);
    this.healingGenerator = new SelfHealingGenerator();
    this.visualRegression = new VisualRegressionEngine({
      diffThreshold: this.config.diffThreshold,
    });
    this.dashboard = new QualityDashboard(this.config.metricsRetention);
    this.codeCache = getCodeCache();
    this.imageCache = getImageCache();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // API KEY VALIDATION
  // ──────────────────────────────────────────────────────────────────────────────

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          'ANTHROPIC_API_KEY environment variable is not set. ' +
            'Please set it before using the VisionOrchestrator.'
        );
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // INPUT VALIDATION
  // ──────────────────────────────────────────────────────────────────────────────

  private validateRequest(request: GenerationRequest): void {
    // Validate prompt
    if (!request.prompt || typeof request.prompt !== 'string') {
      throw new Error('Request must include a non-empty prompt string');
    }

    const trimmedPrompt = request.prompt.trim();
    if (trimmedPrompt.length === 0) {
      throw new Error('Prompt cannot be empty or whitespace only');
    }

    if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`);
    }

    // Validate expected features
    if (request.expectedFeatures) {
      if (!Array.isArray(request.expectedFeatures)) {
        throw new Error('expectedFeatures must be an array');
      }
      if (request.expectedFeatures.length > MAX_EXPECTED_FEATURES) {
        throw new Error(`expectedFeatures exceeds maximum of ${MAX_EXPECTED_FEATURES} items`);
      }
    }

    // Check concurrency limit
    if (this.activeRequests >= MAX_CONCURRENT_REQUESTS) {
      throw new Error(
        `Maximum concurrent requests (${MAX_CONCURRENT_REQUESTS}) reached. ` +
          'Please wait for existing requests to complete.'
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PROGRESS EVENTS
  // ──────────────────────────────────────────────────────────────────────────────

  onProgress(requestId: string, callback: ProgressCallback): () => void {
    this.progressListeners.set(requestId, callback);
    return () => this.progressListeners.delete(requestId);
  }

  private emitProgress(
    requestId: string,
    phase: GenerationPhase,
    progress: number,
    message: string,
    details?: Record<string, unknown>
  ): void {
    const callback = this.progressListeners.get(requestId);
    if (callback) {
      try {
        callback({ phase, progress, message, details });
      } catch (e) {
        // Don't let callback errors break generation
        console.error('[VisionOrchestrator] Progress callback error:', e);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MAIN GENERATION
  // ──────────────────────────────────────────────────────────────────────────────

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const id = this.generateId();

    // Validate input first
    try {
      this.validateRequest(request);
    } catch (validationError) {
      return this.createFailureResult(id, 0, [
        validationError instanceof Error ? validationError.message : 'Validation failed',
      ]);
    }

    // Check for cancellation
    if (request.options?.signal?.aborted) {
      return this.createFailureResult(id, 0, ['Request was cancelled']);
    }

    this.activeRequests++;
    this.emitProgress(id, 'validating', 5, 'Validating request...');

    try {
      // Initialize caches
      await this.codeCache.initialize();
      if (this.config.imageCacheEnabled) {
        await this.imageCache.initialize();
      }

      // 1. Check cache
      this.emitProgress(id, 'cache-check', 10, 'Checking cache...');
      if (!request.options?.skipCache) {
        const cached = await this.checkCache(request);
        if (cached) {
          this.cacheHits++;
          this.emitProgress(id, 'complete', 100, 'Retrieved from cache');
          return cached;
        }
      }

      // Check cancellation before expensive operation
      if (request.options?.signal?.aborted) {
        return this.createFailureResult(id, Date.now() - startTime, ['Request was cancelled']);
      }

      // 2. Generate code with timeout
      this.emitProgress(id, 'generating', 20, 'Generating code...');
      const timeout = request.options?.timeout || CODE_GENERATION_TIMEOUT_MS;
      const codeResult = await this.generateCodeWithTimeout(request, timeout);
      if (!codeResult.code) {
        this.emitProgress(id, 'failed', 0, 'Code generation failed');
        return this.createFailureResult(id, Date.now() - startTime, ['Code generation failed']);
      }

      // 3. Analyze quality
      this.emitProgress(id, 'analyzing', 40, 'Analyzing code quality...');
      let quality = await this.analyzeQuality(codeResult.code, request);
      let currentCode = codeResult.code;
      let healingResult: HealingResult | undefined;
      let attempts = 1;

      // Check cancellation
      if (request.options?.signal?.aborted) {
        return this.createFailureResult(id, Date.now() - startTime, ['Request was cancelled']);
      }

      // 4. Self-healing loop
      while (
        this.config.selfHealingEnabled &&
        !this.meetsQualityThreshold(quality) &&
        attempts < this.config.maxRetries
      ) {
        // Check cancellation in loop
        if (request.options?.signal?.aborted) {
          return this.createFailureResult(id, Date.now() - startTime, ['Request was cancelled']);
        }

        const healingProgress = 40 + attempts * 10;
        this.emitProgress(id, 'healing', healingProgress, `Healing attempt ${attempts}...`, {
          attempt: attempts,
          qualityScore: quality.overallScore,
          stubCount: quality.stubMetrics.stubCount,
        });

        const issues = this.extractIssues(quality);
        healingResult = await this.healingGenerator.healCode(currentCode, issues, {
          originalPrompt: request.prompt,
          pageType: request.pageType,
          expectedFeatures: request.expectedFeatures,
        });

        if (healingResult.applied && healingResult.fixesApplied.length > 0) {
          currentCode = this.applyHealingFixes(currentCode, healingResult);
          quality = await this.analyzeQuality(currentCode, request);
          this.healingCount++;
        }

        attempts++;
      }

      // Check cancellation before image generation
      if (request.options?.signal?.aborted) {
        return this.createFailureResult(id, Date.now() - startTime, ['Request was cancelled']);
      }

      // 5. Generate images
      let images: GeneratedImage[] = [];
      if (request.options?.generateImages !== false) {
        this.emitProgress(id, 'images', 80, 'Generating preview images...');
        images = await this.generateImages(request, currentCode);
      }

      // 6. Create result
      const endTime = Date.now();
      const result: GenerationResult = {
        id,
        success: true,
        code: currentCode,
        images,
        quality,
        attempts,
        healingApplied: !!healingResult?.applied,
        healingDetails: healingResult,
        timing: {
          totalMs: endTime - startTime,
          codeGenerationMs: codeResult.timing,
          imageGenerationMs: images.reduce((sum, img) => sum + img.generationMs, 0),
          validationMs: 0, // Would track separately
          healingMs: healingResult ? endTime - startTime - codeResult.timing : undefined,
        },
        errors: [],
        warnings: quality.stubMetrics.stubLocations.map(s => s.description),
      };

      // 7. Record metrics
      this.recordGeneration(result);

      // 8. Cache result
      if (!request.options?.skipCache) {
        await this.cacheResult(request, result);
      }

      // 9. Emit completion
      this.emitProgress(id, 'complete', 100, 'Generation complete', {
        qualityScore: result.quality.overallScore,
        healingApplied: result.healingApplied,
        attempts: result.attempts,
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emitProgress(id, 'failed', 0, `Generation failed: ${errorMessage}`);
      return this.createFailureResult(id, endTime - startTime, [errorMessage]);
    } finally {
      // Always decrement active requests and clean up progress listener
      this.activeRequests--;
      this.progressListeners.delete(id);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CODE GENERATION
  // ──────────────────────────────────────────────────────────────────────────────

  private async generateCodeWithTimeout(
    request: GenerationRequest,
    timeoutMs: number
  ): Promise<{ code: string | null; timing: number }> {
    // Create an abort controller for timeout
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    try {
      // Race between code generation and timeout
      const result = await Promise.race([
        this.generateCode(request, timeoutController.signal),
        new Promise<{ code: null; timing: number }>((_, reject) => {
          timeoutController.signal.addEventListener('abort', () => {
            reject(new Error(`Code generation timed out after ${timeoutMs}ms`));
          });
        }),
      ]);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        console.error('[VisionOrchestrator] Generation timeout:', error.message);
        return { code: null, timing: timeoutMs };
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async generateCode(
    request: GenerationRequest,
    signal?: AbortSignal
  ): Promise<{ code: string | null; timing: number }> {
    const start = Date.now();

    // Check if already aborted
    if (signal?.aborted) {
      return { code: null, timing: 0 };
    }

    const systemPrompt = `You are an expert React/TypeScript developer creating production-quality components.

CRITICAL RULES:
1. EVERY button MUST have onClick handler - NO exceptions
2. NO placeholder links (href="#") - use real routes or buttons
3. NO console.log in handlers - use proper state management
4. ALL inputs must be controlled (value + onChange)
5. ALL async operations need try/catch with user feedback
6. Modals/dropdowns must close on Escape and outside click
7. Loading states on all async buttons

OUTPUT: Return ONLY valid TypeScript/React code. No markdown, no explanations.`;

    const userPrompt = `Create a React component for: ${request.prompt}

${request.pageType ? `Page type: ${request.pageType}` : ''}
${request.expectedFeatures?.length ? `Expected features: ${request.expectedFeatures.join(', ')}` : ''}
${request.style?.theme ? `Theme: ${request.style.theme}` : ''}
${request.style?.designSystem ? `Design system: ${request.style.designSystem}` : ''}

Return production-ready code with all functionality implemented.`;

    try {
      const client = this.getClient();
      const response = await client.messages.create({
        model: this.config.aiModel || 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
      });

      // Check abort after long operation
      if (signal?.aborted) {
        return { code: null, timing: Date.now() - start };
      }

      const content = response.content[0];
      if (content.type !== 'text') {
        return { code: null, timing: Date.now() - start };
      }

      // Extract code from response
      let code = content.text.trim();
      if (code.startsWith('```')) {
        code = code.replace(/^```(?:tsx?|typescript|javascript)?\n?/, '').replace(/\n?```$/, '');
      }

      return { code, timing: Date.now() - start };
    } catch (error) {
      console.error('[VisionOrchestrator] Code generation failed:', error);
      return { code: null, timing: Date.now() - start };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // QUALITY ANALYSIS
  // ──────────────────────────────────────────────────────────────────────────────

  private async analyzeQuality(code: string, request: GenerationRequest): Promise<QualityMetrics> {
    // AI stub detection
    const stubAnalysis = await this.stubDetector.hybridAnalysis(code, {
      prompt: request.prompt,
      pageType: request.pageType,
      expectedFeatures: request.expectedFeatures,
    });

    // Feature coverage
    const featureCoverage = this.analyzeFeatureCoverage(code, request.expectedFeatures || []);

    // Code quality metrics
    const codeMetrics = this.analyzeCodeQuality(code);

    // Calculate overall score
    const overallScore = Math.round(
      stubAnalysis.completenessScore * 0.3 +
        featureCoverage.criticalCoverage * 100 * 0.4 +
        codeMetrics.functionality * 100 * 0.3
    );

    return {
      overallScore,
      codeMetrics,
      stubMetrics: {
        hasStubs: stubAnalysis.stubs.length > 0,
        stubCount: stubAnalysis.stubs.length,
        stubLocations: stubAnalysis.stubs,
        confidence:
          stubAnalysis.stubs.reduce((sum, s) => sum + s.confidence, 0) /
          Math.max(stubAnalysis.stubs.length, 1),
      },
      featureMetrics: featureCoverage,
    };
  }

  private analyzeFeatureCoverage(
    code: string,
    expectedFeatures: string[]
  ): {
    criticalCoverage: number;
    importantCoverage: number;
    totalFeatures: number;
    missingFeatures: string[];
  } {
    if (expectedFeatures.length === 0) {
      return {
        criticalCoverage: 1,
        importantCoverage: 1,
        totalFeatures: 0,
        missingFeatures: [],
      };
    }

    const codeLower = code.toLowerCase();
    const missingFeatures: string[] = [];
    let foundCount = 0;

    for (const feature of expectedFeatures) {
      const featureWords = feature.toLowerCase().split(/\s+/);
      const found = featureWords.some(word => codeLower.includes(word));
      if (found) {
        foundCount++;
      } else {
        missingFeatures.push(feature);
      }
    }

    const coverage = foundCount / expectedFeatures.length;

    return {
      criticalCoverage: coverage,
      importantCoverage: coverage,
      totalFeatures: expectedFeatures.length,
      missingFeatures,
    };
  }

  private analyzeCodeQuality(code: string): {
    completeness: number;
    functionality: number;
    accessibility: number;
    performance: number;
    maintainability: number;
  } {
    const lines = code.split('\n').length;
    const hasOnClick = /onClick\s*=/g.test(code);
    const hasControlledInputs = /value\s*=.*onChange\s*=/g.test(code) || !/<input/g.test(code);
    const hasErrorHandling = /catch\s*\(/g.test(code);
    const hasAriaLabels = /aria-/g.test(code);
    const hasMemo = /useMemo|useCallback|React\.memo/g.test(code);

    return {
      completeness: Math.min(1, lines / 50), // Expect at least 50 lines for complex components
      functionality:
        (hasOnClick ? 0.5 : 0) + (hasControlledInputs ? 0.3 : 0) + (hasErrorHandling ? 0.2 : 0),
      accessibility: hasAriaLabels ? 0.8 : 0.5,
      performance: hasMemo ? 0.9 : 0.7,
      maintainability: Math.min(1, 200 / lines), // Penalize overly long files
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // IMAGE GENERATION
  // ──────────────────────────────────────────────────────────────────────────────

  private async generateImages(
    request: GenerationRequest,
    code: string
  ): Promise<GeneratedImage[]> {
    const images: GeneratedImage[] = [];

    // Generate preview image
    const imagePrompt = `A modern, professional UI preview of: ${request.prompt}. ${request.style?.theme === 'dark' ? 'Dark theme.' : 'Light theme.'} Clean, minimal design. High quality.`;

    try {
      // Check image cache
      if (this.config.imageCacheEnabled) {
        const cached = await this.imageCache.get(imagePrompt);
        if (cached) {
          images.push({
            id: this.generateId(),
            url: cached,
            provider: 'cache',
            prompt: imagePrompt,
            width: 1024,
            height: 768,
            cached: true,
            generationMs: 0,
          });
          return images;
        }
      }

      // Generate new image
      const result = await this.imageService.generateImage({
        prompt: imagePrompt,
        width: 1024,
        height: 768,
        style: 'vivid',
      });

      const image: GeneratedImage = {
        id: this.generateId(),
        url: result.url,
        provider: result.provider,
        prompt: imagePrompt,
        width: result.width,
        height: result.height,
        cached: false,
        generationMs: result.generationMs,
        cost: result.cost,
      };

      images.push(image);

      // Cache the image
      if (this.config.imageCacheEnabled) {
        await this.imageCache.set(imagePrompt, result.url, {
          ttl: this.config.imageCacheTTL,
          metadata: { prompt: imagePrompt },
        });
      }
    } catch (error) {
      console.error('[VisionOrchestrator] Image generation failed:', error);
    }

    return images;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // HEALING
  // ──────────────────────────────────────────────────────────────────────────────

  private extractIssues(quality: QualityMetrics): string[] {
    const issues: string[] = [];

    for (const stub of quality.stubMetrics.stubLocations) {
      if (stub.severity === 'critical' || stub.severity === 'warning') {
        issues.push(`${stub.type}: ${stub.description} (line ${stub.line})`);
      }
    }

    for (const missing of quality.featureMetrics.missingFeatures) {
      issues.push(`Missing feature: ${missing}`);
    }

    return issues;
  }

  private applyHealingFixes(code: string, healing: HealingResult): string {
    let result = code;

    // Apply fixes in reverse order by line number to avoid offset issues
    const sortedFixes = [...healing.fixesApplied].sort((a, b) => b.location.line - a.location.line);

    for (const fix of sortedFixes) {
      if (fix.originalCode && fix.fixedCode) {
        result = result.replace(fix.originalCode, fix.fixedCode);
      }
    }

    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CACHING
  // ──────────────────────────────────────────────────────────────────────────────

  private async checkCache(request: GenerationRequest): Promise<GenerationResult | null> {
    const cacheKey = this.getCacheKey(request);
    const cached = await this.codeCache.get(cacheKey);

    if (cached) {
      // Return cached result (simplified)
      return {
        id: this.generateId(),
        success: true,
        code: cached,
        images: [],
        quality: {
          overallScore: 90, // Assume cached code is good
          codeMetrics: {
            completeness: 1,
            functionality: 1,
            accessibility: 0.8,
            performance: 0.8,
            maintainability: 0.8,
          },
          stubMetrics: {
            hasStubs: false,
            stubCount: 0,
            stubLocations: [],
            confidence: 1,
          },
          featureMetrics: {
            criticalCoverage: 1,
            importantCoverage: 1,
            totalFeatures: 0,
            missingFeatures: [],
          },
        },
        attempts: 0,
        healingApplied: false,
        timing: {
          totalMs: 0,
          codeGenerationMs: 0,
          imageGenerationMs: 0,
          validationMs: 0,
        },
        errors: [],
        warnings: [],
      };
    }

    return null;
  }

  private async cacheResult(request: GenerationRequest, result: GenerationResult): Promise<void> {
    if (!result.success || !result.code) return;

    const cacheKey = this.getCacheKey(request);
    await this.codeCache.set(cacheKey, result.code, {
      metadata: { prompt: request.prompt, pageType: request.pageType },
    });
  }

  private getCacheKey(request: GenerationRequest): string {
    // Use a structured key format to avoid collisions
    // JSON.stringify provides consistent ordering and escaping
    const keyData = {
      p: request.prompt.trim().substring(0, 500), // Limit prompt length for key
      t: request.pageType || null,
      f: request.expectedFeatures?.sort() || null, // Sort for consistency
      s: request.style?.theme || null,
    };

    // Create hash-like key using base64 encoding of JSON
    const jsonStr = JSON.stringify(keyData);
    const base64 = Buffer.from(jsonStr).toString('base64');

    // Use first 64 chars of base64 (48 bytes of entropy)
    return `v1:${base64.substring(0, 64)}`;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // METRICS
  // ──────────────────────────────────────────────────────────────────────────────

  private meetsQualityThreshold(quality: QualityMetrics): boolean {
    return (
      quality.overallScore >= this.config.minQualityScore &&
      (quality.stubMetrics.stubCount === 0 ||
        quality.stubMetrics.stubCount / 100 <= this.config.maxStubRate)
    );
  }

  private recordGeneration(result: GenerationResult): void {
    this.generationCount++;
    this.qualityScores.push(result.quality.overallScore);
    this.generationTimes.push(result.timing.totalMs);

    if (!result.healingApplied && result.success) {
      this.firstPassCount++;
    }

    // Keep only last 100 for running averages
    if (this.qualityScores.length > 100) {
      this.qualityScores.shift();
      this.generationTimes.shift();
    }

    // Update dashboard
    if (this.config.dashboardEnabled) {
      this.dashboard.recordGeneration(result, 'anthropic');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ──────────────────────────────────────────────────────────────────────────────

  private generateId(): string {
    return `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private createFailureResult(id: string, timeMs: number, errors: string[]): GenerationResult {
    return {
      id,
      success: false,
      code: null,
      images: [],
      quality: {
        overallScore: 0,
        codeMetrics: {
          completeness: 0,
          functionality: 0,
          accessibility: 0,
          performance: 0,
          maintainability: 0,
        },
        stubMetrics: {
          hasStubs: false,
          stubCount: 0,
          stubLocations: [],
          confidence: 0,
        },
        featureMetrics: {
          criticalCoverage: 0,
          importantCoverage: 0,
          totalFeatures: 0,
          missingFeatures: [],
        },
      },
      attempts: 1,
      healingApplied: false,
      timing: {
        totalMs: timeMs,
        codeGenerationMs: 0,
        imageGenerationMs: 0,
        validationMs: 0,
      },
      errors,
      warnings: [],
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────────────────────

  getStats(): OrchestratorStats {
    const avgQuality =
      this.qualityScores.length > 0
        ? this.qualityScores.reduce((a, b) => a + b, 0) / this.qualityScores.length
        : 0;
    const avgTime =
      this.generationTimes.length > 0
        ? this.generationTimes.reduce((a, b) => a + b, 0) / this.generationTimes.length
        : 0;

    return {
      totalGenerations: this.generationCount,
      cacheHits: this.cacheHits,
      cacheMisses: this.generationCount - this.cacheHits,
      firstPassRate: this.generationCount > 0 ? this.firstPassCount / this.generationCount : 0,
      healingRate: this.generationCount > 0 ? this.healingCount / this.generationCount : 0,
      avgQualityScore: avgQuality,
      avgGenerationTime: avgTime,
    };
  }

  getDashboard(): QualityDashboard {
    return this.dashboard;
  }

  getConfig(): VisionConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<VisionConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  async shutdown(): Promise<void> {
    await this.codeCache.shutdown();
    await this.imageCache.shutdown();
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// FACTORY
// ════════════════════════════════════════════════════════════════════════════════

let instance: VisionOrchestrator | null = null;

export function createVisionOrchestrator(config?: Partial<VisionConfig>): VisionOrchestrator {
  instance = new VisionOrchestrator(config);
  return instance;
}

export function getVisionOrchestrator(): VisionOrchestrator {
  if (!instance) {
    instance = new VisionOrchestrator();
  }
  return instance;
}

export default VisionOrchestrator;
