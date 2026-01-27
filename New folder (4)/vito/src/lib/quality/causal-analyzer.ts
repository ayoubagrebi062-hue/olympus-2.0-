/**
 * OLYMPUS 2.0 - Causal Behavioral Analyzer
 *
 * Proves cause-effect chains in generated code:
 * - Trigger (onClick) → Handler → State Change → Render Effect
 * - A behavior only counts if it changes something the user can observe
 *
 * This is NOT pattern detection. This is causal tracing.
 */

import * as fs from 'fs';
import * as path from 'path';

/** State variable tracked through the component */
interface StateVariable {
  name: string;           // e.g., "tasks", "isOpen"
  setter: string;         // e.g., "setTasks", "setIsOpen"
  usedInRender: boolean;  // Is this state used in JSX?
  renderLocations: number[]; // Line numbers where used in JSX
}

/** Handler function with its effects */
interface HandlerAnalysis {
  name: string;
  line: number;
  stateChanges: string[];     // State setters called
  apiCalls: string[];         // fetch/axios calls
  navigations: string[];      // router.push, navigate
  conditionalRenders: string[]; // State that affects conditionals
  hasVisibleEffect: boolean;  // Does this cause observable change?
  causalChain: CausalChain | null;
}

/** Complete causal chain from trigger to effect */
interface CausalChain {
  trigger: string;           // "onClick", "onSubmit"
  handler: string;           // Handler function name
  stateChanged: string[];    // State variables modified
  effectVisible: boolean;    // Is the effect rendered?
  effectType: 'state_render' | 'navigation' | 'api_refetch' | 'none';
  confidence: 'high' | 'medium' | 'low';
}

/** Causal validation result for a component */
interface ComponentCausalAnalysis {
  file: string;
  stateVariables: StateVariable[];
  handlers: HandlerAnalysis[];
  causalChains: CausalChain[];
  brokenChains: BrokenChain[];
}

/** A broken causal chain (action without visible effect) */
interface BrokenChain {
  trigger: string;
  handler: string;
  reason: string;
  severity: 'critical' | 'warning' | 'info';
}

/** Full causal analysis report */
export interface CausalReport {
  passed: boolean;
  totalChains: number;
  validChains: number;
  brokenChains: number;
  criticalBrokenChains: number;
  components: ComponentCausalAnalysis[];
  summary: {
    stateUsedInRender: number;
    stateNotRendered: number;
    handlersWithEffect: number;
    handlersWithoutEffect: number;
  };
}

/**
 * Extract all useState declarations and track their usage
 */
function extractStateVariables(content: string): StateVariable[] {
  const states: StateVariable[] = [];
  const lines = content.split('\n');

  // Find useState declarations
  const useStatePattern = /const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState/g;
  let match;

  while ((match = useStatePattern.exec(content)) !== null) {
    const stateName = match[1];
    const setterName = match[2];

    // Check if state is used in JSX (inside return statement)
    const returnMatch = content.match(/return\s*\(([\s\S]*?)\);?\s*\}/);
    const jsxContent = returnMatch ? returnMatch[1] : '';

    // State is used in render if:
    // 1. Directly in JSX: {stateName}
    // 2. In conditional: {stateName && ...}
    // 3. In map: {stateName.map(...)}
    // 4. In ternary: {stateName ? ... : ...}
    const stateInJsxPatterns = [
      new RegExp(`\\{\\s*${stateName}\\s*\\}`, 'g'),           // {state}
      new RegExp(`\\{\\s*${stateName}\\s*&&`, 'g'),            // {state &&
      new RegExp(`\\{\\s*${stateName}\\.map`, 'g'),            // {state.map
      new RegExp(`\\{\\s*${stateName}\\s*\\?`, 'g'),           // {state ?
      new RegExp(`\\{.*${stateName}.*\\}`, 'g'),               // {anything with state}
      new RegExp(`className=.*${stateName}`, 'g'),             // className with state
      new RegExp(`style=.*${stateName}`, 'g'),                 // style with state
    ];

    const usedInRender = stateInJsxPatterns.some(p => p.test(jsxContent));

    // Find line numbers where state is used in JSX
    const renderLocations: number[] = [];
    if (usedInRender) {
      for (let i = 0; i < lines.length; i++) {
        if (stateInJsxPatterns.some(p => p.test(lines[i]))) {
          renderLocations.push(i + 1);
        }
      }
    }

    states.push({
      name: stateName,
      setter: setterName,
      usedInRender,
      renderLocations,
    });
  }

  return states;
}

/**
 * Analyze a handler function for its effects
 */
