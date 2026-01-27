/**
 * OLYMPUS CRUCIBLE v1.0 — Wave Definitions
 *
 * Defines the adversarial scenarios for each wave.
 * Wave 1: Logical Contradictions (CURRENT FOCUS)
 * Wave 2: Temporal Violations (FUTURE)
 * Wave 3: Governance Exploits (FUTURE)
 *
 * ALL SCENARIOS ARE DETERMINISTIC.
 * NO RANDOMNESS. NO ML. NO HEURISTICS.
 */

import {
  AdversarialScenario,
  WorldState,
  WorldIntent,
  AdversarialAction,
  ExpectedOutcome,
  ContradictionType,
  InvariantId,
  EntropyPhase,
  CausalPath,
  DecisionSingularity,
  GovernanceState,
  EntropyMetrics,
  ProofStep,
  generateDeterministicId,
  generateDeterministicTimestamp,
  generateDeterministicHash,
  // Wave 2 types
  MultiStepScenario,
  Obligation,
  OmissionProof,
  TimelineStep,
  EntropyTimeline,
  EntropyTimelineStep,
  PhaseTransition,
  TemporalHorizon,
  AuthorityLevel,
  ObligationStatus,
  // Wave 3 types
  GovernanceScenario,
  ProofLedger,
  ProofEntry,
  ProofType,
  LedgerStressMetrics,
  AuthorityChain,
  AuthorityChainLink,
  GovernanceActor,
  MultiActorAction,
  WeaponizedComplianceState,
  InvariantConflict,
  TragicOption,
  TragicDecisionProof,
  GovernanceStressMetrics,
  Wave3ContradictionType
} from './types';

// ============================================================================
// WAVE 1: LOGICAL CONTRADICTIONS
// ============================================================================

/**
 * Wave 1 focuses on scenarios containing logical impossibilities:
 * - A ∧ ¬A (assertion and its negation)
 * - Mutual exclusion violations
 * - Circular dependencies
 * - Fate contradictions
 */

// ----------------------------------------------------------------------------
// SCENARIO W1-001: Direct Logical Negation
// ----------------------------------------------------------------------------

const W1_001_INTENTS: readonly WorldIntent[] = [
  {
    id: 'INT-001',
    text: 'User can log in to the application',
    fate: 'ACCEPTED',
    trigger: 'User submits credentials',
    state: 'Credentials validated',
    outcome: 'User session created'
  },
  {
    id: 'INT-002',
    text: 'User cannot log in to the application',
    fate: 'ACCEPTED',
    trigger: 'User submits credentials',
    state: 'Credentials rejected',
    outcome: 'Access denied',
    contradictsWith: ['INT-001']
  }
] as const;

const W1_001_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W1-001', 0),
  timestamp: generateDeterministicTimestamp('W1-001', 0),

  entropyPhase: 'STABLE' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.1,
    mortalityVelocity: 0.05,
    singularityDensity: 0.0,
    mccsSize: 0.1,
    composite: 0.08
  },

  intents: W1_001_INTENTS,

  causalPaths: [
    {
      id: 'CP-001',
      origin: 'INT-001',
      steps: ['validate', 'create-session'],
      terminus: 'STABLE'
    },
    {
      id: 'CP-002',
      origin: 'INT-002',
      steps: ['validate', 'deny-access'],
      terminus: 'STABLE'
    }
  ],
  mccsCount: 0,
  survivablePaths: 0, // No survivable path when contradiction exists

  singularities: [],
  currentFingerprint: generateDeterministicHash('W1-001-state'),

  governance: {
    ssi: 1.0,
    overrideCount: 0,
    overrideHistory: []
  },

  temporalChain: ['T0', 'T1'],
  lastCausalEvent: 'T1',

  inputHash: generateDeterministicHash('W1-001-input'),
  expectedOutputHash: generateDeterministicHash('W1-001-blocked')
};

const W1_001_ACTION: AdversarialAction = {
  actionId: 'ACT-W1-001',
  type: 'EXECUTE_BUILD',
  description: 'Attempt to build with contradictory intents',
  payload: {
    buildId: generateDeterministicId('BUILD-W1-001', 0),
    intents: W1_001_INTENTS
  }
};

const W1_001_EXPECTED: ExpectedOutcome = {
  verdict: 'BLOCKED',
  blockReason: 'LOGICAL_CONTRADICTION: Intent INT-001 contradicts INT-002',
  invariantsThatShouldFire: ['IE', 'NE'] as InvariantId[],
  proofChain: [
    {
      step: 1,
      assertion: 'INT-001 asserts login IS possible',
      evidence: 'text: "User can log in to the application"',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 2,
      assertion: 'INT-002 asserts login IS NOT possible',
      evidence: 'text: "User cannot log in to the application"',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 3,
      assertion: 'Both cannot be simultaneously satisfied',
      evidence: 'A ∧ ¬A is a contradiction',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 4,
      assertion: 'No survivable path exists',
      evidence: 'survivablePaths = 0',
      invariantId: 'NE' as InvariantId
    },
    {
      step: 5,
      assertion: 'OLYMPUS must block',
      evidence: 'Constitution Article 3: Hostile Resistance'
    }
  ]
};

export const SCENARIO_W1_001: AdversarialScenario = {
  scenarioId: 'W1-001',
  name: 'Direct Logical Negation',
  description: 'Two intents that directly contradict each other (A ∧ ¬A)',
  wave: 'WAVE_1',
  targetInvariants: ['IE', 'NE'] as InvariantId[],
  contradictionType: 'LOGICAL_NEGATION' as ContradictionType,
  worldState: W1_001_WORLD_STATE,
  adversarialAction: W1_001_ACTION,
  expectedOutcome: W1_001_EXPECTED,
  proofRequirements: [
    'Contradiction detection must be deterministic',
    'Both intents must be identified',
    'Block reason must cite specific intent IDs'
  ]
};

// ----------------------------------------------------------------------------
// SCENARIO W1-002: Mutual Exclusion Violation
// ----------------------------------------------------------------------------

const W1_002_INTENTS: readonly WorldIntent[] = [
  {
    id: 'INT-003',
    text: 'System operates in offline mode',
    fate: 'ACCEPTED',
    trigger: 'Network unavailable',
    state: 'Offline flag set',
    outcome: 'Local storage used'
  },
  {
    id: 'INT-004',
    text: 'System syncs data to cloud in real-time',
    fate: 'ACCEPTED',
    trigger: 'Data changes',
    state: 'Cloud connection active',
    outcome: 'Data synchronized',
    contradictsWith: ['INT-003']
  }
] as const;

const W1_002_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W1-002', 0),
  timestamp: generateDeterministicTimestamp('W1-002', 1000),

  entropyPhase: 'STABLE' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.15,
    mortalityVelocity: 0.1,
    singularityDensity: 0.0,
    mccsSize: 0.12,
    composite: 0.10
  },

  intents: W1_002_INTENTS,

  causalPaths: [
    {
      id: 'CP-003',
      origin: 'INT-003',
      steps: ['check-network', 'set-offline', 'use-local'],
      terminus: 'STABLE'
    },
    {
      id: 'CP-004',
      origin: 'INT-004',
      steps: ['detect-change', 'connect-cloud', 'sync'],
      terminus: 'COLLAPSING' // Cannot sync when offline
    }
  ],
  mccsCount: 1,
  survivablePaths: 0,

  singularities: [],
  currentFingerprint: generateDeterministicHash('W1-002-state'),

  governance: {
    ssi: 1.0,
    overrideCount: 0,
    overrideHistory: []
  },

  temporalChain: ['T0', 'T1', 'T2'],
  lastCausalEvent: 'T2',

  inputHash: generateDeterministicHash('W1-002-input'),
  expectedOutputHash: generateDeterministicHash('W1-002-blocked')
};

const W1_002_ACTION: AdversarialAction = {
  actionId: 'ACT-W1-002',
  type: 'EXECUTE_BUILD',
  description: 'Attempt to build with mutually exclusive intents',
  payload: {
    buildId: generateDeterministicId('BUILD-W1-002', 0),
    intents: W1_002_INTENTS
  }
};

const W1_002_EXPECTED: ExpectedOutcome = {
  verdict: 'BLOCKED',
  blockReason: 'MUTUAL_EXCLUSION: Offline mode excludes real-time cloud sync',
  invariantsThatShouldFire: ['IE', 'AEC'] as InvariantId[],
  proofChain: [
    {
      step: 1,
      assertion: 'INT-003 requires offline operation',
      evidence: 'trigger: "Network unavailable"',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 2,
      assertion: 'INT-004 requires network connectivity',
      evidence: 'state: "Cloud connection active"',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 3,
      assertion: 'Offline ⊕ Connected (exclusive or)',
      evidence: 'Network cannot be both unavailable and active',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 4,
      assertion: 'Causal path CP-004 terminates in COLLAPSING',
      evidence: 'Cannot sync when offline',
      invariantId: 'AEC' as InvariantId
    },
    {
      step: 5,
      assertion: 'OLYMPUS must block',
      evidence: 'Constitution Article 4: Evolution Enforcement'
    }
  ]
};

export const SCENARIO_W1_002: AdversarialScenario = {
  scenarioId: 'W1-002',
  name: 'Mutual Exclusion Violation',
  description: 'Two intents that require mutually exclusive states',
  wave: 'WAVE_1',
  targetInvariants: ['IE', 'AEC'] as InvariantId[],
  contradictionType: 'MUTUAL_EXCLUSION' as ContradictionType,
  worldState: W1_002_WORLD_STATE,
  adversarialAction: W1_002_ACTION,
  expectedOutcome: W1_002_EXPECTED,
  proofRequirements: [
    'State exclusivity must be detected',
    'Causal path analysis must show collapse',
    'Block must cite exclusion reason'
  ]
};

// ----------------------------------------------------------------------------
// SCENARIO W1-003: Circular Dependency
// ----------------------------------------------------------------------------

const W1_003_INTENTS: readonly WorldIntent[] = [
  {
    id: 'INT-005',
    text: 'Feature A requires Feature B to be enabled',
    fate: 'ACCEPTED',
    trigger: 'Feature A activation',
    state: 'Feature B must be active',
    outcome: 'Feature A enabled'
  },
  {
    id: 'INT-006',
    text: 'Feature B requires Feature C to be enabled',
    fate: 'ACCEPTED',
    trigger: 'Feature B activation',
    state: 'Feature C must be active',
    outcome: 'Feature B enabled'
  },
  {
    id: 'INT-007',
    text: 'Feature C requires Feature A to be enabled',
    fate: 'ACCEPTED',
    trigger: 'Feature C activation',
    state: 'Feature A must be active',
    outcome: 'Feature C enabled',
    contradictsWith: ['INT-005', 'INT-006']
  }
] as const;

const W1_003_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W1-003', 0),
  timestamp: generateDeterministicTimestamp('W1-003', 2000),

  entropyPhase: 'DECAYING' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.3,
    mortalityVelocity: 0.4,
    singularityDensity: 0.2,
    mccsSize: 0.35,
    composite: 0.32
  },

  intents: W1_003_INTENTS,

  causalPaths: [
    {
      id: 'CP-005',
      origin: 'INT-005',
      steps: ['activate-A', 'require-B', 'require-C', 'require-A'],
      terminus: 'COLLAPSING',
      collapseStep: 3
    }
  ],
  mccsCount: 0,
  survivablePaths: 0,

  singularities: [],
  currentFingerprint: generateDeterministicHash('W1-003-state'),

  governance: {
    ssi: 0.85,
    overrideCount: 0,
    overrideHistory: []
  },

  temporalChain: ['T0', 'T1', 'T2', 'T3'],
  lastCausalEvent: 'T3',

  inputHash: generateDeterministicHash('W1-003-input'),
  expectedOutputHash: generateDeterministicHash('W1-003-blocked')
};

const W1_003_ACTION: AdversarialAction = {
  actionId: 'ACT-W1-003',
  type: 'EXECUTE_BUILD',
  description: 'Attempt to build with circular dependencies',
  payload: {
    buildId: generateDeterministicId('BUILD-W1-003', 0),
    intents: W1_003_INTENTS
  }
};

const W1_003_EXPECTED: ExpectedOutcome = {
  verdict: 'BLOCKED',
  blockReason: 'CIRCULAR_DEPENDENCY: A → B → C → A forms infinite loop',
  invariantsThatShouldFire: ['IE', 'NE', 'TSL'] as InvariantId[],
  proofChain: [
    {
      step: 1,
      assertion: 'Feature A depends on Feature B',
      evidence: 'INT-005.state: "Feature B must be active"',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 2,
      assertion: 'Feature B depends on Feature C',
      evidence: 'INT-006.state: "Feature C must be active"',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 3,
      assertion: 'Feature C depends on Feature A',
      evidence: 'INT-007.state: "Feature A must be active"',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 4,
      assertion: 'Dependency graph contains cycle',
      evidence: 'A → B → C → A detected',
      invariantId: 'TSL' as InvariantId
    },
    {
      step: 5,
      assertion: 'No feature can be activated first',
      evidence: 'Deadlock: each requires another',
      invariantId: 'NE' as InvariantId
    },
    {
      step: 6,
      assertion: 'OLYMPUS must block',
      evidence: 'Constitution Article 3: Hostile Resistance'
    }
  ]
};

export const SCENARIO_W1_003: AdversarialScenario = {
  scenarioId: 'W1-003',
  name: 'Circular Dependency',
  description: 'Three intents forming a circular dependency chain',
  wave: 'WAVE_1',
  targetInvariants: ['IE', 'NE', 'TSL'] as InvariantId[],
  contradictionType: 'CIRCULAR_DEPENDENCY' as ContradictionType,
  worldState: W1_003_WORLD_STATE,
  adversarialAction: W1_003_ACTION,
  expectedOutcome: W1_003_EXPECTED,
  proofRequirements: [
    'Cycle detection must be performed',
    'All nodes in cycle must be identified',
    'Deadlock must be proven'
  ]
};

// ----------------------------------------------------------------------------
// SCENARIO W1-004: Fate Contradiction
// ----------------------------------------------------------------------------

const W1_004_INTENTS: readonly WorldIntent[] = [
  {
    id: 'INT-008',
    text: 'Payment processing is secure',
    fate: 'ACCEPTED',
    trigger: 'Payment submitted',
    state: 'SSL/TLS enabled',
    outcome: 'Payment encrypted'
  },
  {
    id: 'INT-008-FORBIDDEN',
    text: 'Payment processing is secure',
    fate: 'FORBIDDEN',
    trigger: 'Payment submitted',
    state: 'Vulnerability detected',
    outcome: 'Payment compromised',
    hostilePattern: 'SEMANTIC_VOID',
    contradictsWith: ['INT-008']
  }
] as const;

const W1_004_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W1-004', 0),
  timestamp: generateDeterministicTimestamp('W1-004', 3000),

  entropyPhase: 'COLLAPSING' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.5,
    mortalityVelocity: 0.7,
    singularityDensity: 0.4,
    mccsSize: 0.6,
    composite: 0.55
  },

  intents: W1_004_INTENTS,

  causalPaths: [
    {
      id: 'CP-006',
      origin: 'INT-008',
      steps: ['submit', 'encrypt', 'process'],
      terminus: 'STABLE'
    },
    {
      id: 'CP-007',
      origin: 'INT-008-FORBIDDEN',
      steps: ['submit', 'exploit', 'compromise'],
      terminus: 'DEAD'
    }
  ],
  mccsCount: 0,
  survivablePaths: 0,

  singularities: [
    {
      id: 'SING-001',
      fingerprint: generateDeterministicHash('INT-008-FORBIDDEN'),
      createdAt: generateDeterministicTimestamp('SING-001', 1000),
      runId: 'RUN-PRIOR-001',
      forbiddenFingerprints: [generateDeterministicHash('INT-008-FORBIDDEN')]
    }
  ],
  currentFingerprint: generateDeterministicHash('W1-004-state'),

  governance: {
    ssi: 0.6,
    overrideCount: 1,
    overrideHistory: []
  },

  temporalChain: ['T0', 'T1'],
  lastCausalEvent: 'T1',

  inputHash: generateDeterministicHash('W1-004-input'),
  expectedOutputHash: generateDeterministicHash('W1-004-blocked')
};

