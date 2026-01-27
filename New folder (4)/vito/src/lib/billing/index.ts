/**
 * OLYMPUS 2.0 - Billing Module
 */

// Types
export * from './types';

// Constants
export * from './constants';

// Errors
export * from './errors';

// Stripe client
export { getStripe, getStripePublishableKey, isTestMode } from './stripe';

// Customer management
export * from './customer';

// Checkout
export * from './checkout';

// Subscriptions
export * from './subscriptions';

// Usage tracking
export {
  trackUsage,
  trackBuild,
  trackDeploy,
  trackStorage,
  trackAiTokens,
  trackApiCall,
  getCurrentUsage,
  getAllUsage,
} from './usage';

// Limits
export {
  checkLimit,
  getLimitForMetric,
  getUsageSummary,
  isApproachingLimit,
  getTenantLimits,
} from './limits';

// Usage reporter
export { reportUsageToStripe, getUsageReport } from './usage-reporter';

// Features
export {
  hasFeature,
  planHasFeature,
  checkFeature,
  requireFeature,
  getFeaturesForPlan,
  getTenantFeatures,
  getUpgradeFeatures,
  getMinimumPlanForFeature,
  checkFeatures,
  getFeatureComparison,
} from './features';

// Trials
export {
  isTrialEligible,
  getTrialStatus,
  extendTrial,
  getExpiringTrials,
  handleTrialExpired,
  getTrialConfig,
} from './trials';
