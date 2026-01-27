/**
 * OLYMPUS 2.0 - Centralized User-Facing Messages
 * All user-facing strings should be defined here for consistency and i18n readiness
 */

export const ERROR_MESSAGES = {
  // Generic
  GENERIC: 'An error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',

  // Auth
  AUTH_FAILED: 'Authentication failed. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address.',

  // Projects
  PROJECT_LOAD_FAILED: 'Failed to load projects. Please try again.',
  PROJECT_CREATE_FAILED: 'Failed to create project.',
  PROJECT_NOT_FOUND: 'Project not found.',

  // Builds
  BUILD_LOAD_FAILED: 'Failed to load builds. Please try again.',
  BUILD_RETRY_FAILED: 'Failed to retry build.',
  BUILD_FETCH_FAILED: 'Failed to fetch build.',

  // Deployments
  DEPLOYMENT_LOAD_FAILED: 'Failed to load deployments. Please try again.',
  REDEPLOY_FAILED: 'Failed to redeploy.',

  // Settings
  PROFILE_SAVE_FAILED: 'Failed to save profile.',
  PREFERENCES_LOAD_FAILED: 'Failed to load preferences.',
  PREFERENCES_SAVE_FAILED: 'Failed to save preferences.',

  // File Operations
  FILE_UPLOAD_FAILED: 'Failed to upload file.',
  FILE_DOWNLOAD_FAILED: 'Failed to download file.',
  EXPORT_FAILED: 'Failed to export. Please try again.',

  // Sharing
  COPY_LINK_FAILED: 'Failed to copy link.',
} as const;

export const SUCCESS_MESSAGES = {
  // Generic
  SAVED: 'Changes saved successfully.',
  DELETED: 'Deleted successfully.',
  COPIED: 'Copied to clipboard.',

  // Auth
  SIGNED_IN: 'Signed in successfully.',
  SIGNED_OUT: 'Signed out successfully.',
  EMAIL_SENT: 'Email sent successfully.',

  // Projects
  PROJECT_CREATED: 'Project created successfully.',
  PROJECT_UPDATED: 'Project updated successfully.',
  PROJECT_DELETED: 'Project deleted successfully.',

  // Builds
  BUILD_STARTED: 'Build started.',
  BUILD_RETRIED: 'Build retry initiated.',

  // Deployments
  DEPLOYMENT_STARTED: 'Deployment started.',
  ROLLBACK_STARTED: 'Rollback initiated.',

  // Settings
  PROFILE_SAVED: 'Profile saved successfully!',
} as const;

export const LOADING_MESSAGES = {
  DEFAULT: 'Loading...',
  CREATING: 'Creating...',
  SAVING: 'Saving...',
  DELETING: 'Deleting...',
  UPLOADING: 'Uploading...',
  EXPORTING: 'Exporting...',
  BUILDING: 'Building...',
  DEPLOYING: 'Deploying...',
} as const;

export const PLACEHOLDER_MESSAGES = {
  SEARCH: 'Search...',
  PROJECT_NAME: 'My Awesome Project',
  PROJECT_DESCRIPTION: 'Describe what you want to build. Be as detailed as possible - OLYMPUS AI will use this to generate your project.',
  BIO: 'Tell us about yourself...',
} as const;

export const COMING_SOON_FEATURES = {
  AVATAR_UPLOAD: 'Avatar Upload',
  CHANGE_PASSWORD: 'Change Password',
  TWO_FACTOR_AUTH: 'Two-Factor Authentication',
  DELETE_ACCOUNT: 'Delete Account',
  UPGRADE_PLAN: 'Upgrade Plan',
  API_KEY_GENERATION: 'API Key Generation',
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES;
export type LoadingMessageKey = keyof typeof LOADING_MESSAGES;
