/**
 * OLYMPUS 2.0 - Application Configuration Constants
 * Centralized configuration values to eliminate magic numbers
 */

// ==================== TIMING ====================

export const TIMING = {
  /** Toast notification display duration (ms) */
  TOAST_DURATION: 3000,

  /** Polling interval for build status (ms) */
  BUILD_POLL_INTERVAL: 2000,

  /** Coming soon toast duration (ms) */
  COMING_SOON_DURATION: 3000,

  /** Debounce delay for search inputs (ms) */
  DEBOUNCE_DELAY: 300,

  /** Auto-save interval (ms) */
  AUTO_SAVE_INTERVAL: 5000,
} as const;

// ==================== API ====================

export const API = {
  /** Default request timeout (ms) */
  TIMEOUT: 30000,

  /** Fast request timeout (ms) */
  FAST_TIMEOUT: 15000,

  /** Number of retry attempts for failed requests */
  RETRY_COUNT: 3,

  /** Base delay between retries (ms) - uses exponential backoff */
  RETRY_DELAY: 1000,
} as const;

// ==================== PAGINATION ====================

export const PAGINATION = {
  /** Default page size for lists */
  DEFAULT_PAGE_SIZE: 10,

  /** Maximum page size allowed */
  MAX_PAGE_SIZE: 100,

  /** Projects per page */
  PROJECTS_PER_PAGE: 10,

  /** Builds per page */
  BUILDS_PER_PAGE: 10,

  /** Deployments per page */
  DEPLOYMENTS_PER_PAGE: 10,
} as const;

// ==================== VALIDATION ====================

export const VALIDATION = {
  /** Minimum project name length */
  PROJECT_NAME_MIN: 2,

  /** Maximum project name length */
  PROJECT_NAME_MAX: 100,

  /** Maximum description length */
  DESCRIPTION_MAX: 500,

  /** Maximum file upload size (bytes) - 10MB */
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  /** Allowed file types for uploads */
  ALLOWED_FILE_TYPES: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
} as const;

// ==================== UI ====================

export const UI = {
  /** Sidebar collapsed width (px) */
  SIDEBAR_COLLAPSED_WIDTH: 64,

  /** Sidebar expanded width (px) */
  SIDEBAR_EXPANDED_WIDTH: 256,

  /** Mobile breakpoint (px) */
  MOBILE_BREAKPOINT: 768,

  /** Maximum toast notifications shown */
  MAX_TOASTS: 3,
} as const;

// ==================== STORAGE KEYS ====================

export const STORAGE_KEYS = {
  NOTIFICATION_PREFERENCES: 'olympus_notification_preferences',
  THEME: 'olympus_theme',
  SIDEBAR_STATE: 'olympus_sidebar_state',
  RECENT_PROJECTS: 'olympus_recent_projects',
} as const;

// ==================== TIME CONVERSIONS ====================

export const TIME = {
  MS_PER_SECOND: 1000,
  MS_PER_MINUTE: 60000,
  MS_PER_HOUR: 3600000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
} as const;

// ==================== USAGE LIMITS ====================

export const LIMITS = {
  /** Free tier build limit per month */
  FREE_BUILDS_PER_MONTH: 10,

  /** Free tier storage limit (MB) */
  FREE_STORAGE_MB: 500,

  /** Free tier projects limit */
  FREE_PROJECTS: 3,

  /** Maximum emails per day */
  MAX_EMAILS_PER_DAY: 20,
} as const;

export default {
  TIMING,
  API,
  PAGINATION,
  VALIDATION,
  UI,
  STORAGE_KEYS,
  TIME,
  LIMITS,
} as const;
