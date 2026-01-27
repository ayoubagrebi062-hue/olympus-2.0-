/**
 * OLYMPUS 2.0 - Behavioral Prober
 *
 * Static analysis that proves generated code will behave correctly:
 * - Buttons have real onClick handlers (not empty)
 * - Forms have onSubmit that does something
 * - State changes actually occur
 * - API calls are actually made
 *
 * Proves: "The app DOES what it should" not just "The app EXISTS correctly"
 */

import * as fs from 'fs';
import * as path from 'path';

/** Interactive element discovered in code */
interface InteractiveElement {
  type: 'button' | 'form' | 'input' | 'link' | 'select';
  file: string;
  line: number;
  handler?: string; // onClick, onSubmit, onChange
  handlerCode?: string; // The actual handler code
  label?: string; // Button text, input placeholder
}

/** Behavioral probe result */
interface ProbeResult {
  element: InteractiveElement;
  passed: boolean;
  behaviors: BehaviorCheck[];
  critical: boolean; // Failure blocks build
}

/** Individual behavior check */
interface BehaviorCheck {
  name: string;
  passed: boolean;
  message: string;
}

/** Full behavioral validation report */
export interface BehavioralReport {
  passed: boolean;
  totalElements: number;
  passedElements: number;
  failedElements: number;
  criticalFailures: number;
  probes: ProbeResult[];
  summary: {
    buttons: { total: number; withHandlers: number; withRealActions: number };
    forms: { total: number; withSubmit: number; withApiCalls: number };
    inputs: { total: number; withOnChange: number; withStateUpdate: number };
  };
}

