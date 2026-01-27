/**
 * OLYMPUS 3.0 - Monitoring & Analytics
 * Centralized exports for all monitoring utilities
 */

// Error tracking
export {
  captureError,
  captureException,
  captureWarning,
  captureMessage,
  withErrorTracking,
  createErrorScope,
  getErrorStats,
  getErrorById,
  clearErrors,
  initializeErrorTracking,
} from './error-tracker';

// Performance metrics
export {
  incrementCounter,
  getCounter,
  setGauge,
  getGauge,
  recordHistogram,
  getHistogramStats,
  timeAsync,
  timeSync,
  startTimer,
  recordWebVital,
  getWebVitals,
  initWebVitals,
  getPrometheusMetrics,
  getMetricsJSON,
  resetMetrics,
} from './metrics';

// Analytics
export {
  initAnalytics,
  identify,
  resetIdentity,
  trackEvent,
  trackPageView,
  trackClick,
  trackFormSubmit,
  trackError,
  trackSignup,
  trackLogin,
  trackSubscription,
  trackFeatureUsage,
  trackBuildCreated,
  trackBuildExported,
  trackTimeOnPage,
  trackScrollDepth,
  initScrollTracking,
  getBufferedEvents,
  clearEventBuffer,
  flushEvents,
  createAnalyticsContext,
} from './analytics';

// Alerting
export {
  alertRules,
  shouldAlert,
  isInCooldown,
  evaluateAlertRule,
  sendAlert,
  getActiveAlerts,
  acknowledgeAlert,
  clearResolvedAlerts,
  getAlertRules,
  updateAlertRule,
  type AlertRule,
  type Alert,
  type AlertSeverity,
  type AlertChannel,
} from './alerts';

// ============================================================================
// UNIFIED INITIALIZATION
// ============================================================================

/**
 * Initialize all monitoring systems
 */
export function initializeMonitoring(
  config: {
    errorTracking?: boolean;
    webVitals?: boolean;
    analytics?: boolean;
    analyticsEndpoint?: string;
  } = {}
): void {
  const { errorTracking = true, webVitals = true, analytics = true } = config;

  if (errorTracking) {
    const { initializeErrorTracking } = require('./error-tracker');
    initializeErrorTracking();
  }

  if (webVitals && typeof window !== 'undefined') {
    const { initWebVitals } = require('./metrics');
    initWebVitals();
  }

  if (analytics && typeof window !== 'undefined') {
    const { initAnalytics, initScrollTracking } = require('./analytics');
    initAnalytics({ apiEndpoint: config.analyticsEndpoint });
    initScrollTracking();
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[monitoring] Initialized with config:', {
      errorTracking,
      webVitals,
      analytics,
    });
  }
}

// ============================================================================
// MONITORING DASHBOARD DATA
// ============================================================================

/**
 * Get comprehensive monitoring dashboard data
 */
export async function getDashboardData(): Promise<{
  errors: ReturnType<typeof import('./error-tracker').getErrorStats>;
  metrics: ReturnType<typeof import('./metrics').getMetricsJSON>;
  analyticsEvents: number;
}> {
  const { getErrorStats } = await import('./error-tracker');
  const { getMetricsJSON } = await import('./metrics');
  const { getBufferedEvents } = await import('./analytics');

  return {
    errors: getErrorStats(),
    metrics: getMetricsJSON(),
    analyticsEvents: getBufferedEvents().length,
  };
}
