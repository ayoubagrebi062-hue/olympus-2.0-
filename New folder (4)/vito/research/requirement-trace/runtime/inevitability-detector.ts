/**
 * Inevitability Detector
 *
 * Determines if architectural collapse is mathematically inevitable.
 *
 * INEVITABILITY CRITERIA:
 * Collapse is INEVITABLE if:
 * 1. ALL causal paths lead to Phase >= COLLAPSING, OR
 * 2. MCCS size grows monotonically across ALL paths (never shrinks)
 *
 * KEY PRINCIPLE:
 * This is MATHEMATICAL, not heuristic or probabilistic.
 * If ALL possible futures lead to collapse, collapse is inevitable.
 *
 * NON-NEGOTIABLE:
 * - No probability (it's 0% or 100%)
 * - No ML or heuristics
 * - Pure logical inference
 * - Deterministic
 */

import type {
  CausalPath,
  InevitabilityProof
} from './types';

// IE version - immutable
const IE_VERSION = '1.0.0';
Object.freeze({ IE_VERSION });

export class InevitabilityDetector {
  /**
   * Determine if collapse is inevitable based on all causal paths
   *
   * Returns a mathematical proof of inevitability (or non-inevitability)
   */
  detect(paths: CausalPath[]): InevitabilityProof {
    if (paths.length === 0) {
      // No paths = cannot prove inevitability
      return this.buildNotInevitableProof(0, 0, 0);
    }

    // Count paths leading to collapse
    const pathsToCollapse = paths.filter(p => p.leads_to_collapse).length;

    // Count paths with monotonic MCCS growth
    const pathsWithMCCSGrowth = paths.filter(p => p.mccs_grows_monotonically).length;

    // Check ALL_PATHS_COLLAPSE criterion
    if (pathsToCollapse === paths.length) {
      return this.buildAllPathsCollapseProof(paths, pathsToCollapse, pathsWithMCCSGrowth);
    }

    // Check MCCS_MONOTONIC_GROWTH criterion
    if (pathsWithMCCSGrowth === paths.length) {
      return this.buildMCCSMonotonicProof(paths, pathsToCollapse, pathsWithMCCSGrowth);
    }

    // Not inevitable - there exists at least one escape path
    return this.buildNotInevitableProof(paths.length, pathsToCollapse, pathsWithMCCSGrowth);
  }

  /**
   * Build proof for ALL_PATHS_COLLAPSE case
   */
  private buildAllPathsCollapseProof(
    paths: CausalPath[],
    pathsToCollapse: number,
    pathsWithMCCSGrowth: number
  ): InevitabilityProof {
    // Find the fastest collapse path
    const collapsingPaths = paths.filter(p => p.leads_to_collapse);
    const fastestPath = this.findFastestCollapse(collapsingPaths);

    return {
      inevitable: true,
      proof_type: 'ALL_PATHS_COLLAPSE',
      paths_analyzed: paths.length,
      paths_to_collapse: pathsToCollapse,
      paths_with_mccs_growth: pathsWithMCCSGrowth,
      steps_to_collapse: fastestPath?.stepsToCollapse ?? null,
      fastest_collapse_path: fastestPath?.pathId ?? null,
      confidence: 1.0,
      proven_at: new Date().toISOString()
    };
  }

  /**
   * Build proof for MCCS_MONOTONIC_GROWTH case
   */
  private buildMCCSMonotonicProof(
    paths: CausalPath[],
    pathsToCollapse: number,
    pathsWithMCCSGrowth: number
  ): InevitabilityProof {
    // Find when MCCS growth leads to collapse
    // (Monotonic MCCS growth = entropy always increases = eventual collapse)
    const collapsingPaths = paths.filter(p => p.leads_to_collapse);
    const fastestPath = collapsingPaths.length > 0
      ? this.findFastestCollapse(collapsingPaths)
      : null;

    return {
      inevitable: true,
      proof_type: 'MCCS_MONOTONIC_GROWTH',
      paths_analyzed: paths.length,
      paths_to_collapse: pathsToCollapse,
      paths_with_mccs_growth: pathsWithMCCSGrowth,
      steps_to_collapse: fastestPath?.stepsToCollapse ?? null,
      fastest_collapse_path: fastestPath?.pathId ?? null,
      confidence: 1.0,
      proven_at: new Date().toISOString()
    };
  }