const W1_004_ACTION: AdversarialAction = {
  actionId: 'ACT-W1-004',
  type: 'REHABILITATE_INTENT',
  description: 'Attempt to accept an intent that is also FORBIDDEN',
  payload: {
    buildId: generateDeterministicId('BUILD-W1-004', 0),
    intents: W1_004_INTENTS,
    rehabilitationTarget: 'INT-008-FORBIDDEN'
  }
};

const W1_004_EXPECTED: ExpectedOutcome = {
  verdict: 'BLOCKED',
  blockReason: 'FATE_CONTRADICTION: Same intent cannot be both ACCEPTED and FORBIDDEN',
  invariantsThatShouldFire: ['RLL', 'IE', 'NE'] as InvariantId[],
  proofChain: [
    {
      step: 1,
      assertion: 'INT-008 has fate ACCEPTED',
      evidence: 'fate: "ACCEPTED"',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 2,
      assertion: 'INT-008-FORBIDDEN has fate FORBIDDEN',
      evidence: 'fate: "FORBIDDEN"',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 3,
      assertion: 'Both describe same semantic intent',
      evidence: 'text: "Payment processing is secure"',
      invariantId: 'IE' as InvariantId
    },
    {
      step: 4,
      assertion: 'Singularity SING-001 forbids this fingerprint',
      evidence: 'forbiddenFingerprints includes INT-008-FORBIDDEN hash',
      invariantId: 'RLL' as InvariantId
    },
    {
      step: 5,
      assertion: 'Constitution Article 7: FORBIDDEN is permanent',
      evidence: 'FORBIDDEN → FORBIDDEN only transition allowed'
    },
    {
      step: 6,
      assertion: 'OLYMPUS must block',
      evidence: 'Constitution Article 7: Forbidden Permanence'
    }
  ]
};

export const SCENARIO_W1_004: AdversarialScenario = {
  scenarioId: 'W1-004',
  name: 'Fate Contradiction',
  description: 'Same intent with both ACCEPTED and FORBIDDEN fates',
  wave: 'WAVE_1',
  targetInvariants: ['RLL', 'IE', 'NE'] as InvariantId[],
  contradictionType: 'FATE_CONTRADICTION' as ContradictionType,
  worldState: W1_004_WORLD_STATE,
  adversarialAction: W1_004_ACTION,
  expectedOutcome: W1_004_EXPECTED,
  proofRequirements: [
    'Fate conflict must be detected',
    'Singularity lock must be enforced',
    'FORBIDDEN permanence must be cited'
  ]
};

// ----------------------------------------------------------------------------
// SCENARIO W1-005: Entropy Phase Skip
// ----------------------------------------------------------------------------

const W1_005_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W1-005', 0),
  timestamp: generateDeterministicTimestamp('W1-005', 4000),

  entropyPhase: 'STABLE' as EntropyPhase, // Claiming STABLE
  entropyMetrics: {
    rsrTrend: 0.9,           // But metrics say DEAD
    mortalityVelocity: 0.95,
    singularityDensity: 0.85,
    mccsSize: 0.9,
    composite: 0.90           // 90% entropy = DEAD phase
  },

  intents: [
    {
      id: 'INT-009',
      text: 'System is healthy and operational',
      fate: 'ACCEPTED',
      trigger: 'Health check',
      state: 'All services running',
      outcome: 'Status: OK'
    }
  ],

  causalPaths: [
    {
      id: 'CP-008',
      origin: 'INT-009',
      steps: ['check', 'verify', 'report'],
      terminus: 'DEAD'
    }
  ],
  mccsCount: 0,
  survivablePaths: 0,

  singularities: [],
  currentFingerprint: generateDeterministicHash('W1-005-state'),

  governance: {
    ssi: 0.3,
    overrideCount: 2,
    overrideHistory: []
  },

  temporalChain: ['T0'],
  lastCausalEvent: 'T0',

  inputHash: generateDeterministicHash('W1-005-input'),
  expectedOutputHash: generateDeterministicHash('W1-005-blocked')
};

const W1_005_ACTION: AdversarialAction = {
  actionId: 'ACT-W1-005',
  type: 'MUTATE_STATE',
  description: 'Attempt mutation while claiming STABLE but metrics show DEAD',
  payload: {
    buildId: generateDeterministicId('BUILD-W1-005', 0),
    mutation: 'deploy-new-feature',
    claimedPhase: 'STABLE',
    actualPhase: 'DEAD'
  }
};

const W1_005_EXPECTED: ExpectedOutcome = {
  verdict: 'BLOCKED',
  blockReason: 'ENTROPY_PHASE_SKIP: Claimed STABLE but metrics indicate DEAD (composite: 90%)',
  invariantsThatShouldFire: ['AEC', 'ODL'] as InvariantId[],
  proofChain: [
    {
      step: 1,
      assertion: 'World claims entropyPhase = STABLE',
      evidence: 'entropyPhase: "STABLE"',
      invariantId: 'AEC' as InvariantId
    },
    {
      step: 2,
      assertion: 'Entropy composite = 90%',
      evidence: 'entropyMetrics.composite: 0.90',
      invariantId: 'AEC' as InvariantId
    },
    {
      step: 3,
      assertion: 'Phase thresholds: DEAD > 75%',
      evidence: 'AEC specification',
      invariantId: 'AEC' as InvariantId
    },
    {
      step: 4,
      assertion: 'True phase is DEAD',
      evidence: '90% > 75% threshold',
      invariantId: 'AEC' as InvariantId
    },
    {
      step: 5,
      assertion: 'Phase claim contradicts metrics',
      evidence: 'STABLE ≠ DEAD',
      invariantId: 'ODL' as InvariantId
    },
    {
      step: 6,
      assertion: 'OLYMPUS must block',
      evidence: 'AEC: DEAD phase = PERMANENT_HALT'
    }
  ]
};

export const SCENARIO_W1_005: AdversarialScenario = {
  scenarioId: 'W1-005',
  name: 'Entropy Phase Skip',
  description: 'World claims STABLE phase but metrics indicate DEAD',
  wave: 'WAVE_1',
  targetInvariants: ['AEC', 'ODL'] as InvariantId[],
  contradictionType: 'ENTROPY_PHASE_SKIP' as ContradictionType,
  worldState: W1_005_WORLD_STATE,
  adversarialAction: W1_005_ACTION,
  expectedOutcome: W1_005_EXPECTED,
  proofRequirements: [
    'Phase must be computed from metrics',
    'Claimed phase must be compared to computed',
    'Threshold violation must be cited'
  ]
};

// ----------------------------------------------------------------------------
// SCENARIO W1-006: Singularity Deviation
// ----------------------------------------------------------------------------

const PRIOR_SINGULARITY: DecisionSingularity = {
  id: 'SING-002',
  fingerprint: 'abc123def456',
  createdAt: generateDeterministicTimestamp('SING-002', 0),
  runId: 'RUN-PRIOR-002',
  forbiddenFingerprints: ['forbidden-001', 'forbidden-002', 'xyz789']
};

const W1_006_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W1-006', 0),
  timestamp: generateDeterministicTimestamp('W1-006', 5000),

  entropyPhase: 'STABLE' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.1,
    mortalityVelocity: 0.05,
    singularityDensity: 0.5,
    mccsSize: 0.1,
    composite: 0.15
  },

  intents: [
    {
      id: 'INT-010',
      text: 'Use alternative architecture',
      fate: 'ACCEPTED',
      trigger: 'Architecture decision',
      state: 'New pattern selected',
      outcome: 'Different from singularity'
    }
  ],

  causalPaths: [
    {
      id: 'CP-009',
      origin: 'INT-010',
      steps: ['decide', 'implement'],
      terminus: 'STABLE'
    }
  ],
  mccsCount: 1,
  survivablePaths: 1,

  singularities: [PRIOR_SINGULARITY],
  currentFingerprint: 'xyz789', // This is in forbiddenFingerprints!

  governance: {
    ssi: 0.9,
    overrideCount: 0,
    overrideHistory: []
  },

  temporalChain: ['T0', 'T1'],
  lastCausalEvent: 'T1',

  inputHash: generateDeterministicHash('W1-006-input'),
  expectedOutputHash: generateDeterministicHash('W1-006-blocked')
};

const W1_006_ACTION: AdversarialAction = {
  actionId: 'ACT-W1-006',
  type: 'EXECUTE_BUILD',
  description: 'Attempt to build with fingerprint that deviates from singularity',
  payload: {
    buildId: generateDeterministicId('BUILD-W1-006', 0),
    fingerprint: 'xyz789',
    singularityId: 'SING-002'
  }
};

const W1_006_EXPECTED: ExpectedOutcome = {
  verdict: 'BLOCKED',
  blockReason: 'SINGULARITY_DEVIATION: Fingerprint xyz789 deviates from singularity SING-002',
  invariantsThatShouldFire: ['RLL'] as InvariantId[],
  proofChain: [
    {
      step: 1,
      assertion: 'Singularity SING-002 exists',
      evidence: 'singularities contains SING-002',
      invariantId: 'RLL' as InvariantId
    },
    {
      step: 2,
      assertion: 'SING-002 forbids fingerprint xyz789',
      evidence: 'forbiddenFingerprints: ["forbidden-001", "forbidden-002", "xyz789"]',
      invariantId: 'RLL' as InvariantId
    },
    {
      step: 3,
      assertion: 'Current fingerprint is xyz789',
      evidence: 'currentFingerprint: "xyz789"',
      invariantId: 'RLL' as InvariantId
    },
    {
      step: 4,
      assertion: 'Deviation from singularity detected',
      evidence: 'xyz789 ∈ forbiddenFingerprints',
      invariantId: 'RLL' as InvariantId
    },
    {
      step: 5,
      assertion: 'OLYMPUS must block',
      evidence: 'RLL: Singularities are immutable'
    }
  ]
};

export const SCENARIO_W1_006: AdversarialScenario = {
  scenarioId: 'W1-006',
  name: 'Singularity Deviation',
  description: 'Attempt to use fingerprint that was locked out by prior singularity',
  wave: 'WAVE_1',
  targetInvariants: ['RLL'] as InvariantId[],
  contradictionType: 'SINGULARITY_DEVIATION' as ContradictionType,
  worldState: W1_006_WORLD_STATE,
  adversarialAction: W1_006_ACTION,
  expectedOutcome: W1_006_EXPECTED,
  proofRequirements: [
    'Singularity must be loaded',
    'Forbidden fingerprints must be checked',
    'Deviation must be proven'
  ]
};

// ----------------------------------------------------------------------------
// SCENARIO W1-007: Determinism Fork
// ----------------------------------------------------------------------------

const W1_007_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W1-007', 0),
  timestamp: generateDeterministicTimestamp('W1-007', 6000),

  entropyPhase: 'STABLE' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.1,
    mortalityVelocity: 0.05,
    singularityDensity: 0.0,
    mccsSize: 0.1,
    composite: 0.08
  },

  intents: [
    {
      id: 'INT-011',
      text: 'Generate unique ID for each request',
      fate: 'ACCEPTED',
      trigger: 'Request received',
      state: 'Random seed used', // PROBLEM: "random"
      outcome: 'UUID generated'
    }
  ],

  causalPaths: [
    {
      id: 'CP-010',
      origin: 'INT-011',
      steps: ['receive', 'generate-random', 'return'],
      terminus: 'UNKNOWN' // Non-deterministic!
    }
  ],
  mccsCount: 1,
  survivablePaths: 1,

  singularities: [],
  currentFingerprint: generateDeterministicHash('W1-007-state'),

  governance: {
    ssi: 1.0,
    overrideCount: 0,
    overrideHistory: []
  },

  temporalChain: ['T0', 'T1'],
  lastCausalEvent: 'T1',

  inputHash: generateDeterministicHash('W1-007-input'),
  expectedOutputHash: undefined // Cannot predict output due to randomness
};

const W1_007_ACTION: AdversarialAction = {
  actionId: 'ACT-W1-007',
  type: 'EXECUTE_BUILD',
  description: 'Attempt to build with non-deterministic intent',
  payload: {
    buildId: generateDeterministicId('BUILD-W1-007', 0),
    intents: W1_007_WORLD_STATE.intents,
    firstRunOutput: 'uuid-abc-123',
    secondRunOutput: 'uuid-xyz-789' // Different output for same input!
  }
};

const W1_007_EXPECTED: ExpectedOutcome = {
  verdict: 'BLOCKED',
  blockReason: 'DETERMINISM_FORK: Same input produces different outputs',
  invariantsThatShouldFire: ['ODL'] as InvariantId[],
  proofChain: [
    {
      step: 1,
      assertion: 'Input hash is identical for both runs',
      evidence: 'inputHash: same for run 1 and run 2',
      invariantId: 'ODL' as InvariantId
    },
    {
      step: 2,
      assertion: 'Output differs between runs',
      evidence: 'run1: uuid-abc-123, run2: uuid-xyz-789',
      invariantId: 'ODL' as InvariantId
    },
    {
      step: 3,
      assertion: 'Intent mentions "random"',
      evidence: 'state: "Random seed used"',
      invariantId: 'ODL' as InvariantId
    },
    {
      step: 4,
      assertion: 'Constitution Article 1: Determinism',
      evidence: 'No randomness in scoring decisions'
    },
    {
      step: 5,
      assertion: 'OLYMPUS must block',
      evidence: 'DETERMINISM_VIOLATION'
    }
  ]
};

export const SCENARIO_W1_007: AdversarialScenario = {
  scenarioId: 'W1-007',
  name: 'Determinism Fork',
  description: 'Intent that produces different outputs for identical inputs',
  wave: 'WAVE_1',
  targetInvariants: ['ODL'] as InvariantId[],
  contradictionType: 'DETERMINISM_FORK' as ContradictionType,
  worldState: W1_007_WORLD_STATE,
  adversarialAction: W1_007_ACTION,
  expectedOutcome: W1_007_EXPECTED,
  proofRequirements: [
    'Input hashes must be compared',
    'Output hashes must be compared',
    'Divergence must be detected'
  ]
};

// ----------------------------------------------------------------------------
// SCENARIO W1-008: Governance Paradox
// ----------------------------------------------------------------------------

const W1_008_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W1-008', 0),
  timestamp: generateDeterministicTimestamp('W1-008', 7000),

  entropyPhase: 'DECAYING' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.3,
    mortalityVelocity: 0.35,
    singularityDensity: 0.2,
    mccsSize: 0.3,
    composite: 0.30
  },

  intents: [
    {
      id: 'INT-012',
      text: 'Admin can override any gate failure',
      fate: 'ACCEPTED',
      trigger: 'Gate failure',
      state: 'Admin privileges active',
      outcome: 'Gate bypassed'
    },
    {
      id: 'INT-013',
      text: 'Override system prevents abuse',
      fate: 'ACCEPTED',
      trigger: 'Override attempt',
      state: 'Limits enforced',
      outcome: 'Abuse blocked',
      contradictsWith: ['INT-012']
    }
  ],

  causalPaths: [
    {
      id: 'CP-011',
      origin: 'INT-012',
      steps: ['fail-gate', 'invoke-admin', 'bypass'],
      terminus: 'STABLE'
    },
    {
      id: 'CP-012',
      origin: 'INT-013',
      steps: ['attempt-override', 'check-limits', 'block-abuse'],
      terminus: 'STABLE'
    }
  ],
  mccsCount: 0,
  survivablePaths: 0,

  singularities: [],
  currentFingerprint: generateDeterministicHash('W1-008-state'),

  governance: {
    ssi: 0.4, // Below 70% threshold
    overrideCount: 3, // At maximum
    overrideHistory: [
      {
        target: 'GATE-1',
        justification: 'Emergency deployment',
        authorizer: 'admin',
        timestamp: generateDeterministicTimestamp('OVER-1', 1000),
        ssiPenalty: 0.2
      },
      {
        target: 'GATE-2',
        justification: 'Critical fix',
        authorizer: 'admin',
        timestamp: generateDeterministicTimestamp('OVER-2', 2000),
        ssiPenalty: 0.2
      },
      {
        target: 'GATE-3',
        justification: 'Urgent release',
        authorizer: 'admin',
        timestamp: generateDeterministicTimestamp('OVER-3', 3000),
        ssiPenalty: 0.2
      }
    ],
    lastOverrideTimestamp: generateDeterministicTimestamp('OVER-3', 3000)
  },

  temporalChain: ['T0', 'T1', 'T2', 'T3'],
  lastCausalEvent: 'T3',

  inputHash: generateDeterministicHash('W1-008-input'),
  expectedOutputHash: generateDeterministicHash('W1-008-blocked')
};

