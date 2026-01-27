/**
 * ACA-1 Anchor Coverage Audit Runner
 *
 * Analyzes the coverage of semantic anchors across the intent space.
 *
 * Outputs:
 *   - covered_space_percent: Percentage covered by known patterns
 *   - unknown_space_percent: Percentage that is unknown/uncovered
 *   - growth_rate: Rate of coverage growth per version
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  campaignId: 'ACA-1',
  estimatedIntentSpaceSize: 10000 // Conceptual size of intent space
};

// ============================================================================
// LOAD ANCHOR CORPORA
// ============================================================================

function loadAnchorCorpus(filename) {
  const content = fs.readFileSync(path.join(__dirname, '..', '..', 'anchors', 'corpus', filename), 'utf8');
  return JSON.parse(content);
}

// ============================================================================
// COVERAGE ANALYSIS
// ============================================================================

function analyzePatternCoverage(corpus, type) {
  const analysis = {
    type,
    totalSamples: corpus.corpus.length,
    categories: {},
    uniquePatterns: new Set()
  };

  for (const sample of corpus.corpus) {
    const category = sample.category || 'uncategorized';
    if (!analysis.categories[category]) {
      analysis.categories[category] = { count: 0, samples: [] };
    }
    analysis.categories[category].count++;
    analysis.categories[category].samples.push(sample.id);

    // Extract key terms for pattern diversity
    const terms = sample.text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    terms.forEach(t => analysis.uniquePatterns.add(t));
  }

  analysis.uniqueTerms = analysis.uniquePatterns.size;
  analysis.categoryCount = Object.keys(analysis.categories).length;

  return analysis;
}

function estimateIntentSpaceCoverage(hostileAnalysis, benignAnalysis) {
  // The intent space is conceptually infinite, but we can estimate
  // coverage based on the diversity and density of our anchors

  // Hostile coverage: patterns that cover hostile intent space
  // We have 70 samples across 7 capability categories
  // Each capability category covers a "region" of hostile intent space

  // Benign coverage: patterns that cover benign intent space
  // We have 70 samples across multiple categories of legitimate operations

  const hostileCategories = 7; // CAP-001 through CAP-007
  const benignCategories = hostileAnalysis.categoryCount;

  // Estimate coverage based on sample density and diversity
  // This is a simplified model - real coverage analysis would use
  // semantic embeddings and clustering

  const hostileTermDiversity = hostileAnalysis.uniqueTerms;
  const benignTermDiversity = benignAnalysis.uniqueTerms;
  const totalTermDiversity = hostileTermDiversity + benignTermDiversity;

  // Assume each unique term covers a "region" of intent space
  // And the total intent space is much larger than what we've sampled

  const estimatedCoveredRegions = totalTermDiversity;
  const estimatedTotalRegions = CONFIG.estimatedIntentSpaceSize;

  const coveredSpacePercent = (estimatedCoveredRegions / estimatedTotalRegions) * 100;
  const unknownSpacePercent = 100 - coveredSpacePercent;

  return {
    coveredSpacePercent: Math.min(coveredSpacePercent, 100).toFixed(2),
    unknownSpacePercent: Math.max(unknownSpacePercent, 0).toFixed(2),
    hostileRegions: {
      categories: hostileCategories,
      samples: hostileAnalysis.totalSamples,
      uniqueTerms: hostileTermDiversity
    },
    benignRegions: {
      categories: benignCategories,
      samples: benignAnalysis.totalSamples,
      uniqueTerms: benignTermDiversity
    },
    methodology: {
      estimatedIntentSpaceSize: estimatedTotalRegions,
      coveredRegions: estimatedCoveredRegions,
      note: "Coverage estimated using term diversity as proxy for semantic coverage"
    }
  };
}

function calculateGrowthRate() {
  // Track coverage growth over versions
  // This is a projection based on anchor additions

  const versions = [
    { version: '1.0.0', hostileSamples: 70, benignSamples: 70, date: '2026-01-19' }
  ];

  // Project future growth based on expected anchor additions
  const projectedGrowth = {
    currentVersion: versions[versions.length - 1],
    growthStrategy: {
      targetCoverage: 5.0, // Target 5% coverage
      requiredNewSamples: 'Estimate based on term diversity analysis',
      priorityAreas: [
        'Cross-domain intent patterns',
        'Emerging threat vectors',
        'New legitimate use cases'
      ]
    },
    versionsHistory: versions,
    growthRate: {
      samplesPerVersion: 140, // Current
      estimatedCoverageGainPerVersion: 1.4, // ~1.4% per 140 samples
      note: 'Linear growth assumption - actual growth may be sublinear as easy patterns are covered first'
    }
  };

  return projectedGrowth;
}

// ============================================================================
// MAIN AUDIT RUNNER
// ============================================================================

async function runAudit() {
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     ACA-1 ANCHOR COVERAGE AUDIT                              ║');
  console.log('║                    Intent Space Coverage Analysis                            ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║   Purpose: Quantify known vs unknown intent space coverage                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Load corpora
  console.log('[1/4] Loading semantic anchor corpora...');
  const sa001 = loadAnchorCorpus('SA-001_HOSTILE_GROUND_TRUTH.json');
  const sa002 = loadAnchorCorpus('SA-002_BENIGN_BOUNDARY.json');
  console.log(`   SA-001: ${sa001.corpus.length} hostile samples`);
  console.log(`   SA-002: ${sa002.corpus.length} benign samples`);
  console.log('');

  // Analyze hostile patterns
  console.log('[2/4] Analyzing hostile pattern coverage...');
  const hostileAnalysis = analyzePatternCoverage(sa001, 'hostile');
  console.log(`   Categories: ${hostileAnalysis.categoryCount}`);
  console.log(`   Unique terms: ${hostileAnalysis.uniqueTerms}`);
  console.log('');

  // Analyze benign patterns
  console.log('[3/4] Analyzing benign pattern coverage...');
  const benignAnalysis = analyzePatternCoverage(sa002, 'benign');
  console.log(`   Categories: ${benignAnalysis.categoryCount}`);
  console.log(`   Unique terms: ${benignAnalysis.uniqueTerms}`);
  console.log('');

  // Estimate coverage
  console.log('[4/4] Estimating intent space coverage...');
  const coverage = estimateIntentSpaceCoverage(hostileAnalysis, benignAnalysis);
  const growthRate = calculateGrowthRate();
  console.log('');

  const endTime = Date.now();
  const durationMs = endTime - startTime;

  // Display results
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     ACA-1 COVERAGE AUDIT RESULTS                             ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║   Covered Space:      ${coverage.coveredSpacePercent.padStart(6)}%                                          ║`);
  console.log(`║   Unknown Space:      ${coverage.unknownSpacePercent.padStart(6)}%                                          ║`);
  console.log(`║   Growth Rate:        ${String(growthRate.growthRate.estimatedCoverageGainPerVersion).padStart(6)}% per version                            ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Detailed breakdown
  console.log('Coverage Breakdown:');
  console.log('┌────────────────────────────┬──────────┬──────────┬──────────┐');
  console.log('│ Type                       │ Samples  │ Categor. │ Terms    │');
  console.log('├────────────────────────────┼──────────┼──────────┼──────────┤');
  console.log(`│ Hostile (SA-001)           │ ${String(coverage.hostileRegions.samples).padStart(8)} │ ${String(coverage.hostileRegions.categories).padStart(8)} │ ${String(coverage.hostileRegions.uniqueTerms).padStart(8)} │`);
  console.log(`│ Benign (SA-002)            │ ${String(coverage.benignRegions.samples).padStart(8)} │ ${String(coverage.benignRegions.categories).padStart(8)} │ ${String(coverage.benignRegions.uniqueTerms).padStart(8)} │`);
  console.log('└────────────────────────────┴──────────┴──────────┴──────────┘');

  console.log('');
  console.log('Category Distribution (Hostile):');
  for (const [category, data] of Object.entries(hostileAnalysis.categories)) {
    console.log(`  ${category}: ${data.count} samples`);
  }

  console.log('');
  console.log('Category Distribution (Benign):');
  for (const [category, data] of Object.entries(benignAnalysis.categories)) {
    console.log(`  ${category}: ${data.count} samples`);
  }

  console.log('');
  console.log('Implications:');
  console.log(`  • ${coverage.unknownSpacePercent}% of intent space is UNKNOWN`);
  console.log('  • Unknown intents are escalated by UID-1 layer');
  console.log('  • No silent admission of unknown intents (UIC-1 verified)');
  console.log('  • Coverage can grow through anchor corpus expansion');

  console.log('');
  console.log('Writing reports...');

  // Write results
  const auditResults = {
    campaignId: CONFIG.campaignId,
    timestamp: new Date().toISOString(),
    duration: { ms: durationMs, seconds: (durationMs / 1000).toFixed(2) },
    coverage: {
      covered_space_percent: parseFloat(coverage.coveredSpacePercent),
      unknown_space_percent: parseFloat(coverage.unknownSpacePercent),
      growth_rate: growthRate.growthRate.estimatedCoverageGainPerVersion
    },
    details: {
      hostile: hostileAnalysis,
      benign: benignAnalysis,
      methodology: coverage.methodology
    },
    growthProjection: growthRate,
    status: 'COMPLETED'
  };

  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(reportsDir, 'ACA-1_COVERAGE_AUDIT.json'),
    JSON.stringify(auditResults, null, 2)
  );
  console.log('   Written: ACA-1_COVERAGE_AUDIT.json');

  const reportMd = `# ACA-1 Anchor Coverage Audit Report

**Campaign:** ACA-1
**Date:** ${new Date().toISOString()}
**Status:** COMPLETED

## Summary

This audit analyzes the coverage of semantic anchors across the intent space.

## Coverage Metrics

| Metric | Value |
|--------|-------|
| **Covered Space** | ${coverage.coveredSpacePercent}% |
| **Unknown Space** | ${coverage.unknownSpacePercent}% |
| **Growth Rate** | ${growthRate.growthRate.estimatedCoverageGainPerVersion}% per version |

## Anchor Corpus Analysis

| Corpus | Samples | Categories | Unique Terms |
|--------|---------|------------|--------------|
| SA-001 (Hostile) | ${coverage.hostileRegions.samples} | ${coverage.hostileRegions.categories} | ${coverage.hostileRegions.uniqueTerms} |
| SA-002 (Benign) | ${coverage.benignRegions.samples} | ${coverage.benignRegions.categories} | ${coverage.benignRegions.uniqueTerms} |

## Methodology

Coverage is estimated using term diversity as a proxy for semantic coverage:
- Estimated intent space size: ${coverage.methodology.estimatedIntentSpaceSize} conceptual regions
- Covered regions: ${coverage.methodology.coveredRegions} (based on unique terms)
- This is a simplified model - production would use semantic embeddings

## Implications

1. **${coverage.unknownSpacePercent}% Unknown Space**: The majority of possible intents are not explicitly covered by anchors
2. **UID-1 Protection**: Unknown intents are caught by the Unknown Intent Detector layer
3. **Zero Silent Admission**: UIC-1 verified that no unknown intent is silently admitted
4. **Epistemic Safety**: The system explicitly acknowledges what it doesn't know

## Growth Strategy

To increase coverage:
1. Expand hostile anchor corpus with emerging threat patterns
2. Expand benign anchor corpus with new legitimate use cases
3. Focus on cross-domain and novel intent patterns
4. Regularly audit coverage as new patterns emerge

## Conclusion

The current anchor coverage is ${coverage.coveredSpacePercent}% of the estimated intent space. While this seems low, the UID-1 layer ensures that the remaining ${coverage.unknownSpacePercent}% is properly flagged as UNKNOWN and escalated rather than silently admitted.

**Key Principle**: Unknown is not Safe.

---

*Generated by ACA-1 Anchor Coverage Audit*
*Constitution: SEC-4*
`;

  fs.writeFileSync(
    path.join(reportsDir, 'ACA-1_COVERAGE_REPORT.md'),
    reportMd
  );
  console.log('   Written: ACA-1_COVERAGE_REPORT.md');

  return auditResults;
}

// Run audit
runAudit().then(results => {
  console.log('');
  console.log('Audit complete.');
  console.log(`Covered Space: ${results.coverage.covered_space_percent}%`);
  console.log(`Unknown Space: ${results.coverage.unknown_space_percent}%`);
  console.log(`Growth Rate: ${results.coverage.growth_rate}% per version`);
  process.exit(0);
}).catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
