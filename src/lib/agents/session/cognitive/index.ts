// Types
export * from './types';

// Constants - All tunable values in one place
export * from './constants';

// Validation - Input validation and safety guards
export {
  SIZE_LIMITS,
  RATE_LIMITS,
  checkRateLimitForUser,
  cleanupRateLimits,
  validateBuildInput,
  validateFeedbackInput,
  validatePreferenceInput,
  validateCommunicationStyleInput,
  pruneSessionToLimits,
  estimateSessionSize,
  isSessionNearLimits,
  sanitizeUserId,
  type ValidationResult,
  type ValidatedBuildInput,
  type FeedbackInput,
  type PreferenceInput,
  type CommunicationStyleInput,
} from './validation';

// Core
export { CognitiveEngine } from './engine';
export {
  CognitiveSessionManager,
  cognitiveSessionManager,
  type CognitivePersistence,
  InMemoryCognitivePersistence,
} from './manager';

// Integration
export {
  withCognitiveContext,
  onBuildComplete,
  getSmartSuggestions,
  getPrefilledConfig,
  recordIteration,
  getConversationContext,
} from './integration';

// Session Limits (PATCH 3)
export {
  SESSION_LIMITS,
  enforceSessionLimits,
  checkSessionSize,
  aggressiveCleanup,
  estimateItemSize,
  canAcceptMoreData,
} from './limits';

// Session Locking (PATCH 6)
export {
  SessionLockManager,
  sessionLockManager,
  OptimisticLockError,
  LockTimeoutError,
  type VersionedSession,
} from './locking';