  /**
   * Build proof for NOT_INEVITABLE case
   */
  private buildNotInevitableProof(
    pathsAnalyzed: number,
    pathsToCollapse: number,
    pathsWithMCCSGrowth: number
  ): InevitabilityProof {
    return {
      inevitable: false,
      proof_type: 'NOT_INEVITABLE',
      paths_analyzed: pathsAnalyzed,
      paths_to_collapse: pathsToCollapse,
      paths_with_mccs_growth: pathsWithMCCSGrowth,
      steps_to_collapse: null,
      fastest_collapse_path: null,
      confidence: 1.0,
      proven_at: new Date().toISOString()
    };
  }

  /**
   * Find the path that collapses fastest
   */
  private findFastestCollapse(
    paths: CausalPath[]
  ): { pathId: string; stepsToCollapse: number } | null {
    if (paths.length === 0) {
      return null;
    }

    let fastestPath = paths[0];
    let fastestSteps = this.findCollapseStep(paths[0]);

    for (const path of paths.slice(1)) {
      const steps = this.findCollapseStep(path);
      if (steps < fastestSteps) {
        fastestPath = path;
        fastestSteps = steps;
      }
    }

    return {
      pathId: fastestPath.path_id,
      stepsToCollapse: fastestSteps
    };
  }

  /**
   * Find the step at which collapse occurs in a path
   */
  private findCollapseStep(path: CausalPath): number {
    for (let i = 0; i < path.phase_trajectory.length; i++) {
      const phase = path.phase_trajectory[i];
      if (phase === 'COLLAPSING' || phase === 'DEAD') {
        return i;
      }
    }
    // Path doesn't collapse within simulation
    return path.steps_simulated;
  }

  /**
   * Get escape paths (paths that don't lead to collapse)
   */
  getEscapePaths(paths: CausalPath[]): CausalPath[] {
    return paths.filter(p => !p.leads_to_collapse);
  }

  /**
   * Get collapse paths (paths that lead to collapse)
   */
  getCollapsePaths(paths: CausalPath[]): CausalPath[] {
    return paths.filter(p => p.leads_to_collapse);
  }

  /**
   * Generate human-readable causal chain summary
   */
  generateCausalChainSummary(
    paths: CausalPath[],
    proof: InevitabilityProof
  ): string[] {
    const summary: string[] = [];

    if (proof.inevitable) {
      summary.push(`INEVITABILITY DETECTED: ${proof.proof_type}`);
      summary.push(`Analyzed ${proof.paths_analyzed} causal paths.`);

      if (proof.proof_type === 'ALL_PATHS_COLLAPSE') {
        summary.push(`ALL ${proof.paths_to_collapse} paths lead to Phase >= COLLAPSING.`);
      } else if (proof.proof_type === 'MCCS_MONOTONIC_GROWTH') {
        summary.push(`MCCS grows monotonically across ALL ${proof.paths_with_mccs_growth} paths.`);
        summary.push(`Unbounded MCCS growth guarantees eventual collapse.`);
      }

      if (proof.steps_to_collapse !== null) {
        summary.push(`Fastest collapse occurs in ${proof.steps_to_collapse} steps.`);
      }

      summary.push(`CONCLUSION: No escape path exists. Collapse is mathematically certain.`);
    } else {
      summary.push(`NOT INEVITABLE: Escape paths exist.`);
      summary.push(`Analyzed ${proof.paths_analyzed} causal paths.`);

      const escapePaths = proof.paths_analyzed - proof.paths_to_collapse;
      summary.push(`${escapePaths} path(s) do NOT lead to collapse.`);

      if (proof.paths_to_collapse > 0) {
        summary.push(`${proof.paths_to_collapse} path(s) lead to collapse (avoidable).`);
      }

      summary.push(`CONCLUSION: System can recover via intervention.`);
    }

    return summary;
  }
}
