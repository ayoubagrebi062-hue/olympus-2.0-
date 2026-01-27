/**
 * Comparative Analyzer
 *
 * Compares control shapes vs stateful shapes to prove selective loss.
 * This is Olympus' signature capability.
 */

import type {
  ShapeTraceResult,
  ShapeDeclaration,
  CounterfactualAnalysis,
  RootCause,
  RootCauseClass,
  ExecutionVerdict,
  VerdictDetails
} from '../registry/types';
import { ShapeRegistry } from '../registry';
import type { HandoffId, LossClass, TracedAgentId } from '../types';

export interface ComparativeResult {
  control_shapes_survived: string[];
  stateful_shapes_lost: string[];
  loss_is_selective: boolean;
  selectivity_evidence: string;
}

export interface SelectiveLossProof {
  proven: boolean;
  control_survivor: string | null;
  stateful_victim: string | null;
  failure_handoff: HandoffId | null;
  evidence: string;
}

export class ComparativeAnalyzer {
  private registry: ShapeRegistry;

  constructor(registry: ShapeRegistry) {
    this.registry = registry;
  }

  /**
   * Analyze control vs stateful shape survival
   */
  analyzeComparative(
    shapeTraces: Record<string, ShapeTraceResult>
  ): ComparativeResult {
    const controlShapes = this.registry.getControlShapes();
    const statefulShapes = this.registry.getStatefulShapes();

    const controlSurvived: string[] = [];
    const statefulLost: string[] = [];

    // Check which control shapes survived H4
    for (const shape of controlShapes) {
      const trace = shapeTraces[shape.id];
      if (trace) {
        const h4Loss = trace.handoff_losses['H4' as HandoffId];
        if (!h4Loss?.loss_detected) {
          controlSurvived.push(shape.id);
        }
      }
    }

    // Check which stateful shapes were lost at H4
    for (const shape of statefulShapes) {
      const trace = shapeTraces[shape.id];
      if (trace) {
        const h4Loss = trace.handoff_losses['H4' as HandoffId];
        if (h4Loss?.loss_detected) {
          statefulLost.push(shape.id);
        }
      }
    }

    // Determine if loss is selective
    const lossIsSelective = controlSurvived.length > 0 && statefulLost.length > 0;

    let selectivityEvidence = '';
    if (lossIsSelective) {
      selectivityEvidence = `SELECTIVE LOSS PROVEN: Control shapes [${controlSurvived.join(', ')}] survived H4 ` +
        `while stateful shapes [${statefulLost.join(', ')}] were destroyed. ` +
        `This proves the loss mechanism targets stateful capabilities specifically.`;
    } else if (statefulLost.length > 0) {
      selectivityEvidence = `Stateful shapes lost at H4: [${statefulLost.join(', ')}]. ` +
        `Control shapes also affected - loss may be systemic.`;
    } else {
      selectivityEvidence = 'No selective loss detected. All shapes propagated successfully.';
    }

    return {
      control_shapes_survived: controlSurvived,
      stateful_shapes_lost: statefulLost,
      loss_is_selective: lossIsSelective,
      selectivity_evidence: selectivityEvidence
    };
  }

  /**
   * Generate formal selective loss proof
   */
  proveSelectiveLoss(
    shapeTraces: Record<string, ShapeTraceResult>
  ): SelectiveLossProof {
    const comparative = this.analyzeComparative(shapeTraces);

    if (!comparative.loss_is_selective) {
      return {
        proven: false,
        control_survivor: null,
        stateful_victim: null,
        failure_handoff: null,
        evidence: 'Selective loss could not be proven. Either all shapes survived or all shapes failed.'
      };
    }

    const controlSurvivor = comparative.control_shapes_survived[0];
    const statefulVictim = comparative.stateful_shapes_lost[0];
    const victimTrace = shapeTraces[statefulVictim];
    const failureHandoff = victimTrace?.survival_status.failure_point || ('H4' as HandoffId);

    return {
      proven: true,
      control_survivor: controlSurvivor,
      stateful_victim: statefulVictim,
      failure_handoff: failureHandoff,
      evidence: `SELECTIVE DESTRUCTION CONFIRMED:\n` +
        `  - Control shape "${controlSurvivor}" (STATELESS) survived handoff ${failureHandoff}\n` +
        `  - Stateful shape "${statefulVictim}" was destroyed at handoff ${failureHandoff}\n` +
        `  - Same pipeline, same handoff, different outcomes\n` +
        `  - Conclusion: The loss mechanism discriminates against STATEFUL shapes`
    };
  }

