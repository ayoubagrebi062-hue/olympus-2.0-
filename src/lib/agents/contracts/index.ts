/**
 * OLYMPUS 2.0 - Agent Contract Testing System
 *
 * Provides contract validation between agent pairs to catch handoff issues.
 *
 * Usage:
 * ```typescript
 * import { getContractValidator, ALL_CONTRACTS } from './contracts';
 *
 * const validator = getContractValidator();
 * validator.registerContracts(ALL_CONTRACTS);
 *
 * const result = validator.validateHandoff('blocks', 'pixel', blocksOutput);
 * if (!result.valid) {
 *   console.log('Contract violations:', result.violations);
 * }
 * ```
 */

// Types
export type {
  AgentContract,
  FieldConstraint,
  ExpectedFormat,
  ContractViolation,
  ContractValidationResult,
  ContractAuditResult,
  ViolationPattern,
  ViolationSeverity,
  ContractRegistry,
  ValidationOptions,
  ContractTestReport,
} from './types';

// Validator
export { ContractValidator, getContractValidator, createContractValidator } from './validator';

// Contract definitions
export { BLOCKS_TO_PIXEL_CONTRACT } from './definitions/blocks-pixel';
export { PIXEL_TO_WIRE_CONTRACT } from './definitions/pixel-wire';
export { STRATEGOS_TO_BLOCKS_CONTRACT } from './definitions/strategos-blocks';
export { PALETTE_TO_BLOCKS_CONTRACT } from './definitions/palette-blocks';

// ============================================================================
// ALL CONTRACTS - Easy registration
// ============================================================================

import { BLOCKS_TO_PIXEL_CONTRACT } from './definitions/blocks-pixel';
import { PIXEL_TO_WIRE_CONTRACT } from './definitions/pixel-wire';
import { STRATEGOS_TO_BLOCKS_CONTRACT } from './definitions/strategos-blocks';
import { PALETTE_TO_BLOCKS_CONTRACT } from './definitions/palette-blocks';
import type { AgentContract } from './types';

/**
 * All defined contracts for easy bulk registration
 */
export const ALL_CONTRACTS: AgentContract[] = [
  STRATEGOS_TO_BLOCKS_CONTRACT,
  PALETTE_TO_BLOCKS_CONTRACT,
  BLOCKS_TO_PIXEL_CONTRACT,
  PIXEL_TO_WIRE_CONTRACT,
];

/**
 * Contract count by criticality
 */
export const CONTRACT_STATS = {
  total: ALL_CONTRACTS.length,
  critical: ALL_CONTRACTS.filter(c => c.criticality === 'critical').length,
  high: ALL_CONTRACTS.filter(c => c.criticality === 'high').length,
  medium: ALL_CONTRACTS.filter(c => c.criticality === 'medium').length,
  low: ALL_CONTRACTS.filter(c => c.criticality === 'low').length,
};

/**
 * Initialize validator with all contracts
 */
export function initializeContractValidator() {
  const { getContractValidator } = require('./validator');
  const validator = getContractValidator();
  validator.registerContracts(ALL_CONTRACTS);
  return validator;
}
