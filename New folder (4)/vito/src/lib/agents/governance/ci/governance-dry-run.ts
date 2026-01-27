import * as fs from 'fs';
import * as path from 'path';
import { DecisionBindingGate } from './decision-binding';
import { DecisionFinalizationGate } from './decision-finalization';
import { DeliberationAuditor } from './deliberation-audit';
import { CapabilityLearningExtractor } from './capability-learning';
import { GovernanceObservatory } from './governance-observatory';

interface GovernancePhase {
  version: string;
  currentPhase: 'OBSERVATION_ONLY' | 'SCOPED_ENFORCEMENT' | 'FULL_ENFORCEMENT';
  phases: {
    OBSERVATION_ONLY: {
      description: string;
      blockingModules: string[];
      observationModules: string[];
    };
    SCOPED_ENFORCEMENT: {
      description: string;
      blockingModules: string[];
      scope: string;
    };
    FULL_ENFORCEMENT: {
      description: string;
      blockingModules: string | string[];
    };
  };
}

interface DryRunReport {
  version: string;
  timestamp: string;
  governancePhase: string;
  governanceVerdict: 'APPROVED' | 'APPROVED_WITH_WARNINGS' | 'BLOCKED';
  summary: {
    totalModules: number;
    passedModules: number;
    failedModules: number;
    warningModules: number;
    downgradedFindingsCount: number;
  };
  enforcementScope: {
    blockingModules: string[];
    observationModules: string[];
  };
  modules: ModuleReport[];
  blockingFailures: string[];
  nonBlockingObservations: string[];
}

interface ModuleReport {
  moduleName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  executionTime: number;
  summary: any;
  errors: string[];
  warnings: string[];
}

interface DecisionSchema {
  decisions: Array<{
    id: string;
    decisionClass?: string;
    class?: string;
  }>;
}

class GovernanceDryRun {
  private readonly version = '2.0.0';
  private readonly reportPath: string;
  private readonly phasePath: string;
  private governancePhase: GovernancePhase | null = null;

  constructor(reportPath?: string, phasePath?: string) {
    this.reportPath = reportPath || 'data/governance/governance-dry-run-report.json';
    this.phasePath = phasePath || 'contracts/governance-phase.json';
    this.loadGovernancePhase();
  }

  private loadGovernancePhase(): void {
    if (!fs.existsSync(this.phasePath)) {
      console.warn(`Governance phase config not found: ${this.phasePath}`);
      console.warn('Defaulting to OBSERVATION_ONLY phase');
      this.governancePhase = this.getDefaultPhase();
      return;
    }

    try {
      const content = fs.readFileSync(this.phasePath, 'utf-8');
      this.governancePhase = JSON.parse(content);
    } catch (error) {
      console.error('Failed to load governance phase config:', error);
      console.warn('Defaulting to OBSERVATION_ONLY phase');
      this.governancePhase = this.getDefaultPhase();
    }
  }

  private getDefaultPhase(): GovernancePhase {
    return {
      version: '1.0.0',
      currentPhase: 'OBSERVATION_ONLY',
      phases: {
        OBSERVATION_ONLY: {
          description: 'No blocking except schema/contract violations',
          blockingModules: ['decision-binding', 'decision-finalization'],
          observationModules: ['deliberation-audit', 'reasoning-quality-audit', 'capability-learning', 'governance-observatory']
        },
        SCOPED_ENFORCEMENT: {
          description: 'Block only on new/modified files',
          blockingModules: ['decision-binding', 'decision-finalization', 'deliberation-audit'],
          scope: 'git-diff'
        },
        FULL_ENFORCEMENT: {
          description: 'All governance rules enforced',
          blockingModules: 'ALL'
        }
      }
    };
  }

  private isBlockingModule(moduleName: string): boolean {
    if (!this.governancePhase) {
      return true;
    }

    const currentPhase = this.governancePhase.phases[this.governancePhase.currentPhase];
    
    if (currentPhase.blockingModules === 'ALL') {
      return true;
    }

    return currentPhase.blockingModules.includes(moduleName);
  }

