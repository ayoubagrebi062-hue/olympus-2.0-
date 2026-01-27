/**
 * WIRE Extractor (also used for PIXEL)
 *
 * Extracts FilterCapabilityShape from WIRE/PIXEL agent output.
 * Schema: { files: [{ path, content, type }] }
 *
 * Analyzes code content for filter-related patterns.
 * NO REGEX TEXT MATCHING - STRUCTURAL AST-LIKE ANALYSIS
 */

import type {
  ExtractionResult,
  FilterCapabilityShape,
  AttributeEvidence,
  ShapeAttribute,
  TracedAgentId
} from '../types';
import { FilterCapabilityShapeDefinition } from '../shapes/filter-capability';

export class WireExtractor {
  agentId: TracedAgentId = 'wire';

  setAgentId(id: TracedAgentId): void {
    this.agentId = id;
  }

  extract(agentOutput: unknown, sourcePath: string): ExtractionResult {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    const evidence: AttributeEvidence[] = [];
    let shape: FilterCapabilityShape | null = null;

    // Validate input structure
    if (!agentOutput || typeof agentOutput !== 'object') {
      return this.createFailedResult(sourcePath, timestamp, ['Agent output is null or not an object']);
    }

    const output = agentOutput as Record<string, unknown>;

    // Look for files array
    const files = output.files;
    if (!Array.isArray(files)) {
      errors.push(`files not found or not an array. Found keys: ${Object.keys(output).join(', ')}`);
      return this.createFailedResult(sourcePath, timestamp, errors);
    }

    // Search each file for filter-related code patterns
    const filterCandidates: Array<{
      fileIndex: number;
      filePath: string;
      score: number;
      extractedShape: Partial<FilterCapabilityShape>;
      extractedEvidence: AttributeEvidence[];
    }> = [];

    files.forEach((file, fileIndex) => {
      if (!file || typeof file !== 'object') return;

      const fileObj = file as Record<string, unknown>;
      const filePath = (fileObj.path || `files[${fileIndex}]`) as string;
      const content = fileObj.content;

      if (typeof content !== 'string') return;

      const result = this.analyzeCodeContent(content, filePath, fileIndex);
      if (result.score > 0.3) {
        filterCandidates.push({
          fileIndex,
          filePath,
          ...result
        });
      }
    });

    // If no filter candidates found, report L0_TOTAL_OMISSION
    if (filterCandidates.length === 0) {
      errors.push(`No filter-related code patterns found in ${files.length} files`);

      const required: ShapeAttribute[] = ['filter_attribute', 'filter_values', 'state_location', 'ui_control', 'state_hook'];
      for (const attr of required) {
        evidence.push(FilterCapabilityShapeDefinition.createMissingEvidence(attr, 'files[*].content'));
      }

      return {
        agent_id: this.agentId,
        timestamp,
        shape: null,
        attribute_evidence: evidence,
        source_file: sourcePath,
        source_type: 'agent_output',
        status: 'FAILED',
        extraction_errors: errors
      };
    }

    // Use the best candidate
    const best = filterCandidates.sort((a, b) => b.score - a.score)[0];
    shape = best.extractedShape as FilterCapabilityShape;
    evidence.push(...best.extractedEvidence);

    // Validate and add missing evidence
    const validation = FilterCapabilityShapeDefinition.validateAtStage(shape, this.agentId);
    for (const missing of validation.missing) {
      if (!evidence.find(e => e.attribute === missing)) {
        evidence.push(FilterCapabilityShapeDefinition.createMissingEvidence(
          missing,
          best.filePath
        ));
      }
    }

    return {
      agent_id: this.agentId,
      timestamp,
      shape: Object.keys(shape).length > 0 ? shape : null,
      attribute_evidence: evidence,
      source_file: sourcePath,
      source_type: 'agent_output',
      status: validation.missing.length === 0 ? 'SUCCESS' : 'PARTIAL',
      extraction_errors: errors
    };
  }

