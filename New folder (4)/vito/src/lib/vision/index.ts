/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   OLYMPUS VISION SYSTEM v2.0 - 10X UPGRADE                                   ║
 * ║                                                                               ║
 * ║   "Self-healing, AI-powered visual intelligence that learns, adapts,         ║
 * ║    and never ships broken code."                                             ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║   QUICK START:                                                                 ║
 * ║                                                                               ║
 * ║     // Simple (one line)                                                      ║
 * ║     const code = await vision("Create a login form");                         ║
 * ║                                                                               ║
 * ║     // Streaming (real-time)                                                  ║
 * ║     for await (const chunk of visionStream("Create a form")) {                ║
 * ║       process.stdout.write(chunk.text);                                       ║
 * ║     }                                                                         ║
 * ║                                                                               ║
 * ║   CAPABILITIES:                                                               ║
 * ║   ├── AI Semantic Stub Detection (not regex - actual understanding)          ║
 * ║   ├── Multi-Provider Image Failover (Pollinations → DALL-E → Stability)     ║
 * ║   ├── Visual Regression Testing (screenshot diff, broken UI detection)       ║
 * ║   ├── Self-Healing Generation (auto-fix failures, learns from mistakes)      ║
 * ║   ├── Quality Intelligence Dashboard (real-time metrics, predictions)        ║
 * ║   └── Smart Caching (content-addressed, cross-session persistence)           ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// ════════════════════════════════════════════════════════════════════════════════
// SIMPLE MODE - Start here! One line, just works.
// ════════════════════════════════════════════════════════════════════════════════

export {
  vision,
  visionFull,
  component,
  landingPage,
  form,
  dashboard,
  type SimpleOptions,
  type SimpleResult,
} from './simple';

// Re-export vision as default for maximum simplicity
export { default } from './simple';

// ════════════════════════════════════════════════════════════════════════════════
// STREAMING MODE - Real-time generation like the pros
// ════════════════════════════════════════════════════════════════════════════════

export {
  visionStream,
  streamTo,
  streamToConsole,
  createWebStream,
  createSSEResponse,
  type StreamChunk,
  type StreamResult,
  type StreamOptions,
  type UseVisionStreamReturn,
} from './streaming';

// ════════════════════════════════════════════════════════════════════════════════
// ADVANCED MODE - Full control when you need it
// ════════════════════════════════════════════════════════════════════════════════

// Core exports
export {
  VisionOrchestrator,
  createVisionOrchestrator,
  getVisionOrchestrator,
} from './orchestrator';

export {
  AIStubDetector,
  getAIStubDetector,
} from './ai-stub-detector';

export {
  MultiProviderImageService,
  getMultiProviderImageService,
} from './multi-provider-images';

export {
  VisualRegressionEngine,
  getVisualRegressionEngine,
} from './visual-regression';

export {
  SelfHealingGenerator,
  getSelfHealingGenerator,
} from './self-healing';

export {
  QualityDashboard,
  getQualityDashboard,
} from './quality-dashboard';

export {
  SmartCache,
  ImageCache,
  CodeCache,
  AnalysisCache,
  getSmartCache,
  getImageCache,
  getCodeCache,
  shutdownAllCaches,
  removeCache,
} from './smart-cache';

// Types
export type {
  VisionConfig,
  ImageProviderConfig,
  GenerationResult,
  GeneratedImage,
  QualityMetrics,
  StubLocation,
  VisualDiff,
  DiffRegion,
  BrokenElement,
  HealingResult,
  HealingFix,
  LearningEntry,
  ProviderStatus,
  DashboardMetrics,
  CacheEntry,
  CacheStats,
} from './types';