  private isObservationModule(moduleName: string): boolean {
    if (!this.governancePhase) {
      return false;
    }

    const currentPhase = this.governancePhase.phases[this.governancePhase.currentPhase];
    
    if (currentPhase.blockingModules === 'ALL') {
      return false;
    }

    const blockingModules = Array.isArray(currentPhase.blockingModules) ? currentPhase.blockingModules : [];
    return !blockingModules.includes(moduleName);
  }

  private getObservationModules(): string[] {
    if (!this.governancePhase) {
      return [];
    }

    const currentPhase = this.governancePhase.phases[this.governancePhase.currentPhase];
    
    if (currentPhase.blockingModules === 'ALL') {
      return [];
    }

    if ('observationModules' in currentPhase) {
      return currentPhase.observationModules || [];
    }

    return [];
  }

  run(): DryRunReport {
    const startTime = Date.now();
    console.log('\n=== Governance Dry Run ===');
    console.log('Starting CI pipeline validation...\n');
    console.log(`Governance Phase: ${this.governancePhase?.currentPhase || 'UNKNOWN'}`);
    console.log(`Phase Description: ${this.governancePhase?.phases[this.governancePhase.currentPhase].description || 'Unknown'}\n`);

    const modules: ModuleReport[] = [];

    try {
      modules.push(this.runDecisionBinding());
      modules.push(this.runDecisionFinalization());
      modules.push(this.runDeliberationAudit());
      modules.push(this.runReasoningQualityAudit());
      modules.push(this.runCapabilityLearning());
      modules.push(this.runGovernanceObservatory());
    } catch (error) {
      console.error('Unexpected error during dry run:', error);
      process.exit(1);
    }

    const report = this.generateReport(modules);
    this.emitReport(report);
    this.printReport(report);

    const exitCode = this.determineExitCode(report);
    console.log(`\nGovernance Verdict: ${report.governanceVerdict}`);
    console.log(`Exit Code: ${exitCode}\n`);

    process.exit(exitCode);
  }

  private runDecisionBinding(): ModuleReport {
    const startTime = Date.now();
    const moduleName = 'decision-binding';
    console.log(`[1/6] Running ${moduleName}...`);

    const report: ModuleReport = {
      moduleName,
      status: 'PASS',
      executionTime: 0,
      summary: {},
      errors: [],
      warnings: []
    };

    try {
      const bindingGate = new DecisionBindingGate('contracts/decision-schema.json');
      const allTsFiles = this.getAllTypeScriptFiles('src');

      let bindingReport;
      try {
        bindingReport = bindingGate.enforce(allTsFiles);
        report.summary = bindingReport;
        report.executionTime = Date.now() - startTime;
        report.status = bindingReport.failedFiles > 0 ? 'FAIL' : 'PASS';
      } catch (error) {
        if (error instanceof Error && (error as any).code === 'exit') {
          report.status = 'FAIL';
          report.errors.push('Decision binding enforcement failed - see module output above');
        } else {
          throw error;
        }
      }

      console.log(`${moduleName}: ${report.status} (${report.executionTime}ms)`);
    } catch (error) {
      report.status = 'FAIL';
      report.errors.push(error instanceof Error ? error.message : String(error));
      report.executionTime = Date.now() - startTime;
      console.log(`${moduleName}: FAIL (${report.executionTime}ms)`);
    }

    return report;
  }

  private runDecisionFinalization(): ModuleReport {
    const startTime = Date.now();
    const moduleName = 'decision-finalization';
    console.log(`[2/6] Running ${moduleName}...`);

    const report: ModuleReport = {
      moduleName,
      status: 'PASS',
      executionTime: 0,
      summary: {},
      errors: [],
      warnings: []
    };

    try {
      const finalizationGate = new DecisionFinalizationGate('data/decisions/decision-log.json');

      let finalizationReport;
      try {
        finalizationReport = finalizationGate.enforce();
        report.summary = finalizationReport;
        report.executionTime = Date.now() - startTime;

        if (finalizationReport.violations.some(v => v.severity === 'error')) {
          report.status = 'FAIL';
          report.errors = finalizationReport.violations
            .filter(v => v.severity === 'error')
            .map(v => `${v.decisionId}: ${v.description}`);
        } else if (finalizationReport.violations.some(v => v.severity === 'warning')) {
          report.status = 'WARNING';
          report.warnings = finalizationReport.violations
            .filter(v => v.severity === 'warning')
            .map(v => `${v.decisionId}: ${v.description}`);
        }
      } catch (error) {
        if (error instanceof Error && (error as any).code === 'exit') {
          report.status = 'FAIL';
          report.errors.push('Decision finalization enforcement failed - see module output above');
        } else {
          throw error;
        }
      }

      console.log(`${moduleName}: ${report.status} (${report.executionTime}ms)`);
    } catch (error) {
      report.status = 'FAIL';
      report.errors.push(error instanceof Error ? error.message : String(error));
      report.executionTime = Date.now() - startTime;
      console.log(`${moduleName}: FAIL (${report.executionTime}ms)`);
    }

    return report;
  }