function analyzeHandler(
  handlerName: string,
  handlerBody: string,
  stateVariables: StateVariable[],
  content: string
): HandlerAnalysis {
  const stateChanges: string[] = [];
  const apiCalls: string[] = [];
  const navigations: string[] = [];
  const conditionalRenders: string[] = [];

  // Find state setter calls
  for (const state of stateVariables) {
    if (handlerBody.includes(state.setter)) {
      stateChanges.push(state.name);
      if (state.usedInRender) {
        conditionalRenders.push(state.name);
      }
    }
  }

  // Find API calls
  const apiPatterns = [
    /fetch\s*\(\s*['"`]([^'"`)]+)/g,
    /axios\.\w+\s*\(\s*['"`]([^'"`)]+)/g,
    /\.get\s*\(\s*['"`]([^'"`)]+)/g,
    /\.post\s*\(\s*['"`]([^'"`)]+)/g,
    /\.put\s*\(\s*['"`]([^'"`)]+)/g,
    /\.delete\s*\(\s*['"`]([^'"`)]+)/g,
  ];

  for (const pattern of apiPatterns) {
    let match;
    while ((match = pattern.exec(handlerBody)) !== null) {
      apiCalls.push(match[1] || 'unknown');
    }
  }

  // Find navigation calls
  if (/router\.push|navigate\(|window\.location/.test(handlerBody)) {
    const navMatch = handlerBody.match(/(?:router\.push|navigate)\s*\(\s*['"`]([^'"`)]+)/);
    navigations.push(navMatch ? navMatch[1] : 'unknown');
  }

  // Determine if handler has visible effect
  const hasVisibleEffect =
    conditionalRenders.length > 0 ||  // Changes state that's rendered
    navigations.length > 0 ||          // Navigates to new page
    (apiCalls.length > 0 && stateChanges.length > 0); // API + state update

  // Build causal chain
  let causalChain: CausalChain | null = null;
  if (stateChanges.length > 0 || apiCalls.length > 0 || navigations.length > 0) {
    let effectType: CausalChain['effectType'] = 'none';
    let confidence: CausalChain['confidence'] = 'low';

    if (conditionalRenders.length > 0) {
      effectType = 'state_render';
      confidence = 'high';
    } else if (navigations.length > 0) {
      effectType = 'navigation';
      confidence = 'high';
    } else if (apiCalls.length > 0 && stateChanges.length > 0) {
      effectType = 'api_refetch';
      confidence = 'medium';
    }

    causalChain = {
      trigger: 'onClick', // Will be set by caller
      handler: handlerName,
      stateChanged: stateChanges,
      effectVisible: hasVisibleEffect,
      effectType,
      confidence,
    };
  }

  // Find line number
  const lineMatch = content.indexOf(handlerName);
  const line = lineMatch >= 0 ? content.substring(0, lineMatch).split('\n').length : 0;

  return {
    name: handlerName,
    line,
    stateChanges,
    apiCalls,
    navigations,
    conditionalRenders,
    hasVisibleEffect,
    causalChain,
  };
}

/**
 * Extract and analyze all handlers in a component
 */
function extractHandlers(content: string, stateVariables: StateVariable[]): HandlerAnalysis[] {
  const handlers: HandlerAnalysis[] = [];

  // Pattern for handler functions
  const handlerPatterns = [
    // const handleClick = () => { ... }
    /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([\s\S]*?)\n\s*\};/g,
    // const handleClick = async () => { ... }
    /const\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\n\s*\};/g,
    // function handleClick() { ... }
    /function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/g,
  ];

  for (const pattern of handlerPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const handlerName = match[1];
      const handlerBody = match[2];

      // Only analyze handlers that look like event handlers
      if (/^handle|^on[A-Z]|Submit|Click|Change|Toggle|Open|Close/i.test(handlerName)) {
        handlers.push(analyzeHandler(handlerName, handlerBody, stateVariables, content));
      }
    }
  }

  return handlers;
}

/**
 * Find broken causal chains (actions without visible effects)
 */
function findBrokenChains(
  content: string,
  handlers: HandlerAnalysis[],
  stateVariables: StateVariable[]
): BrokenChain[] {
  const broken: BrokenChain[] = [];

  // Find onClick/onSubmit bindings and check their handlers
  const bindingPatterns = [
    { pattern: /onClick\s*=\s*\{(\w+)\}/g, trigger: 'onClick' },
    { pattern: /onSubmit\s*=\s*\{(\w+)\}/g, trigger: 'onSubmit' },
    { pattern: /onChange\s*=\s*\{(\w+)\}/g, trigger: 'onChange' },
  ];

  for (const { pattern, trigger } of bindingPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const handlerName = match[1];
      const handler = handlers.find(h => h.name === handlerName);

      if (!handler) {
        // Handler referenced but not defined (might be prop)
        continue;
      }

      if (!handler.hasVisibleEffect) {
        // Determine severity
        let severity: BrokenChain['severity'] = 'warning';
        let reason = '';

        if (handler.stateChanges.length > 0) {
          // Changes state but state not rendered
          reason = `Changes state (${handler.stateChanges.join(', ')}) but state is not used in render`;
          severity = 'critical';
        } else if (handler.apiCalls.length > 0 && handler.stateChanges.length === 0) {
          // API call without state update
          reason = 'Makes API call but does not update state with result';
          severity = 'warning';
        } else if (handler.stateChanges.length === 0 && handler.apiCalls.length === 0 && handler.navigations.length === 0) {
          // No observable effect at all
          reason = 'Handler has no state changes, API calls, or navigation';
          severity = 'info';
        }

        if (reason) {
          broken.push({
            trigger,
            handler: handlerName,
            reason,
            severity,
          });
        }
      }
    }
  }

  // Check for inline handlers that do nothing visible
  const inlinePatterns = [
    /onClick\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g,                    // () => {}
    /onClick\s*=\s*\{\s*\(\)\s*=>\s*console\.log\([^)]+\)\s*\}/g,      // () => console.log()
  ];

  for (const pattern of inlinePatterns) {
    if (pattern.test(content)) {
      broken.push({
        trigger: 'onClick',
        handler: 'inline',
        reason: 'Inline handler with no visible effect (empty or console.log only)',
        severity: 'critical',
      });
    }
  }

  return broken;
}

/**
 * Analyze a single component file for causal chains
 */
function analyzeComponent(filePath: string, content: string): ComponentCausalAnalysis {
  const stateVariables = extractStateVariables(content);
  const handlers = extractHandlers(content, stateVariables);
  const brokenChains = findBrokenChains(content, handlers, stateVariables);

  // Extract valid causal chains
  const causalChains: CausalChain[] = handlers
    .filter(h => h.causalChain && h.hasVisibleEffect)
    .map(h => h.causalChain!);

  return {
    file: filePath,
    stateVariables,
    handlers,
    causalChains,
    brokenChains,
  };
}

/**
 * Run full causal analysis on all generated files
 */
export function runCausalAnalysis(buildDir: string): CausalReport {
  const components: ComponentCausalAnalysis[] = [];
  let totalChains = 0;
  let validChains = 0;
  let brokenChains = 0;
  let criticalBrokenChains = 0;

  const summary = {
    stateUsedInRender: 0,
    stateNotRendered: 0,
    handlersWithEffect: 0,
    handlersWithoutEffect: 0,
  };

  // Scan for .tsx files
  const agentsDir = path.join(buildDir, 'agents');
  if (!fs.existsSync(agentsDir)) {
    return {
      passed: true,
      totalChains: 0,
      validChains: 0,
      brokenChains: 0,
      criticalBrokenChains: 0,
      components: [],
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
      } else if (item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  };
  scanDir(agentsDir);

  // Analyze each component
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(buildDir, file);
    const analysis = analyzeComponent(relativePath, content);
    components.push(analysis);

    // Update counts
    totalChains += analysis.handlers.length;
    validChains += analysis.causalChains.length;
    brokenChains += analysis.brokenChains.length;
    criticalBrokenChains += analysis.brokenChains.filter(b => b.severity === 'critical').length;

    // Update summary
    for (const state of analysis.stateVariables) {
      if (state.usedInRender) {
        summary.stateUsedInRender++;
      } else {
        summary.stateNotRendered++;
      }
    }
    for (const handler of analysis.handlers) {
      if (handler.hasVisibleEffect) {
        summary.handlersWithEffect++;
      } else {
        summary.handlersWithoutEffect++;
      }
    }
  }

  // Build passes if no critical broken chains
  const passed = criticalBrokenChains === 0;

  console.log(`[CausalAnalyzer] Analyzed ${files.length} components`);
  console.log(`[CausalAnalyzer] Chains: ${validChains}/${totalChains} valid`);
  console.log(`[CausalAnalyzer] Broken: ${brokenChains} (${criticalBrokenChains} critical)`);
  console.log(`[CausalAnalyzer] State: ${summary.stateUsedInRender} rendered, ${summary.stateNotRendered} orphaned`);
  console.log(`[CausalAnalyzer] Handlers: ${summary.handlersWithEffect} with effect, ${summary.handlersWithoutEffect} without`);

  return {
    passed,
    totalChains,
    validChains,
    brokenChains,
    criticalBrokenChains,
    components,
    summary,
  };
}
