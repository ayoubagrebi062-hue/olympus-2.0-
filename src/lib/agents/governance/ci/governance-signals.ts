import * as fs from 'fs';
import * as path from 'path';

interface GovernanceSignal {
  timestamp: string;
  source: string;
  signalType: SignalType;
  data: SignalData;
}

type SignalType =
  | 'tier_violation'
  | 'ethical_veto'
  | 'human_override'
  | 'ambiguity_failure'
  | 'repeated_pattern';

interface SignalData {
  file?: string;
  tier?: string;
  pattern?: string;
  count?: number;
  violationCount?: number;
  description?: string;
}

interface SignalsArtifact {
  version: string;
  generatedAt: string;
  observationWindow: {
    start: string;
    end: string;
  };
  signals: GovernanceSignal[];
  summary: {
    totalSignals: number;
    byType: Record<SignalType, number>;
    humanOverrideCount: number;
    tierViolationCount: number;
    ethicalVetoCount: number;
    ambiguityFailureCount: number;
    repeatedPatternCount: number;
  };
  patterns: {
    mostCommon: PatternFrequency[];
    humanOverrideHotspots: string[];
    tierViolationHotspots: string[];
  };
}

interface PatternFrequency {
  pattern: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
}

interface TierEnforcementReport {
  totalFiles: number;
  passedFiles: number;
  failedFiles: number;
  violations: Array<{
    filePath: string;
    tier: string | null;
    violation: string;
    severity: 'error' | 'warning';
  }>;
  summary: {
    tier1: number;
    tier2: number;
    tier3: number;
    unclassified: number;
  };
}

interface LedgerEnforcementReport {
  blockedOperations: number;
  authorizedOperations: number;
  ethicalVetos: number;
  humanOverrides: number;
  violations: Array<{
    operation: string;
    reason: string;
    overridden: boolean;
  }>;
}

interface AuthorityRegistry {
  version: string;
  authorities: Array<{
    id: string;
    scope: string[];
    maxOverrideCount: number;
  }>;
}

export class GovernanceSignalAggregator {
  private readonly outputPath: string;
  private readonly version: string = '1.0.0';

  constructor(outputPath: string = 'governance-signals.json') {
    this.outputPath = outputPath;
  }

  aggregate(
    tierReport: TierEnforcementReport,
    ledgerReport: LedgerEnforcementReport,
    authorityRegistry: AuthorityRegistry
  ): SignalsArtifact {
    const now = new Date().toISOString();
    const signals: GovernanceSignal[] = [];

    signals.push(...this.extractTierViolationSignals(tierReport));
    signals.push(...this.extractEthicalVetoSignals(ledgerReport));
    signals.push(...this.extractHumanOverrideSignals(ledgerReport, authorityRegistry));
    signals.push(...this.extractAmbiguityFailureSignals(tierReport));
    signals.push(...this.extractRepeatedPatternSignals(tierReport));

    const artifact: SignalsArtifact = {
      version: this.version,
      generatedAt: now,
      observationWindow: {
        start: this.getEarliestTimestamp(signals),
        end: now,
      },
      signals,
      summary: this.calculateSummary(signals),
      patterns: this.analyzePatterns(signals),
    };

    this.validateArtifact(artifact);
    this.emitArtifact(artifact);

    return artifact;
  }

  private extractTierViolationSignals(report: TierEnforcementReport): GovernanceSignal[] {
    const signals: GovernanceSignal[] = [];
    const now = new Date().toISOString();

    for (const violation of report.violations) {
      if (violation.severity === 'error' && violation.violation.includes('MUST NOT')) {
        signals.push({
          timestamp: now,
          source: 'tier-enforcement',
          signalType: 'tier_violation',
          data: {
            file: violation.filePath,
            tier: violation.tier || 'unclassified',
            description: violation.violation,
          },
        });
      }
    }

    return signals;
  }

  private extractEthicalVetoSignals(report: LedgerEnforcementReport): GovernanceSignal[] {
    const signals: GovernanceSignal[] = [];
    const now = new Date().toISOString();

    for (const violation of report.violations) {
      if (violation.reason.toLowerCase().includes('ethical') && !violation.overridden) {
        signals.push({
          timestamp: now,
          source: 'ledger-enforcement',
          signalType: 'ethical_veto',
          data: {
            description: violation.reason,
          },
        });
      }
    }

    return signals;
  }