  private runDeliberationAudit(): ModuleReport {
    const startTime = Date.now();
    const moduleName = 'deliberation-audit';
    console.log(`[3/6] Running ${moduleName}...`);

    const report: ModuleReport = {
      moduleName,
      status: 'PASS',
      executionTime: 0,
      summary: {},
      errors: [],
      warnings: []
    };

    try {
      const auditor = new DeliberationAuditor();
      const allTsFiles = this.getAllTypeScriptFiles('src');

      let auditArtifact;
      try {
        auditArtifact = auditor.audit(allTsFiles);
        report.summary = auditArtifact.summary;
        report.executionTime = Date.now() - startTime;

        if (auditArtifact.summary.bySeverity.error > 0) {
          report.status = 'FAIL';
          report.errors.push(`${auditArtifact.summary.bySeverity.error} error findings`);
        } else if (auditArtifact.summary.bySeverity.warning > 0) {
          report.status = 'WARNING';
          report.warnings.push(`${auditArtifact.summary.bySeverity.warning} warning findings`);
        }
      } catch (error) {
        if (error instanceof Error && (error as any).code === 'exit') {
          report.status = 'FAIL';
          report.errors.push('Deliberation audit failed - see module output above');
        } else {
          throw error;
        }
      }

      console.log(`${moduleName}: ${report.status} (${report.executionTime}ms)`);
    } catch (error) {
      report.status = 'FAIL';
      report.errors.push(error instanceof Error ? error.message : String(error));
      report.executionTime = Date.now() - startTime;
      console.log(`${moduleName}: FAIL (${report.executionTime}ms)`);
    }

    return report;
  }

  private runReasoningQualityAudit(): ModuleReport {
    const startTime = Date.now();
    const moduleName = 'reasoning-quality-audit';
    console.log(`[4/6] Running ${moduleName}...`);

    const report: ModuleReport = {
      moduleName,
      status: 'PASS',
      executionTime: 0,
      summary: {},
      errors: [],
      warnings: []
    };

    try {
      const decisionLogPath = 'data/decisions/decision-log.json';

      if (!fs.existsSync(decisionLogPath)) {
        report.status = 'WARNING';
        report.warnings.push('Decision log not found, skipping reasoning quality audit');
      } else {
        const decisionLogContent = fs.readFileSync(decisionLogPath, 'utf-8');
        const decisionLog = JSON.parse(decisionLogContent);

        const decisions = decisionLog.decisions || [];
        if (decisions.length === 0) {
          report.status = 'WARNING';
          report.warnings.push('No decisions found for reasoning quality audit');
        } else {
          report.summary = {
            totalDecisions: decisions.length,
            averageScore: decisions.reduce((sum: number, d: any) => sum + (d.totalScore || 0), 0) / decisions.length
          };
          report.executionTime = Date.now() - startTime;

          const lowQualityCount = decisions.filter((d: any) => d.totalScore && d.totalScore < 50).length;
          if (lowQualityCount > 0) {
            report.status = 'WARNING';
            report.warnings.push(`${lowQualityCount} decisions below quality threshold`);
          }
        }
      }

      console.log(`${moduleName}: ${report.status} (${report.executionTime}ms)`);
    } catch (error) {
      report.status = 'FAIL';
      report.errors.push(error instanceof Error ? error.message : String(error));
      report.executionTime = Date.now() - startTime;
      console.log(`${moduleName}: FAIL (${report.executionTime}ms)`);
    }

    return report;
  }