  /**
   * Generate counterfactual analysis for a lost shape
   */
  generateCounterfactual(
    shape: ShapeDeclaration,
    traceResult: ShapeTraceResult
  ): CounterfactualAnalysis {
    const lossClass = traceResult.survival_status.failure_class;

    if (!lossClass) {
      return {
        shape_id: shape.id,
        original_loss_class: 'L0_TOTAL_OMISSION',
        survival_possible: false,
        blocking_mechanism: 'L0_TOTAL_OMISSION',
        evidence: 'Shape was never present in pipeline. Counterfactual analysis not applicable.',
        hypothetical_path: 'N/A'
      };
    }

    // Analyze what would happen without the loss mechanism
    let survivalPossible = false;
    let blockingMechanism: LossClass = lossClass;
    let evidence = '';
    let hypotheticalPath = '';

    switch (lossClass) {
      case 'L6_SUMMARY_COLLAPSE':
        survivalPossible = true;
        blockingMechanism = 'L6_SUMMARY_COLLAPSE';
        evidence = 'If summarizeOutputForDependency preserved shape attributes instead of collapsing to "completed", ' +
          'the shape would have propagated through H4 to WIRE.';
        hypotheticalPath = 'BLOCKS (shape present) → [NO SUMMARIZATION] → WIRE (shape preserved)';
        break;

      case 'L4_CONTEXT_TRUNCATION':
        survivalPossible = true;
        blockingMechanism = 'L4_CONTEXT_TRUNCATION';
        evidence = 'If context window was not truncated before the shape data, ' +
          'the shape would have been visible to the downstream agent.';
        hypotheticalPath = 'AGENT (shape present) → [FULL CONTEXT] → NEXT_AGENT (shape preserved)';
        break;

      case 'L5_DEPENDENCY_SKIP':
        survivalPossible = true;
        blockingMechanism = 'L5_DEPENDENCY_SKIP';
        evidence = 'If the source agent was included in dependency chain, ' +
          'the shape would have been available to the target agent.';
        hypotheticalPath = 'SOURCE → [INCLUDED IN DEPS] → TARGET (shape available)';
        break;

      case 'L0_TOTAL_OMISSION':
        // Check if shape was present earlier
        const wasPresent = Object.values(traceResult.extractions).some(e => e.present);
        if (wasPresent) {
          survivalPossible = true;
          evidence = 'Shape was present earlier in pipeline but lost completely. ' +
            'If propagation mechanism preserved the shape, it would have survived.';
          hypotheticalPath = 'PRESENT_STAGE → [PRESERVE SHAPE] → TARGET (shape preserved)';
        } else {
          survivalPossible = false;
          evidence = 'Shape was never captured from input. Initial extraction must be fixed.';
          hypotheticalPath = 'INPUT → [EXTRACT SHAPE] → STRATEGOS (shape captured)';
        }
        break;

      default:
        survivalPossible = false;
        evidence = `Loss class ${lossClass} requires agent-level intervention to fix.`;
        hypotheticalPath = 'Unknown recovery path';
    }

    return {
      shape_id: shape.id,
      original_loss_class: lossClass,
      survival_possible: survivalPossible,
      blocking_mechanism: blockingMechanism,
      evidence,
      hypothetical_path: hypotheticalPath
    };
  }

