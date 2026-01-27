/**
 * OLYMPUS 2.0 - Agent Executor Types
 */

import type { AgentId, AgentInput, AgentOutput, AgentStatus, AgentDefinition } from '../types';

/** Execution options */
export interface ExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  validateOutput?: boolean;
  streamOutput?: boolean;
  /** Enable semantic example injection from Qdrant (default: true) */
  useExamples?: boolean;
  onProgress?: (progress: ExecutionProgress) => void;
}

/** Execution progress */
export interface ExecutionProgress {
  agentId: AgentId;
  status: AgentStatus;
  phase: 'initializing' | 'prompting' | 'generating' | 'validating' | 'complete';
  progress: number; // 0-100
  tokensUsed?: number;
  message?: string;
  streamedContent?: string;
}

/** Execution result */
export interface ExecutionResult {
  success: boolean;
  output: AgentOutput | null;
  error?: ExecutionError;
  retries: number;
  totalDuration: number;
}

/** Execution error */
export interface ExecutionError {
  code: string;
  message: string;
  agentId: AgentId;
  phase: string;
  recoverable: boolean;
  originalError?: Error;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/** Validation error */
export interface ValidationError {
  field: string;
  message: string;
  expected?: string;
  received?: string;
  /** Additional details about the error */
  details?: string;
  /** Suggestion for fixing the error */
  suggestion?: string;
  /** Error severity - compilation errors are critical */
  severity?: 'error' | 'warning' | 'info';
}

/** Validation warning */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
  /** Additional details about the warning */
  details?: string;
}

/** Retry strategy */
export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/** Default retry strategy */
export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE', 'OVERLOADED'],
};

/** Agent execution state */
export interface ExecutionState {
  agentId: AgentId;
  startTime: Date;
  endTime?: Date;
  attempt: number;
  status: AgentStatus;
  lastError?: ExecutionError;
  tokensUsed: number;
  streamBuffer: string;
}
