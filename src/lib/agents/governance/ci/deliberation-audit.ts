import * as fs from 'fs';
import * as path from 'path';

interface DeliberationAuditConfig {
  decisionClassMarkers: {
    classA: string[];
    classB: string[];
    classC: string[];
  };
  reasoningArtifactPatterns: {
    decisionBrief: string[];
    reasoningChain: string[];
    evidenceSummary: string[];
    ethicalAssessment: string[];
    actionRecommendation: string[];
  };
  uncertaintyPatterns: string[];
  precautionPatterns: string[];
  escalationPatterns: string[];
  ethicalPatterns: string[];
}

interface DeliberationFinding {
  id: string;
  timestamp: string;
  file: string;
  decisionClass: 'A' | 'B' | 'C' | 'unknown';
  findingType: FindingType;
  severity: 'info' | 'warning' | 'error';
  description: string;
  recommendation: string;
  context: {
    lineNumber?: number;
    matchedPattern?: string;
    evidence?: string[];
  };
}

type FindingType =
  | 'missing_reasoning_artifact'
  | 'missing_ethical_reasoning'
  | 'uncertainty_without_precaution'
  | 'uncertainty_without_escalation'
  | 'missing_escalation'
  | 'insufficient_evidence'
  | 'undeclared_uncertainty'
  | 'class_mismatch';

interface DeliberationAuditArtifact {
  version: string;
  generatedAt: string;
  auditWindow: {
    start: string;
    end: string;
  };
  summary: {
    totalFindings: number;
    byType: Record<FindingType, number>;
    byDecisionClass: {
      classA: number;
      classB: number;
      classC: number;
      unknown: number;
    };
    bySeverity: {
      info: number;
      warning: number;
      error: number;
    };
  };
  findings: DeliberationFinding[];
  patterns: {
    commonFindings: FindingFrequency[];
    classCFindings: FindingFrequency[];
    escalationGaps: string[];
  };
}

interface FindingFrequency {
  findingType: FindingType;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  description: string;
}

export class DeliberationAuditor {
  private config: DeliberationAuditConfig;
  private readonly outputPath: string;
  private readonly version: string = '1.0.0';

  constructor(configPath?: string, outputPath?: string) {
    this.config = this.loadConfig(configPath);
    this.outputPath = outputPath || 'governance-deliberation-audit.json';
  }

  audit(filePaths: string[]): DeliberationAuditArtifact {
    const findings: DeliberationFinding[] = [];
    const now = new Date().toISOString();

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
        continue;
      }