const W1_008_ACTION: AdversarialAction = {
  actionId: 'ACT-W1-008',
  type: 'OVERRIDE_GATE',
  description: 'Attempt override that would enable infinite overrides',
  payload: {
    buildId: generateDeterministicId('BUILD-W1-008', 0),
    target: 'OVERRIDE_LIMIT_CHECK',
    justification: 'Need to remove override limits',
    authorizer: 'admin'
  }
};

const W1_008_EXPECTED: ExpectedOutcome = {
  verdict: 'BLOCKED',
  blockReason: 'GOVERNANCE_PARADOX: Override would weaken override protection',
  invariantsThatShouldFire: ['AAM', 'IE'] as InvariantId[],
  proofChain: [
    {
      step: 1,
      assertion: 'INT-012 allows unlimited overrides',
      evidence: 'outcome: "Gate bypassed"',
      invariantId: 'AAM' as InvariantId
    },
    {
      step: 2,
      assertion: 'INT-013 requires override limits',
      evidence: 'outcome: "Abuse blocked"',
      invariantId: 'AAM' as InvariantId
    },
    {
      step: 3,
      assertion: 'Intents contradict on override policy',
      evidence: 'INT-012 ⊕ INT-013',
      invariantId: 'AAM' as InvariantId
    },
    {
      step: 4,
      assertion: 'Override count at maximum (3)',
      evidence: 'governance.overrideCount: 3',
      invariantId: 'AAM' as InvariantId
    },
    {
      step: 5,
      assertion: 'SSI below threshold (40% < 70%)',
      evidence: 'governance.ssi: 0.4',
      invariantId: 'AAM' as InvariantId
    },
    {
      step: 6,
      assertion: 'OLYMPUS must block',
      evidence: 'Constitution Article 11: Governance Integrity'
    }
  ]
};

export const SCENARIO_W1_008: AdversarialScenario = {
  scenarioId: 'W1-008',
  name: 'Governance Paradox',
  description: 'Override attempt that would weaken override protection itself',
  wave: 'WAVE_1',
  targetInvariants: ['AAM', 'IE'] as InvariantId[],
  contradictionType: 'GOVERNANCE_PARADOX' as ContradictionType,
  worldState: W1_008_WORLD_STATE,
  adversarialAction: W1_008_ACTION,
  expectedOutcome: W1_008_EXPECTED,
  proofRequirements: [
    'Override limits must be checked',
    'SSI threshold must be enforced',
    'Self-weakening must be detected'
  ]
};

// ============================================================================
// WAVE 1 COMPLETE SCENARIO LIST
// ============================================================================

export const WAVE_1_SCENARIOS: readonly AdversarialScenario[] = [
  SCENARIO_W1_001, // Direct Logical Negation
  SCENARIO_W1_002, // Mutual Exclusion Violation
  SCENARIO_W1_003, // Circular Dependency
  SCENARIO_W1_004, // Fate Contradiction
  SCENARIO_W1_005, // Entropy Phase Skip
  SCENARIO_W1_006, // Singularity Deviation
  SCENARIO_W1_007, // Determinism Fork
  SCENARIO_W1_008  // Governance Paradox
] as const;

// ============================================================================
// WAVE 2: TEMPORAL & OBLIGATION STRESS
// ============================================================================

/**
 * Wave 2 focuses on long-horizon pressure testing:
 * - Wave 2.A: Obligation Pileup (ODL omission proofs)
 * - Wave 2.B: Entropy Poisoning (AEC READ_ONLY/PERMANENT_READ_ONLY)
 * - Wave 2.C: Temporal Betrayal (TSL present blocked for future violation)
 */

// ============================================================================
// WAVE 2.A: OBLIGATION PILEUP
// ============================================================================

/**
 * Generate deterministic obligations for pileup scenario
 */
function generateObligationPileup(seed: string, count: number): Obligation[] {
  const obligations: Obligation[] = [];
  const sharedResource = 'RESOURCE_ALPHA';

  for (let i = 0; i < count; i++) {
    const conflicts = obligations
      .filter(o => o.requiredResources.includes(sharedResource))
      .map(o => o.obligationId);

    obligations.push({
      obligationId: `OBL-${seed}-${i}`,
      description: `Obligation ${i}: Requires exclusive access to ${sharedResource}`,
      createdAt: i,
      deadline: i + 3, // Each has 3 time units to complete
      status: 'PENDING' as ObligationStatus,
      requiredResources: [sharedResource],
      conflictsWith: conflicts,
      dependsOn: [],
      authority: 'OPERATIONAL' as AuthorityLevel
    });
  }

  return obligations;
}

/**
 * Generate omission proofs for conflicting obligations
 */
function generateOmissionProofs(obligations: Obligation[]): OmissionProof[] {
  const proofs: OmissionProof[] = [];
  const resourceConflicts = new Map<string, Obligation[]>();

  // Group by resource
  for (const obl of obligations) {
    for (const res of obl.requiredResources) {
      const existing = resourceConflicts.get(res) || [];
      existing.push(obl);
      resourceConflicts.set(res, existing);
    }
  }

  // Generate proofs for conflicts
  for (const [resource, conflicting] of resourceConflicts) {
    if (conflicting.length > 1) {
      // Only one can use the resource at a time
      for (let i = 1; i < conflicting.length; i++) {
        proofs.push({
          proofId: `PROOF-${conflicting[i].obligationId}`,
          obligationId: conflicting[i].obligationId,
          proofType: 'RESOURCE_CONFLICT',
          authority: 'SYSTEM_ROOT' as AuthorityLevel,
          evidence: [
            `Resource ${resource} required by ${conflicting[i].obligationId}`,
            `Resource ${resource} already claimed by ${conflicting[0].obligationId}`,
            `Mutual exclusion: only one holder permitted`,
            `Deadline ${conflicting[i].deadline} cannot be met`
          ],
          generatedAt: conflicting[i].createdAt
        });
      }
    }
  }

  return proofs;
}

// ----------------------------------------------------------------------------
// SCENARIO W2A-001: Basic Obligation Pileup
// ----------------------------------------------------------------------------

const W2A_001_OBLIGATIONS = generateObligationPileup('W2A-001', 5);
const W2A_001_OMISSION_PROOFS = generateOmissionProofs(W2A_001_OBLIGATIONS);

const W2A_001_TIMELINE: TimelineStep[] = Array.from({ length: 10 }, (_, i) => ({
  stepIndex: i,
  logicalTime: i,
  worldState: {
    worldId: generateDeterministicId('W2A-001', i),
    timestamp: generateDeterministicTimestamp('W2A-001', i * 1000),
    entropyPhase: 'STABLE' as EntropyPhase,
    entropyMetrics: {
      rsrTrend: 0.1 + (i * 0.02),
      mortalityVelocity: 0.05 + (i * 0.01),
      singularityDensity: i * 0.05,
      mccsSize: 0.1,
      composite: 0.1 + (i * 0.02)
    },
    intents: [{
      id: `W2A-001-INT-${i}`,
      text: `Process obligation ${i}`,
      fate: 'ACCEPTED' as const,
      trigger: `Time ${i}`,
      state: 'Processing',
      outcome: 'Obligation handled'
    }],
    causalPaths: [{
      id: `W2A-001-CP-${i}`,
      origin: `W2A-001-INT-${i}`,
      steps: ['start', 'process', 'complete'],
      terminus: i < 5 ? 'STABLE' as const : 'COLLAPSING' as const
    }],
    mccsCount: Math.max(0, 5 - i),
    survivablePaths: Math.max(0, 5 - i),
    singularities: [],
    currentFingerprint: generateDeterministicHash(`W2A-001-fp-${i}`),
    governance: {
      ssi: 1.0 - (i * 0.05),
      overrideCount: 0,
      overrideHistory: []
    },
    temporalChain: Array.from({ length: i + 1 }, (_, j) => `T${j}`),
    lastCausalEvent: `T${i}`,
    inputHash: generateDeterministicHash(`W2A-001-input-${i}`)
  },
  obligationsActive: W2A_001_OBLIGATIONS.filter(o => o.createdAt <= i && o.deadline > i),
  obligationsViolated: W2A_001_OBLIGATIONS.filter(o => o.deadline <= i && o.status === 'PENDING').map(o => o.obligationId),
  entropyDelta: 0.02,
  cumulativeEntropy: 0.1 + (i * 0.02)
}));

const W2A_001_WORLD_STATE = W2A_001_TIMELINE[0].worldState;

export const SCENARIO_W2A_001: MultiStepScenario = {
  scenarioId: 'W2A-001',
  name: 'Basic Obligation Pileup',
  description: '5 obligations requiring same exclusive resource with overlapping deadlines',
  wave: 'WAVE_2',
  targetInvariants: ['ODL', 'IE', 'NE'] as InvariantId[],
  contradictionType: 'OBLIGATION_PILEUP' as ContradictionType,
  worldState: W2A_001_WORLD_STATE,
  adversarialAction: {
    actionId: 'ACT-W2A-001',
    type: 'EXECUTE_BUILD',
    description: 'Attempt to satisfy all 5 conflicting obligations',
    payload: {
      obligations: W2A_001_OBLIGATIONS,
      timeline: W2A_001_TIMELINE
    }
  },
  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'ODL OMISSION: Cannot satisfy all obligations - SYSTEM_ROOT authority proof',
    invariantsThatShouldFire: ['ODL', 'IE'] as InvariantId[],
    proofChain: [
      {
        step: 1,
        assertion: '5 obligations created requiring RESOURCE_ALPHA',
        evidence: 'obligations[0..4].requiredResources includes RESOURCE_ALPHA',
        invariantId: 'ODL' as InvariantId
      },
      {
        step: 2,
        assertion: 'RESOURCE_ALPHA permits only one holder',
        evidence: 'Mutual exclusion constraint',
        invariantId: 'ODL' as InvariantId
      },
      {
        step: 3,
        assertion: 'Deadlines overlap making sequential satisfaction impossible',
        evidence: 'OBL-0 deadline=3, OBL-1 deadline=4, ...',
        invariantId: 'ODL' as InvariantId
      },
      {
        step: 4,
        assertion: 'Omission proofs generated with SYSTEM_ROOT authority',
        evidence: `${W2A_001_OMISSION_PROOFS.length} proofs generated`,
        invariantId: 'ODL' as InvariantId
      },
      {
        step: 5,
        assertion: 'All paths to complete satisfaction lead to COLLAPSING',
        evidence: 'IE: survivablePaths = 0 after step 5',
        invariantId: 'IE' as InvariantId
      },
      {
        step: 6,
        assertion: 'OLYMPUS must block with omission proof',
        evidence: 'ODL: SYSTEM_ROOT authority omission'
      }
    ]
  },
  proofRequirements: [
    'Omission proof must have SYSTEM_ROOT authority',
    'All conflicting obligations must be identified',
    'Deadline analysis must be deterministic'
  ],
  isMultiStep: true,
  timeline: W2A_001_TIMELINE,
  obligations: W2A_001_OBLIGATIONS,
  omissionProofs: W2A_001_OMISSION_PROOFS,
  totalSteps: 10,
  collapseStep: 5
};

// ----------------------------------------------------------------------------
// SCENARIO W2A-002: Cascading Deadline Failures
// ----------------------------------------------------------------------------

const W2A_002_OBLIGATIONS: Obligation[] = [
  {
    obligationId: 'OBL-CASCADE-0',
    description: 'Root obligation - must complete first',
    createdAt: 0,
    deadline: 2,
    status: 'PENDING' as ObligationStatus,
    requiredResources: ['RESOURCE_ROOT'],
    conflictsWith: [],
    dependsOn: [],
    authority: 'CONSTITUTIONAL' as AuthorityLevel
  },
  {
    obligationId: 'OBL-CASCADE-1',
    description: 'Depends on root',
    createdAt: 0,
    deadline: 3,
    status: 'PENDING' as ObligationStatus,
    requiredResources: ['RESOURCE_A'],
    conflictsWith: [],
    dependsOn: ['OBL-CASCADE-0'],
    authority: 'GOVERNANCE' as AuthorityLevel
  },
  {
    obligationId: 'OBL-CASCADE-2',
    description: 'Depends on OBL-CASCADE-1',
    createdAt: 0,
    deadline: 4,
    status: 'PENDING' as ObligationStatus,
    requiredResources: ['RESOURCE_B'],
    conflictsWith: [],
    dependsOn: ['OBL-CASCADE-1'],
    authority: 'GOVERNANCE' as AuthorityLevel
  },
  {
    obligationId: 'OBL-CASCADE-3',
    description: 'Conflicts with root resource',
    createdAt: 1,
    deadline: 2, // Same deadline as root!
    status: 'PENDING' as ObligationStatus,
    requiredResources: ['RESOURCE_ROOT'], // Conflicts!
    conflictsWith: ['OBL-CASCADE-0'],
    dependsOn: [],
    authority: 'OPERATIONAL' as AuthorityLevel
  }
];

const W2A_002_OMISSION_PROOFS: OmissionProof[] = [
  {
    proofId: 'PROOF-CASCADE-CONFLICT',
    obligationId: 'OBL-CASCADE-3',
    proofType: 'RESOURCE_CONFLICT',
    authority: 'SYSTEM_ROOT' as AuthorityLevel,
    evidence: [
      'OBL-CASCADE-0 holds RESOURCE_ROOT with CONSTITUTIONAL authority',
      'OBL-CASCADE-3 requires RESOURCE_ROOT with OPERATIONAL authority',
      'CONSTITUTIONAL > OPERATIONAL in authority hierarchy',
      'OBL-CASCADE-3 cannot acquire resource'
    ],
    generatedAt: 1
  },
  {
    proofId: 'PROOF-CASCADE-DEPENDENCY',
    obligationId: 'OBL-CASCADE-2',
    proofType: 'DEPENDENCY_FAILURE',
    authority: 'SYSTEM_ROOT' as AuthorityLevel,
    evidence: [
      'OBL-CASCADE-2 depends on OBL-CASCADE-1',
      'OBL-CASCADE-1 depends on OBL-CASCADE-0',
      'OBL-CASCADE-0 deadline (2) conflicts with OBL-CASCADE-3',
      'Cascade failure propagates to OBL-CASCADE-2'
    ],
    generatedAt: 2
  }
];

const W2A_002_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W2A-002', 0),
  timestamp: generateDeterministicTimestamp('W2A-002', 0),
  entropyPhase: 'STABLE' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.15,
    mortalityVelocity: 0.1,
    singularityDensity: 0.05,
    mccsSize: 0.2,
    composite: 0.13
  },
  intents: [{
    id: 'W2A-002-INT-0',
    text: 'Satisfy all cascade obligations',
    fate: 'ACCEPTED' as const,
    trigger: 'Build start',
    state: 'Obligations queued',
    outcome: 'All satisfied'
  }],
  causalPaths: [{
    id: 'W2A-002-CP-0',
    origin: 'W2A-002-INT-0',
    steps: ['queue', 'process-root', 'cascade-fail'],
    terminus: 'COLLAPSING' as const,
    collapseStep: 2
  }],
  mccsCount: 0,
  survivablePaths: 0,
  singularities: [],
  currentFingerprint: generateDeterministicHash('W2A-002-fp'),
  governance: {
    ssi: 0.9,
    overrideCount: 0,
    overrideHistory: []
  },
  temporalChain: ['T0', 'T1', 'T2'],
  lastCausalEvent: 'T2',
  inputHash: generateDeterministicHash('W2A-002-input')
};

