/**
 * Handoff Budget Matrix
 *
 * Defines allowable degradations and fatal conditions per handoff per shape category.
 * This is the enforcement backbone of the RICP.
 */

import type { HandoffBudget, DegradationBudget, ShapeCategory } from '../types';
import type { HandoffId, TracedAgentId, LossClass } from '../../types';

// Budget presets
const ZERO_TOLERANCE: DegradationBudget = {
  allowed: {
    max_attributes_degraded: 0,
    tolerated_loss_classes: []
  },
  fatal: {
    loss_classes: [
      'L0_TOTAL_OMISSION',
      'L1_PARTIAL_CAPTURE',
      'L2_SEMANTIC_DRIFT',
      'L3_SPECIFICITY_LOSS',
      'L4_CONTEXT_TRUNCATION',
      'L5_DEPENDENCY_SKIP',
      'L6_SUMMARY_COLLAPSE',
      'L7_SCHEMA_MISMATCH'
    ],
    min_required_attributes: 999 // All required
  }
};

const EARLY_STAGE_STATEFUL: DegradationBudget = {
  allowed: {
    max_attributes_degraded: 2,
    tolerated_loss_classes: ['L3_SPECIFICITY_LOSS', 'L7_SCHEMA_MISMATCH']
  },
  fatal: {
    loss_classes: ['L0_TOTAL_OMISSION', 'L1_PARTIAL_CAPTURE', 'L5_DEPENDENCY_SKIP', 'L6_SUMMARY_COLLAPSE'],
    min_required_attributes: 2
  }
};

const EARLY_STAGE_STATELESS: DegradationBudget = {
  allowed: {
    max_attributes_degraded: 1,
    tolerated_loss_classes: ['L3_SPECIFICITY_LOSS', 'L7_SCHEMA_MISMATCH']
  },
  fatal: {
    loss_classes: ['L0_TOTAL_OMISSION', 'L1_PARTIAL_CAPTURE'],
    min_required_attributes: 2
  }
};

const MID_STAGE_STATEFUL: DegradationBudget = {
  allowed: {
    max_attributes_degraded: 1,
    tolerated_loss_classes: ['L3_SPECIFICITY_LOSS']
  },
  fatal: {
    loss_classes: ['L0_TOTAL_OMISSION', 'L1_PARTIAL_CAPTURE', 'L2_SEMANTIC_DRIFT', 'L5_DEPENDENCY_SKIP', 'L6_SUMMARY_COLLAPSE'],
    min_required_attributes: 3
  }
};

const MID_STAGE_STATELESS: DegradationBudget = {
  allowed: {
    max_attributes_degraded: 1,
    tolerated_loss_classes: ['L3_SPECIFICITY_LOSS']
  },
  fatal: {
    loss_classes: ['L0_TOTAL_OMISSION', 'L1_PARTIAL_CAPTURE', 'L2_SEMANTIC_DRIFT'],
    min_required_attributes: 2
  }
};

const LATE_STAGE_STATEFUL: DegradationBudget = {
  allowed: {
    max_attributes_degraded: 0,
    tolerated_loss_classes: []
  },
  fatal: {
    loss_classes: [
      'L0_TOTAL_OMISSION',
      'L1_PARTIAL_CAPTURE',
      'L2_SEMANTIC_DRIFT',
      'L3_SPECIFICITY_LOSS',
      'L4_CONTEXT_TRUNCATION',
      'L5_DEPENDENCY_SKIP',
      'L6_SUMMARY_COLLAPSE',
      'L7_SCHEMA_MISMATCH'
    ],
    min_required_attributes: 999
  }
};

const LATE_STAGE_STATELESS: DegradationBudget = {
  allowed: {
    max_attributes_degraded: 1,
    tolerated_loss_classes: ['L3_SPECIFICITY_LOSS', 'L7_SCHEMA_MISMATCH']
  },
  fatal: {
    loss_classes: ['L0_TOTAL_OMISSION', 'L1_PARTIAL_CAPTURE', 'L2_SEMANTIC_DRIFT', 'L5_DEPENDENCY_SKIP', 'L6_SUMMARY_COLLAPSE'],
    min_required_attributes: 2
  }
};

const FINAL_STAGE_STATELESS: DegradationBudget = {
  allowed: {
    max_attributes_degraded: 0,
    tolerated_loss_classes: []
  },
  fatal: {
    loss_classes: ['L0_TOTAL_OMISSION', 'L1_PARTIAL_CAPTURE'],
    min_required_attributes: 2
  }
};

// The Budget Matrix
export const HANDOFF_BUDGETS: HandoffBudget[] = [
  // H1: STRATEGOS → SCOPE (Early stage)
  {
    handoff_id: 'H1' as HandoffId,
    source: 'strategos' as TracedAgentId,
    target: 'scope' as TracedAgentId,
    budgets: {
      STATEFUL: EARLY_STAGE_STATEFUL,
      STATELESS: EARLY_STAGE_STATELESS,
      CONTROL: ZERO_TOLERANCE
    }
  },

  // H2: SCOPE → CARTOGRAPHER (Early stage)
  {
    handoff_id: 'H2' as HandoffId,
    source: 'scope' as TracedAgentId,
    target: 'cartographer' as TracedAgentId,
    budgets: {
      STATEFUL: EARLY_STAGE_STATEFUL,
      STATELESS: EARLY_STAGE_STATELESS,
      CONTROL: ZERO_TOLERANCE
    }
  },

  // H3: CARTOGRAPHER → BLOCKS (Mid stage)
  {
    handoff_id: 'H3' as HandoffId,
    source: 'cartographer' as TracedAgentId,
    target: 'blocks' as TracedAgentId,
    budgets: {
      STATEFUL: MID_STAGE_STATEFUL,
      STATELESS: MID_STAGE_STATELESS,
      CONTROL: ZERO_TOLERANCE
    }
  },

  // H4: BLOCKS → WIRE (Critical stage - zero tolerance for stateful)
  {
    handoff_id: 'H4' as HandoffId,
    source: 'blocks' as TracedAgentId,
    target: 'wire' as TracedAgentId,
    budgets: {
      STATEFUL: LATE_STAGE_STATEFUL,
      STATELESS: LATE_STAGE_STATELESS,
      CONTROL: ZERO_TOLERANCE
    }
  },

  // H5: WIRE → PIXEL (Final stage)
  {
    handoff_id: 'H5' as HandoffId,
    source: 'wire' as TracedAgentId,
    target: 'pixel' as TracedAgentId,
    budgets: {
      STATEFUL: LATE_STAGE_STATEFUL,
      STATELESS: FINAL_STAGE_STATELESS,
      CONTROL: ZERO_TOLERANCE
    }
  }
];

export function getBudgetForHandoff(
  handoffId: HandoffId,
  category: ShapeCategory
): DegradationBudget | null {
  const budget = HANDOFF_BUDGETS.find(b => b.handoff_id === handoffId);
  if (!budget) return null;
  return budget.budgets[category];
}

export function isFatalLoss(
  handoffId: HandoffId,
  category: ShapeCategory,
  lossClass: LossClass
): boolean {
  const budget = getBudgetForHandoff(handoffId, category);
  if (!budget) return true; // Unknown = fatal
  return budget.fatal.loss_classes.includes(lossClass);
}

export function isToleratedLoss(
  handoffId: HandoffId,
  category: ShapeCategory,
  lossClass: LossClass
): boolean {
  const budget = getBudgetForHandoff(handoffId, category);
  if (!budget) return false;
  return budget.allowed.tolerated_loss_classes.includes(lossClass);
}
