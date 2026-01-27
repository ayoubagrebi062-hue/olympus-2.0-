/**
 * OLYMPUS 2.0 - Security Utilities
 *
 * Barrel exports for security-related functions.
 */

export {
  recordFailedAttempt,
  recordSuccessfulLogin,
  isLockedOut,
  unlockAccount,
} from './brute-force';

export {
  logAuthEvent,
  logLoginSuccess,
  logLoginFailure,
  logAccountLocked,
  logPasswordChanged,
  logRoleChanged,
} from './audit';

export {
  getUserSessions,
  revokeSession,
  revokeOtherSessions,
  revokeAllSessions,
  isSessionValid,
  shouldRefreshSession,
  getSessionExpiry,
  formatSessionInfo,
} from './session';
