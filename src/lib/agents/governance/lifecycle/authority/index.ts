/**
 * OLYMPUS 2.0 - Agent Lifecycle Authority Layer
 * Version 8.0.0
 * Complete lifecycle authority exports
 */

// Authority Types (excluding IAgentLifecycleAuthority to avoid duplicate)
export type { TransitionRequest, TransitionResult } from './types';
export { LifecycleTransitionError } from './types';

// Authority Interface (use this as the canonical export for IAgentLifecycleAuthority)
export type { IAgentLifecycleAuthority } from './IAgentLifecycleAuthority';

// Authority Implementation
export * from './AgentLifecycleAuthority';