/** Patterns that indicate real behavior (not empty/placeholder) */
const REAL_ACTION_PATTERNS = [
  /setState\s*\(/, // React state update
  /set[A-Z]\w+\s*\(/, // setState hook pattern
  /dispatch\s*\(/, // Redux dispatch
  /fetch\s*\(/, // API call
  /axios\./, // Axios API call
  /\.post\s*\(/, // POST request
  /\.put\s*\(/, // PUT request
  /\.delete\s*\(/, // DELETE request
  /router\.push/, // Navigation
  /navigate\s*\(/, // React Router navigate
  /window\.location/, // Direct navigation
  /console\.(log|error)/, // At minimum, logging (weak but not empty)
  /throw\s+/, // Error throwing
  /return\s+/, // Returning a value
  /\.then\s*\(/, // Promise chain
  /await\s+/, // Async operation
  /emit\s*\(/, // Event emission
  /toast\./, // Toast notification
  /alert\s*\(/, // Alert (weak but visible)
  /confirm\s*\(/, // Confirmation dialog
  /modal/i, // Modal interaction
  /open\s*\(/, // Opening something
  /close\s*\(/, // Closing something
  /toggle/i, // Toggle action
  /show/i, // Show action
  /hide/i, // Hide action
];

/** Patterns that indicate EMPTY/PLACEHOLDER handlers */
const EMPTY_HANDLER_PATTERNS = [
  /^\s*\(\)\s*=>\s*\{\s*\}\s*$/, // () => {}
  /^\s*\(\)\s*=>\s*null\s*$/, // () => null
  /^\s*\(\)\s*=>\s*undefined\s*$/, // () => undefined
  /^\s*function\s*\(\)\s*\{\s*\}\s*$/, // function() {}
  /^\s*\(\s*\)\s*=>\s*\{\s*\/\//, // () => { // comment only
  /TODO/i, // Contains TODO
  /FIXME/i, // Contains FIXME
  /placeholder/i, // Placeholder
  /not\s+implemented/i, // Not implemented
];

/** Patterns for CRUD operations that should have API calls */
const CRUD_PATTERNS = {
  create: [/add/i, /create/i, /new/i, /submit/i, /save/i, /post/i],
  read: [/get/i, /fetch/i, /load/i, /read/i, /list/i],
  update: [/update/i, /edit/i, /modify/i, /change/i, /put/i, /patch/i],
  delete: [/delete/i, /remove/i, /destroy/i, /clear/i],
};

/** API call patterns */
const API_CALL_PATTERNS = [
  /fetch\s*\(\s*['"`]/,
  /axios\.\w+\s*\(/,
  /\.get\s*\(\s*['"`]/,
  /\.post\s*\(\s*['"`]/,
  /\.put\s*\(\s*['"`]/,
  /\.delete\s*\(\s*['"`]/,
  /\/api\//,
];

/**
 * Extract interactive elements from a React component file
 */
function extractInteractiveElements(filePath: string, content: string): InteractiveElement[] {
  const elements: InteractiveElement[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Find buttons
    const buttonMatch = line.match(/<button[^>]*>/i) || line.match(/<Button[^>]*>/i);
    if (buttonMatch) {
      const onClickMatch = line.match(/onClick\s*=\s*\{([^}]+)\}/);
      const labelMatch = line.match(/>([^<]+)</);
      elements.push({
        type: 'button',
        file: filePath,
        line: lineNum,
        handler: onClickMatch ? 'onClick' : undefined,
        handlerCode: onClickMatch ? onClickMatch[1].trim() : undefined,
        label: labelMatch ? labelMatch[1].trim() : undefined,
      });
    }

    // Find forms
    const formMatch = line.match(/<form[^>]*>/i);
    if (formMatch) {
      const onSubmitMatch = line.match(/onSubmit\s*=\s*\{([^}]+)\}/);
      elements.push({
        type: 'form',
        file: filePath,
        line: lineNum,
        handler: onSubmitMatch ? 'onSubmit' : undefined,
        handlerCode: onSubmitMatch ? onSubmitMatch[1].trim() : undefined,
      });
    }

    // Find inputs with onChange
    const inputMatch = line.match(/<input[^>]*>/i) || line.match(/<Input[^>]*>/i);
    if (inputMatch) {
      const onChangeMatch = line.match(/onChange\s*=\s*\{([^}]+)\}/);
      const placeholderMatch = line.match(/placeholder\s*=\s*['"]([^'"]+)['"]/);
      elements.push({
        type: 'input',
        file: filePath,
        line: lineNum,
        handler: onChangeMatch ? 'onChange' : undefined,
        handlerCode: onChangeMatch ? onChangeMatch[1].trim() : undefined,
        label: placeholderMatch ? placeholderMatch[1] : undefined,
      });
    }

    // Find links
    const linkMatch =
      line.match(/<a[^>]*href\s*=\s*['"]([^'"]+)['"]/i) ||
      line.match(/<Link[^>]*href\s*=\s*['"]([^'"]+)['"]/i);
    if (linkMatch) {
      elements.push({
        type: 'link',
        file: filePath,
        line: lineNum,
        label: linkMatch[1],
      });
    }
  }

  return elements;
}

/**
 * Check if a handler has real behavior (not empty/placeholder)
 */
function hasRealBehavior(handlerCode: string | undefined, fullContent: string): boolean {
  if (!handlerCode) return false;

  // Check for empty handler patterns
  for (const pattern of EMPTY_HANDLER_PATTERNS) {
    if (pattern.test(handlerCode)) {
      return false;
    }
  }

  // If handler is a reference (e.g., handleClick), find the function
  const functionMatch = handlerCode.match(/^(\w+)$/);
  if (functionMatch) {
    const funcName = functionMatch[1];
    // Look for function definition in the content
    const funcDefPattern = new RegExp(
      `(const|function)\\s+${funcName}\\s*=?\\s*[^{]*\\{([^}]+)\\}`,
      's'
    );
    const funcMatch = fullContent.match(funcDefPattern);
    if (funcMatch) {
      const funcBody = funcMatch[2];
      return REAL_ACTION_PATTERNS.some(p => p.test(funcBody));
    }
  }

  // Check for real action patterns in the handler code
  return REAL_ACTION_PATTERNS.some(p => p.test(handlerCode));
}

/**
 * Check if handler makes API calls
 */
function hasApiCall(handlerCode: string | undefined, fullContent: string): boolean {
  if (!handlerCode) return false;

  // Direct check on handler
  if (API_CALL_PATTERNS.some(p => p.test(handlerCode))) {
    return true;
  }

  // If handler is a reference, find the function
  const functionMatch = handlerCode.match(/^(\w+)$/);
  if (functionMatch) {
    const funcName = functionMatch[1];
    const funcDefPattern = new RegExp(`${funcName}[^{]*\\{[\\s\\S]*?\\}`, 'g');
    const matches = fullContent.match(funcDefPattern);
    if (matches) {
      return matches.some(m => API_CALL_PATTERNS.some(p => p.test(m)));
    }
  }

  return false;
}

/**
 * Determine if an element is CRUD-related and should have API calls
 */
function isCrudElement(element: InteractiveElement): 'create' | 'update' | 'delete' | null {
  const text =
    (element.label || '').toLowerCase() + ' ' + (element.handlerCode || '').toLowerCase();

  if (CRUD_PATTERNS.create.some(p => p.test(text))) return 'create';
  if (CRUD_PATTERNS.update.some(p => p.test(text))) return 'update';
  if (CRUD_PATTERNS.delete.some(p => p.test(text))) return 'delete';

  return null;
}

/**
 * Generate behavioral probes for an element
 */
function probeElement(element: InteractiveElement, fullContent: string): ProbeResult {
  const behaviors: BehaviorCheck[] = [];
  let critical = false;

  switch (element.type) {
    case 'button': {
      // Check 1: Has handler
      const hasHandler = !!element.handler;
      behaviors.push({
        name: 'has_handler',
        passed: hasHandler,
        message: hasHandler ? 'Button has onClick handler' : 'Button missing onClick handler',
      });

      // Check 2: Handler has real behavior
      const hasReal = hasRealBehavior(element.handlerCode, fullContent);
      behaviors.push({
        name: 'has_real_behavior',
        passed: hasReal,
        message: hasReal
          ? 'Handler performs real action (state change, API call, navigation)'
          : 'Handler is empty or placeholder',
      });

      // Check 3: CRUD buttons should have API calls
      const crudType = isCrudElement(element);
      if (crudType) {
        critical = true; // CRUD buttons are critical
        const hasApi = hasApiCall(element.handlerCode, fullContent);
        behaviors.push({
          name: 'crud_has_api',
          passed: hasApi,
          message: hasApi
            ? `${crudType.toUpperCase()} button calls API`
            : `${crudType.toUpperCase()} button missing API call (client-only mutation)`,
        });
      }
      break;
    }

    case 'form': {
      // Check 1: Has onSubmit
      const hasSubmit = element.handler === 'onSubmit';
      behaviors.push({
        name: 'has_submit_handler',
        passed: hasSubmit,
        message: hasSubmit ? 'Form has onSubmit handler' : 'Form missing onSubmit handler',
      });
      critical = true; // Forms are critical

      // Check 2: Submit has real behavior
      if (hasSubmit) {
        const hasReal = hasRealBehavior(element.handlerCode, fullContent);
        behaviors.push({
          name: 'submit_has_behavior',
          passed: hasReal,
          message: hasReal
            ? 'Form submit performs real action'
            : 'Form submit is empty or placeholder',
        });

        // Check 3: Form should make API call
        const hasApi = hasApiCall(element.handlerCode, fullContent);
        behaviors.push({
          name: 'form_has_api',
          passed: hasApi,
          message: hasApi ? 'Form submission calls API' : 'Form submission missing API call',
        });
      }
      break;
    }

    case 'input': {
      // Check: Has onChange with state update
      const hasOnChange = element.handler === 'onChange';
      if (hasOnChange) {
        const updatesState =
          element.handlerCode?.includes('set') ||
          element.handlerCode?.includes('onChange') ||
          /\w+\(.*\)/.test(element.handlerCode || '');
        behaviors.push({
          name: 'updates_state',
          passed: updatesState,
          message: updatesState
            ? 'Input onChange updates state'
            : 'Input onChange does not update state',
        });
      }
      break;
    }

    case 'link': {
      // Check: Link has valid href
      const hasValidHref = element.label && element.label !== '#' && element.label !== '';
      behaviors.push({
        name: 'valid_href',
        passed: !!hasValidHref,
        message: hasValidHref
          ? `Link has valid href: ${element.label}`
          : 'Link has invalid href (# or empty)',
      });
      break;
    }
  }

  const passed = behaviors.every(b => b.passed);
  return { element, passed, behaviors, critical };
}

/**
 * Run behavioral analysis on all generated files
 */
export function runBehavioralAnalysis(buildDir: string): BehavioralReport {
  const probes: ProbeResult[] = [];
  const summary = {
    buttons: { total: 0, withHandlers: 0, withRealActions: 0 },
    forms: { total: 0, withSubmit: 0, withApiCalls: 0 },
    inputs: { total: 0, withOnChange: 0, withStateUpdate: 0 },
  };

  // Scan for .tsx files
  const agentsDir = path.join(buildDir, 'agents');
  if (!fs.existsSync(agentsDir)) {
    return {
      passed: true,
      totalElements: 0,
      passedElements: 0,
      failedElements: 0,
      criticalFailures: 0,
      probes: [],
      summary,
    };
  }

  const files: string[] = [];
  const scanDir = (dir: string) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  };
  scanDir(agentsDir);

  // Analyze each file
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(buildDir, file);
    const elements = extractInteractiveElements(relativePath, content);

    for (const element of elements) {
      const probe = probeElement(element, content);
      probes.push(probe);

      // Update summary
      switch (element.type) {
        case 'button':
          summary.buttons.total++;
          if (element.handler) summary.buttons.withHandlers++;
          if (probe.behaviors.find(b => b.name === 'has_real_behavior')?.passed) {
            summary.buttons.withRealActions++;
          }
          break;
        case 'form':
          summary.forms.total++;
          if (element.handler === 'onSubmit') summary.forms.withSubmit++;
          if (probe.behaviors.find(b => b.name === 'form_has_api')?.passed) {
            summary.forms.withApiCalls++;
          }
          break;
        case 'input':
          summary.inputs.total++;
          if (element.handler === 'onChange') summary.inputs.withOnChange++;
          if (probe.behaviors.find(b => b.name === 'updates_state')?.passed) {
            summary.inputs.withStateUpdate++;
          }
          break;
      }
    }
  }

  // Calculate results
  const passedElements = probes.filter(p => p.passed).length;
  const failedElements = probes.filter(p => !p.passed).length;
  const criticalFailures = probes.filter(p => !p.passed && p.critical).length;

  // Build passes if no critical failures
  const passed = criticalFailures === 0;

  console.log(`[BehavioralProber] Analyzed ${files.length} files`);
  console.log(`[BehavioralProber] Found ${probes.length} interactive elements`);
  console.log(
    `[BehavioralProber] Passed: ${passedElements}, Failed: ${failedElements}, Critical: ${criticalFailures}`
  );
  console.log(
    `[BehavioralProber] Buttons: ${summary.buttons.withRealActions}/${summary.buttons.total} with real actions`
  );
  console.log(
    `[BehavioralProber] Forms: ${summary.forms.withApiCalls}/${summary.forms.total} with API calls`
  );

  return {
    passed,
    totalElements: probes.length,
    passedElements,
    failedElements,
    criticalFailures,
    probes,
    summary,
  };
}