  /**
   * Determine root cause from trace results
   */
  determineRootCause(
    shapeTraces: Record<string, ShapeTraceResult>,
    selectiveProof: SelectiveLossProof
  ): RootCause {
    // If selective loss is proven, that's the root cause
    if (selectiveProof.proven) {
      const victimTrace = shapeTraces[selectiveProof.stateful_victim!];
      const lossClass = victimTrace?.survival_status.failure_class;

      return {
        class: 'SELECTIVE_DESTRUCTION',
        mechanism: `The OLYMPUS pipeline selectively destroys STATEFUL shapes at handoff ${selectiveProof.failure_handoff}. ` +
          `CONTROL shapes survive the same handoff, proving the loss is not due to general truncation or errors, ` +
          `but due to how STATEFUL capabilities (requiring hooks/handlers) are collapsed during summarization.`,
        handoff: selectiveProof.failure_handoff!,
        evidence: {
          source_path: `agentOutputs.blocks`,
          target_path: `agentOutputs.wire`,
          explanation: selectiveProof.evidence
        },
        recommendation: 'Modify summarizeOutputForDependency to preserve stateful capability attributes. ' +
          'Do not collapse shape data to generic summaries.'
      };
    }

    // Check for specific loss patterns
    for (const [shapeId, trace] of Object.entries(shapeTraces)) {
      const lossClass = trace.survival_status.failure_class;

      if (lossClass === 'L6_SUMMARY_COLLAPSE') {
        return {
          class: 'SUMMARIZER_COLLAPSE',
          mechanism: `The summarizeOutputForDependency function collapses detailed shape data into generic summaries, ` +
            `losing filter_values, state_hooks, and event_handlers.`,
          handoff: trace.survival_status.failure_point || ('H4' as HandoffId),
          evidence: {
            source_path: `agentOutputs.${trace.survival_status.actual_last_stage}`,
            target_path: `dependencySummary`,
            explanation: `Shape ${shapeId} was present but collapsed to "completed" in dependency summary`
          },
          recommendation: 'Extend summarizeOutputForDependency to preserve capability-specific attributes.'
        };
      }

      if (lossClass === 'L4_CONTEXT_TRUNCATION') {
        return {
          class: 'CONTEXT_TRUNCATION',
          mechanism: `Context window limits cause shape data to be truncated before reaching downstream agents.`,
          handoff: trace.survival_status.failure_point || ('H4' as HandoffId),
          evidence: {
            source_path: `agentOutputs.${trace.survival_status.actual_last_stage}`,
            target_path: `context`,
            explanation: `Shape ${shapeId} was present in output but truncated in context`
          },
          recommendation: 'Increase MAX_CONTEXT_TOKENS or prioritize capability data in context building.'
        };
      }

      if (lossClass === 'L5_DEPENDENCY_SKIP') {
        return {
          class: 'DEPENDENCY_SKIP',
          mechanism: `Source agent is not included in target agent's dependency chain.`,
          handoff: trace.survival_status.failure_point || ('H4' as HandoffId),
          evidence: {
            source_path: `agentOutputs.${trace.survival_status.actual_last_stage}`,
            target_path: `dependencies`,
            explanation: `Shape ${shapeId} exists but source agent skipped in dependency chain`
          },
          recommendation: 'Review dependency graph configuration to ensure capability-carrying agents are included.'
        };
      }
    }

    // Default: Unknown cause
    return {
      class: 'UNKNOWN',
      mechanism: 'Root cause could not be determined from available trace data.',
      handoff: 'H4' as HandoffId,
      evidence: {
        source_path: 'N/A',
        target_path: 'N/A',
        explanation: 'Insufficient data to determine root cause. Manual investigation required.'
      },
      recommendation: 'Enable verbose logging and re-run with additional trace points.'
    };
  }

