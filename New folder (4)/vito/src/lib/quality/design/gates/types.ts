/**
 * OLYMPUS 2.1 - Design Gate Types
 *
 * Common types for all design validation gates.
 */

export type DesignGateType =
  | 'design-tokens'
  | 'components'
  | 'layout'
  | 'motion'
  | 'design-a11y';

export interface DesignGateIssue {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  line?: number;
  found?: string;
  expected?: string;
  autoFixable: boolean;
  wcag?: string; // For a11y issues
}

export interface DesignGateResult {
  gate: DesignGateType;
  passed: boolean;
  score: number;
  issues: DesignGateIssue[];
  stats: Record<string, number>;
}

export interface FileToCheck {
  path: string;
  content: string;
}

export interface DesignGate {
  name: string;
  description: string;
  type: DesignGateType;
  check: (files: FileToCheck[]) => Promise<DesignGateResult>;
}
