/**
 * OLYMPUS 3.0 - Validation Types
 * ===============================
 * Type definitions for AI output validation
 */

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  message: string;
  severity: ValidationSeverity;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  metadata: {
    linesOfCode: number;
    complexity: number;
    fileCount: number;
    validatedAt: Date;
  };
}

export interface ValidatorConfig {
  strictMode?: boolean;
  allowedPackages?: string[];
  blockedPatterns?: RegExp[];
  minQualityScore?: number;
}

export interface GeneratedOutput {
  files: GeneratedFile[];
  prompt: string;
  provider: string;
  timestamp: Date;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface RelevanceResult {
  issues: ValidationIssue[];
  score: number;
}