  /**
   * Determine execution verdict
   */
  determineVerdict(
    shapeTraces: Record<string, ShapeTraceResult>,
    selectiveProof: SelectiveLossProof,
    gateBlocked: boolean
  ): VerdictDetails {
    // Check for selective destruction (highest severity)
    if (selectiveProof.proven) {
      return {
        verdict: 'SELECTIVE_DESTRUCTION_CONFIRMED',
        blocking: true,
        reason_code: 'SELECTIVE_DESTRUCTION',
        explanation: `CRITICAL: Selective destruction of stateful capabilities confirmed. ` +
          `Control shape "${selectiveProof.control_survivor}" survived while ` +
          `stateful shape "${selectiveProof.stateful_victim}" was destroyed at ${selectiveProof.failure_handoff}. ` +
          `This is a fundamental integrity violation.`,
        culpable_agents: ['blocks', 'wire'],
        culpable_mechanisms: ['summarizeOutputForDependency', 'dependency_summary_collapse']
      };
    }

    // Check if gate blocked execution
    if (gateBlocked) {
      // Check for systemic failure (multiple shapes lost)
      const lostShapes = Object.values(shapeTraces).filter(
        t => !t.survival_status.survived_to_target
      );

      if (lostShapes.length > 1) {
        return {
          verdict: 'SYSTEMIC_FAILURE',
          blocking: true,
          reason_code: 'SYSTEMIC_FAILURE',
          explanation: `CRITICAL: Multiple shapes (${lostShapes.length}) failed to survive pipeline. ` +
            `This indicates a systemic issue with requirement propagation.`,
          culpable_agents: this.findCulpableAgents(shapeTraces),
          culpable_mechanisms: this.findCulpableMechanisms(shapeTraces)
        };
      }

      return {
        verdict: 'EXECUTION_BLOCKED_REQUIREMENT_LOSS',
        blocking: true,
        reason_code: 'REQUIREMENT_LOSS',
        explanation: `Execution blocked due to requirement loss. ` +
          `One or more required shapes did not survive to their target stage.`,
        culpable_agents: this.findCulpableAgents(shapeTraces),
        culpable_mechanisms: this.findCulpableMechanisms(shapeTraces)
      };
    }

    // All clear
    return {
      verdict: 'SAFE_TO_EXECUTE',
      blocking: false,
      reason_code: 'ALL_REQUIREMENTS_PRESERVED',
      explanation: 'All registered shapes survived to their required stages within budget limits. ' +
        'WIRE and PIXEL execution may proceed.',
      culpable_agents: [],
      culpable_mechanisms: []
    };
  }

  private findCulpableAgents(shapeTraces: Record<string, ShapeTraceResult>): TracedAgentId[] {
    const culpable = new Set<TracedAgentId>();

    for (const trace of Object.values(shapeTraces)) {
      if (trace.survival_status.failure_point) {
        // The target of the failing handoff is culpable
        const handoffNum = parseInt(trace.survival_status.failure_point.slice(1));
        const stages: TracedAgentId[] = ['strategos', 'scope', 'cartographer', 'blocks', 'wire', 'pixel'];
        if (handoffNum < stages.length) {
          culpable.add(stages[handoffNum]);
        }
      }
    }

    return Array.from(culpable);
  }

  private findCulpableMechanisms(shapeTraces: Record<string, ShapeTraceResult>): string[] {
    const mechanisms = new Set<string>();

    for (const trace of Object.values(shapeTraces)) {
      const lossClass = trace.survival_status.failure_class;
      if (lossClass === 'L6_SUMMARY_COLLAPSE') {
        mechanisms.add('summarizeOutputForDependency');
      }
      if (lossClass === 'L4_CONTEXT_TRUNCATION') {
        mechanisms.add('context_truncation');
      }
      if (lossClass === 'L5_DEPENDENCY_SKIP') {
        mechanisms.add('dependency_chain_pruning');
      }
    }

    return Array.from(mechanisms);
  }
}