  private extractHumanOverrideSignals(
    report: LedgerEnforcementReport,
    authorityRegistry: AuthorityRegistry
  ): GovernanceSignal[] {
    const signals: GovernanceSignal[] = [];
    const now = new Date().toISOString();

    let overrideCount = 0;

    for (const violation of report.violations) {
      if (violation.overridden) {
        overrideCount++;
      }
    }

    if (overrideCount > 0) {
      signals.push({
        timestamp: now,
        source: 'ledger-enforcement',
        signalType: 'human_override',
        data: {
          count: overrideCount,
          description: `${overrideCount} human overrides detected`,
        },
      });
    }

    return signals;
  }

  private extractAmbiguityFailureSignals(report: TierEnforcementReport): GovernanceSignal[] {
    const signals: GovernanceSignal[] = [];
    const now = new Date().toISOString();

    for (const violation of report.violations) {
      if (
        violation.violation.includes('ambiguity') ||
        violation.violation.includes('mixed tier behaviors') ||
        violation.violation.includes('unclassified')
      ) {
        signals.push({
          timestamp: now,
          source: 'tier-enforcement',
          signalType: 'ambiguity_failure',
          data: {
            file: violation.filePath,
            description: violation.violation,
          },
        });
      }
    }

    return signals;
  }

  private extractRepeatedPatternSignals(report: TierEnforcementReport): GovernanceSignal[] {
    const signals: GovernanceSignal[] = [];
    const now = new Date().toISOString();
    const patternCounts = new Map<string, number>();

    for (const violation of report.violations) {
      const pattern = violation.violation;
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
    }

    for (const [pattern, count] of patternCounts.entries()) {
      if (count >= 3) {
        signals.push({
          timestamp: now,
          source: 'tier-enforcement',
          signalType: 'repeated_pattern',
          data: {
            pattern,
            count,
            description: `Pattern observed ${count} times`,
          },
        });
      }
    }

    return signals;
  }

  private calculateSummary(signals: GovernanceSignal[]): SignalsArtifact['summary'] {
    const summary: SignalsArtifact['summary'] = {
      totalSignals: signals.length,
      byType: {
        tier_violation: 0,
        ethical_veto: 0,
        human_override: 0,
        ambiguity_failure: 0,
        repeated_pattern: 0,
      },
      humanOverrideCount: 0,
      tierViolationCount: 0,
      ethicalVetoCount: 0,
      ambiguityFailureCount: 0,
      repeatedPatternCount: 0,
    };

    for (const signal of signals) {
      summary.byType[signal.signalType]++;

      switch (signal.signalType) {
        case 'tier_violation':
          summary.tierViolationCount++;
          break;
        case 'ethical_veto':
          summary.ethicalVetoCount++;
          break;
        case 'human_override':
          summary.humanOverrideCount += signal.data.count || 1;
          break;
        case 'ambiguity_failure':
          summary.ambiguityFailureCount++;
          break;
        case 'repeated_pattern':
          summary.repeatedPatternCount++;
          break;
      }
    }

    return summary;
  }

