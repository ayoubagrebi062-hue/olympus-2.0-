/**
 * OLYMPUS 2.0 - Governance Module
 * Authoritative exports for governance system
 * @version 8.0.0
 */

// Governance Seal (AUTHORITATIVE)
export * from './governance-seal';

// Runtime Startup (CRITICAL)
export * from './runtime-startup';

// Lifecycle Layer (AUTHORITATIVE)
export * from './lifecycle/contract';
// Note: authority types re-exported via contract to avoid duplicates
export { AgentLifecycleAuthority } from './lifecycle/authority';
export * from './lifecycle/gate';
export * from './lifecycle/store';
export * from './lifecycle/postgres';
export * from './lifecycle/postgres-gate';

// Foundation Layer
export * from './types';
export { IdentityAuthority } from './authority/identity';
export * from './primitives/crypto';
export * from './primitives/version';

// Persistence Layer
export * from './persistence/verification-store';

// Enforcement Layer
export * from './ledger';
export * from './invariant';
export * from './store';

// Control Layer (control-plane already re-exports epochs and blast-radius)
export * from './control-plane';
