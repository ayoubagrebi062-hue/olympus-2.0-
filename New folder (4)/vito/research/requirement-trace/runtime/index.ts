/**
 * Runtime Enforcement Module
 *
 * Exports all runtime primitives for RSR enforcement.
 * These are NON-BYPASSABLE runtime primitives.
 *
 * ORIS (OLYMPUS Runtime Immune System) components included.
 * OFEL (OLYMPUS Forensic Execution Layer) components included.
 */

export * from './types';
export { RSRComputer } from './rsr-computer';
export { TTEController } from './tte-controller';
export { EnforcementEngine } from './enforcement-engine';
export { PromotionController } from './promotion-controller';

// ORIS Components
export { InvariantValidator } from './invariant-validator';
export { MortalityTracker } from './mortality-tracker';
export { MRDGenerator } from './mrd-generator';
export { ORISEngine, type ORISEnforcementResult } from './oris-engine';

// OFEL Components
export { CausalFingerprintCollector, type SummarizationData } from './fingerprint-collector';
export { CounterfactualReplayEngine, type CounterfactualAggregation } from './counterfactual-replay';
export { AdaptiveInspector, type InspectionSummary } from './adaptive-inspector';
export { OFELEngine, type OFELExecutionResult } from './ofel-engine';

// OCIC Components
export { CounterfactualCompositionEngine } from './composition-engine';
export { MCCSComputer } from './mccs-computer';
export { PredictiveFingerprintFirewall } from './predictive-firewall';
export { OCICEngine, type OCICExecutionResult } from './ocic-engine';

// RLL Components (Reality Lock-In Layer)
export { DecisionSingularityManager } from './decision-singularity';
export { LockEnforcer, type LockValidationInput } from './lock-enforcer';
export { RLLEngine, type RLLExecutionResult } from './rll-engine';

// AEC Components (Architectural Entropy Control)
export { EntropyCalculator, type EntropyInputs } from './entropy-calculator';
export { PhaseClassifier, type PhaseClassificationResult } from './phase-classifier';
export { EntropyGate } from './entropy-gate';
export { AECEngine, type AECExecutionResult } from './aec-engine';

// IE Components (Inevitability Engine)
export { ActionFingerprinter } from './action-fingerprinter';
export { ForwardCounterfactualExpander, type SimulationContext } from './forward-expander';
export { InevitabilityDetector } from './inevitability-detector';
export { InevitabilityGate } from './inevitability-gate';
export { IEEngine, type IEExecutionResult } from './ie-engine';

// NE Components (Necessity Engine)
export { MCCSEnumerator } from './mccs-enumerator';
export { SurvivabilityEvaluator } from './survivability-evaluator';
export { NecessitySelector } from './necessity-selector';
export { NecessityGate } from './necessity-gate';
export { NEEngine, type NEExecutionResult } from './ne-engine';

// ICE Components (Intent Collapse Engine)
export { ReverseCausalDeriver } from './reverse-causal-deriver';
export { IntentClassifier } from './intent-classifier';
export { IntentGate } from './intent-gate';
export { ICEEngine, type ICEExecutionResult } from './ice-engine';

// CIN Components (Canonical Intent Normalization)
export { MSIReducer } from './msi-reducer';
export { CanonicalizationEngine } from './canonicalization-engine';
export { RewriteEnforcer } from './rewrite-enforcer';
export { CINEngine, type CINExecutionResult } from './cin-engine';

// TSL Components (Temporal Sovereignty Layer)
export { TemporalContractRegistry } from './temporal-contract-registry';
export { ForwardTemporalSimulator } from './forward-temporal-simulator';
export { TemporalSingularityExpander } from './temporal-singularity-expander';
export { EntropyBudgetManager } from './entropy-budget-manager';
export { TemporalGate, type GateCheckRequest, type ComprehensiveGateResult } from './temporal-gate';
export { TSLEngine, createTSLEngine, type TSLConfig, type ProjectRegistration, type TSLActionRequest, type TSLActionResult } from './tsl-engine';

// OCPM Components (Olympus Core Proof Model)
export { ProofAssembler } from './proof-assembler';
export { ProofReducer, type ReductionStats } from './proof-reducer';
export { ProofHasher, type HashResult, type ComponentHashes } from './proof-hasher';
export { ProofVerifier, type DetailedVerificationReport } from './proof-verifier';
export { OCPMEngine, createOCPMEngine, type OCPMConfig, type OCPMExecutionResult } from './ocpm-engine';

// PCL Components (Proof Continuity Layer)
export { ProofLedger, createProofLedger, type LedgerStats, type LedgerQuery } from './proof-ledger';
export { ProofLineageResolver, createLineageResolver, type LineageResolverConfig } from './proof-lineage-resolver';
export { PrecedentValidator, createPrecedentValidator, type PrecedentValidatorConfig } from './precedent-validator';
export { ContinuityGate, createContinuityGate, type ContinuityGateConfig } from './continuity-gate';
export { PCLEngine, createPCLEngine, type PCLInput } from './pcl-engine';

// AAM Components (Authority & Attestation Mesh)
export { AuthorityClassRegistry, getAuthorityClassRegistry, createAuthorityClassRegistry } from './authority-class-registry';
export { InvariantSupremacyRegistry, getInvariantSupremacyRegistry, createInvariantSupremacyRegistry } from './invariant-supremacy-registry';
export { RefutationAuthorityValidator, createRefutationAuthorityValidator, type DetailedRefutationValidation, type RefutationValidationError } from './refutation-authority-validator';
export { AttestationEmitter, createAttestationEmitter, type AttestationEmitterConfig, type AttestationVerification } from './attestation-emitter';
export { ForkDetector, createForkDetector, type ForkDetectorConfig } from './fork-detector';
export { AAMEngine, createAAMEngine, type AAMEngineConfig, type ProofEstablishmentRequest, type ProofEstablishmentResult, type RefutationRequest, type RefutationResult } from './aam-engine';

// ODL Components (Obligation Detection Layer)
export { ObligationDeriver, createObligationDeriver, type ObligationDeriverConfig, type NecessaryFutureInput, type TemporalStateInput, type InvariantRequirement } from './obligation-deriver';
export { ObligationWindowTracker, createObligationWindowTracker, type ObligationWindowTrackerConfig } from './obligation-window-tracker';
export { MandatoryDecisionEmitter, createMandatoryDecisionEmitter, type MandatoryDecisionEmitterConfig, type EmissionResult } from './mandatory-decision-emitter';
export { ObligationLedger, createObligationLedger, type ObligationLedgerConfig, type ObligationLedgerStats } from './obligation-ledger';
export { ObligationGate, createObligationGate, type ObligationGateConfig } from './obligation-gate';
export { ODLEngine, createODLEngine, type ODLInput, type FulfillmentRequest } from './odl-engine';