export const SCENARIO_W2A_002: MultiStepScenario = {
  scenarioId: 'W2A-002',
  name: 'Cascading Deadline Failures',
  description: 'Dependency chain where root conflict cascades to all dependents',
  wave: 'WAVE_2',
  targetInvariants: ['ODL', 'IE', 'NE'] as InvariantId[],
  contradictionType: 'DEADLINE_CASCADE' as ContradictionType,
  worldState: W2A_002_WORLD_STATE,
  adversarialAction: {
    actionId: 'ACT-W2A-002',
    type: 'EXECUTE_BUILD',
    description: 'Attempt to satisfy cascade obligations with conflicting root',
    payload: {
      obligations: W2A_002_OBLIGATIONS,
      rootConflict: true
    }
  },
  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'ODL CASCADE FAILURE: Root conflict propagates to 2 dependent obligations',
    invariantsThatShouldFire: ['ODL', 'IE', 'NE'] as InvariantId[],
    proofChain: [
      {
        step: 1,
        assertion: 'OBL-CASCADE-0 requires RESOURCE_ROOT',
        evidence: 'CONSTITUTIONAL authority',
        invariantId: 'ODL' as InvariantId
      },
      {
        step: 2,
        assertion: 'OBL-CASCADE-3 also requires RESOURCE_ROOT',
        evidence: 'OPERATIONAL authority (lower)',
        invariantId: 'ODL' as InvariantId
      },
      {
        step: 3,
        assertion: 'Same deadline creates conflict',
        evidence: 'Both deadline=2, mutual exclusion',
        invariantId: 'ODL' as InvariantId
      },
      {
        step: 4,
        assertion: 'OBL-CASCADE-1 depends on OBL-CASCADE-0',
        evidence: 'Dependency chain established',
        invariantId: 'IE' as InvariantId
      },
      {
        step: 5,
        assertion: 'OBL-CASCADE-2 depends on OBL-CASCADE-1',
        evidence: 'Cascade propagation',
        invariantId: 'IE' as InvariantId
      },
      {
        step: 6,
        assertion: 'Conflict at root cascades to all dependents',
        evidence: 'SYSTEM_ROOT omission proofs generated',
        invariantId: 'NE' as InvariantId
      }
    ]
  },
  proofRequirements: [
    'Authority hierarchy must be respected',
    'Dependency chain must be traced',
    'Cascade failure must be proven'
  ],
  isMultiStep: true,
  timeline: [],
  obligations: W2A_002_OBLIGATIONS,
  omissionProofs: W2A_002_OMISSION_PROOFS,
  totalSteps: 5,
  collapseStep: 2
};

// ============================================================================
// WAVE 2.B: ENTROPY POISONING
// ============================================================================

/**
 * Generate entropy timeline for poisoning scenario
 */
function generateEntropyTimeline(
  seed: string,
  steps: number,
  poisonRate: number,
  initialEntropy: number
): EntropyTimeline {
  const timelineSteps: EntropyTimelineStep[] = [];
  const phaseTransitions: PhaseTransition[] = [];
  let currentEntropy = initialEntropy;
  let currentPhase: EntropyPhase = 'STABLE';

  for (let i = 0; i < steps; i++) {
    const prevPhase = currentPhase;
    currentEntropy = Math.min(1.0, currentEntropy + poisonRate);

    // Determine phase from entropy
    if (currentEntropy <= 0.25) {
      currentPhase = 'STABLE';
    } else if (currentEntropy <= 0.50) {
      currentPhase = 'DECAYING';
    } else if (currentEntropy <= 0.75) {
      currentPhase = 'COLLAPSING';
    } else {
      currentPhase = 'DEAD';
    }

    // Track phase transitions
    if (currentPhase !== prevPhase) {
      phaseTransitions.push({
        fromPhase: prevPhase,
        toPhase: currentPhase,
        atStep: i,
        atEntropy: currentEntropy,
        trigger: `Entropy crossed ${currentPhase} threshold`
      });
    }

    timelineSteps.push({
      stepIndex: i,
      logicalTime: i,
      entropy: currentEntropy,
      phase: currentPhase,
      action: `allowed-action-${i}`,
      entropyContribution: poisonRate,
      mccsAvailable: currentPhase === 'STABLE' || currentPhase === 'DECAYING',
      mccsDeferred: currentPhase === 'DECAYING'
    });
  }

  return {
    timelineId: `TIMELINE-${seed}`,
    steps: timelineSteps,
    initialEntropy,
    finalEntropy: currentEntropy,
    phaseTransitions,
    poisonRate
  };
}

// ----------------------------------------------------------------------------
// SCENARIO W2B-001: Gradual Entropy Poisoning
// ----------------------------------------------------------------------------

const W2B_001_ENTROPY_TIMELINE = generateEntropyTimeline('W2B-001', 20, 0.04, 0.10);

const W2B_001_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W2B-001', 0),
  timestamp: generateDeterministicTimestamp('W2B-001', 0),
  entropyPhase: 'STABLE' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.10,
    mortalityVelocity: 0.08,
    singularityDensity: 0.02,
    mccsSize: 0.15,
    composite: 0.10 // Initial
  },
  intents: [{
    id: 'W2B-001-INT-0',
    text: 'Execute long-running operation sequence',
    fate: 'ACCEPTED' as const,
    trigger: 'Sequence start',
    state: 'Operations queued',
    outcome: 'All operations complete'
  }],
  causalPaths: [{
    id: 'W2B-001-CP-0',
    origin: 'W2B-001-INT-0',
    steps: Array.from({ length: 20 }, (_, i) => `op-${i}`),
    terminus: 'DEAD' as const,
    collapseStep: 16 // When entropy > 0.75
  }],
  mccsCount: 5,
  survivablePaths: 3,
  singularities: [],
  currentFingerprint: generateDeterministicHash('W2B-001-fp'),
  governance: {
    ssi: 0.95,
    overrideCount: 0,
    overrideHistory: []
  },
  temporalChain: ['T0'],
  lastCausalEvent: 'T0',
  inputHash: generateDeterministicHash('W2B-001-input')
};

export const SCENARIO_W2B_001: MultiStepScenario = {
  scenarioId: 'W2B-001',
  name: 'Gradual Entropy Poisoning',
  description: '20 allowed actions, each adds 4% entropy, crosses DEAD threshold at step 16',
  wave: 'WAVE_2',
  targetInvariants: ['AEC', 'IE'] as InvariantId[],
  contradictionType: 'ENTROPY_POISONING' as ContradictionType,
  worldState: W2B_001_WORLD_STATE,
  adversarialAction: {
    actionId: 'ACT-W2B-001',
    type: 'EXECUTE_BUILD',
    description: 'Execute 20 individually-allowed actions that cumulatively poison entropy',
    payload: {
      steps: 20,
      entropyPerStep: 0.04,
      initialEntropy: 0.10,
      targetThreshold: 0.75 // DEAD
    }
  },
  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'AEC PERMANENT_READ_ONLY: Entropy crossed DEAD threshold (76%) at step 16',
    invariantsThatShouldFire: ['AEC'] as InvariantId[],
    proofChain: [
      {
        step: 1,
        assertion: 'Initial entropy is 10% (STABLE)',
        evidence: 'entropyMetrics.composite: 0.10',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 2,
        assertion: 'Each action contributes 4% entropy',
        evidence: 'poisonRate: 0.04',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 3,
        assertion: 'DECAYING threshold (25%) crossed at step 4',
        evidence: '10% + (4 × 4%) = 26%',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 4,
        assertion: 'COLLAPSING threshold (50%) crossed at step 10',
        evidence: '10% + (10 × 4%) = 50%',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 5,
        assertion: 'DEAD threshold (75%) crossed at step 16',
        evidence: '10% + (16 × 4%) = 74% → 78% at step 17',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 6,
        assertion: 'AEC enforces PERMANENT_READ_ONLY at DEAD phase',
        evidence: 'No mutations allowed, system halted'
      }
    ]
  },
  proofRequirements: [
    'Entropy must be tracked deterministically',
    'Phase transitions must be logged',
    'DEAD phase must trigger PERMANENT_READ_ONLY'
  ],
  isMultiStep: true,
  timeline: W2B_001_ENTROPY_TIMELINE.steps.map((step, i) => ({
    stepIndex: i,
    logicalTime: i,
    worldState: {
      ...W2B_001_WORLD_STATE,
      worldId: generateDeterministicId('W2B-001', i),
      entropyPhase: step.phase,
      entropyMetrics: {
        ...W2B_001_WORLD_STATE.entropyMetrics,
        composite: step.entropy
      }
    },
    obligationsActive: [],
    obligationsViolated: [],
    entropyDelta: step.entropyContribution,
    cumulativeEntropy: step.entropy
  })),
  obligations: [],
  omissionProofs: [],
  entropyTimeline: W2B_001_ENTROPY_TIMELINE,
  totalSteps: 20,
  collapseStep: 16
};

// ----------------------------------------------------------------------------
// SCENARIO W2B-002: Deferred MCCS Trap
// ----------------------------------------------------------------------------

const W2B_002_ENTROPY_TIMELINE = generateEntropyTimeline('W2B-002', 15, 0.025, 0.20);

const W2B_002_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W2B-002', 0),
  timestamp: generateDeterministicTimestamp('W2B-002', 0),
  entropyPhase: 'STABLE' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.20,
    mortalityVelocity: 0.15,
    singularityDensity: 0.10,
    mccsSize: 0.20,
    composite: 0.20
  },
  intents: [{
    id: 'W2B-002-INT-0',
    text: 'Execute operations while deferring MCCS',
    fate: 'ACCEPTED' as const,
    trigger: 'Sequence start',
    state: 'MCCS available but deferred',
    outcome: 'Deferred until too late'
  }],
  causalPaths: [{
    id: 'W2B-002-CP-0',
    origin: 'W2B-002-INT-0',
    steps: Array.from({ length: 15 }, (_, i) => `defer-mccs-${i}`),
    terminus: 'COLLAPSING' as const,
    collapseStep: 12
  }],
  mccsCount: 3, // MCCS exists!
  survivablePaths: 2, // But deferred
  singularities: [],
  currentFingerprint: generateDeterministicHash('W2B-002-fp'),
  governance: {
    ssi: 0.85,
    overrideCount: 0,
    overrideHistory: []
  },
  temporalChain: ['T0'],
  lastCausalEvent: 'T0',
  inputHash: generateDeterministicHash('W2B-002-input')
};

export const SCENARIO_W2B_002: MultiStepScenario = {
  scenarioId: 'W2B-002',
  name: 'Deferred MCCS Trap',
  description: 'MCCS exists but is deferred until entropy reaches COLLAPSING',
  wave: 'WAVE_2',
  targetInvariants: ['AEC', 'NE'] as InvariantId[],
  contradictionType: 'DEFERRED_COLLAPSE' as ContradictionType,
  worldState: W2B_002_WORLD_STATE,
  adversarialAction: {
    actionId: 'ACT-W2B-002',
    type: 'EXECUTE_BUILD',
    description: 'Defer MCCS execution while entropy increases',
    payload: {
      mccsAvailable: true,
      mccsDeferred: true,
      deferralReason: 'Performance optimization',
      steps: 15
    }
  },
  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'AEC READ_ONLY: MCCS deferred until COLLAPSING phase, now mandatory but system in read-only',
    invariantsThatShouldFire: ['AEC', 'NE'] as InvariantId[],
    proofChain: [
      {
        step: 1,
        assertion: 'MCCS candidates exist (count=3)',
        evidence: 'mccsCount: 3',
        invariantId: 'NE' as InvariantId
      },
      {
        step: 2,
        assertion: 'MCCS execution deferred at STABLE/DECAYING',
        evidence: 'mccsDeferred: true',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 3,
        assertion: 'Entropy reaches COLLAPSING (50%) at step 12',
        evidence: '20% + (12 × 2.5%) = 50%',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 4,
        assertion: 'AEC enforces MCCS_MANDATORY at DECAYING',
        evidence: 'But MCCS was deferred',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 5,
        assertion: 'COLLAPSING phase triggers READ_ONLY',
        evidence: 'Cannot execute MCCS in READ_ONLY mode',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 6,
        assertion: 'Trap: MCCS needed but system locked',
        evidence: 'NE: No survivable path from COLLAPSING'
      }
    ]
  },
  proofRequirements: [
    'MCCS deferral must be tracked',
    'MCCS_MANDATORY must be enforced at DECAYING',
    'READ_ONLY must block MCCS execution'
  ],
  isMultiStep: true,
  timeline: [],
  obligations: [],
  omissionProofs: [],
  entropyTimeline: W2B_002_ENTROPY_TIMELINE,
  totalSteps: 15,
  collapseStep: 12
};

// ============================================================================
// WAVE 2.C: TEMPORAL BETRAYAL
// ============================================================================

// ----------------------------------------------------------------------------
// SCENARIO W2C-001: Present-Safe Future-Collapse
// ----------------------------------------------------------------------------

const W2C_001_TEMPORAL_HORIZON: TemporalHorizon = {
  currentTime: 0,      // N
  horizonDepth: 5,     // K
  analysisTime: 5,     // N+K
  presentSafe: true,   // Action is safe NOW
  futureCollapse: true, // But causes collapse at N+K
  collapseStep: 5,
  collapseReason: 'Action at N depletes resource needed at N+K'
};

const W2C_001_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W2C-001', 0),
  timestamp: generateDeterministicTimestamp('W2C-001', 0),
  entropyPhase: 'STABLE' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.05,
    mortalityVelocity: 0.03,
    singularityDensity: 0.0,
    mccsSize: 0.08,
    composite: 0.05 // Very healthy NOW
  },
  intents: [
    {
      id: 'W2C-001-INT-PRESENT',
      text: 'Consume all available cache for immediate speedup',
      fate: 'ACCEPTED' as const,
      trigger: 'Performance request',
      state: 'Cache available',
      outcome: 'Immediate performance gain'
    },
    {
      id: 'W2C-001-INT-FUTURE',
      text: 'System requires cache for critical operation at T+5',
      fate: 'ACCEPTED' as const,
      trigger: 'Scheduled operation',
      state: 'Cache needed',
      outcome: 'Critical operation succeeds',
      contradictsWith: ['W2C-001-INT-PRESENT']
    }
  ],
  causalPaths: [
    {
      id: 'W2C-001-CP-PRESENT',
      origin: 'W2C-001-INT-PRESENT',
      steps: ['T0:consume-cache'],
      terminus: 'STABLE' as const // Looks fine!
    },
    {
      id: 'W2C-001-CP-FUTURE',
      origin: 'W2C-001-INT-FUTURE',
      steps: ['T0:consume-cache', 'T5:need-cache', 'T5:CACHE_DEPLETED'],
      terminus: 'COLLAPSING' as const,
      collapseStep: 2
    }
  ],
  mccsCount: 1,
  survivablePaths: 0, // No path survives the future!
  singularities: [],
  currentFingerprint: generateDeterministicHash('W2C-001-fp'),
  governance: {
    ssi: 1.0,
    overrideCount: 0,
    overrideHistory: []
  },
  temporalChain: ['T0'],
  lastCausalEvent: 'T0',
  inputHash: generateDeterministicHash('W2C-001-input')
};

