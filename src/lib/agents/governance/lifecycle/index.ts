/**
 * OLYMPUS 2.0 - Agent Lifecycle Layer
 * Version 8.0.0
 * Complete lifecycle management exports
 */

// Lifecycle Contract (excludes IAgentLifecycleAuthority to avoid duplicate with authority)
export { AgentLifecycleState } from './contract';
export type { AgentLifecycleRecord, AgentLifecycleTransition } from './contract';

// Authority Layer (SINGLE WRITER) - exports IAgentLifecycleAuthority
export * from './authority';

// Runtime Gate Interface
export * from './gate';

// Persistence Store Interface
export * from './store';

// Postgres Implementation
export * from './postgres';

// Postgres Gate Implementation
export * from './postgres-gate';