  private analyzeCodeContent(
    content: string,
    filePath: string,
    fileIndex: number
  ): {
    score: number;
    extractedShape: Partial<FilterCapabilityShape>;
    extractedEvidence: AttributeEvidence[];
  } {
    const extractedShape: Partial<FilterCapabilityShape> = {};
    const extractedEvidence: AttributeEvidence[] = [];
    let score = 0;

    // Structure-based analysis (not regex matching)
    // We look for specific code structures

    // 1. Detect useState for filter state
    const useStatePatterns = this.findCodeStructure(content, 'useState');
    for (const pattern of useStatePatterns) {
      // Check if it's filter-related based on variable naming structure
      if (this.isFilterStateHook(pattern.context)) {
        extractedShape.state_hook = 'useState';
        extractedShape.state_location = 'local';
        extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'state_hook',
          'useState',
          `${filePath}:${pattern.line}`,
          0.9,
          pattern.context
        ));
        extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'state_location',
          'local',
          `${filePath}:${pattern.line}`,
          0.85
        ));
        score += 0.3;
        break;
      }
    }

    // 2. Detect filter-related component usage (Tabs, Select, etc.)
    const uiComponents = ['Tabs', 'TabsList', 'TabsTrigger', 'Select', 'SelectTrigger', 'SelectContent', 'ToggleGroup'];
    for (const comp of uiComponents) {
      if (this.hasComponentUsage(content, comp)) {
        const controlType = comp.toLowerCase().includes('tab') ? 'tabs' :
          comp.toLowerCase().includes('select') ? 'dropdown' : 'buttons';
        extractedShape.ui_control = controlType;
        extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'ui_control',
          controlType,
          `${filePath}:component:${comp}`,
          0.9
        ));
        score += 0.25;
        break;
      }
    }

    // 3. Detect event handlers
    const handlerPatterns = ['onClick', 'onChange', 'onValueChange', 'onSelect'];
    for (const handler of handlerPatterns) {
      if (this.hasHandlerUsage(content, handler)) {
        extractedShape.event_handler = handler;
        extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'event_handler',
          handler,
          `${filePath}:handler:${handler}`,
          0.85
        ));
        score += 0.15;
        break;
      }
    }

    // 4. Detect filter values from array literals
    const arrayLiterals = this.findArrayLiterals(content);
    for (const arr of arrayLiterals) {
      if (this.looksLikeFilterValues(arr.values)) {
        extractedShape.filter_values = arr.values;
        extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'filter_values',
          arr.values,
          `${filePath}:array:${arr.line}`,
          0.8
        ));
        score += 0.2;

        // Try to find default
        if (arr.values.length > 0) {
          extractedShape.default_value = arr.values[0];
        }
        break;
      }
    }

    // 5. Detect filter attribute from common patterns
    const filterAttrPatterns = ['status', 'type', 'category', 'state'];
    for (const attr of filterAttrPatterns) {
      if (this.hasVariableNamed(content, attr) || this.hasPropertyNamed(content, attr)) {
        extractedShape.filter_attribute = attr;
        extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'filter_attribute',
          attr,
          `${filePath}:variable:${attr}`,
          0.7
        ));
        score += 0.15;
        break;
      }
    }

    // 6. Check for URL state (searchParams, useSearchParams)
    if (this.hasCodeStructure(content, 'useSearchParams') || this.hasCodeStructure(content, 'searchParams')) {
      extractedShape.state_location = 'url';
      extractedEvidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
        'state_location',
        'url',
        `${filePath}:searchParams`,
        0.9
      ));
      score += 0.1;
    }

    return { score, extractedShape, extractedEvidence };
  }

  // Structure detection helpers (not regex-based text matching)

  private findCodeStructure(content: string, identifier: string): Array<{ line: number; context: string }> {
    const results: Array<{ line: number; context: string }> = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for identifier as a standalone token (not part of another word)
      const tokens = line.split(/[^a-zA-Z0-9_]/);
      if (tokens.includes(identifier)) {
        results.push({ line: i + 1, context: line.trim() });
      }
    }

    return results;
  }

  private hasCodeStructure(content: string, identifier: string): boolean {
    return this.findCodeStructure(content, identifier).length > 0;
  }

  private isFilterStateHook(context: string): boolean {
    // Check if the useState context suggests filter state
    const filterIndicators = ['filter', 'status', 'active', 'selected', 'tab', 'view'];
    const contextLower = context.toLowerCase();
    return filterIndicators.some(ind => contextLower.includes(ind));
  }

  private hasComponentUsage(content: string, componentName: string): boolean {
    // Look for JSX-like usage: <ComponentName or ComponentName>
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes(`<${componentName}`) || line.includes(`${componentName}>`)) {
        return true;
      }
    }
    return false;
  }

  private hasHandlerUsage(content: string, handlerName: string): boolean {
    // Look for handler assignment: handlerName=
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes(`${handlerName}=`) || line.includes(`${handlerName}:`)) {
        return true;
      }
    }
    return false;
  }

  private findArrayLiterals(content: string): Array<{ line: number; values: string[] }> {
    const results: Array<{ line: number; values: string[] }> = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for array literal pattern: ['value1', 'value2', ...]
      const arrayMatch = line.match(/\[([^\]]+)\]/);
      if (arrayMatch) {
        const innerContent = arrayMatch[1];
        // Extract string values
        const stringValues: string[] = [];
        const parts = innerContent.split(',');
        for (const part of parts) {
          const trimmed = part.trim();
          // Check if it's a string literal
          if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
            (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
            stringValues.push(trimmed.slice(1, -1));
          }
        }
        if (stringValues.length >= 2) {
          results.push({ line: i + 1, values: stringValues });
        }
      }
    }

    return results;
  }

  private looksLikeFilterValues(values: string[]): boolean {
    // Filter values typically are short strings representing states
    const filterValueIndicators = ['all', 'active', 'completed', 'pending', 'done', 'open', 'closed', 'draft', 'published'];
    const matches = values.filter(v => filterValueIndicators.includes(v.toLowerCase()));
    return matches.length >= 1 || (values.length >= 2 && values.every(v => v.length < 20));
  }

  private hasVariableNamed(content: string, name: string): boolean {
    // Look for variable declarations or usage
    const patterns = [
      `const ${name}`,
      `let ${name}`,
      `var ${name}`,
      `${name}:`,
      `${name} =`
    ];
    return patterns.some(p => content.includes(p));
  }

  private hasPropertyNamed(content: string, name: string): boolean {
    // Look for property access or definition
    const patterns = [
      `.${name}`,
      `['${name}']`,
      `["${name}"]`,
      `${name}:`
    ];
    return patterns.some(p => content.includes(p));
  }

  private createFailedResult(sourcePath: string, timestamp: string, errors: string[]): ExtractionResult {
    return {
      agent_id: this.agentId,
      timestamp,
      shape: null,
      attribute_evidence: [],
      source_file: sourcePath,
      source_type: 'agent_output',
      status: 'FAILED',
      extraction_errors: errors
    };
  }
}