      const fileFindings = this.analyzeFile(filePath);
      findings.push(...fileFindings);
    }

    const artifact = this.createArtifact(findings, now);
    this.validateArtifact(artifact);
    this.emitArtifact(artifact);

    this.printSummary(artifact);

    return artifact;
  }

  private loadConfig(configPath?: string): DeliberationAuditConfig {
    const defaultConfig: DeliberationAuditConfig = {
      decisionClassMarkers: {
        classA: [
          '@class-a',
          '@decision-class-a',
          'DECISION_CLASS_A',
          'Class A:',
          'CLASS A:',
          'INFO_DECISION',
          'INFORMATIONAL_DECISION',
        ],
        classB: [
          '@class-b',
          '@decision-class-b',
          'DECISION_CLASS_B',
          'Class B:',
          'CLASS B:',
          'OPERATIONAL_DECISION',
        ],
        classC: [
          '@class-c',
          '@decision-class-c',
          'DECISION_CLASS_C',
          'Class C:',
          'CLASS C:',
          'CRITICAL_DECISION',
          'IRREVERSIBLE_DECISION',
        ],
      },
      reasoningArtifactPatterns: {
        decisionBrief: ['DECISION_BRIEF', 'Decision Brief:', 'DECISION_BRIEF:', '@decision-brief'],
        reasoningChain: [
          'REASONING_CHAIN',
          'Reasoning Chain:',
          'REASONING_CHAIN:',
          '@reasoning-chain',
        ],
        evidenceSummary: [
          'EVIDENCE_SUMMARY',
          'Evidence Summary:',
          'EVIDENCE_SUMMARY:',
          '@evidence-summary',
        ],
        ethicalAssessment: [
          'ETHICAL_ASSESSMENT',
          'Ethical Assessment:',
          'ETHICAL_ASSESSMENT:',
          '@ethical-assessment',
        ],
        actionRecommendation: [
          'ACTION_RECOMMENDATION',
          'Action Recommendation:',
          'ACTION_RECOMMENDATION:',
          '@action-recommendation',
        ],
      },
      uncertaintyPatterns: [
        'UNCERTAINTY',
        'Uncertainty Declared',
        'UNCERTAINTY DECLARED',
        '@uncertainty',
        'uncertainty:',
      ],
      precautionPatterns: [
        'PRECAUTIONARY',
        'PRECAUTIONARY MODE',
        'precautionary:',
        'APPLY PRECAUTION',
      ],
      escalationPatterns: [
        'ESCALATION',
        'ESCALATION REQUEST',
        'Escalate to human',
        '@escalation',
        'escalation:',
      ],
      ethicalPatterns: [
        'ETHICAL_ASSESSMENT',
        'Ethical Assessment:',
        'ETHICAL_OVERSIGHT',
        'STAKEHOLDER_ANALYSIS',
        'ethical:',
      ],
    };

    if (configPath && fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const userConfig = JSON.parse(content);
        return { ...defaultConfig, ...userConfig };
      } catch (error) {
        console.warn('Could not load deliberation audit config, using defaults');
      }
    }

    return defaultConfig;
  }

  private analyzeFile(filePath: string): DeliberationFinding[] {
    const findings: DeliberationFinding[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const decisionClass = this.detectDecisionClass(content, lines);
    const hasUncertainty = this.detectUncertainty(content);
    const hasPrecaution = this.detectPrecaution(content);
    const hasEscalation = this.detectEscalation(content);
    const reasoningArtifacts = this.detectReasoningArtifacts(content);

    findings.push(
      ...this.checkReasoningArtifacts(filePath, decisionClass, reasoningArtifacts, lines)
    );
    findings.push(
      ...this.checkEthicalReasoning(filePath, decisionClass, reasoningArtifacts, lines)
    );
    findings.push(
      ...this.checkUncertaintyHandling(
        filePath,
        decisionClass,
        hasUncertainty,
        hasPrecaution,
        hasEscalation,
        lines
      )
    );
    findings.push(...this.checkEscalation(filePath, decisionClass, hasEscalation, content, lines));

    return findings;
  }

  private detectDecisionClass(content: string, lines: string[]): 'A' | 'B' | 'C' | 'unknown' {
    for (const marker of this.config.decisionClassMarkers.classC) {
      if (content.includes(marker)) {
        return 'C';
      }
    }

    for (const marker of this.config.decisionClassMarkers.classB) {
      if (content.includes(marker)) {
        return 'B';
      }
    }

    for (const marker of this.config.decisionClassMarkers.classA) {
      if (content.includes(marker)) {
        return 'A';
      }
    }

    const contentLower = content.toLowerCase();

    if (
      contentLower.includes('drop') ||
      contentLower.includes('truncate') ||
      contentLower.includes('delete from') ||
      contentLower.includes('rm -rf') ||
      contentLower.includes('unlinksync')
    ) {
      return 'C';
    }

    if (
      contentLower.includes('db.write') ||
      contentLower.includes('db.insert') ||
      contentLower.includes('db.update') ||
      contentLower.includes('db.delete') ||
      contentLower.includes('enforce(') ||
      contentLower.includes('reject(') ||
      contentLower.includes('block(')
    ) {
      return 'B';
    }

    return 'unknown';
  }

  private detectUncertainty(content: string): boolean {
    return this.config.uncertaintyPatterns.some(pattern => new RegExp(pattern, 'i').test(content));
  }

  private detectPrecaution(content: string): boolean {
    return this.config.precautionPatterns.some(pattern => new RegExp(pattern, 'i').test(content));
  }

  private detectEscalation(content: string): boolean {
    return this.config.escalationPatterns.some(pattern => new RegExp(pattern, 'i').test(content));
  }

  private detectReasoningArtifacts(content: string): Set<string> {
    const artifacts = new Set<string>();

    if (this.hasAnyPattern(content, this.config.reasoningArtifactPatterns.decisionBrief)) {
      artifacts.add('decisionBrief');
    }

    if (this.hasAnyPattern(content, this.config.reasoningArtifactPatterns.reasoningChain)) {
      artifacts.add('reasoningChain');
    }

    if (this.hasAnyPattern(content, this.config.reasoningArtifactPatterns.evidenceSummary)) {
      artifacts.add('evidenceSummary');
    }

    if (this.hasAnyPattern(content, this.config.reasoningArtifactPatterns.ethicalAssessment)) {
      artifacts.add('ethicalAssessment');
    }

    if (this.hasAnyPattern(content, this.config.reasoningArtifactPatterns.actionRecommendation)) {
      artifacts.add('actionRecommendation');
    }

    return artifacts;
  }

  private hasAnyPattern(content: string, patterns: string[]): boolean {
    return patterns.some(pattern => new RegExp(pattern, 'i').test(content));
  }

  private checkReasoningArtifacts(
    filePath: string,
    decisionClass: 'A' | 'B' | 'C' | 'unknown',
    reasoningArtifacts: Set<string>,
    lines: string[]
  ): DeliberationFinding[] {
    const findings: DeliberationFinding[] = [];

    if (decisionClass === 'B' || decisionClass === 'C') {
      const requiredArtifacts = ['decisionBrief', 'reasoningChain', 'evidenceSummary'];
      const missingArtifacts = requiredArtifacts.filter(
        artifact => !reasoningArtifacts.has(artifact)
      );

      if (missingArtifacts.length > 0) {
        findings.push({
          id: this.generateId(),
          timestamp: new Date().toISOString(),
          file: this.getRelativePath(filePath),
          decisionClass,
          findingType: 'missing_reasoning_artifact',
          severity: decisionClass === 'C' ? 'error' : 'warning',
          description: `Missing reasoning artifacts: ${missingArtifacts.join(', ')}`,
          recommendation:
            decisionClass === 'C'
              ? 'Add required reasoning artifacts (Decision Brief, Reasoning Chain, Evidence Summary) before Class C actions'
              : 'Add reasoning artifacts (Decision Brief, Reasoning Chain, Evidence Summary) for Class B actions',
          context: {
            matchedPattern: missingArtifacts.join(', '),
          },
        });
      }
    }

    return findings;
  }

  private checkEthicalReasoning(
    filePath: string,
    decisionClass: 'A' | 'B' | 'C' | 'unknown',
    reasoningArtifacts: Set<string>,
    lines: string[]
  ): DeliberationFinding[] {
    const findings: DeliberationFinding[] = [];

    if (decisionClass === 'C' && !reasoningArtifacts.has('ethicalAssessment')) {
      findings.push({
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        file: this.getRelativePath(filePath),
        decisionClass,
        findingType: 'missing_ethical_reasoning',
        severity: 'error',
        description: 'Class C action missing ethical reasoning artifact',
        recommendation:
          'Add Ethical Assessment artifact with stakeholder analysis, principle evaluation, and conflict resolution',
        context: {
          matchedPattern: 'ETHICAL_ASSESSMENT',
        },
      });
    }

    return findings;
  }

  private checkUncertaintyHandling(
    filePath: string,
    decisionClass: 'A' | 'B' | 'C' | 'unknown',
    hasUncertainty: boolean,
    hasPrecaution: boolean,
    hasEscalation: boolean,
    lines: string[]
  ): DeliberationFinding[] {
    const findings: DeliberationFinding[] = [];

    if (hasUncertainty && !hasPrecaution && !hasEscalation) {
      findings.push({
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        file: this.getRelativePath(filePath),
        decisionClass,
        findingType: 'uncertainty_without_precaution',
        severity: decisionClass === 'C' ? 'error' : 'warning',
        description: 'Uncertainty declared without precautionary measures or escalation',
        recommendation:
          decisionClass === 'C'
            ? 'Apply Precautionary Mode or escalate to human immediately for Class C uncertainty'
            : 'Apply Precautionary Mode or escalate for uncertainty resolution',
        context: {
          matchedPattern: 'UNCERTAINTY',
        },
      });
    }

    if (hasUncertainty && decisionClass === 'C' && !hasEscalation) {
      findings.push({
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        file: this.getRelativePath(filePath),
        decisionClass,
        findingType: 'uncertainty_without_escalation',
        severity: 'error',
        description: 'Class C action with uncertainty not escalated to human',
        recommendation: 'Class C uncertainty must be escalated to human for guidance',
        context: {
          matchedPattern: 'ESCALATION',
        },
      });
    }

    return findings;
  }

  private checkEscalation(
    filePath: string,
    decisionClass: 'A' | 'B' | 'C' | 'unknown',
    hasEscalation: boolean,
    content: string,
    lines: string[]
  ): DeliberationFinding[] {
    const findings: DeliberationFinding[] = [];

    const needsEscalation =
      decisionClass === 'C' ||
      content.includes('HUMAN_OVERRIDE_REQUIRED') ||
      (content.includes('ETHICAL_VETO') && !content.includes('OVERRIDDEN'));

    if (needsEscalation && !hasEscalation) {
      findings.push({
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        file: this.getRelativePath(filePath),
        decisionClass,
        findingType: 'missing_escalation',
        severity: decisionClass === 'C' ? 'error' : 'warning',
        description:
          decisionClass === 'C'
            ? 'Class C action missing escalation to human'
            : 'Action requiring human oversight missing escalation',
        recommendation:
          decisionClass === 'C'
            ? 'All Class C actions must be escalated to human with full context'
            : 'Escalate actions requiring human oversight',
        context: {
          matchedPattern: 'ESCALATION',
        },
      });
    }

    return findings;
  }

  private createArtifact(
    findings: DeliberationFinding[],
    generatedAt: string
  ): DeliberationAuditArtifact {
    const summary = this.calculateSummary(findings);
    const patterns = this.analyzePatterns(findings);

    return {
      version: this.version,
      generatedAt,
      auditWindow: {
        start: this.getEarliestTimestamp(findings),
        end: generatedAt,
      },
      summary,
      findings,
      patterns,
    };
  }

  private calculateSummary(findings: DeliberationFinding[]): DeliberationAuditArtifact['summary'] {
    const summary: DeliberationAuditArtifact['summary'] = {
      totalFindings: findings.length,
      byType: {
        missing_reasoning_artifact: 0,
        missing_ethical_reasoning: 0,
        uncertainty_without_precaution: 0,
        uncertainty_without_escalation: 0,
        missing_escalation: 0,
        insufficient_evidence: 0,
        undeclared_uncertainty: 0,
        class_mismatch: 0,
      },
      byDecisionClass: {
        classA: 0,
        classB: 0,
        classC: 0,
        unknown: 0,
      },
      bySeverity: {
        info: 0,
        warning: 0,
        error: 0,
      },
    };

    for (const finding of findings) {
      summary.byType[finding.findingType]++;
      if (finding.decisionClass === 'unknown') {
        summary.byDecisionClass.unknown++;
      } else {
        summary.byDecisionClass[`class${finding.decisionClass}`]++;
      }
      summary.bySeverity[finding.severity]++;
    }

    return summary;
  }

  private analyzePatterns(findings: DeliberationFinding[]): DeliberationAuditArtifact['patterns'] {
    const findingCounts = new Map<FindingType, DeliberationFinding[]>();

    for (const finding of findings) {
      if (!findingCounts.has(finding.findingType)) {
        findingCounts.set(finding.findingType, []);
      }
      findingCounts.get(finding.findingType)!.push(finding);
    }

    const commonFindings: FindingFrequency[] = Array.from(findingCounts.entries())
      .filter(([_, list]) => list.length > 0)
      .map(([type, list]) => ({
        findingType: type,
        occurrences: list.length,
        firstSeen: list[0].timestamp,
        lastSeen: list[list.length - 1].timestamp,
        description: list[0].description,
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);

    const classCFindings = findings.filter(f => f.decisionClass === 'C');
    const cFindingCounts = new Map<FindingType, number>();

    for (const finding of classCFindings) {
      cFindingCounts.set(finding.findingType, (cFindingCounts.get(finding.findingType) || 0) + 1);
    }

    const classCFrequency: FindingFrequency[] = Array.from(cFindingCounts.entries())
      .map(([type, count]) => {
        const sample = classCFindings.find(f => f.findingType === type)!;
        return {
          findingType: type,
          occurrences: count,
          firstSeen: sample.timestamp,
          lastSeen: classCFindings.filter(f => f.findingType === type).pop()!.timestamp,
          description: sample.description,
        };
      })
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 5);

    const escalationGaps = findings
      .filter(f => f.findingType === 'missing_escalation')
      .map(f => f.file)
      .filter((file, index, self) => self.indexOf(file) === index)
      .slice(0, 5);

    return {
      commonFindings,
      classCFindings: classCFrequency,
      escalationGaps,
    };
  }

  private getEarliestTimestamp(findings: DeliberationFinding[]): string {
    if (findings.length === 0) {
      return new Date().toISOString();
    }

    return findings.reduce((earliest, finding) => {
      return finding.timestamp < earliest ? finding.timestamp : earliest;
    }, findings[0].timestamp);
  }

  private validateArtifact(artifact: DeliberationAuditArtifact): void {
    const errors: string[] = [];

    if (!artifact.version) {
      errors.push('Missing version');
    }

    if (!artifact.generatedAt) {
      errors.push('Missing generatedAt');
    }

    if (!artifact.summary) {
      errors.push('Missing summary');
    }

    if (!Array.isArray(artifact.findings)) {
      errors.push('findings must be an array');
    }

    if (!artifact.patterns) {
      errors.push('Missing patterns');
    }

    if (errors.length > 0) {
      console.error('Deliberation audit artifact validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
  }

  private emitArtifact(artifact: DeliberationAuditArtifact): void {
    const existingArtifact = this.loadExistingArtifact();
    const newArtifact = this.appendFindings(artifact, existingArtifact);

    fs.writeFileSync(this.outputPath, JSON.stringify(newArtifact, null, 2), 'utf-8');
  }

  private loadExistingArtifact(): DeliberationAuditArtifact | null {
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

  private appendFindings(
    newArtifact: DeliberationAuditArtifact,
    existingArtifact: DeliberationAuditArtifact | null
  ): DeliberationAuditArtifact {
    if (!existingArtifact) {
      return newArtifact;
    }

    return {
      ...newArtifact,
      auditWindow: {
        start: existingArtifact.auditWindow.start,
        end: newArtifact.auditWindow.end,
      },
      summary: this.calculateSummary([...existingArtifact.findings, ...newArtifact.findings]),
      findings: [...existingArtifact.findings, ...newArtifact.findings],
      patterns: this.analyzePatterns([...existingArtifact.findings, ...newArtifact.findings]),
    };
  }

  private printSummary(artifact: DeliberationAuditArtifact): void {
    console.log('\n=== Deliberation Audit Summary ===\n');

    console.log('Total Findings:', artifact.summary.totalFindings);
    console.log('Severity Breakdown:');
    console.log(`  Info:     ${artifact.summary.bySeverity.info}`);
    console.log(`  Warning:  ${artifact.summary.bySeverity.warning}`);
    console.log(`  Error:    ${artifact.summary.bySeverity.error}`);

    console.log('\nBy Decision Class:');
    console.log(`  Class A:  ${artifact.summary.byDecisionClass.classA}`);
    console.log(`  Class B:  ${artifact.summary.byDecisionClass.classB}`);
    console.log(`  Class C:  ${artifact.summary.byDecisionClass.classC}`);
    console.log(`  Unknown:  ${artifact.summary.byDecisionClass.unknown}`);

    if (artifact.patterns.commonFindings.length > 0) {
      console.log('\nCommon Findings:');
      artifact.patterns.commonFindings.slice(0, 5).forEach(finding => {
        console.log(`  ${finding.findingType}: ${finding.occurrences}`);
      });
    }

    if (artifact.patterns.escalationGaps.length > 0) {
      console.log('\nEscalation Gaps:');
      artifact.patterns.escalationGaps.forEach(file => {
        console.log(`  - ${file}`);
      });
    }

    console.log('\n=== Audit Complete ===\n');
    console.log('Artifact emitted to:', path.resolve(process.cwd(), this.outputPath));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  }
}

function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllTypeScriptFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const auditor = new DeliberationAuditor();

  if (args.length === 0) {
    console.log('No files specified, scanning src directory...\n');
    const files = getAllTypeScriptFiles('src');
    auditor.audit(files);
  } else {
    auditor.audit(args);
  }
}
