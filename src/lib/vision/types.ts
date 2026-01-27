/**
 * OLYMPUS VISION SYSTEM - Type Definitions
 */

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

export interface VisionConfig {
  // AI Analysis
  aiProvider: 'anthropic' | 'openai' | 'local';
  aiModel?: string;

  // Image Generation
  imageProviders: ImageProviderConfig[];
  imageCacheEnabled: boolean;
  imageCacheTTL: number;

  // Quality Thresholds
  minQualityScore: number;
  maxStubRate: number;
  maxRetries: number;

  // Self-Healing
  selfHealingEnabled: boolean;
  learningEnabled: boolean;

  // Visual Regression
  visualRegressionEnabled: boolean;
  diffThreshold: number;

  // Dashboard
  dashboardEnabled: boolean;
  metricsRetention: number;
}

export interface ImageProviderConfig {
  name: 'pollinations' | 'dalle' | 'stability' | 'leonardo' | 'midjourney';
  enabled: boolean;
  priority: number;
  apiKey?: string;
  webhookUrl?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  costPerImage?: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// GENERATION RESULTS
// ════════════════════════════════════════════════════════════════════════════════

export interface GenerationResult {
  id: string;
  success: boolean;
  code: string | null;
  images: GeneratedImage[];
  quality: QualityMetrics;
  attempts: number;
  healingApplied: boolean;
  healingDetails?: HealingResult;
  timing: {
    totalMs: number;
    codeGenerationMs: number;
    imageGenerationMs: number;
    validationMs: number;
    healingMs?: number;
  };
  errors: string[];
  warnings: string[];
}

export interface GeneratedImage {
  id: string;
  url: string;
  provider: string;
  prompt: string;
  width: number;
  height: number;
  cached: boolean;
  generationMs: number;
  cost?: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// QUALITY METRICS
// ════════════════════════════════════════════════════════════════════════════════

export interface QualityMetrics {
  overallScore: number; // 0-100

  // Code Quality
  codeMetrics: {
    completeness: number;
    functionality: number;
    accessibility: number;
    performance: number;
    maintainability: number;
  };

  // Stub Detection
  stubMetrics: {
    hasStubs: boolean;
    stubCount: number;
    stubLocations: StubLocation[];
    confidence: number;
  };

  // Feature Coverage
  featureMetrics: {
    criticalCoverage: number;
    importantCoverage: number;
    totalFeatures: number;
    missingFeatures: string[];
  };

  // Visual Quality (if visual regression enabled)
  visualMetrics?: {
    renderSuccess: boolean;
    diffPercentage: number;
    brokenElements: string[];
    accessibilityIssues: string[];
  };
}

export interface StubLocation {
  line: number;
  column: number;
  type: 'todo' | 'placeholder' | 'empty-handler' | 'incomplete-logic' | 'mock-data';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  suggestedFix?: string;
  confidence: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// VISUAL REGRESSION
// ════════════════════════════════════════════════════════════════════════════════

export interface VisualDiff {
  baseline: string;
  current: string;
  diff: string;
  diffPercentage: number;
  changedRegions: DiffRegion[];
  brokenElements: BrokenElement[];
  passed: boolean;
}

export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  changeType: 'added' | 'removed' | 'modified';
  severity: 'critical' | 'warning' | 'info';
}

export interface BrokenElement {
  selector: string;
  issue: 'missing' | 'overlapping' | 'truncated' | 'misaligned' | 'invisible';
  description: string;
  screenshot?: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// SELF-HEALING
// ════════════════════════════════════════════════════════════════════════════════

export interface HealingResult {
  applied: boolean;
  originalIssues: string[];
  fixesApplied: HealingFix[];
  remainingIssues: string[];
  confidenceScore: number;
  learningId?: string;
}

export interface HealingFix {
  issueType: string;
  location: { line: number; column: number };
  originalCode: string;
  fixedCode: string;
  explanation: string;
  confidence: number;
  source: 'rule-based' | 'ai-generated' | 'learned';
}

export interface LearningEntry {
  id: string;
  timestamp: string;
  issuePattern: string;
  fixPattern: string;
  successCount: number;
  failureCount: number;
  lastUsed: string;
  contexts: string[];
}

// ════════════════════════════════════════════════════════════════════════════════
// PROVIDER STATUS
// ════════════════════════════════════════════════════════════════════════════════

export interface ProviderStatus {
  name: string;
  healthy: boolean;
  latencyMs: number;
  successRate: number;
  requestsToday: number;
  costToday: number;
  lastError?: string;
  lastErrorTime?: string;
  circuitBreaker: {
    state: 'closed' | 'open' | 'half-open';
    failureCount: number;
    nextRetryTime?: string;
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// DASHBOARD METRICS
// ════════════════════════════════════════════════════════════════════════════════

export interface DashboardMetrics {
  timestamp: string;

  // Generation Stats
  generation: {
    totalRequests: number;
    successRate: number;
    avgGenerationTime: number;
    avgQualityScore: number;
  };

  // Healing Stats
  healing: {
    healingRate: number;
    avgHealingTime: number;
    topIssues: { issue: string; count: number }[];
    learningEntries: number;
  };

  // Provider Stats
  providers: ProviderStatus[];

  // Quality Trends
  trends: {
    qualityScores: { time: string; score: number }[];
    stubRates: { time: string; rate: number }[];
    firstPassRates: { time: string; rate: number }[];
  };

  // Alerts
  alerts: {
    level: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }[];
}

// ════════════════════════════════════════════════════════════════════════════════
// CACHE
// ════════════════════════════════════════════════════════════════════════════════

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: string;
  expiresAt: string;
  hits: number;
  size: number;
  contentHash: string;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictions: number;
}