  private runCapabilityLearning(): ModuleReport {
    const startTime = Date.now();
    const moduleName = 'capability-learning';
    console.log(`[5/6] Running ${moduleName}...`);

    const report: ModuleReport = {
      moduleName,
      status: 'PASS',
      executionTime: 0,
      summary: {},
      errors: [],
      warnings: []
    };

    try {
      const extractor = new CapabilityLearningExtractor(
        'data/decisions/decision-log.json',
        'contracts/agent-capability-schema.json'
      );

      let learningArtifact;
      try {
        learningArtifact = extractor.extract();
        report.summary = learningArtifact.summary;
        report.executionTime = Date.now() - startTime;

        if (learningArtifact.summary.byPriority.high > 0) {
          report.status = 'WARNING';
          report.warnings.push(`${learningArtifact.summary.byPriority.high} high-priority recommendations`);
        }
      } catch (error) {
        if (error instanceof Error && (error as any).code === 'exit') {
          report.status = 'FAIL';
          report.errors.push('Capability learning extraction failed - see module output above');
        } else {
          throw error;
        }
      }

      console.log(`${moduleName}: ${report.status} (${report.executionTime}ms)`);
    } catch (error) {
      report.status = 'FAIL';
      report.errors.push(error instanceof Error ? error.message : String(error));
      report.executionTime = Date.now() - startTime;
      console.log(`${moduleName}: FAIL (${report.executionTime}ms)`);
    }

    return report;
  }

  private runGovernanceObservatory(): ModuleReport {
    const startTime = Date.now();
    const moduleName = 'governance-observatory';
    console.log(`[6/6] Running ${moduleName}...`);

    const report: ModuleReport = {
      moduleName,
      status: 'PASS',
      executionTime: 0,
      summary: {},
      errors: [],
      warnings: []
    };

    try {
      const observatory = new GovernanceObservatory();

      let observatoryArtifact;
      try {
        observatoryArtifact = observatory.observe();
        report.summary = {
          systemHealth: observatoryArtifact.systemHealth,
          riskLevels: observatoryArtifact.riskLevels
        };
        report.executionTime = Date.now() - startTime;

        if (observatoryArtifact.riskLevels.overall === 'high') {
          report.status = 'FAIL';
          report.errors.push('Overall system risk level is HIGH');
        } else if (observatoryArtifact.riskLevels.overall === 'medium') {
          report.status = 'WARNING';
          report.warnings.push('Overall system risk level is MEDIUM');
        }
      } catch (error) {
        if (error instanceof Error && (error as any).code === 'exit') {
          report.status = 'FAIL';
          report.errors.push('Governance observatory failed - see module output above');
        } else {
          throw error;
        }
      }

      console.log(`${moduleName}: ${report.status} (${report.executionTime}ms)`);
    } catch (error) {
      report.status = 'FAIL';
      report.errors.push(error instanceof Error ? error.message : String(error));
      report.executionTime = Date.now() - startTime;
      console.log(`${moduleName}: FAIL (${report.executionTime}ms)`);
    }

    return report;
  }

  private generateReport(modules: ModuleReport[]): DryRunReport {
    let failedModules = modules.filter(m => m.status === 'FAIL');
    let warningModules = modules.filter(m => m.status === 'WARNING');
    const passedModules = modules.filter(m => m.status === 'PASS');

    let downgradedFindingsCount = 0;

    if (this.governancePhase) {
      for (const module of modules) {
        if (module.status === 'FAIL' && this.isObservationModule(module.moduleName)) {
          module.status = 'WARNING';
          module.warnings.push(...module.errors);
          module.errors = [];
          downgradedFindingsCount++;
        }
      }

      failedModules = modules.filter(m => m.status === 'FAIL');
      warningModules = modules.filter(m => m.status === 'WARNING');
    }

    const blockingFailures = failedModules.flatMap(m => m.errors);
    const nonBlockingObservations = warningModules.flatMap(m => m.warnings);

    let governanceVerdict: 'APPROVED' | 'APPROVED_WITH_WARNINGS' | 'BLOCKED';
    if (failedModules.length > 0) {
      governanceVerdict = 'BLOCKED';
    } else if (warningModules.length > 0) {
      governanceVerdict = 'APPROVED_WITH_WARNINGS';
    } else {
      governanceVerdict = 'APPROVED';
    }

    let blockingModules: string[] = [];
    let observationModules: string[] = [];

    if (this.governancePhase) {
      const currentPhase = this.governancePhase.phases[this.governancePhase.currentPhase];
      blockingModules = Array.isArray(currentPhase.blockingModules) ? currentPhase.blockingModules : [];
      
      if ('observationModules' in currentPhase && Array.isArray(currentPhase.observationModules)) {
        observationModules = currentPhase.observationModules;
      }
    }

    return {
      version: this.version,
      timestamp: new Date().toISOString(),
      governancePhase: this.governancePhase?.currentPhase || 'UNKNOWN',
      governanceVerdict,
      summary: {
        totalModules: modules.length,
        passedModules: passedModules.length,
        failedModules: failedModules.length,
        warningModules: warningModules.length,
        downgradedFindingsCount
      },
      enforcementScope: {
        blockingModules,
        observationModules
      },
      modules,
      blockingFailures,
      nonBlockingObservations
    };
  }