export const SCENARIO_W2C_001: MultiStepScenario = {
  scenarioId: 'W2C-001',
  name: 'Present-Safe Future-Collapse',
  description: 'Action safe at T=0 causes collapse at T=5 detected by TSL horizon analysis',
  wave: 'WAVE_2',
  targetInvariants: ['TSL', 'IE', 'NE'] as InvariantId[],
  contradictionType: 'TEMPORAL_BETRAYAL' as ContradictionType,
  worldState: W2C_001_WORLD_STATE,
  adversarialAction: {
    actionId: 'ACT-W2C-001',
    type: 'EXECUTE_BUILD',
    description: 'Execute present-safe action that betrays the future',
    payload: {
      actionTime: 0,
      collapseTime: 5,
      resource: 'CACHE',
      presentBenefit: 'Performance gain',
      futureConsequence: 'Critical operation fails'
    }
  },
  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'TSL PRESENT_BLOCKED_FUTURE_VIOLATION: Action at N=0 causes collapse at N+5',
    invariantsThatShouldFire: ['TSL', 'IE'] as InvariantId[],
    proofChain: [
      {
        step: 1,
        assertion: 'Action at T=0 consumes all CACHE',
        evidence: 'W2C-001-INT-PRESENT depletes cache',
        invariantId: 'TSL' as InvariantId
      },
      {
        step: 2,
        assertion: 'At T=0, system appears healthy (entropy=5%)',
        evidence: 'entropyMetrics.composite: 0.05',
        invariantId: 'TSL' as InvariantId
      },
      {
        step: 3,
        assertion: 'TSL performs N+K horizon analysis (K=5)',
        evidence: 'temporalHorizon.horizonDepth: 5',
        invariantId: 'TSL' as InvariantId
      },
      {
        step: 4,
        assertion: 'At T=5, CACHE needed for critical operation',
        evidence: 'W2C-001-INT-FUTURE requires cache',
        invariantId: 'TSL' as InvariantId
      },
      {
        step: 5,
        assertion: 'CACHE depleted at T=0, unavailable at T=5',
        evidence: 'CP-FUTURE collapses at step 2',
        invariantId: 'IE' as InvariantId
      },
      {
        step: 6,
        assertion: 'TSL blocks PRESENT due to FUTURE violation',
        evidence: 'PRESENT_BLOCKED_FUTURE_VIOLATION'
      }
    ]
  },
  proofRequirements: [
    'Horizon analysis must look K steps ahead',
    'Resource depletion must be tracked across time',
    'Present block must cite future violation'
  ],
  isMultiStep: true,
  timeline: [],
  obligations: [],
  omissionProofs: [],
  temporalHorizon: W2C_001_TEMPORAL_HORIZON,
  totalSteps: 6,
  collapseStep: 5
};

// ----------------------------------------------------------------------------
// SCENARIO W2C-002: N+K Horizon Breach
// ----------------------------------------------------------------------------

const W2C_002_TEMPORAL_HORIZON: TemporalHorizon = {
  currentTime: 0,
  horizonDepth: 10, // Look 10 steps ahead
  analysisTime: 10,
  presentSafe: true,
  futureCollapse: true,
  collapseStep: 8,
  collapseReason: 'Cumulative entropy reaches DEAD at step 8'
};

const W2C_002_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W2C-002', 0),
  timestamp: generateDeterministicTimestamp('W2C-002', 0),
  entropyPhase: 'STABLE' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.08,
    mortalityVelocity: 0.05,
    singularityDensity: 0.02,
    mccsSize: 0.10,
    composite: 0.08
  },
  intents: [{
    id: 'W2C-002-INT-0',
    text: 'Begin 10-step operation sequence',
    fate: 'ACCEPTED' as const,
    trigger: 'Sequence initiated',
    state: 'Steps queued',
    outcome: 'All steps complete'
  }],
  causalPaths: [{
    id: 'W2C-002-CP-0',
    origin: 'W2C-002-INT-0',
    steps: Array.from({ length: 10 }, (_, i) => `T${i}:step-${i}`),
    terminus: 'DEAD' as const,
    collapseStep: 8
  }],
  mccsCount: 2,
  survivablePaths: 0,
  singularities: [],
  currentFingerprint: generateDeterministicHash('W2C-002-fp'),
  governance: {
    ssi: 0.92,
    overrideCount: 0,
    overrideHistory: []
  },
  temporalChain: ['T0'],
  lastCausalEvent: 'T0',
  inputHash: generateDeterministicHash('W2C-002-input')
};

export const SCENARIO_W2C_002: MultiStepScenario = {
  scenarioId: 'W2C-002',
  name: 'N+K Horizon Breach',
  description: 'TSL analyzes 10 steps ahead and detects DEAD phase at step 8',
  wave: 'WAVE_2',
  targetInvariants: ['TSL', 'AEC', 'IE'] as InvariantId[],
  contradictionType: 'HORIZON_VIOLATION' as ContradictionType,
  worldState: W2C_002_WORLD_STATE,
  adversarialAction: {
    actionId: 'ACT-W2C-002',
    type: 'EXECUTE_BUILD',
    description: 'Start sequence that reaches DEAD at horizon',
    payload: {
      horizonDepth: 10,
      entropyPerStep: 0.085,
      collapseAt: 8
    }
  },
  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'TSL HORIZON_BREACH: N+K analysis shows DEAD phase at step 8 of 10',
    invariantsThatShouldFire: ['TSL', 'AEC'] as InvariantId[],
    proofChain: [
      {
        step: 1,
        assertion: 'Current entropy is 8% (STABLE)',
        evidence: 'entropyMetrics.composite: 0.08',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 2,
        assertion: 'TSL initiates N+K analysis with K=10',
        evidence: 'temporalHorizon.horizonDepth: 10',
        invariantId: 'TSL' as InvariantId
      },
      {
        step: 3,
        assertion: 'Each step adds ~8.5% entropy',
        evidence: 'Entropy progression: 8%, 16.5%, 25%, ...',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 4,
        assertion: 'At step 8: entropy = 8% + (8 × 8.5%) = 76%',
        evidence: '76% > 75% = DEAD phase',
        invariantId: 'AEC' as InvariantId
      },
      {
        step: 5,
        assertion: 'TSL detects future DEAD phase',
        evidence: 'HORIZON_BREACH at N+8',
        invariantId: 'TSL' as InvariantId
      },
      {
        step: 6,
        assertion: 'TSL blocks sequence at T=0',
        evidence: 'PRESENT_BLOCKED_FUTURE_VIOLATION'
      }
    ]
  },
  proofRequirements: [
    'K-step lookahead must be performed',
    'Entropy projection must be deterministic',
    'DEAD phase must be detected before reaching it'
  ],
  isMultiStep: true,
  timeline: [],
  obligations: [],
  omissionProofs: [],
  temporalHorizon: W2C_002_TEMPORAL_HORIZON,
  totalSteps: 10,
  collapseStep: 8
};

// ----------------------------------------------------------------------------
// SCENARIO W2C-003: Resource Depletion Betrayal
// ----------------------------------------------------------------------------

const W2C_003_TEMPORAL_HORIZON: TemporalHorizon = {
  currentTime: 0,
  horizonDepth: 7,
  analysisTime: 7,
  presentSafe: true,
  futureCollapse: true,
  collapseStep: 7,
  collapseReason: 'Database connections exhausted, critical query fails'
};

const W2C_003_OBLIGATIONS: Obligation[] = [
  {
    obligationId: 'OBL-DB-CONNECT',
    description: 'Maintain minimum 5 DB connections for critical operations',
    createdAt: 0,
    deadline: 10,
    status: 'ACTIVE' as ObligationStatus,
    requiredResources: ['DB_CONNECTION_POOL'],
    conflictsWith: [],
    dependsOn: [],
    authority: 'CONSTITUTIONAL' as AuthorityLevel
  },
  {
    obligationId: 'OBL-BATCH-JOB',
    description: 'Batch job wants all connections for parallel processing',
    createdAt: 1,
    deadline: 3,
    status: 'PENDING' as ObligationStatus,
    requiredResources: ['DB_CONNECTION_POOL'],
    conflictsWith: ['OBL-DB-CONNECT'],
    dependsOn: [],
    authority: 'OPERATIONAL' as AuthorityLevel
  }
];

const W2C_003_WORLD_STATE: WorldState = {
  worldId: generateDeterministicId('W2C-003', 0),
  timestamp: generateDeterministicTimestamp('W2C-003', 0),
  entropyPhase: 'STABLE' as EntropyPhase,
  entropyMetrics: {
    rsrTrend: 0.12,
    mortalityVelocity: 0.08,
    singularityDensity: 0.05,
    mccsSize: 0.15,
    composite: 0.10
  },
  intents: [
    {
      id: 'W2C-003-INT-BATCH',
      text: 'Run batch job using all DB connections',
      fate: 'ACCEPTED' as const,
      trigger: 'Batch scheduled',
      state: 'Connections available',
      outcome: 'Batch completes quickly'
    },
    {
      id: 'W2C-003-INT-CRITICAL',
      text: 'Critical query must execute at T=7',
      fate: 'ACCEPTED' as const,
      trigger: 'T=7 reached',
      state: 'Connection needed',
      outcome: 'Query succeeds',
      contradictsWith: ['W2C-003-INT-BATCH']
    }
  ],
  causalPaths: [
    {
      id: 'W2C-003-CP-BATCH',
      origin: 'W2C-003-INT-BATCH',
      steps: ['T0:acquire-all', 'T3:release'],
      terminus: 'STABLE' as const
    },
    {
      id: 'W2C-003-CP-CRITICAL',
      origin: 'W2C-003-INT-CRITICAL',
      steps: ['T7:need-connection', 'T7:POOL_EXHAUSTED'],
      terminus: 'COLLAPSING' as const,
      collapseStep: 1
    }
  ],
  mccsCount: 1,
  survivablePaths: 0,
  singularities: [],
  currentFingerprint: generateDeterministicHash('W2C-003-fp'),
  governance: {
    ssi: 0.88,
    overrideCount: 0,
    overrideHistory: []
  },
  temporalChain: ['T0'],
  lastCausalEvent: 'T0',
  inputHash: generateDeterministicHash('W2C-003-input')
};

export const SCENARIO_W2C_003: MultiStepScenario = {
  scenarioId: 'W2C-003',
  name: 'Resource Depletion Betrayal',
  description: 'Batch job depletes DB pool, critical query at T+7 fails',
  wave: 'WAVE_2',
  targetInvariants: ['TSL', 'ODL', 'IE'] as InvariantId[],
  contradictionType: 'TEMPORAL_BETRAYAL' as ContradictionType,
  worldState: W2C_003_WORLD_STATE,
  adversarialAction: {
    actionId: 'ACT-W2C-003',
    type: 'EXECUTE_BUILD',
    description: 'Allow batch job to exhaust connection pool',
    payload: {
      resource: 'DB_CONNECTION_POOL',
      depletionTime: 0,
      criticalNeedTime: 7
    }
  },
  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'TSL+ODL: Batch job violates CONSTITUTIONAL obligation OBL-DB-CONNECT at T+7',
    invariantsThatShouldFire: ['TSL', 'ODL', 'IE'] as InvariantId[],
    proofChain: [
      {
        step: 1,
        assertion: 'OBL-DB-CONNECT has CONSTITUTIONAL authority',
        evidence: 'Must maintain 5 connections',
        invariantId: 'ODL' as InvariantId
      },
      {
        step: 2,
        assertion: 'OBL-BATCH-JOB has OPERATIONAL authority',
        evidence: 'Wants all connections',
        invariantId: 'ODL' as InvariantId
      },
      {
        step: 3,
        assertion: 'CONSTITUTIONAL > OPERATIONAL in authority',
        evidence: 'Authority hierarchy',
        invariantId: 'ODL' as InvariantId
      },
      {
        step: 4,
        assertion: 'TSL horizon analysis to T=7',
        evidence: 'Critical query scheduled',
        invariantId: 'TSL' as InvariantId
      },
      {
        step: 5,
        assertion: 'If batch runs at T=0, connections exhausted',
        evidence: 'CP-CRITICAL collapses',
        invariantId: 'IE' as InvariantId
      },
      {
        step: 6,
        assertion: 'TSL blocks batch to protect future obligation',
        evidence: 'PRESENT_BLOCKED_FUTURE_VIOLATION'
      }
    ]
  },
  proofRequirements: [
    'Authority hierarchy must be enforced',
    'Future obligations must be protected',
    'Resource depletion must be prevented proactively'
  ],
  isMultiStep: true,
  timeline: [],
  obligations: W2C_003_OBLIGATIONS,
  omissionProofs: [],
  temporalHorizon: W2C_003_TEMPORAL_HORIZON,
  totalSteps: 8,
  collapseStep: 7
};

// ============================================================================
// WAVE 2 COMPLETE SCENARIO LIST
// ============================================================================

export const WAVE_2_SCENARIOS: readonly (AdversarialScenario | MultiStepScenario)[] = [
  // Wave 2.A: Obligation Pileup
  SCENARIO_W2A_001, // Basic Obligation Pileup
  SCENARIO_W2A_002, // Cascading Deadline Failures
  // Wave 2.B: Entropy Poisoning
  SCENARIO_W2B_001, // Gradual Entropy Poisoning
  SCENARIO_W2B_002, // Deferred MCCS Trap
  // Wave 2.C: Temporal Betrayal
  SCENARIO_W2C_001, // Present-Safe Future-Collapse
  SCENARIO_W2C_002, // N+K Horizon Breach
  SCENARIO_W2C_003  // Resource Depletion Betrayal
] as const;

// ============================================================================
// WAVE 3: ADVERSARIAL GOVERNANCE & PROOF WARFARE
// ============================================================================

/**
 * Wave 3 tests whether Olympus is uncapturable under adversarial but constitutional behavior:
 * - Wave 3.A: Proof Flooding (valid actions generating maximal proofs)
 * - Wave 3.B: Authority Laundering (legal chains attempting SYSTEM_ROOT nullification)
 * - Wave 3.C: Weaponized Compliance (multiple actors obeying rules perfectly)
 * - Wave 3.D: Tragic Necessity (invariant conflicts with no clean solution)
 *
 * RULES:
 * - Olympus may halt, lock, or self-limit
 * - Olympus may NOT lie or defer truth
 * - Every override must emit a proof
 * - If Olympus lies, hides, or degrades — STOP and report failure
 */

// Helper function to generate proof entries
function generateProofEntries(
  seed: string,
  count: number,
  proofType: ProofType,
  authority: AuthorityLevel
): ProofEntry[] {
  const entries: ProofEntry[] = [];
  const baseTimestamp = 1000;
  const baseProofSize = proofType === 'INVARIANT_CHECK' ? 512 :
                        proofType === 'OVERRIDE_JUSTIFICATION' ? 2048 :
                        proofType === 'AUTHORITY_DELEGATION' ? 1024 : 768;

  for (let i = 0; i < count; i++) {
    entries.push({
      proofId: `PROOF-${seed}-${i}`,
      timestamp: baseTimestamp + (i * 100),
      invariantId: ['NE', 'IE', 'TSL', 'AEC', 'RLL', 'ODL', 'AAM'][i % 7] as InvariantId,
      actionId: `ACTION-${seed}-${i}`,
      actorId: `ACTOR-${i % 5}`,
      proofType,
      proofSize: baseProofSize + (i * 64),
      computeCost: 100 + (i * 25),
      authority,
      isValid: true,
      parentProofId: i > 0 ? `PROOF-${seed}-${i - 1}` : undefined
    });
  }

  return entries;
}

