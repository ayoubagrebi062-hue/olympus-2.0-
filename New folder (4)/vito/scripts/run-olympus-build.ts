/**
 * OLYMPUS BUILD EXECUTION SCRIPT
 *
 * PHASE 2: START BUILD
 *
 * This script:
 * 1. Loads the Master Spec from the specified path
 * 2. Parses it with SpecParser to extract structured requirements
 * 3. Initializes RequirementsTracker with parsed spec
 * 4. Copies spec to project root for the build system
 * 5. Reports parsed requirements and execution instructions
 *
 * Usage:
 *   npx tsx scripts/run-olympus-build.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseSpec, getRequirementsTracker, runCompletenessGate, formatGateResult } from '../src/lib/agents/spec';
import type { SpecRequirements, PageRequirement, ComponentRequirement } from '../src/lib/agents/spec';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SPEC_PATH = 'C:\\Users\\SBS\\Downloads\\olympus-plan\\OLYMPUS_MASTER_BUILD_PROMPT.md';
const PROJECT_ROOT = process.cwd();
const BUILD_PROMPT_PATH = path.join(PROJECT_ROOT, 'OLYMPUS_BUILD_PROMPT.md');

// Compliance thresholds from PHASE 2 requirements
const THRESHOLDS = {
  minPageCompletion: 90,       // 90% of pages required
  minComponentCompletion: 80,  // 80% of components required
  minCriticalCompletion: 100,  // 100% of P0/critical items
  minDesignSystemCompletion: 70,
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('================================================================================');
  console.log('                    OLYMPUS BUILD PROTOCOL - PHASE 2: START BUILD');
  console.log('================================================================================');
  console.log('');

  // STEP 1: Load the Master Spec
  console.log('STEP 1: Loading Master Spec...');
  console.log(`  Path: ${SPEC_PATH}`);

  let specContent: string;
  try {
    specContent = fs.readFileSync(SPEC_PATH, 'utf-8');
    console.log(`  ✅ Loaded ${specContent.length} characters (${specContent.split('\n').length} lines)`);
  } catch (error) {
    console.error(`  ❌ ERROR: Could not load spec file`);
    console.error(`     ${(error as Error).message}`);
    process.exit(1);
  }

  // STEP 2: Parse the spec
  console.log('');
  console.log('STEP 2: Parsing Spec with SpecParser...');

  const parseResult = parseSpec(specContent);

  if (parseResult.errors.length > 0) {
    console.log('  ⚠️  Parse Errors:');
    for (const error of parseResult.errors) {
      console.log(`     - ${error.type}: ${error.message}`);
    }
  }

  if (parseResult.warnings.length > 0) {
    console.log('  ⚠️  Parse Warnings:');
    for (const warning of parseResult.warnings) {
      console.log(`     - ${warning.type}: ${warning.message}`);
    }
  }

  const { requirements } = parseResult;

  // Display parsed requirements
  console.log('');
  console.log('  📊 PARSED REQUIREMENTS:');
  console.log('  ─────────────────────────');
  console.log(`  Project: ${requirements.metadata.name}`);
  console.log(`  Type: ${requirements.metadata.type}`);
  console.log('');

  // Pages
  console.log(`  📄 PAGES (${requirements.pages.length} total):`);
  const p0Pages = requirements.pages.filter(p => p.priority === 'P0');
  const p1Pages = requirements.pages.filter(p => p.priority === 'P1');
  const p2Pages = requirements.pages.filter(p => p.priority === 'P2');

  console.log(`     P0 Critical (${p0Pages.length}):`);
  for (const page of p0Pages) {
    console.log(`       • ${page.path} → ${page.name}`);
  }
  console.log(`     P1 Important (${p1Pages.length}):`);
  for (const page of p1Pages) {
    console.log(`       • ${page.path} → ${page.name}`);
  }
  if (p2Pages.length > 0) {
    console.log(`     P2 Nice-to-have (${p2Pages.length}):`);
    for (const page of p2Pages) {
      console.log(`       • ${page.path} → ${page.name}`);
    }
  }

  // Components
  console.log('');
  console.log(`  🧩 COMPONENTS (${requirements.components.length} total):`);
  const criticalComponents = requirements.components.filter(c => c.critical);
  const otherComponents = requirements.components.filter(c => !c.critical);

  console.log(`     Critical (${criticalComponents.length}):`);
  for (const comp of criticalComponents) {
    console.log(`       • ${comp.name} (${comp.category})`);
  }

  // Group other components by category
  const byCategory = new Map<string, ComponentRequirement[]>();
  for (const comp of otherComponents) {
    const list = byCategory.get(comp.category) || [];
    list.push(comp);
    byCategory.set(comp.category, list);
  }

  for (const [category, comps] of byCategory) {
    console.log(`     ${category} (${comps.length}):`);
    for (const comp of comps.slice(0, 5)) {
      console.log(`       • ${comp.name}`);
    }
    if (comps.length > 5) {
      console.log(`       ... and ${comps.length - 5} more`);
    }
  }

  // Design System
  console.log('');
  console.log('  🎨 DESIGN SYSTEM:');
  const colorCount = Object.keys(requirements.designSystem.colors).length;
  console.log(`     Colors: ${colorCount} tokens`);
  if (requirements.designSystem.glassmorphism) {
    console.log(`     Glassmorphism: REQUIRED for cards`);
  }
  console.log(`     Animations: ${requirements.designSystem.animations.join(', ') || 'none specified'}`);

  // Tech Stack
  console.log('');
  console.log('  ⚙️  TECH STACK:');
  console.log(`     Framework: ${requirements.techStack.framework}`);
  console.log(`     Language: ${requirements.techStack.language}`);
  console.log(`     Styling: ${requirements.techStack.styling}`);
  if (requirements.techStack.componentLibrary) {
    console.log(`     Components: ${requirements.techStack.componentLibrary}`);
  }
  if (requirements.techStack.animationLibrary) {
    console.log(`     Animations: ${requirements.techStack.animationLibrary}`);
  }

  // STEP 3: Initialize RequirementsTracker
  console.log('');
  console.log('STEP 3: Initializing RequirementsTracker...');

  const tracker = getRequirementsTracker();
  tracker.initialize(requirements);

  console.log(`  ✅ Tracker initialized with:`);
  console.log(`     - ${requirements.pages.length} page requirements`);
  console.log(`     - ${requirements.components.length} component requirements`);
  console.log(`     - ${colorCount} design tokens`);
  console.log('');
  console.log(`  📋 COMPLIANCE THRESHOLDS:`);
  console.log(`     Pages: ${THRESHOLDS.minPageCompletion}% minimum`);
  console.log(`     Components: ${THRESHOLDS.minComponentCompletion}% minimum`);
  console.log(`     Critical: ${THRESHOLDS.minCriticalCompletion}% minimum (MUST be 100%)`);

  // STEP 4: Copy spec to project root
  console.log('');
  console.log('STEP 4: Preparing build environment...');

  try {
    fs.writeFileSync(BUILD_PROMPT_PATH, specContent, 'utf-8');
    console.log(`  ✅ Spec copied to: ${BUILD_PROMPT_PATH}`);
  } catch (error) {
    console.error(`  ❌ ERROR: Could not copy spec to project`);
    console.error(`     ${(error as Error).message}`);
    process.exit(1);
  }

  // STEP 5: Report and provide execution instructions
  console.log('');
  console.log('================================================================================');
  console.log('                              BUILD REPORT');
  console.log('================================================================================');
  console.log('');
  console.log('  📊 SPEC ANALYSIS:');
  console.log(`     Total Pages:      ${requirements.pages.length}`);
  console.log(`     Total Components: ${requirements.components.length}`);
  console.log(`     Critical Pages:   ${p0Pages.length}`);
  console.log(`     Critical Comps:   ${criticalComponents.length}`);
  console.log('');
  console.log('  🎯 COMPLIANCE TARGETS:');
  console.log(`     Pages:     ${Math.ceil(requirements.pages.length * 0.9)} / ${requirements.pages.length} required`);
  console.log(`     Components: ${Math.ceil(requirements.components.length * 0.8)} / ${requirements.components.length} required`);
  console.log(`     Critical:   ${p0Pages.length + criticalComponents.length} / ${p0Pages.length + criticalComponents.length} required (100%)`);
  console.log('');
  console.log('================================================================================');
  console.log('                          EXECUTION INSTRUCTIONS');
  console.log('================================================================================');
  console.log('');
  console.log('  To start the OLYMPUS build, you have two options:');
  console.log('');
  console.log('  OPTION 1: Via API (requires running dev server)');
  console.log('    1. Start the dev server: npm run dev');
  console.log('    2. Call the build API:');
  console.log('       curl -X POST http://localhost:3000/api/bootstrap/start-build');
  console.log('');
  console.log('  OPTION 2: Direct execution (recommended for testing)');
  console.log('    npx tsx scripts/execute-build.ts');
  console.log('');
  console.log('================================================================================');
  console.log('  ✅ READY TO BUILD');
  console.log('================================================================================');
  console.log('');

  // Return parsed data for programmatic use
  return {
    requirements,
    parseMetadata: parseResult.parseMetadata,
    tracker,
    thresholds: THRESHOLDS,
  };
}

// Run if called directly
main().catch(console.error);
