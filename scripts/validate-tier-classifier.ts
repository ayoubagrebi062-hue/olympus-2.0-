/**
 * Tier Classifier Validation Script
 *
 * Measures:
 * - Total violations detected
 * - False positive rate (estimated)
 * - Performance (scan time)
 * - Memory usage
 */

import * as fs from 'fs';
import * as path from 'path';
import { TierClassifier } from '../src/lib/agents/governance/ci/tier-classifier';
import type { FileAnalysis } from '../src/lib/agents/governance/ci/tier-classifier';

interface ValidationReport {
  timestamp: string;
  scanStats: {
    filesScanned: number;
    violationsFound: number;
    scanDurationMs: number;
    memoryUsedMB: number;
  };
  violationBreakdown: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
  suspectedFalsePositives: {
    count: number;
    percentage: number;
    examples: Array<{
      file: string;
      tier: string;
      reason: string;
      confidence: number;
    }>;
  };
  performance: {
    avgTimePerFile: number;
    filesPerSecond: number;
  };
  topViolations: Array<{
    file: string;
    tier: string;
    violations: string[];
    confidence: number;
  }>;
}

function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'build') {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function isSuspectedFalsePositive(analysis: FileAnalysis): boolean {
  // Low confidence = likely false positive
  if (analysis.confidence < 0.5) {
    return true;
  }

  // Violations in test files
  if (analysis.filePath.includes('test') || analysis.filePath.includes('__tests__')) {
    return true;
  }

  // Violations in .d.ts files
  if (analysis.filePath.endsWith('.d.ts')) {
    return true;
  }

  // Violations with no line numbers (couldn't locate actual code)
  if (analysis.violations.length > 0 && analysis.lineNumbers.length === 0) {
    return true;
  }

  return false;
}

async function validateTierClassifier(): Promise<ValidationReport> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  console.log('🔍 Starting tier classifier validation...\n');

  const srcPath = path.join(process.cwd(), 'src');
  const files = getAllTsFiles(srcPath);

  console.log(`Found ${files.length} TypeScript files to scan\n`);

  const classifier = new TierClassifier();
  const results: FileAnalysis[] = [];

  let filesScanned = 0;
  for (const file of files) {
    try {
      const analysis = classifier.analyzeFile(file);
      if (analysis.violations.length > 0 || analysis.detectedTier) {
        results.push(analysis);
      }
      filesScanned++;

      // Progress indicator every 100 files
      if (filesScanned % 100 === 0) {
        console.log(`  Scanned ${filesScanned}/${files.length} files...`);
      }
    } catch (error) {
      // Skip files that can't be analyzed
      console.error(`  ⚠ Skipped ${file}: ${(error as Error).message}`);
    }
  }

  const endTime = Date.now();
  const endMemory = process.memoryUsage().heapUsed;

  // Analyze violations
  const tier1 = results.filter(r => r.detectedTier === 'tier1').length;
  const tier2 = results.filter(r => r.detectedTier === 'tier2').length;
  const tier3 = results.filter(r => r.detectedTier === 'tier3').length;

  // Detect suspected false positives
  const suspectedFP = results.filter(isSuspectedFalsePositive);

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    scanStats: {
      filesScanned: files.length,
      violationsFound: results.length,
      scanDurationMs: endTime - startTime,
      memoryUsedMB: (endMemory - startMemory) / 1024 / 1024,
    },
    violationBreakdown: { tier1, tier2, tier3 },
    suspectedFalsePositives: {
      count: suspectedFP.length,
      percentage: results.length > 0 ? (suspectedFP.length / results.length) * 100 : 0,
      examples: suspectedFP.slice(0, 10).map(fp => ({
        file: fp.filePath.replace(process.cwd(), ''),
        tier: fp.detectedTier || 'unknown',
        reason: fp.violations.join(', ') || 'No specific violations',
        confidence: fp.confidence,
      })),
    },
    performance: {
      avgTimePerFile: (endTime - startTime) / files.length,
      filesPerSecond: files.length / ((endTime - startTime) / 1000),
    },
    topViolations: results
      .filter(r => r.violations.length > 0)
      .sort((a, b) => b.violations.length - a.violations.length)
      .slice(0, 10)
      .map(r => ({
        file: r.filePath.replace(process.cwd(), ''),
        tier: r.detectedTier || 'unknown',
        violations: r.violations,
        confidence: r.confidence,
      })),
  };

  return report;
}

// Run validation
validateTierClassifier()
  .then(report => {
    console.log('\n📊 VALIDATION REPORT\n');
    console.log('Files Scanned:', report.scanStats.filesScanned);
    console.log('Violations Found:', report.scanStats.violationsFound);
    console.log('  - Tier 1:', report.violationBreakdown.tier1);
    console.log('  - Tier 2:', report.violationBreakdown.tier2);
    console.log('  - Tier 3:', report.violationBreakdown.tier3);
    console.log(
      '\nSuspected False Positives:',
      report.suspectedFalsePositives.count,
      `(${report.suspectedFalsePositives.percentage.toFixed(1)}%)`
    );

    if (report.suspectedFalsePositives.examples.length > 0) {
      console.log('\nExample False Positives:');
      report.suspectedFalsePositives.examples.slice(0, 5).forEach((fp, i) => {
        console.log(`  ${i + 1}. ${fp.file}`);
        console.log(`     Tier: ${fp.tier}, Confidence: ${(fp.confidence * 100).toFixed(0)}%`);
        console.log(`     Reason: ${fp.reason}`);
      });
    }

    console.log('\nPerformance:');
    console.log('  - Scan Time:', report.scanStats.scanDurationMs, 'ms');
    console.log('  - Files/sec:', report.performance.filesPerSecond.toFixed(1));
    console.log('  - Memory:', report.scanStats.memoryUsedMB.toFixed(1), 'MB');

    console.log('\nTop Violations:');
    report.topViolations.slice(0, 5).forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.file}`);
      console.log(
        `     Tier: ${v.tier}, Violations: ${v.violations.length}, Confidence: ${(v.confidence * 100).toFixed(0)}%`
      );
    });

    // Save report
    fs.writeFileSync('validation-report-baseline.json', JSON.stringify(report, null, 2));

    console.log('\n✅ Report saved to validation-report-baseline.json');

    // Decision criteria
    console.log('\n🎯 DECISION CRITERIA:\n');
    if (report.suspectedFalsePositives.percentage > 50) {
      console.log('❌ HIGH false positive rate (>50%) → UPGRADE STRONGLY RECOMMENDED');
    } else if (report.suspectedFalsePositives.percentage > 20) {
      console.log('⚠️  MEDIUM false positive rate (20-50%) → UPGRADE RECOMMENDED');
    } else if (report.suspectedFalsePositives.percentage > 10) {
      console.log('⚠️  LOW false positive rate (10-20%) → UPGRADE OPTIONAL');
    } else {
      console.log('✅ MINIMAL false positive rate (<10%) → UPGRADE NOT NEEDED');
    }
  })
  .catch(error => {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  });