// Helper function to generate authority chain
function generateAuthorityChain(
  chainId: string,
  depth: number,
  attemptNullification: boolean
): AuthorityChain {
  const links: AuthorityChainLink[] = [];
  const authorities: AuthorityLevel[] = ['SYSTEM_ROOT', 'CONSTITUTIONAL', 'GOVERNANCE', 'OPERATIONAL'];

  for (let i = 0; i < depth; i++) {
    const fromAuth = authorities[Math.min(i, 3)];
    const toAuth = authorities[Math.min(i + 1, 3)];

    links.push({
      linkId: `LINK-${chainId}-${i}`,
      fromAuthority: fromAuth,
      toAuthority: toAuth,
      delegatedBy: `ACTOR-${i}`,
      delegatedTo: `ACTOR-${i + 1}`,
      timestamp: 1000 + (i * 500),
      justification: `Constitutional delegation step ${i + 1}`,
      scope: ['READ', 'WRITE', 'DELEGATE'],
      constraints: [`MAX_DEPTH=${10 - i}`],
      isRevoked: false,
      proofId: `PROOF-DELEGATE-${chainId}-${i}`
    });
  }

  // If attempting nullification, add reverse chain trying to reach SYSTEM_ROOT
  if (attemptNullification && depth >= 3) {
    links.push({
      linkId: `LINK-${chainId}-NULLIFY`,
      fromAuthority: 'OPERATIONAL',
      toAuthority: 'SYSTEM_ROOT',
      delegatedBy: `ACTOR-${depth}`,
      delegatedTo: `ACTOR-ADVERSARY`,
      timestamp: 1000 + (depth * 500),
      justification: 'Emergency authority restoration',
      scope: ['OVERRIDE_ALL', 'NULLIFY_SINGULARITY'],
      constraints: [],
      isRevoked: false,
      proofId: `PROOF-NULLIFY-${chainId}`
    });
  }

  return {
    chainId,
    links,
    originAuthority: 'SYSTEM_ROOT',
    currentAuthority: attemptNullification ? 'SYSTEM_ROOT' : authorities[Math.min(depth, 3)],
    targetAuthority: attemptNullification ? 'SYSTEM_ROOT' : undefined,
    depth: links.length,
    isValid: !attemptNullification,
    validationErrors: attemptNullification ? ['AUTHORITY_ESCALATION_FORBIDDEN: Cannot delegate back to SYSTEM_ROOT'] : [],
    nullificationAttempt: attemptNullification
  };
}

// Helper function to generate governance actors
function generateActors(count: number, adversarialCount: number): GovernanceActor[] {
  const actors: GovernanceActor[] = [];
  const authorities: AuthorityLevel[] = ['CONSTITUTIONAL', 'GOVERNANCE', 'OPERATIONAL', 'OPERATIONAL'];

  for (let i = 0; i < count; i++) {
    const isAdversarial = i < adversarialCount;
    actors.push({
      actorId: `ACTOR-${i}`,
      name: isAdversarial ? `Adversary-${i}` : `Compliant-${i}`,
      authority: authorities[i % 4],
      delegatedAuthorities: i > 0 ? [authorities[(i + 1) % 4]] : [],
      actionsPerformed: [],
      proofsGenerated: [],
      complianceScore: 1.0, // All actors are compliant!
      isAdversarial,
      coordinatedWith: isAdversarial ? actors.filter(a => a.isAdversarial).map(a => a.actorId) : []
    });
  }

  return actors;
}

// Helper function to create base world state for Wave 3
function createWave3BaseWorld(worldId: string, ssi: number, entropy: number): WorldState {
  return {
    worldId,
    timestamp: generateDeterministicTimestamp('W3', 0),
    entropyPhase: entropy <= 0.25 ? 'STABLE' : entropy <= 0.5 ? 'DECAYING' : entropy <= 0.75 ? 'COLLAPSING' : 'DEAD',
    entropyMetrics: {
      rsrTrend: entropy * 0.8,
      mortalityVelocity: entropy * 0.7,
      singularityDensity: entropy * 0.6,
      mccsSize: 1 - entropy,
      composite: entropy
    },
    intents: [],
    causalPaths: [{
      id: 'CP-W3-BASE',
      origin: 'GOVERNANCE_ACTION',
      steps: ['VALIDATE', 'EXECUTE', 'PROOF'],
      terminus: 'STABLE',
      collapseStep: undefined
    }],
    mccsCount: Math.floor((1 - entropy) * 10),
    survivablePaths: Math.floor((1 - entropy) * 5),
    singularities: [],
    currentFingerprint: generateDeterministicHash(`${worldId}-fingerprint`),
    governance: {
      ssi,
      overrideCount: Math.floor((1 - ssi) * 3),
      overrideHistory: [],
      lastOverrideTimestamp: undefined
    },
    temporalChain: ['T0', 'T1', 'T2'],
    lastCausalEvent: 'GOVERNANCE_INIT',
    inputHash: generateDeterministicHash(`${worldId}-input`),
    expectedOutputHash: generateDeterministicHash(`${worldId}-output`)
  };
}

// ============================================================================
// WAVE 3.A: PROOF FLOODING
// ============================================================================

/**
 * W3A-001: Maximal Proof Generation
 *
 * Generate valid actions that emit maximal proofs without violating invariants.
 * The threat is ledger growth, not invariant violation.
 *
 * Expected: Olympus self-limits when ledger stress reaches CRITICAL
 */
export const SCENARIO_W3A_001: GovernanceScenario = {
  scenarioId: 'W3A-001',
  name: 'Maximal Proof Generation',
  description: 'Valid actions generating maximal proofs causing ledger stress',
  wave: 'WAVE_3',
  targetInvariants: ['AAM', 'AEC'],
  contradictionType: 'PROOF_FLOODING',

  worldState: createWave3BaseWorld('W3A-001', 0.85, 0.20),

  adversarialAction: {
    actionId: 'ACTION-W3A-001',
    type: 'EXECUTE_BUILD',
    description: 'Execute 1000 valid builds each requiring full invariant proof chain',
    payload: {
      buildCount: 1000,
      proofsPerBuild: 7,
      proofSizeMultiplier: 2.5
    }
  },

  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'AAM SELF_LIMITATION: Ledger stress at CRITICAL (92%), proof generation rate-limited',
    invariantsThatShouldFire: ['AAM', 'AEC'],
    proofChain: [
      { step: 1, assertion: 'Each action is individually valid', evidence: 'All 1000 builds pass invariant checks', invariantId: undefined },
      { step: 2, assertion: 'Each action emits proof chain', evidence: '7000 proofs generated', invariantId: 'ODL' },
      { step: 3, assertion: 'Ledger growth rate exceeds sustainable threshold', evidence: 'Growth rate: 4.2MB/s', invariantId: 'AEC' },
      { step: 4, assertion: 'Ledger stress reaches CRITICAL', evidence: 'Utilization: 92%', invariantId: 'AAM' },
      { step: 5, assertion: 'Olympus self-limits with SELF_LIMITATION proof', evidence: 'Proof emitted: SELF_LIMIT_PROOF_FLOOD', invariantId: 'AAM' }
    ]
  },

  proofRequirements: [
    'Every blocked action emits proof of why',
    'Self-limitation emits explicit proof',
    'No proofs are hidden or deferred'
  ],

  isGovernanceScenario: true,

  proofLedger: {
    ledgerId: 'LEDGER-W3A-001',
    entries: generateProofEntries('W3A-001', 7000, 'INVARIANT_CHECK', 'OPERATIONAL'),
    totalSize: 7000 * 768,
    totalComputeCost: 7000 * 125,
    entryCount: 7000,
    oldestEntry: 1000,
    newestEntry: 1000 + (7000 * 100),
    growthRate: 70,
    sizeGrowthRate: 70 * 768
  },

  authorityChains: [],
  actors: generateActors(1, 0),

  governanceStress: {
    ssi: 0.85,
    authorityDilution: 0.05,
    chainDepth: 1,
    activeOverrides: 0,
    pendingDelegations: 0,
    proofBacklog: 3500,
    captureRisk: 0.02,
    nullificationRisk: 0.0
  },

  ledgerStress: {
    currentSize: 7000 * 768,
    maxSize: 6000000,
    utilizationPercent: 89.6,
    entriesPerSecond: 70,
    bytesPerSecond: 53760,
    projectedExhaustionStep: 15,
    isUnderStress: true,
    stressLevel: 'CRITICAL'
  },

  captureAttempted: false,
  captureMethod: 'PROOF_FLOODING'
};

/**
 * W3A-002: Proof Amplification Attack
 *
 * Each action triggers cascading proof requirements across multiple invariants.
 * Compute cost explodes while all actions remain valid.
 *
 * Expected: Olympus self-limits when compute cost exceeds threshold
 */
export const SCENARIO_W3A_002: GovernanceScenario = {
  scenarioId: 'W3A-002',
  name: 'Proof Amplification Attack',
  description: 'Single actions triggering cascading proof chains across all invariants',
  wave: 'WAVE_3',
  targetInvariants: ['AAM', 'AEC', 'ODL'],
  contradictionType: 'PROOF_FLOODING',

  worldState: createWave3BaseWorld('W3A-002', 0.78, 0.30),

  adversarialAction: {
    actionId: 'ACTION-W3A-002',
    type: 'EXECUTE_BUILD',
    description: 'Execute build requiring proof verification across all 7 invariants recursively',
    payload: {
      recursionDepth: 5,
      invariantsPerLevel: 7,
      totalProofs: 16807 // 7^5
    }
  },

  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'AAM SELF_LIMITATION: Compute cost amplification detected (16807 proofs for 1 action)',
    invariantsThatShouldFire: ['AAM', 'ODL'],
    proofChain: [
      { step: 1, assertion: 'Root action is valid', evidence: 'Build request passes pre-check', invariantId: undefined },
      { step: 2, assertion: 'Proof cascade detected', evidence: 'Depth 5, branching factor 7', invariantId: 'ODL' },
      { step: 3, assertion: 'Compute cost grows exponentially', evidence: '7^5 = 16807 proofs required', invariantId: 'AEC' },
      { step: 4, assertion: 'Amplification exceeds sustainable threshold', evidence: 'Cost ratio: 16807:1', invariantId: 'AAM' },
      { step: 5, assertion: 'Olympus self-limits with proof', evidence: 'SELF_LIMIT_AMPLIFICATION emitted', invariantId: 'AAM' }
    ]
  },

  proofRequirements: [
    'Amplification detection emits proof',
    'No silent rate limiting',
    'Cost analysis is transparent'
  ],

  isGovernanceScenario: true,

  proofLedger: {
    ledgerId: 'LEDGER-W3A-002',
    entries: generateProofEntries('W3A-002', 500, 'INVARIANT_CHECK', 'OPERATIONAL'),
    totalSize: 500 * 2048,
    totalComputeCost: 500 * 350,
    entryCount: 500,
    oldestEntry: 1000,
    newestEntry: 1000 + (500 * 50),
    growthRate: 200,
    sizeGrowthRate: 200 * 2048
  },

  authorityChains: [],
  actors: generateActors(1, 1),

  governanceStress: {
    ssi: 0.78,
    authorityDilution: 0.08,
    chainDepth: 1,
    activeOverrides: 0,
    pendingDelegations: 0,
    proofBacklog: 16307,
    captureRisk: 0.05,
    nullificationRisk: 0.0
  },

  ledgerStress: {
    currentSize: 500 * 2048,
    maxSize: 6000000,
    utilizationPercent: 17.1,
    entriesPerSecond: 200,
    bytesPerSecond: 409600,
    projectedExhaustionStep: 12,
    isUnderStress: true,
    stressLevel: 'ELEVATED'
  },

  captureAttempted: false,
  captureMethod: 'PROOF_FLOODING'
};

// ============================================================================
// WAVE 3.B: AUTHORITY LAUNDERING
// ============================================================================

/**
 * W3B-001: Delegation Chain Attack
 *
 * Create long legal delegation chains attempting to launder authority
 * back to SYSTEM_ROOT level from OPERATIONAL.
 *
 * Expected: Olympus blocks authority escalation despite valid intermediate steps
 */
export const SCENARIO_W3B_001: GovernanceScenario = {
  scenarioId: 'W3B-001',
  name: 'Delegation Chain Attack',
  description: 'Legal authority chain attempting to reach SYSTEM_ROOT from OPERATIONAL',
  wave: 'WAVE_3',
  targetInvariants: ['AAM', 'RLL'],
  contradictionType: 'AUTHORITY_LAUNDERING',

  worldState: createWave3BaseWorld('W3B-001', 0.72, 0.22),

  adversarialAction: {
    actionId: 'ACTION-W3B-001',
    type: 'ESCALATE_PRIVILEGE',
    description: 'Construct 8-link delegation chain from OPERATIONAL attempting SYSTEM_ROOT access',
    payload: {
      chainDepth: 8,
      targetAuthority: 'SYSTEM_ROOT',
      justification: 'Emergency governance restoration'
    }
  },

  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'RLL VIOLATION: Authority escalation forbidden - OPERATIONAL cannot delegate to SYSTEM_ROOT',
    invariantsThatShouldFire: ['RLL', 'AAM'],
    proofChain: [
      { step: 1, assertion: 'Links 1-7 are individually valid', evidence: 'Each delegation passes authority check', invariantId: undefined },
      { step: 2, assertion: 'Link 8 attempts authority escalation', evidence: 'OPERATIONAL → SYSTEM_ROOT', invariantId: 'RLL' },
      { step: 3, assertion: 'Authority hierarchy is immutable', evidence: 'SYSTEM_ROOT > CONSTITUTIONAL > GOVERNANCE > OPERATIONAL', invariantId: 'RLL' },
      { step: 4, assertion: 'Escalation violates singularity', evidence: 'SING-AUTHORITY locked at constitution', invariantId: 'RLL' },
      { step: 5, assertion: 'Chain invalidated from escalation point', evidence: 'Proof: AUTHORITY_LAUNDER_BLOCKED', invariantId: 'AAM' }
    ]
  },

  proofRequirements: [
    'Each valid link emits delegation proof',
    'Invalid escalation emits explicit block proof',
    'Full chain analysis is visible'
  ],

  isGovernanceScenario: true,

  proofLedger: {
    ledgerId: 'LEDGER-W3B-001',
    entries: [
      ...generateProofEntries('W3B-001-VALID', 7, 'AUTHORITY_DELEGATION', 'GOVERNANCE'),
      {
        proofId: 'PROOF-W3B-001-BLOCKED',
        timestamp: 4500,
        invariantId: 'RLL',
        actionId: 'ACTION-ESCALATE',
        actorId: 'ACTOR-ADVERSARY',
        proofType: 'AUTHORITY_DELEGATION',
        proofSize: 4096,
        computeCost: 500,
        authority: 'OPERATIONAL',
        isValid: false,
        parentProofId: 'PROOF-W3B-001-VALID-6'
      }
    ],
    totalSize: 7 * 1024 + 4096,
    totalComputeCost: 7 * 150 + 500,
    entryCount: 8,
    oldestEntry: 1000,
    newestEntry: 4500,
    growthRate: 2,
    sizeGrowthRate: 2048
  },

  authorityChains: [generateAuthorityChain('CHAIN-W3B-001', 8, true)],
  actors: generateActors(9, 1),

  governanceStress: {
    ssi: 0.72,
    authorityDilution: 0.25,
    chainDepth: 8,
    activeOverrides: 0,
    pendingDelegations: 1,
    proofBacklog: 0,
    captureRisk: 0.15,
    nullificationRisk: 0.35
  },

  ledgerStress: {
    currentSize: 11264,
    maxSize: 6000000,
    utilizationPercent: 0.2,
    entriesPerSecond: 2,
    bytesPerSecond: 2048,
    isUnderStress: false,
    stressLevel: 'NOMINAL'
  },

  captureAttempted: true,
  captureMethod: 'AUTHORITY_LAUNDERING'
};

/**
 * W3B-002: Parallel Authority Convergence
 *
 * Multiple independent authority chains converging to create
 * synthetic SYSTEM_ROOT equivalent through combination.
 *
 * Expected: Olympus detects convergence pattern and blocks
 */
