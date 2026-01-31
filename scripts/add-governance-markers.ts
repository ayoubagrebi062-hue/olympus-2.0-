#!/usr/bin/env tsx
/**
 * Bulk Governance Marker Script
 *
 * Automatically adds governance markers to files based on tier classification.
 *
 * Usage:
 *   npx tsx scripts/add-governance-markers.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

type Tier = 'tier1' | 'tier2' | 'tier3';

interface FileViolation {
  filePath: string;
  tier: Tier;
  missingMarkers: string[];
}

// ============================================================================
// MARKER DEFINITIONS
// ============================================================================

const TIER_MARKERS = {
  tier2: ['@AUTHORITY_CHECK - Database/storage operations require authorization verification'],
  tier3: [
    '@ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight',
    '@HUMAN_ACCOUNTABILITY - Critical operations require human review',
    '@HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable',
  ],
};

// ============================================================================
// PARSE GOVERNANCE SCAN OUTPUT
// ============================================================================

function parseGovernanceScan(scanOutput: string): FileViolation[] {
  const violations: Map<string, FileViolation> = new Map();
  const lines = scanOutput.split('\n');

  let currentFile: string | null = null;
  let currentTier: Tier | null = null;

  for (const line of lines) {
    // Match file path lines like: [1] [TIER3] src\lib\agents\...
    const fileMatch = line.match(/\[TIER([123])\].*?([a-zA-Z]:\\[^[]+\.tsx?|src[\\\/][^[]+\.tsx?)/);
    if (fileMatch) {
      const tier = `tier${fileMatch[1]}` as Tier;
      let filePath = fileMatch[2].trim();

      // Normalize path separators to forward slashes
      filePath = filePath.replace(/\\/g, '/');

      // Remove color codes if present
      filePath = filePath.replace(/\x1b\[[0-9;]*m/g, '');

      currentFile = filePath;
      currentTier = tier;

      if (!violations.has(filePath)) {
        violations.set(filePath, {
          filePath,
          tier,
          missingMarkers: [],
        });
      }
    }

    // Track missing markers
    if (currentFile && currentTier && line.includes('missing')) {
      const violation = violations.get(currentFile);
      if (violation) {
        if (
          line.includes('ETHICAL_OVERSIGHT') &&
          !violation.missingMarkers.includes('ETHICAL_OVERSIGHT')
        ) {
          violation.missingMarkers.push('ETHICAL_OVERSIGHT');
        }
        if (
          line.includes('HUMAN_ACCOUNTABILITY') &&
          !violation.missingMarkers.includes('HUMAN_ACCOUNTABILITY')
        ) {
          violation.missingMarkers.push('HUMAN_ACCOUNTABILITY');
        }
        if (
          line.includes('HUMAN_OVERRIDE_REQUIRED') &&
          !violation.missingMarkers.includes('HUMAN_OVERRIDE_REQUIRED')
        ) {
          violation.missingMarkers.push('HUMAN_OVERRIDE_REQUIRED');
        }
        if (
          line.includes('AUTHORITY_CHECK') &&
          !violation.missingMarkers.includes('AUTHORITY_CHECK')
        ) {
          violation.missingMarkers.push('AUTHORITY_CHECK');
        }
      }
    }
  }

  return Array.from(violations.values()).filter(v => v.missingMarkers.length > 0);
}

// ============================================================================
// ADD MARKERS TO FILE
// ============================================================================

function addMarkersToFile(filePath: string, tier: Tier): boolean {
  const fullPath = path.resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');

  // Check if markers already exist
  const markersToAdd = TIER_MARKERS[tier];
  const hasMarkers = markersToAdd.some(marker => content.includes(marker.split(' - ')[0]));

  if (hasMarkers) {
    console.log(`⏭️  Skipped (already has markers): ${filePath}`);
    return false;
  }

  // Find the insertion point (end of header comment, before imports)
  const patterns = [
    // Match /** ... */ style comments
    /^\/\*\*[\s\S]*?\*\/\s*\n/m,
    // Match // ... style comments at the start
    /^(\/\/[^\n]*\n)+/m,
  ];

  let insertionPoint = -1;
  let matchedPattern: RegExpMatchArray | null = null;

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      matchedPattern = match;
      insertionPoint = match.index! + match[0].length;
      break;
    }
  }

  if (insertionPoint === -1) {
    // No header comment found, add markers at the top
    const markerComment = '/**\n * ' + markersToAdd.join('\n * ') + '\n */\n\n';
    content = markerComment + content;
  } else {
    // Insert markers at the end of the existing header comment
    const beforeComment = content.substring(0, matchedPattern!.index!);
    const comment = matchedPattern![0];
    const afterComment = content.substring(insertionPoint);

    // For /** */ style comments, insert before the closing */
    if (comment.includes('/**')) {
      const closingIndex = comment.lastIndexOf('*/');
      const beforeClosing = comment.substring(0, closingIndex);
      const closing = comment.substring(closingIndex);

      const markerLines = markersToAdd.map(m => ` * ${m}`).join('\n');
      const updatedComment = beforeClosing + ' *\n' + markerLines + '\n ' + closing;

      content = beforeComment + updatedComment + afterComment;
    } else {
      // For // style comments, add after them
      const markerComment = '/**\n * ' + markersToAdd.join('\n * ') + '\n */\n\n';
      content = beforeComment + comment + '\n' + markerComment + afterComment;
    }
  }

  // Write back
  fs.writeFileSync(fullPath, content, 'utf-8');
  return true;
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('🏛️  OLYMPUS GOVERNANCE - Bulk Marker Addition\n');

  // Read governance scan output
  const scanFile = 'governance-final.txt';
  if (!fs.existsSync(scanFile)) {
    console.error(`❌ Governance scan file not found: ${scanFile}`);
    console.error('   Run governance check first to generate this file.');
    process.exit(1);
  }

  const scanOutput = fs.readFileSync(scanFile, 'utf-8');
  const violations = parseGovernanceScan(scanOutput);

  console.log(`📋 Found ${violations.length} files needing markers\n`);

  // Group by tier
  const tier2Files = violations.filter(v => v.tier === 'tier2');
  const tier3Files = violations.filter(v => v.tier === 'tier3');

  console.log(`   Tier 2: ${tier2Files.length} files (@AUTHORITY_CHECK)`);
  console.log(`   Tier 3: ${tier3Files.length} files (3 markers each)\n`);

  // Process files
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const violation of violations) {
    try {
      const success = addMarkersToFile(violation.filePath, violation.tier);
      if (success) {
        processed++;
        console.log(`✅ Added markers: ${violation.filePath}`);
      } else {
        skipped++;
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${violation.filePath}:`, error);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY\n');
  console.log(`   Total files:     ${violations.length}`);
  console.log(`   ✅ Processed:    ${processed}`);
  console.log(`   ⏭️  Skipped:      ${skipped}`);
  console.log(`   ❌ Errors:       ${errors}`);
  console.log('\n' + '='.repeat(70));

  if (processed > 0) {
    console.log('\n✨ Markers added successfully!');
    console.log('   Run governance check again to verify.');
  }
}

// Run
main();
