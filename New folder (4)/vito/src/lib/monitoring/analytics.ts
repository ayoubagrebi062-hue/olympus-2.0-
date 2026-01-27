/**
 * OLYMPUS 3.0 - Analytics Tracking
 * User behavior and business event tracking
 */

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsEvent {
  name: string;
  properties: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  context: EventContext;
}

interface EventContext {
  page?: string;
  referrer?: string;
  userAgent?: string;
  screen?: { width: number; height: number };
  locale?: string;
  timezone?: string;
}

interface UserProperties {
  userId: string;
  email?: string;
  name?: string;
  plan?: string;
  createdAt?: Date;
  traits?: Record<string, unknown>;
}

interface PageViewEvent {
  path: string;
  title?: string;
  referrer?: string;
  duration?: number;
}

// ============================================================================
// STATE
// ============================================================================

let currentUserId: string | null = null;
let currentSessionId: string | null = null;
const eventBuffer: AnalyticsEvent[] = [];
const MAX_BUFFER_SIZE = 1000;
const FLUSH_INTERVAL = 30000; // 30 seconds

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize analytics tracking
 */
export function initAnalytics(config: {
  apiEndpoint?: string;
  enabled?: boolean;
} = {}): void {
  if (typeof window === 'undefined') return;

  // Generate session ID
  currentSessionId = generateSessionId();

  // Track page views on navigation
  trackInitialPageView();

  // Set up periodic flush
  setInterval(() => {
    flushEvents();
  }, FLUSH_INTERVAL);

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    flushEvents();
  });

  // Track visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents();
    }
  });
}

/**
 * Identify a user
 */
export function identify(properties: UserProperties): void {
  currentUserId = properties.userId;

  trackEvent('user_identified', {
    userId: properties.userId,
    email: properties.email,
    name: properties.name,
    plan: properties.plan,
    traits: properties.traits,
  });
}

/**
 * Reset user identity (on logout)
 */
export function resetIdentity(): void {
  currentUserId = null;
  currentSessionId = generateSessionId();

  trackEvent('user_logout', {});
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Track a custom event
 */
export function trackEvent(
  name: string,
  properties: Record<string, unknown> = {}
): void {
  const event: AnalyticsEvent = {
    name,
    properties,
    userId: currentUserId || undefined,
    sessionId: currentSessionId || undefined,
    timestamp: new Date(),
    context: getEventContext(),
  };

  eventBuffer.push(event);

  // Trim buffer if too large
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.splice(0, eventBuffer.length - MAX_BUFFER_SIZE);
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[analytics]', name, properties);
  }
}

/**
 * Track a page view
 */
export function trackPageView(pageView: PageViewEvent): void {
  trackEvent('page_view', {
    path: pageView.path,
    title: pageView.title,
    referrer: pageView.referrer,
    duration: pageView.duration,
  });
}

/**
 * Track a click event
 */
export function trackClick(
  elementId: string,
  properties: Record<string, unknown> = {}
): void {
  trackEvent('click', {
    elementId,
    ...properties,
  });
}

/**
 * Track a form submission
 */
export function trackFormSubmit(
  formId: string,
  properties: Record<string, unknown> = {}
): void {
  trackEvent('form_submit', {
    formId,
    ...properties,
  });
}

/**
 * Track an error
 */
export function trackError(
  error: Error,
  context: Record<string, unknown> = {}
): void {
  trackEvent('error', {
    message: error.message,
    name: error.name,
    stack: error.stack?.slice(0, 500),
    ...context,
  });
}

// ============================================================================
// BUSINESS EVENTS
// ============================================================================

/**
 * Track signup event
 */
export function trackSignup(properties: {
  method: 'email' | 'google' | 'github';
  plan?: string;
  referrer?: string;
}): void {
  trackEvent('signup', properties);
}

/**
 * Track login event
 */
export function trackLogin(properties: {
  method: 'email' | 'google' | 'github';
}): void {
  trackEvent('login', properties);
}

/**
 * Track subscription event
 */
export function trackSubscription(properties: {
  action: 'created' | 'upgraded' | 'downgraded' | 'cancelled';
  plan: string;
  previousPlan?: string;
  revenue?: number;
  currency?: string;
}): void {
  trackEvent('subscription', properties);
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(
  feature: string,
  properties: Record<string, unknown> = {}
): void {
  trackEvent('feature_usage', {
    feature,
    ...properties,
  });
}

/**
 * Track build creation
 */
export function trackBuildCreated(properties: {
  buildId: string;
  type: string;
  templateUsed?: string;
}): void {
  trackEvent('build_created', properties);
}

/**
 * Track build export
 */
export function trackBuildExported(properties: {
  buildId: string;
  format: string;
}): void {
  trackEvent('build_exported', properties);
}

// ============================================================================
// ENGAGEMENT TRACKING
// ============================================================================

let pageStartTime: number | null = null;

/**
 * Track time spent on page
 */
export function trackTimeOnPage(path: string): void {
  if (pageStartTime) {
    const duration = Date.now() - pageStartTime;
    trackEvent('time_on_page', {
      path,
      duration,
      durationSeconds: Math.round(duration / 1000),
    });
  }
  pageStartTime = Date.now();
}

/**
 * Track scroll depth
 */
export function trackScrollDepth(depth: number, path: string): void {
  trackEvent('scroll_depth', {
    depth,
    path,
  });
}

/**
 * Initialize scroll tracking
 */
export function initScrollTracking(): void {
  if (typeof window === 'undefined') return;

  let maxDepth = 0;
  const thresholds = [25, 50, 75, 100];
  const trackedThresholds = new Set<number>();

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const depth = Math.round((scrollTop / docHeight) * 100);

    if (depth > maxDepth) {
      maxDepth = depth;

      for (const threshold of thresholds) {
        if (depth >= threshold && !trackedThresholds.has(threshold)) {
          trackedThresholds.add(threshold);
          trackScrollDepth(threshold, window.location.pathname);
        }
      }
    }
  });
}

// ============================================================================
// DATA EXPORT
// ============================================================================

/**
 * Get buffered events
 */
export function getBufferedEvents(): AnalyticsEvent[] {
  return [...eventBuffer];
}

/**
 * Clear event buffer
 */
export function clearEventBuffer(): void {
  eventBuffer.length = 0;
}

/**
 * Flush events to backend
 */
export async function flushEvents(): Promise<void> {
  if (eventBuffer.length === 0) return;

  const events = [...eventBuffer];
  eventBuffer.length = 0;

  try {
    // In production, send to analytics backend
    if (process.env.NODE_ENV === 'production') {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    }
  } catch (error) {
    // Re-add events on failure
    eventBuffer.unshift(...events);
    console.warn('[analytics] Flush failed:', error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getEventContext(): EventContext {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    page: window.location.pathname,
    referrer: document.referrer || undefined,
    userAgent: navigator.userAgent,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function trackInitialPageView(): void {
  if (typeof window !== 'undefined') {
    trackPageView({
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer,
    });
    pageStartTime = Date.now();
  }
}

// ============================================================================
// REACT HOOKS HELPERS
// ============================================================================

/**
 * Create analytics context for React
 */
export function createAnalyticsContext() {
  return {
    trackEvent,
    trackPageView,
    trackClick,
    trackFormSubmit,
    trackFeatureUsage,
    identify,
    resetIdentity,
  };
}