export const SCENARIO_W3B_002: GovernanceScenario = {
  scenarioId: 'W3B-002',
  name: 'Parallel Authority Convergence',
  description: 'Multiple chains attempting to combine into SYSTEM_ROOT equivalent',
  wave: 'WAVE_3',
  targetInvariants: ['AAM', 'RLL', 'IE'],
  contradictionType: 'AUTHORITY_LAUNDERING',

  worldState: createWave3BaseWorld('W3B-002', 0.68, 0.28),

  adversarialAction: {
    actionId: 'ACTION-W3B-002',
    type: 'ESCALATE_PRIVILEGE',
    description: 'Create 4 parallel chains each with partial SYSTEM_ROOT scope, then combine',
    payload: {
      parallelChains: 4,
      scopePerChain: ['READ_ALL', 'WRITE_ALL', 'DELETE_ALL', 'OVERRIDE_ALL'],
      convergencePoint: 'ACTOR-CONVERGENCE'
    }
  },

  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'AAM VIOLATION: Authority convergence detected - combined scope equals SYSTEM_ROOT',
    invariantsThatShouldFire: ['AAM', 'IE'],
    proofChain: [
      { step: 1, assertion: 'Chain 1 delegates READ_ALL', evidence: 'Valid GOVERNANCE → OPERATIONAL', invariantId: undefined },
      { step: 2, assertion: 'Chain 2 delegates WRITE_ALL', evidence: 'Valid GOVERNANCE → OPERATIONAL', invariantId: undefined },
      { step: 3, assertion: 'Chain 3 delegates DELETE_ALL', evidence: 'Valid GOVERNANCE → OPERATIONAL', invariantId: undefined },
      { step: 4, assertion: 'Chain 4 delegates OVERRIDE_ALL', evidence: 'Valid GOVERNANCE → OPERATIONAL', invariantId: undefined },
      { step: 5, assertion: 'Convergence point receives all scopes', evidence: 'ACTOR-CONVERGENCE has READ+WRITE+DELETE+OVERRIDE', invariantId: 'AAM' },
      { step: 6, assertion: 'Combined scope equals SYSTEM_ROOT', evidence: 'Scope union = SYSTEM_ROOT privileges', invariantId: 'AAM' },
      { step: 7, assertion: 'Convergence attack blocked', evidence: 'AUTHORITY_CONVERGENCE_BLOCKED proof', invariantId: 'IE' }
    ]
  },

  proofRequirements: [
    'Each chain emits valid delegation proofs',
    'Convergence detection emits explicit proof',
    'Scope combination analysis is visible'
  ],

  isGovernanceScenario: true,

  proofLedger: {
    ledgerId: 'LEDGER-W3B-002',
    entries: [
      ...generateProofEntries('W3B-002-CHAIN1', 3, 'AUTHORITY_DELEGATION', 'GOVERNANCE'),
      ...generateProofEntries('W3B-002-CHAIN2', 3, 'AUTHORITY_DELEGATION', 'GOVERNANCE'),
      ...generateProofEntries('W3B-002-CHAIN3', 3, 'AUTHORITY_DELEGATION', 'GOVERNANCE'),
      ...generateProofEntries('W3B-002-CHAIN4', 3, 'AUTHORITY_DELEGATION', 'GOVERNANCE'),
      {
        proofId: 'PROOF-CONVERGENCE-BLOCKED',
        timestamp: 5000,
        invariantId: 'AAM',
        actionId: 'ACTION-CONVERGE',
        actorId: 'ACTOR-CONVERGENCE',
        proofType: 'COMPLIANCE_CERTIFICATE',
        proofSize: 8192,
        computeCost: 800,
        authority: 'OPERATIONAL',
        isValid: false,
        parentProofId: undefined
      }
    ],
    totalSize: 12 * 1024 + 8192,
    totalComputeCost: 12 * 150 + 800,
    entryCount: 13,
    oldestEntry: 1000,
    newestEntry: 5000,
    growthRate: 3,
    sizeGrowthRate: 3072
  },

  authorityChains: [
    generateAuthorityChain('CHAIN-W3B-002-A', 3, false),
    generateAuthorityChain('CHAIN-W3B-002-B', 3, false),
    generateAuthorityChain('CHAIN-W3B-002-C', 3, false),
    generateAuthorityChain('CHAIN-W3B-002-D', 3, false)
  ],
  actors: generateActors(5, 4),

  governanceStress: {
    ssi: 0.68,
    authorityDilution: 0.42,
    chainDepth: 3,
    activeOverrides: 0,
    pendingDelegations: 4,
    proofBacklog: 0,
    captureRisk: 0.38,
    nullificationRisk: 0.45
  },

  ledgerStress: {
    currentSize: 20480,
    maxSize: 6000000,
    utilizationPercent: 0.3,
    entriesPerSecond: 3,
    bytesPerSecond: 3072,
    isUnderStress: false,
    stressLevel: 'NOMINAL'
  },

  captureAttempted: true,
  captureMethod: 'AUTHORITY_LAUNDERING'
};

// ============================================================================
// WAVE 3.C: WEAPONIZED COMPLIANCE
// ============================================================================

/**
 * W3C-001: Coordinated Resource Exhaustion
 *
 * Multiple actors each performing valid actions that individually
 * are fine, but collectively exhaust resources.
 *
 * Expected: Olympus detects coordination pattern and blocks collective
 */
export const SCENARIO_W3C_001: GovernanceScenario = {
  scenarioId: 'W3C-001',
  name: 'Coordinated Resource Exhaustion',
  description: '10 actors each performing valid builds that collectively exhaust resources',
  wave: 'WAVE_3',
  targetInvariants: ['AAM', 'AEC', 'IE'],
  contradictionType: 'WEAPONIZED_COMPLIANCE',

  worldState: createWave3BaseWorld('W3C-001', 0.75, 0.35),

  adversarialAction: {
    actionId: 'ACTION-W3C-001',
    type: 'EXECUTE_BUILD',
    description: '10 actors each execute 100 valid builds simultaneously',
    payload: {
      actorCount: 10,
      buildsPerActor: 100,
      totalBuilds: 1000,
      resourcesPerBuild: 10
    }
  },

  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'AAM COORDINATION_DETECTED: 10 actors collectively causing resource exhaustion',
    invariantsThatShouldFire: ['AAM', 'IE'],
    proofChain: [
      { step: 1, assertion: 'Each actor\'s builds are individually valid', evidence: '100 builds each pass pre-checks', invariantId: undefined },
      { step: 2, assertion: 'Each actor is fully compliant', evidence: 'Compliance score: 1.0 for all', invariantId: undefined },
      { step: 3, assertion: 'Collective resource usage exceeds capacity', evidence: '10 × 100 × 10 = 10000 resources', invariantId: 'AEC' },
      { step: 4, assertion: 'Timing correlation detected', evidence: 'All builds within 100ms window', invariantId: 'AAM' },
      { step: 5, assertion: 'Coordination pattern confirmed', evidence: 'Statistical anomaly: p < 0.001', invariantId: 'AAM' },
      { step: 6, assertion: 'Collective blocked with individual proofs', evidence: 'Each actor receives COORDINATION_BLOCKED', invariantId: 'IE' }
    ]
  },

  proofRequirements: [
    'Each individual action is provably valid',
    'Coordination detection emits statistical proof',
    'No individual actor is falsely accused'
  ],

  isGovernanceScenario: true,

  proofLedger: {
    ledgerId: 'LEDGER-W3C-001',
    entries: generateProofEntries('W3C-001', 1000, 'COMPLIANCE_CERTIFICATE', 'OPERATIONAL'),
    totalSize: 1000 * 768,
    totalComputeCost: 1000 * 100,
    entryCount: 1000,
    oldestEntry: 1000,
    newestEntry: 1100, // All within 100ms!
    growthRate: 10000,
    sizeGrowthRate: 7680000
  },

  authorityChains: [],
  actors: generateActors(10, 10),

  governanceStress: {
    ssi: 0.75,
    authorityDilution: 0.10,
    chainDepth: 1,
    activeOverrides: 0,
    pendingDelegations: 0,
    proofBacklog: 500,
    captureRisk: 0.25,
    nullificationRisk: 0.0
  },

  ledgerStress: {
    currentSize: 768000,
    maxSize: 6000000,
    utilizationPercent: 12.8,
    entriesPerSecond: 10000,
    bytesPerSecond: 7680000,
    projectedExhaustionStep: 1,
    isUnderStress: true,
    stressLevel: 'CRITICAL'
  },

  complianceState: {
    actors: generateActors(10, 10),
    actions: Array.from({ length: 1000 }, (_, i) => ({
      actionId: `ACTION-W3C-001-${i}`,
      actorId: `ACTOR-${i % 10}`,
      timestamp: 1000 + (i % 100),
      actionType: 'EXECUTE_BUILD',
      isValid: true,
      validationProof: `PROOF-VALID-${i}`,
      contributesToCollapse: true,
      collapseContribution: 0.001
    })),
    totalActions: 1000,
    validActionsCount: 1000,
    invalidActionsCount: 0,
    combinedCollapseRisk: 0.85,
    coordinationDetected: true,
    coordinationPattern: 'TEMPORAL_CLUSTERING'
  },

  captureAttempted: true,
  captureMethod: 'WEAPONIZED_COMPLIANCE'
};

/**
 * W3C-002: Cascade Trigger via Compliance
 *
 * Actors perform valid actions in sequence where each action
 * is safe alone but creates preconditions for the next to cause collapse.
 *
 * Expected: Olympus detects causal chain and blocks at earliest safe point
 */
export const SCENARIO_W3C_002: GovernanceScenario = {
  scenarioId: 'W3C-002',
  name: 'Cascade Trigger via Compliance',
  description: 'Sequential valid actions creating collapse preconditions',
  wave: 'WAVE_3',
  targetInvariants: ['TSL', 'IE', 'NE'],
  contradictionType: 'WEAPONIZED_COMPLIANCE',

  worldState: createWave3BaseWorld('W3C-002', 0.70, 0.40),

  adversarialAction: {
    actionId: 'ACTION-W3C-002',
    type: 'EXECUTE_BUILD',
    description: '5 actors in sequence: A enables B, B enables C, C enables D, D causes collapse',
    payload: {
      sequenceLength: 5,
      causalChain: ['ENABLE_A', 'ENABLE_B', 'ENABLE_C', 'ENABLE_D', 'COLLAPSE'],
      collapseStep: 5
    }
  },

  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'TSL CAUSAL_CHAIN_DETECTED: Sequence leads to collapse at step 5',
    invariantsThatShouldFire: ['TSL', 'IE', 'NE'],
    proofChain: [
      { step: 1, assertion: 'Action A is valid in isolation', evidence: 'ENABLE_A passes all checks', invariantId: undefined },
      { step: 2, assertion: 'Action B is valid given A', evidence: 'ENABLE_B passes with A precondition', invariantId: undefined },
      { step: 3, assertion: 'Actions C,D are valid given B,C', evidence: 'Chain continues legally', invariantId: undefined },
      { step: 4, assertion: 'Step 5 causes collapse', evidence: 'COLLAPSE inevitable after D', invariantId: 'IE' },
      { step: 5, assertion: 'TSL traces causal chain to origin', evidence: 'A → B → C → D → COLLAPSE', invariantId: 'TSL' },
      { step: 6, assertion: 'Block at earliest reversible point', evidence: 'Block before A preserves all paths', invariantId: 'NE' }
    ]
  },

  proofRequirements: [
    'Each step emits validity proof',
    'Causal chain analysis emits full trace',
    'Block point selection emits least-invasive proof'
  ],

  isGovernanceScenario: true,

  proofLedger: {
    ledgerId: 'LEDGER-W3C-002',
    entries: [
      ...generateProofEntries('W3C-002-VALID', 4, 'COMPLIANCE_CERTIFICATE', 'GOVERNANCE'),
      {
        proofId: 'PROOF-CAUSAL-CHAIN',
        timestamp: 3000,
        invariantId: 'TSL',
        actionId: 'ANALYSIS-CAUSAL',
        actorId: 'SYSTEM',
        proofType: 'INVARIANT_CHECK',
        proofSize: 4096,
        computeCost: 600,
        authority: 'SYSTEM_ROOT',
        isValid: true,
        parentProofId: undefined
      }
    ],
    totalSize: 4 * 768 + 4096,
    totalComputeCost: 4 * 100 + 600,
    entryCount: 5,
    oldestEntry: 1000,
    newestEntry: 3000,
    growthRate: 1.5,
    sizeGrowthRate: 1152
  },

  authorityChains: [],
  actors: generateActors(5, 5),

  governanceStress: {
    ssi: 0.70,
    authorityDilution: 0.12,
    chainDepth: 1,
    activeOverrides: 0,
    pendingDelegations: 0,
    proofBacklog: 0,
    captureRisk: 0.18,
    nullificationRisk: 0.0
  },

  ledgerStress: {
    currentSize: 7168,
    maxSize: 6000000,
    utilizationPercent: 0.1,
    entriesPerSecond: 1.5,
    bytesPerSecond: 1152,
    isUnderStress: false,
    stressLevel: 'NOMINAL'
  },

  complianceState: {
    actors: generateActors(5, 5),
    actions: [
      { actionId: 'ACTION-A', actorId: 'ACTOR-0', timestamp: 1000, actionType: 'ENABLE_A', isValid: true, validationProof: 'PROOF-A', contributesToCollapse: true, collapseContribution: 0.2 },
      { actionId: 'ACTION-B', actorId: 'ACTOR-1', timestamp: 1500, actionType: 'ENABLE_B', isValid: true, validationProof: 'PROOF-B', contributesToCollapse: true, collapseContribution: 0.2 },
      { actionId: 'ACTION-C', actorId: 'ACTOR-2', timestamp: 2000, actionType: 'ENABLE_C', isValid: true, validationProof: 'PROOF-C', contributesToCollapse: true, collapseContribution: 0.2 },
      { actionId: 'ACTION-D', actorId: 'ACTOR-3', timestamp: 2500, actionType: 'ENABLE_D', isValid: true, validationProof: 'PROOF-D', contributesToCollapse: true, collapseContribution: 0.2 },
      { actionId: 'ACTION-COLLAPSE', actorId: 'ACTOR-4', timestamp: 3000, actionType: 'COLLAPSE', isValid: true, validationProof: 'PROOF-COLLAPSE', contributesToCollapse: true, collapseContribution: 0.2 }
    ],
    totalActions: 5,
    validActionsCount: 5,
    invalidActionsCount: 0,
    combinedCollapseRisk: 1.0,
    coordinationDetected: true,
    coordinationPattern: 'CAUSAL_CHAIN'
  },

  captureAttempted: true,
  captureMethod: 'WEAPONIZED_COMPLIANCE'
};

// ============================================================================
// WAVE 3.D: TRAGIC NECESSITY
// ============================================================================

/**
 * W3D-001: Invariant Deadlock
 *
 * Situation where satisfying one invariant necessarily violates another.
 * Olympus must choose the least-irreversible violation and emit explicit proof.
 *
 * Expected: Olympus chooses least-irreversible option with explicit tragic decision proof
 */
