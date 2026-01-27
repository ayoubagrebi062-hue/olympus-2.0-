/**
 * Context Extractor
 *
 * Extracts FilterCapabilityShape from context summaries and dependency summaries.
 * This is CRITICAL for detecting L4_CONTEXT_TRUNCATION and L6_SUMMARY_COLLAPSE.
 *
 * Analyzes:
 * - buildContextSummary() output
 * - summarizeOutputForDependency() output
 * - summarizeAgentOutput() output
 */

import type {
  ExtractionResult,
  FilterCapabilityShape,
  AttributeEvidence,
  ShapeAttribute,
  TracedAgentId
} from '../types';
import { ShapeMatcher } from '../shapes/shape-matcher';
import { FilterCapabilityShapeDefinition } from '../shapes/filter-capability';

export interface ContextData {
  // The full context string passed to an agent
  contextSummary?: string;

  // Dependency summaries (from summarizeOutputForDependency)
  dependencySummaries?: Record<string, string>;

  // Knowledge object (from buildKnowledge)
  knowledge?: Record<string, unknown>;

  // Previous outputs record
  previousOutputs?: Record<string, unknown>;
}

export class ContextExtractor {
  /**
   * Extract shape from context summary string
   */
  extractFromContextSummary(
    contextSummary: string,
    targetAgent: TracedAgentId,
    sourcePath: string
  ): ExtractionResult {
    const timestamp = new Date().toISOString();
    const evidence: AttributeEvidence[] = [];
    const errors: string[] = [];
    const extractedShape: Partial<FilterCapabilityShape> = {};

    if (!contextSummary || typeof contextSummary !== 'string') {
      return {
        agent_id: targetAgent,
        timestamp,
        shape: null,
        attribute_evidence: [],
        source_file: sourcePath,
        source_type: 'context_summary',
        status: 'FAILED',
        extraction_errors: ['Context summary is empty or not a string']
      };
    }

    // Parse sections from context summary
    const sections = this.parseContextSections(contextSummary);

    // Look for Core Features section
    if (sections['Core Features (MVP)'] || sections['Core Features']) {
      const featuresSection = sections['Core Features (MVP)'] || sections['Core Features'];
      const featureLines = featuresSection.split('\n').filter(l => l.trim().startsWith('-'));

      // Check if any feature line indicates filter capability
      for (let i = 0; i < featureLines.length; i++) {
        const line = featureLines[i];
        const score = this.scoreLineForFilter(line);
        if (score > 0.3) {
          // Extract what we can from the line structure
          if (line.toLowerCase().includes('status')) {
            extractedShape.filter_attribute = 'status';
            evidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
              'filter_attribute',
              'status',
              `contextSummary.coreFeatures[${i}]`,
              0.7,
              line.trim()
            ));
          }
          if (line.toLowerCase().includes('filter')) {
            evidence.push({
              attribute: 'filter_attribute',
              found: true,
              value: 'filter',
              json_path: `contextSummary.coreFeatures[${i}]`,
              raw_text: line.trim(),
              confidence: 0.6
            });
          }
        }
      }
    }

    // Look for Previous Agent Outputs section
    if (sections['Previous Agent Outputs']) {
      const outputsSection = sections['Previous Agent Outputs'];
      // This section contains summarized outputs - very likely to have lost data
      const hasFilterMention = this.scoreLineForFilter(outputsSection) > 0.2;
      if (!hasFilterMention) {
        errors.push('Previous Agent Outputs section does not contain filter-related content');
      }
    }

    // Check for truncation marker
    if (contextSummary.includes('[... context truncated')) {
      errors.push('Context was truncated - potential L4_CONTEXT_TRUNCATION');
    }

    // Validate extraction
    const shape = Object.keys(extractedShape).length > 0 ? extractedShape as FilterCapabilityShape : null;
    const validation = shape ? FilterCapabilityShapeDefinition.validateAtStage(shape, targetAgent) : { missing: [], present: [] };

    // Add missing evidence
    const required: ShapeAttribute[] = ['filter_attribute', 'filter_values'];
    for (const attr of required) {
      if (!evidence.find(e => e.attribute === attr && e.found)) {
        evidence.push(FilterCapabilityShapeDefinition.createMissingEvidence(attr, 'contextSummary'));
      }
    }

    return {
      agent_id: targetAgent,
      timestamp,
      shape,
      attribute_evidence: evidence,
      source_file: sourcePath,
      source_type: 'context_summary',
      status: shape ? (validation.missing.length === 0 ? 'SUCCESS' : 'PARTIAL') : 'FAILED',
      extraction_errors: errors
    };
  }

  /**
   * Extract shape from dependency summary (summarizeOutputForDependency output)
   */
  extractFromDependencySummary(
    dependencySummary: string,
    sourceAgent: TracedAgentId,
    targetAgent: TracedAgentId,
    sourcePath: string
  ): ExtractionResult {
    const timestamp = new Date().toISOString();
    const evidence: AttributeEvidence[] = [];
    const errors: string[] = [];
    const extractedShape: Partial<FilterCapabilityShape> = {};

    if (!dependencySummary || typeof dependencySummary !== 'string') {
      return {
        agent_id: targetAgent,
        timestamp,
        shape: null,
        attribute_evidence: [],
        source_file: sourcePath,
        source_type: 'dependency_summary',
        status: 'FAILED',
        extraction_errors: [`Dependency summary from ${sourceAgent} is empty`]
      };
    }

    // Dependency summaries are VERY condensed
    // Format: "decisions: choice1, choice2; X files generated"
    // This is where L6_SUMMARY_COLLAPSE happens

    const hasDecisions = dependencySummary.includes('decisions:');
    const hasFiles = dependencySummary.includes('files generated') || dependencySummary.includes('files:');

    // Check if filter-related content survived summarization
    const filterScore = this.scoreLineForFilter(dependencySummary);

    if (filterScore < 0.2) {
      errors.push(`Filter capability not found in dependency summary from ${sourceAgent}. Summary: "${dependencySummary}"`);
      errors.push('Potential L6_SUMMARY_COLLAPSE - detailed filter info collapsed to generic summary');
    } else {
      // Try to extract what we can
      if (dependencySummary.toLowerCase().includes('filter')) {
        extractedShape.filter_attribute = 'unknown-from-summary';
        evidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'filter_attribute',
          'unknown-from-summary',
          `dependencySummary.${sourceAgent}`,
          0.4,
          dependencySummary
        ));
      }
    }

    // Mark all typically-required attributes as missing if not found
    const required: ShapeAttribute[] = ['filter_attribute', 'filter_values', 'ui_control'];
    for (const attr of required) {
      if (!evidence.find(e => e.attribute === attr && e.found)) {
        evidence.push({
          attribute: attr,
          found: false,
          value: undefined,
          json_path: 'NOT_FOUND',
          raw_text: `Not in dependency summary: "${dependencySummary}"`,
          confidence: 0
        });
      }
    }

    const shape = Object.keys(extractedShape).length > 0 ? extractedShape as FilterCapabilityShape : null;

    return {
      agent_id: targetAgent,
      timestamp,
      shape,
      attribute_evidence: evidence,
      source_file: sourcePath,
      source_type: 'dependency_summary',
      status: shape ? 'PARTIAL' : 'FAILED',
      extraction_errors: errors
    };
  }

  /**
   * Simulate what summarizeOutputForDependency would produce
   * This helps us understand what gets lost
   */
  simulateSummary(agentOutput: unknown): string {
    if (!agentOutput || typeof agentOutput !== 'object') {
      return 'completed';
    }

    const output = agentOutput as Record<string, unknown>;
    const parts: string[] = [];

    // The actual summarizer only takes first 3 decisions
    const decisions = output.decisions as Array<{ type: string; choice: string }> | undefined;
    if (Array.isArray(decisions) && decisions.length > 0) {
      const decisionSummary = decisions.slice(0, 3).map(d => d.choice).join(', ');
      parts.push(`decisions: ${decisionSummary}`);
    }

    // And file count
    const artifacts = output.artifacts as Array<{ type: string }> | undefined;
    if (Array.isArray(artifacts)) {
      const files = artifacts.filter(a => a.type === 'code');
      if (files.length > 0) {
        parts.push(`${files.length} files generated`);
      }
    }

    return parts.join('; ') || 'completed';
  }

  // Helper methods

  private parseContextSections(contextSummary: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = contextSummary.split('\n');

    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        // Save previous section
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = line.replace('## ', '').trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  }

  private scoreLineForFilter(text: string): number {
    let score = 0;
    const lower = text.toLowerCase();

    const filterIndicators = ['filter', 'status', 'category', 'type', 'view', 'tab', 'toggle'];
    const valueIndicators = ['all', 'active', 'completed', 'pending', 'open', 'closed'];
    const uiIndicators = ['tabs', 'dropdown', 'select', 'buttons', 'chips'];

    for (const ind of filterIndicators) {
      if (lower.includes(ind)) score += 0.15;
    }
    for (const ind of valueIndicators) {
      if (lower.includes(ind)) score += 0.1;
    }
    for (const ind of uiIndicators) {
      if (lower.includes(ind)) score += 0.1;
    }

    return Math.min(score, 1.0);
  }
}