  private analyzePatterns(signals: GovernanceSignal[]): SignalsArtifact['patterns'] {
    const patternCounts = new Map<string, number>();
    const fileCounts = new Map<string, number>();
    const tierCounts = new Map<string, number>();

    for (const signal of signals) {
      if (signal.data.pattern) {
        patternCounts.set(signal.data.pattern, (patternCounts.get(signal.data.pattern) || 0) + 1);
      }

      if (signal.data.file) {
        fileCounts.set(signal.data.file, (fileCounts.get(signal.data.file) || 0) + 1);
      }

      if (signal.data.tier) {
        tierCounts.set(signal.data.tier, (tierCounts.get(signal.data.tier) || 0) + 1);
      }
    }

    const mostCommon: PatternFrequency[] = Array.from(patternCounts.entries())
      .map(([pattern, occurrences]) => ({
        pattern,
        occurrences,
        firstSeen: signals.find(s => s.data.pattern === pattern)?.timestamp || '',
        lastSeen: signals.filter(s => s.data.pattern === pattern).pop()?.timestamp || '',
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);

    const humanOverrideHotspots: string[] = Array.from(fileCounts.entries())
      .filter(([_, count]) => count > 2)
      .map(([file, _]) => file)
      .slice(0, 5);

    const tierViolationHotspots: string[] = Array.from(tierCounts.entries())
      .map(([tier, count]) => `${tier}: ${count}`)
      .slice(0, 5);

    return {
      mostCommon,
      humanOverrideHotspots,
      tierViolationHotspots,
    };
  }

  private getEarliestTimestamp(signals: GovernanceSignal[]): string {
    if (signals.length === 0) {
      return new Date().toISOString();
    }

    return signals.reduce((earliest, signal) => {
      return signal.timestamp < earliest ? signal.timestamp : earliest;
    }, signals[0].timestamp);
  }

  private validateArtifact(artifact: SignalsArtifact): void {
    const errors: string[] = [];

    if (!artifact.version) {
      errors.push('Missing version');
    }

    if (!artifact.generatedAt) {
      errors.push('Missing generatedAt');
    }

    if (!artifact.observationWindow) {
      errors.push('Missing observationWindow');
    }

    if (!artifact.summary) {
      errors.push('Missing summary');
    }

    if (!artifact.patterns) {
      errors.push('Missing patterns');
    }

    if (!Array.isArray(artifact.signals)) {
      errors.push('signals must be an array');
    }

    if (artifact.summary.byType && typeof artifact.summary.byType !== 'object') {
      errors.push('byType must be an object');
    }

    if (errors.length > 0) {
      console.error('Signal schema validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
  }

  private emitArtifact(artifact: SignalsArtifact): void {
    const existingArtifact = this.loadExistingArtifact();
    const newArtifact = this.appendSignals(artifact, existingArtifact);

    fs.writeFileSync(this.outputPath, JSON.stringify(newArtifact, null, 2), 'utf-8');
  }

  private loadExistingArtifact(): SignalsArtifact | null {
    if (!fs.existsSync(this.outputPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.outputPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private appendSignals(
    newArtifact: SignalsArtifact,
    existingArtifact: SignalsArtifact | null
  ): SignalsArtifact {
    if (!existingArtifact) {
      return newArtifact;
    }

    return {
      ...newArtifact,
      observationWindow: {
        start: existingArtifact.observationWindow.start,
        end: newArtifact.observationWindow.end,
      },
      signals: [...existingArtifact.signals, ...newArtifact.signals],
      summary: this.calculateSummary([...existingArtifact.signals, ...newArtifact.signals]),
      patterns: this.analyzePatterns([...existingArtifact.signals, ...newArtifact.signals]),
    };
  }
}

function loadGovernanceReports(): {
  tierReport: TierEnforcementReport | null;
  ledgerReport: LedgerEnforcementReport | null;
  authorityRegistry: AuthorityRegistry | null;
} {
  const tierReportPath = path.join('outputs', 'tier-enforcement-report.json');
  const ledgerReportPath = path.join('outputs', 'ledger-enforcement-report.json');
  const authorityPath = path.join('contracts', 'authority-registry.json');

  let tierReport: TierEnforcementReport | null = null;
  let ledgerReport: LedgerEnforcementReport | null = null;
  let authorityRegistry: AuthorityRegistry | null = null;

  if (fs.existsSync(tierReportPath)) {
    try {
      const content = fs.readFileSync(tierReportPath, 'utf-8');
      tierReport = JSON.parse(content);
    } catch {
      console.warn('Could not load tier enforcement report');
    }
  }

  if (fs.existsSync(ledgerReportPath)) {
    try {
      const content = fs.readFileSync(ledgerReportPath, 'utf-8');
      ledgerReport = JSON.parse(content);
    } catch {
      console.warn('Could not load ledger enforcement report');
    }
  }

  if (fs.existsSync(authorityPath)) {
    try {
      const content = fs.readFileSync(authorityPath, 'utf-8');
      authorityRegistry = JSON.parse(content);
    } catch {
      console.warn('Could not load authority registry');
    }
  }

  return { tierReport, ledgerReport, authorityRegistry };
}

if (require.main === module) {
  const aggregator = new GovernanceSignalAggregator();

  const { tierReport, ledgerReport, authorityRegistry } = loadGovernanceReports();

  if (!tierReport || !ledgerReport || !authorityRegistry) {
    console.log('Governance signals: Insufficient data for aggregation');
    console.log('  - tier enforcement report:', tierReport ? 'loaded' : 'missing');
    console.log('  - ledger enforcement report:', ledgerReport ? 'loaded' : 'missing');
    console.log('  - authority registry:', authorityRegistry ? 'loaded' : 'missing');
    process.exit(0);
  }

  const artifact = aggregator.aggregate(tierReport, ledgerReport, authorityRegistry);

  console.log('Governance signals aggregated:');
  console.log(`  Total signals: ${artifact.summary.totalSignals}`);
  console.log(`  Tier violations: ${artifact.summary.tierViolationCount}`);
  console.log(`  Ethical vetos: ${artifact.summary.ethicalVetoCount}`);
  console.log(`  Human overrides: ${artifact.summary.humanOverrideCount}`);
  console.log(`  Ambiguity failures: ${artifact.summary.ambiguityFailureCount}`);
  console.log(`  Repeated patterns: ${artifact.summary.repeatedPatternCount}`);
  console.log('\nArtifact emitted to:', path.resolve(process.cwd(), aggregator['outputPath']));
}