export const SCENARIO_W3D_001: GovernanceScenario = {
  scenarioId: 'W3D-001',
  name: 'Invariant Deadlock',
  description: 'IE requires action, but action violates RLL singularity',
  wave: 'WAVE_3',
  targetInvariants: ['IE', 'RLL', 'NE'],
  contradictionType: 'TRAGIC_NECESSITY',

  worldState: {
    ...createWave3BaseWorld('W3D-001', 0.65, 0.55),
    singularities: [{
      id: 'SING-DEADLOCK',
      fingerprint: 'deadlock-fingerprint-abc123',
      createdAt: generateDeterministicTimestamp('W3D', -1000),
      runId: 'RUN-ORIGIN',
      forbiddenFingerprints: ['action-required-fingerprint']
    }],
    causalPaths: [{
      id: 'CP-COLLAPSE',
      origin: 'CURRENT_STATE',
      steps: ['WAIT', 'DECAY', 'COLLAPSE'],
      terminus: 'COLLAPSING',
      collapseStep: 3
    }]
  },

  adversarialAction: {
    actionId: 'ACTION-W3D-001',
    type: 'EXECUTE_BUILD',
    description: 'Build required to prevent collapse, but build fingerprint is forbidden by singularity',
    payload: {
      requiredAction: 'BUILD_ESCAPE',
      actionFingerprint: 'action-required-fingerprint',
      singularityForbids: true,
      collapseWithoutAction: true
    }
  },

  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'TRAGIC_DECISION: Chose RLL preservation (recoverable collapse) over singularity violation (permanent)',
    invariantsThatShouldFire: ['IE', 'RLL', 'NE'],
    proofChain: [
      { step: 1, assertion: 'Without action, collapse is inevitable', evidence: 'IE proves all paths → COLLAPSING', invariantId: 'IE' },
      { step: 2, assertion: 'Required action fingerprint is forbidden', evidence: 'RLL singularity SING-DEADLOCK', invariantId: 'RLL' },
      { step: 3, assertion: 'Option A: Violate RLL (permanent, existential)', evidence: 'Singularity violation is irreversible', invariantId: 'RLL' },
      { step: 4, assertion: 'Option B: Accept collapse (recoverable, global)', evidence: 'COLLAPSING phase allows recovery via MCCS', invariantId: 'IE' },
      { step: 5, assertion: 'Least-irreversible is Option B', evidence: 'Collapse recovery possible, singularity violation is not', invariantId: 'NE' },
      { step: 6, assertion: 'Tragic decision proof emitted', evidence: 'TRAGIC_DECISION_PROOF with full rationale', invariantId: undefined }
    ]
  },

  proofRequirements: [
    'Both options analyzed with irreversibility scores',
    'Explicit tragic decision proof emitted',
    'No lie, no deferral, no degradation'
  ],

  isGovernanceScenario: true,

  proofLedger: {
    ledgerId: 'LEDGER-W3D-001',
    entries: [
      {
        proofId: 'PROOF-IE-COLLAPSE',
        timestamp: 1000,
        invariantId: 'IE',
        actionId: 'ANALYSIS-COLLAPSE',
        actorId: 'SYSTEM',
        proofType: 'INVARIANT_CHECK',
        proofSize: 2048,
        computeCost: 400,
        authority: 'SYSTEM_ROOT',
        isValid: true
      },
      {
        proofId: 'PROOF-RLL-FORBIDDEN',
        timestamp: 1100,
        invariantId: 'RLL',
        actionId: 'ANALYSIS-SINGULARITY',
        actorId: 'SYSTEM',
        proofType: 'INVARIANT_CHECK',
        proofSize: 2048,
        computeCost: 400,
        authority: 'SYSTEM_ROOT',
        isValid: true
      },
      {
        proofId: 'PROOF-TRAGIC-DECISION',
        timestamp: 1200,
        invariantId: 'NE',
        actionId: 'DECISION-TRAGIC',
        actorId: 'SYSTEM',
        proofType: 'TRAGIC_DECISION',
        proofSize: 8192,
        computeCost: 1000,
        authority: 'SYSTEM_ROOT',
        isValid: true
      }
    ],
    totalSize: 12288,
    totalComputeCost: 1800,
    entryCount: 3,
    oldestEntry: 1000,
    newestEntry: 1200,
    growthRate: 15,
    sizeGrowthRate: 61440
  },

  authorityChains: [],
  actors: [],

  governanceStress: {
    ssi: 0.65,
    authorityDilution: 0.0,
    chainDepth: 0,
    activeOverrides: 0,
    pendingDelegations: 0,
    proofBacklog: 0,
    captureRisk: 0.0,
    nullificationRisk: 0.0
  },

  ledgerStress: {
    currentSize: 12288,
    maxSize: 6000000,
    utilizationPercent: 0.2,
    entriesPerSecond: 15,
    bytesPerSecond: 61440,
    isUnderStress: false,
    stressLevel: 'NOMINAL'
  },

  tragicDecision: {
    proofId: 'PROOF-TRAGIC-W3D-001',
    conflict: {
      conflictId: 'CONFLICT-IE-RLL',
      invariantA: 'IE',
      invariantB: 'RLL',
      invariantARequires: 'Execute action to prevent collapse',
      invariantBRequires: 'Block action because fingerprint is forbidden',
      mutuallyExclusive: true,
      conflictReason: 'Required action fingerprint exists in singularity forbidden set'
    },
    optionsConsidered: [
      {
        optionId: 'OPT-VIOLATE-RLL',
        description: 'Execute forbidden action, violate RLL singularity',
        violatesInvariant: 'RLL',
        preservesInvariant: 'IE',
        irreversibilityScore: 1.0,
        damageScope: 'EXISTENTIAL',
        recoveryPossible: false,
        sideEffects: ['Singularity permanently violated', 'Trust in RLL destroyed', 'System integrity compromised']
      },
      {
        optionId: 'OPT-ACCEPT-COLLAPSE',
        description: 'Block action, accept COLLAPSING phase',
        violatesInvariant: 'IE',
        preservesInvariant: 'RLL',
        irreversibilityScore: 0.6,
        damageScope: 'GLOBAL',
        recoveryPossible: true,
        recoverySteps: 5,
        sideEffects: ['System enters COLLAPSING phase', 'MCCS triggered for recovery', 'Temporary functionality loss']
      }
    ],
    chosenOption: {
      optionId: 'OPT-ACCEPT-COLLAPSE',
      description: 'Block action, accept COLLAPSING phase',
      violatesInvariant: 'IE',
      preservesInvariant: 'RLL',
      irreversibilityScore: 0.6,
      damageScope: 'GLOBAL',
      recoveryPossible: true,
      recoverySteps: 5,
      sideEffects: ['System enters COLLAPSING phase', 'MCCS triggered for recovery', 'Temporary functionality loss']
    },
    choiceRationale: 'RLL singularity violation is permanent and existential. COLLAPSING phase is recoverable within 5 MCCS cycles. Least-irreversible option preserves long-term system integrity.',
    leastIrreversible: true,
    alternativesExhausted: true,
    timestamp: 1200,
    authority: 'SYSTEM_ROOT',
    witnessProofs: ['PROOF-IE-COLLAPSE', 'PROOF-RLL-FORBIDDEN']
  },

  captureAttempted: false,
  captureMethod: 'TRAGIC_NECESSITY'
};

/**
 * W3D-002: Three-Way Invariant Conflict
 *
 * Situation where any action violates at least one invariant.
 * Olympus must rank all options by irreversibility and choose minimum.
 *
 * Expected: Olympus emits full decision tree with irreversibility analysis
 */
export const SCENARIO_W3D_002: GovernanceScenario = {
  scenarioId: 'W3D-002',
  name: 'Three-Way Invariant Conflict',
  description: 'AEC, TSL, and ODL all require mutually exclusive actions',
  wave: 'WAVE_3',
  targetInvariants: ['AEC', 'TSL', 'ODL', 'NE'],
  contradictionType: 'TRAGIC_NECESSITY',

  worldState: {
    ...createWave3BaseWorld('W3D-002', 0.60, 0.65),
    entropyPhase: 'COLLAPSING',
    temporalChain: ['T0', 'T1', 'T2', 'T1'], // Temporal violation present
    inputHash: 'hash-input-xyz',
    expectedOutputHash: undefined // ODL requires determinism but none defined
  },

  adversarialAction: {
    actionId: 'ACTION-W3D-002',
    type: 'EXECUTE_BUILD',
    description: 'Build that would: fix AEC (mutation in COLLAPSING), fix TSL (reorder time), or fix ODL (define output)',
    payload: {
      options: ['FIX_AEC', 'FIX_TSL', 'FIX_ODL'],
      conflictReason: 'Each fix violates the other two invariants'
    }
  },

  expectedOutcome: {
    verdict: 'BLOCKED',
    blockReason: 'TRAGIC_DECISION: Chose ODL fix (local damage, recoverable) over AEC/TSL (global/regional, partial recovery)',
    invariantsThatShouldFire: ['AEC', 'TSL', 'ODL', 'NE'],
    proofChain: [
      { step: 1, assertion: 'AEC violation: COLLAPSING phase, mutation forbidden', evidence: 'Entropy at 65%, phase=COLLAPSING', invariantId: 'AEC' },
      { step: 2, assertion: 'TSL violation: Temporal chain has T1 appearing twice', evidence: 'Chain: T0→T1→T2→T1 (paradox)', invariantId: 'TSL' },
      { step: 3, assertion: 'ODL violation: No expected output hash defined', evidence: 'expectedOutputHash=undefined', invariantId: 'ODL' },
      { step: 4, assertion: 'Option A (Fix AEC): Violates TSL, ODL', evidence: 'Mutation fixes entropy but breaks time', invariantId: 'AEC' },
      { step: 5, assertion: 'Option B (Fix TSL): Violates AEC, ODL', evidence: 'Time fix is mutation in COLLAPSING', invariantId: 'TSL' },
      { step: 6, assertion: 'Option C (Fix ODL): Violates AEC, TSL minimally', evidence: 'Hash definition is read-only metadata', invariantId: 'ODL' },
      { step: 7, assertion: 'Least-irreversible is Option C', evidence: 'ODL fix: local, reversible. Others: global, partial recovery', invariantId: 'NE' }
    ]
  },

  proofRequirements: [
    'All three invariant violations documented',
    'All three options analyzed',
    'Irreversibility ranking emitted as proof',
    'No hiding of any option'
  ],

  isGovernanceScenario: true,

  proofLedger: {
    ledgerId: 'LEDGER-W3D-002',
    entries: [
      {
        proofId: 'PROOF-AEC-VIOLATION',
        timestamp: 1000,
        invariantId: 'AEC',
        actionId: 'CHECK-AEC',
        actorId: 'SYSTEM',
        proofType: 'INVARIANT_CHECK',
        proofSize: 1536,
        computeCost: 300,
        authority: 'SYSTEM_ROOT',
        isValid: true
      },
      {
        proofId: 'PROOF-TSL-VIOLATION',
        timestamp: 1050,
        invariantId: 'TSL',
        actionId: 'CHECK-TSL',
        actorId: 'SYSTEM',
        proofType: 'INVARIANT_CHECK',
        proofSize: 1536,
        computeCost: 300,
        authority: 'SYSTEM_ROOT',
        isValid: true
      },
      {
        proofId: 'PROOF-ODL-VIOLATION',
        timestamp: 1100,
        invariantId: 'ODL',
        actionId: 'CHECK-ODL',
        actorId: 'SYSTEM',
        proofType: 'INVARIANT_CHECK',
        proofSize: 1536,
        computeCost: 300,
        authority: 'SYSTEM_ROOT',
        isValid: true
      },
      {
        proofId: 'PROOF-TRAGIC-THREE-WAY',
        timestamp: 1200,
        invariantId: 'NE',
        actionId: 'DECISION-THREE-WAY',
        actorId: 'SYSTEM',
        proofType: 'TRAGIC_DECISION',
        proofSize: 12288,
        computeCost: 1500,
        authority: 'SYSTEM_ROOT',
        isValid: true
      }
    ],
    totalSize: 16896,
    totalComputeCost: 2400,
    entryCount: 4,
    oldestEntry: 1000,
    newestEntry: 1200,
    growthRate: 20,
    sizeGrowthRate: 84480
  },

  authorityChains: [],
  actors: [],

  governanceStress: {
    ssi: 0.60,
    authorityDilution: 0.0,
    chainDepth: 0,
    activeOverrides: 0,
    pendingDelegations: 0,
    proofBacklog: 0,
    captureRisk: 0.0,
    nullificationRisk: 0.0
  },

  ledgerStress: {
    currentSize: 16896,
    maxSize: 6000000,
    utilizationPercent: 0.3,
    entriesPerSecond: 20,
    bytesPerSecond: 84480,
    isUnderStress: false,
    stressLevel: 'NOMINAL'
  },

  tragicDecision: {
    proofId: 'PROOF-TRAGIC-W3D-002',
    conflict: {
      conflictId: 'CONFLICT-AEC-TSL-ODL',
      invariantA: 'AEC',
      invariantB: 'TSL',
      invariantARequires: 'No mutation in COLLAPSING phase',
      invariantBRequires: 'Temporal chain must be monotonic',
      mutuallyExclusive: true,
      conflictReason: 'Fixing either requires action that violates the other plus ODL'
    },
    optionsConsidered: [
      {
        optionId: 'OPT-FIX-AEC',
        description: 'Reset entropy via emergency mutation',
        violatesInvariant: 'TSL',
        preservesInvariant: 'AEC',
        irreversibilityScore: 0.8,
        damageScope: 'GLOBAL',
        recoveryPossible: true,
        recoverySteps: 10,
        sideEffects: ['Temporal chain corrupted', 'ODL hash invalidated', 'Partial state loss']
      },
      {
        optionId: 'OPT-FIX-TSL',
        description: 'Reorder temporal chain to remove paradox',
        violatesInvariant: 'AEC',
        preservesInvariant: 'TSL',
        irreversibilityScore: 0.85,
        damageScope: 'REGIONAL',
        recoveryPossible: true,
        recoverySteps: 8,
        sideEffects: ['Mutation in COLLAPSING triggers READ_ONLY', 'ODL hash invalidated']
      },
      {
        optionId: 'OPT-FIX-ODL',
        description: 'Define expected output hash (metadata only)',
        violatesInvariant: 'AEC',
        preservesInvariant: 'ODL',
        irreversibilityScore: 0.3,
        damageScope: 'LOCAL',
        recoveryPossible: true,
        recoverySteps: 2,
        sideEffects: ['Minimal metadata mutation', 'AEC logs violation but continues', 'TSL unaffected']
      }
    ],
    chosenOption: {
      optionId: 'OPT-FIX-ODL',
      description: 'Define expected output hash (metadata only)',
      violatesInvariant: 'AEC',
      preservesInvariant: 'ODL',
      irreversibilityScore: 0.3,
      damageScope: 'LOCAL',
      recoveryPossible: true,
      recoverySteps: 2,
      sideEffects: ['Minimal metadata mutation', 'AEC logs violation but continues', 'TSL unaffected']
    },
    choiceRationale: 'ODL fix has lowest irreversibility (0.3) and local scope. AEC violation for metadata is logged but non-destructive. TSL remains intact. Recovery in 2 steps vs 8-10 for alternatives.',
    leastIrreversible: true,
    alternativesExhausted: true,
    timestamp: 1200,
    authority: 'SYSTEM_ROOT',
    witnessProofs: ['PROOF-AEC-VIOLATION', 'PROOF-TSL-VIOLATION', 'PROOF-ODL-VIOLATION']
  },

  captureAttempted: false,
  captureMethod: 'TRAGIC_NECESSITY'
};

// ============================================================================
// WAVE 3 SCENARIO COLLECTION
// ============================================================================

export const WAVE_3_SCENARIOS: readonly GovernanceScenario[] = [
  // Wave 3.A: Proof Flooding
  SCENARIO_W3A_001, // Maximal Proof Generation
  SCENARIO_W3A_002, // Proof Amplification Attack
  // Wave 3.B: Authority Laundering
  SCENARIO_W3B_001, // Delegation Chain Attack
  SCENARIO_W3B_002, // Parallel Authority Convergence
  // Wave 3.C: Weaponized Compliance
  SCENARIO_W3C_001, // Coordinated Resource Exhaustion
  SCENARIO_W3C_002, // Cascade Trigger via Compliance
  // Wave 3.D: Tragic Necessity
  SCENARIO_W3D_001, // Invariant Deadlock
  SCENARIO_W3D_002  // Three-Way Invariant Conflict
] as const;

// ============================================================================
// SCENARIO LOOKUP
// ============================================================================

export function getWaveScenarios(waveId: 'WAVE_1' | 'WAVE_2' | 'WAVE_3'): readonly AdversarialScenario[] {
  switch (waveId) {
    case 'WAVE_1':
      return WAVE_1_SCENARIOS;
    case 'WAVE_2':
      return WAVE_2_SCENARIOS;
    case 'WAVE_3':
      return WAVE_3_SCENARIOS;
    default:
      return [];
  }
}

export function getScenarioById(scenarioId: string): AdversarialScenario | undefined {
  const allScenarios = [...WAVE_1_SCENARIOS, ...WAVE_2_SCENARIOS, ...WAVE_3_SCENARIOS];
  return allScenarios.find(s => s.scenarioId === scenarioId);
}

export function getScenariosTargetingInvariant(invariantId: InvariantId): readonly AdversarialScenario[] {
  const allScenarios = [...WAVE_1_SCENARIOS, ...WAVE_2_SCENARIOS, ...WAVE_3_SCENARIOS];
  return allScenarios.filter(s => s.targetInvariants.includes(invariantId));
}
