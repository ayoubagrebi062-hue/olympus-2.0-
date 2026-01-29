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

// Contract definitions - Original (4)
export { BLOCKS_TO_PIXEL_CONTRACT } from './definitions/blocks-pixel';
export { PIXEL_TO_WIRE_CONTRACT } from './definitions/pixel-wire';
export { STRATEGOS_TO_BLOCKS_CONTRACT } from './definitions/strategos-blocks';
export { PALETTE_TO_BLOCKS_CONTRACT } from './definitions/palette-blocks';

// Contract definitions - Phase 3 Additions (18+)
export { ORACLE_TO_STRATEGOS_CONTRACT } from './definitions/oracle-strategos';
export { ORACLE_TO_EMPATHY_CONTRACT } from './definitions/oracle-empathy';
export { EMPATHY_TO_PSYCHE_CONTRACT } from './definitions/empathy-psyche';
export { VENTURE_TO_SCOPE_CONTRACT } from './definitions/venture-scope';
export { GRID_TO_CARTOGRAPHER_CONTRACT } from './definitions/grid-cartographer';
export { FLOW_TO_WIRE_CONTRACT } from './definitions/flow-wire';
export { ARCHON_TO_DATUM_CONTRACT } from './definitions/archon-datum';
export { DATUM_TO_NEXUS_CONTRACT } from './definitions/datum-nexus';
export { NEXUS_TO_FORGE_CONTRACT } from './definitions/nexus-forge';
export { FORGE_TO_SENTINEL_CONTRACT } from './definitions/forge-sentinel';
export { WIRE_TO_POLISH_CONTRACT } from './definitions/wire-polish';
export { STRATEGOS_TO_PALETTE_CONTRACT } from './definitions/strategos-palette';
export { ENGINE_TO_GATEWAY_CONTRACT } from './definitions/engine-gateway';
export { GATEWAY_TO_KEEPER_CONTRACT } from './definitions/gateway-keeper';
export { BRIDGE_TO_SYNC_CONTRACT } from './definitions/bridge-sync';
export { SYNC_TO_NOTIFY_CONTRACT } from './definitions/sync-notify';
export { SENTINEL_TO_ATLAS_CONTRACT } from './definitions/sentinel-atlas';
export { POLISH_TO_SEARCH_CONTRACT } from './definitions/polish-search';
export { SCRIBE_TO_ARCHITECT_CONTRACT } from './definitions/scribe-architect';
export { ARTIST_TO_BLOCKS_CONTRACT } from './definitions/artist-blocks';

// ============================================================================
// ALL CONTRACTS - Easy registration
// ============================================================================

import { BLOCKS_TO_PIXEL_CONTRACT } from './definitions/blocks-pixel';
import { PIXEL_TO_WIRE_CONTRACT } from './definitions/pixel-wire';
import { STRATEGOS_TO_BLOCKS_CONTRACT } from './definitions/strategos-blocks';
import { PALETTE_TO_BLOCKS_CONTRACT } from './definitions/palette-blocks';
import { ORACLE_TO_STRATEGOS_CONTRACT } from './definitions/oracle-strategos';
import { ORACLE_TO_EMPATHY_CONTRACT } from './definitions/oracle-empathy';
import { EMPATHY_TO_PSYCHE_CONTRACT } from './definitions/empathy-psyche';
import { VENTURE_TO_SCOPE_CONTRACT } from './definitions/venture-scope';
import { GRID_TO_CARTOGRAPHER_CONTRACT } from './definitions/grid-cartographer';
import { FLOW_TO_WIRE_CONTRACT } from './definitions/flow-wire';
import { ARCHON_TO_DATUM_CONTRACT } from './definitions/archon-datum';
import { DATUM_TO_NEXUS_CONTRACT } from './definitions/datum-nexus';
import { NEXUS_TO_FORGE_CONTRACT } from './definitions/nexus-forge';
import { FORGE_TO_SENTINEL_CONTRACT } from './definitions/forge-sentinel';
import { WIRE_TO_POLISH_CONTRACT } from './definitions/wire-polish';
import { STRATEGOS_TO_PALETTE_CONTRACT } from './definitions/strategos-palette';
import { ENGINE_TO_GATEWAY_CONTRACT } from './definitions/engine-gateway';
import { GATEWAY_TO_KEEPER_CONTRACT } from './definitions/gateway-keeper';
import { BRIDGE_TO_SYNC_CONTRACT } from './definitions/bridge-sync';
import { SYNC_TO_NOTIFY_CONTRACT } from './definitions/sync-notify';
import { SENTINEL_TO_ATLAS_CONTRACT } from './definitions/sentinel-atlas';
import { POLISH_TO_SEARCH_CONTRACT } from './definitions/polish-search';
import { SCRIBE_TO_ARCHITECT_CONTRACT } from './definitions/scribe-architect';
import { ARTIST_TO_BLOCKS_CONTRACT } from './definitions/artist-blocks';
import type { AgentContract } from './types';

/**
 * All defined contracts for easy bulk registration
 * Total: 24 contracts covering the full OLYMPUS agent pipeline
 */
export const ALL_CONTRACTS: AgentContract[] = [
  // Discovery Phase
  ORACLE_TO_STRATEGOS_CONTRACT,
  ORACLE_TO_EMPATHY_CONTRACT,
  EMPATHY_TO_PSYCHE_CONTRACT,
  VENTURE_TO_SCOPE_CONTRACT,

  // Strategy Phase
  STRATEGOS_TO_BLOCKS_CONTRACT,
  STRATEGOS_TO_PALETTE_CONTRACT,
  SCRIBE_TO_ARCHITECT_CONTRACT,

  // Design Phase
  PALETTE_TO_BLOCKS_CONTRACT,
  GRID_TO_CARTOGRAPHER_CONTRACT,
  ARTIST_TO_BLOCKS_CONTRACT,

  // Architecture Phase
  ARCHON_TO_DATUM_CONTRACT,
  DATUM_TO_NEXUS_CONTRACT,
  NEXUS_TO_FORGE_CONTRACT,

  // Implementation Phase
  BLOCKS_TO_PIXEL_CONTRACT,
  PIXEL_TO_WIRE_CONTRACT,
  FLOW_TO_WIRE_CONTRACT,
  WIRE_TO_POLISH_CONTRACT,
  POLISH_TO_SEARCH_CONTRACT,

  // Backend Phase
  FORGE_TO_SENTINEL_CONTRACT,
  ENGINE_TO_GATEWAY_CONTRACT,
  GATEWAY_TO_KEEPER_CONTRACT,

  // Integration Phase
  BRIDGE_TO_SYNC_CONTRACT,
  SYNC_TO_NOTIFY_CONTRACT,
  SENTINEL_TO_ATLAS_CONTRACT,
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