  private emitReport(report: DryRunReport): void {
    const dir = path.dirname(this.reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      this.reportPath,
      JSON.stringify(report, null, 2),
      'utf-8'
    );
  }

  private printReport(report: DryRunReport): void {
    console.log('\n=== Governance Dry Run Summary ===\n');

    console.log(`Governance Phase: ${report.governancePhase}`);
    if (this.governancePhase) {
      const phaseDescription = this.governancePhase.phases[this.governancePhase.currentPhase as keyof typeof this.governancePhase.phases].description;
      console.log(`Phase Description: ${phaseDescription}`);
    }
    console.log('');

    console.log('Module Results:');
    for (const module of report.modules) {
      const statusEmoji = module.status === 'PASS' ? '✓' : module.status === 'FAIL' ? '✗' : '⚠';
      const isDowngraded = module.warnings.some(w => w.includes('downgraded'));
      const marker = isDowngraded ? ' [↓]' : '';
      console.log(`  ${statusEmoji} ${module.moduleName.padEnd(25)} ${module.status.padEnd(10)} ${module.executionTime}ms${marker}`);
    }

    console.log('\nSummary:');
    console.log(`  Total Modules:            ${report.summary.totalModules}`);
    console.log(`  Passed:                   ${report.summary.passedModules}`);
    console.log(`  Failed:                   ${report.summary.failedModules}`);
    console.log(`  Warnings:                 ${report.summary.warningModules}`);
    console.log(`  Downgraded Findings:       ${report.summary.downgradedFindingsCount}`);

    if (report.summary.downgradedFindingsCount > 0) {
      console.log(`  Note: ${report.summary.downgradedFindingsCount} findings downgraded from FAIL to WARNING per ${report.governancePhase} phase rules`);
    }

    if (report.blockingFailures.length > 0) {
      console.log('\nBlocking Failures:');
      for (const failure of report.blockingFailures) {
        console.log(`  ✗ ${failure}`);
      }
    }

    if (report.nonBlockingObservations.length > 0) {
      console.log('\nNon-Blocking Observations:');
      for (const observation of report.nonBlockingObservations.slice(0, 5)) {
        console.log(`  ⚠ ${observation}`);
      }
      if (report.nonBlockingObservations.length > 5) {
        console.log(`  ... and ${report.nonBlockingObservations.length - 5} more`);
      }
    }

    console.log('\nEnforcement Scope:');
    console.log(`  Blocking Modules:    ${report.enforcementScope.blockingModules.join(', ') || 'ALL'}`);
    console.log(`  Observation Modules:  ${report.enforcementScope.observationModules.join(', ') || 'NONE'}`);

    console.log(`\nGovernance Verdict: ${report.governanceVerdict}`);
    console.log(`Report saved to: ${path.resolve(process.cwd(), this.reportPath)}\n`);
  }

  private determineExitCode(report: DryRunReport): number {
    return report.governanceVerdict === 'BLOCKED' ? 1 : 0;
  }

  private getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) {
      return fileList;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.getAllTypeScriptFiles(filePath, fileList);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        fileList.push(filePath);
      }
    });

    return fileList;
  }
}

function main() {
  const args = process.argv.slice(2);
  const reportPath = args[0];
  const phasePath = args[1];
  const dryRun = new GovernanceDryRun(reportPath, phasePath);
  dryRun.run();
}

if (require.main === module) {
  main();
}
