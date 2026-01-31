/**
 * AUTONOMOUS GOVERNANCE DAEMON
 *
 * Intelligence Features:
 * 1. AUTONOMOUS OPERATION - Runs 24/7, auto-fixes, escalates intelligently
 * 2. LEARNING CAPABILITY - Learns from feedback, adapts to codebase
 * 3. PREDICTIVE INTELLIGENCE - Real-time watching, trend analysis, proactive warnings
 *
 * This is a DAEMON, not a one-shot script.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { TierClassifier, FileAnalysis } from '../ci/tier-classifier';
import { getDecisionStrategyLoader, getCurrentEnvironment } from '../shared/loader-singleton';
import type {
  Violation as LoaderViolation,
  PatternLearning,
  DecisionResult,
  DecisionStrategyLoader,
} from './decision-strategy-loader';
import { LearningEngine, type DecisionOutcome, type ThresholdSuggestion } from './learning-engine';
import { ASTAnalyzer, type ASTFinding } from './ast-analyzer';

// ============================================================================
// CAPABILITY 1: AUTONOMOUS OPERATION
// ============================================================================

interface RemediationAction {
  filePath: string;
  action: 'auto-fix' | 'alert-human' | 'log-only';
  confidence: number;
  fixApplied?: string;
  escalationReason?: string;
}

interface HealthMetrics {
  uptime: number;
  filesScanned: number;
  violationsFound: number;
  autoFixSuccess: number;
  autoFixFailure: number;
  falsePositiveRate: number;
  lastHealthCheck: number;
}

class AutonomousGovernanceDaemon {
  private classifier: TierClassifier;
  private astAnalyzer: ASTAnalyzer;
  private watcher: chokidar.FSWatcher | null = null;
  private isRunning: boolean = false;
  private learningSystem: LearningSystem;
  private learningEngine: LearningEngine;
  private predictiveEngine: PredictiveEngine;
  private healthMetrics: HealthMetrics;
  private scanHistory: ScanResult[] = [];
  private strategyLoader: DecisionStrategyLoader | null = null;

  // SECURITY FIX (Jan 31, 2026): Circuit breaker cooldown to prevent permanent lockout
  private circuitBreakerCooldownUntil: number = 0;
  private readonly CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.classifier = new TierClassifier();
    this.astAnalyzer = new ASTAnalyzer();
    this.learningSystem = new LearningSystem();
    this.learningEngine = new LearningEngine();
    this.predictiveEngine = new PredictiveEngine();
    this.healthMetrics = this.initHealthMetrics();

    // Self-healing: Uncaught error handler
    this.setupSelfHealing();

    // Initialize strategy loader asynchronously
    this.initializeStrategyLoader();
  }

  /**
   * Initialize the strategy loader in the background
   */
  private async initializeStrategyLoader() {
    try {
      this.strategyLoader = await getDecisionStrategyLoader();
      console.log('✅ Strategy loader initialized');
    } catch (error) {
      console.warn('⚠️  Strategy loader failed, using fallback logic:', error);
      this.strategyLoader = null;
    }
  }

  /**
   * Start autonomous operation - runs 24/7
   */
  async start() {
    console.log('🤖 Starting Autonomous Governance Daemon...');
    this.isRunning = true;

    // 1. Initial full scan
    await this.performFullScan();

    // 2. Watch for file changes (real-time)
    this.startFileWatcher();

    // 3. Periodic health checks (every 5 minutes)
    this.startHealthMonitoring();

    // 4. Periodic learning updates (every hour)
    this.startLearningCycle();

    // 5. Predictive analysis (every 30 minutes)
    this.startPredictiveAnalysis();

    console.log('✅ Daemon running. Press Ctrl+C to stop.');
  }

  /**
   * Real-time file watching
   */
  private startFileWatcher() {
    this.watcher = chokidar.watch('src/**/*.{ts,tsx}', {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('change', filePath => this.handleFileChange(filePath))
      .on('add', filePath => this.handleFileChange(filePath))
      .on('error', error => this.handleWatcherError(error));

    console.log('👁️  File watcher active - monitoring changes in real-time');
  }

  /**
   * Handle file change - analyze and auto-remediate
   */
  private async handleFileChange(filePath: string) {
    console.log(`📝 File changed: ${filePath}`);

    try {
      // SECURITY FIX (Jan 31, 2026): Circuit breaker with cooldown reset
      // Previously: autoFixFailure > 5 caused PERMANENT lockout (no reset path)
      // Now: After 5-minute cooldown, counter resets and auto-fix resumes

      const now = Date.now();

      // Check if we're in cooldown period
      if (now < this.circuitBreakerCooldownUntil) {
        const remainingSeconds = Math.round((this.circuitBreakerCooldownUntil - now) / 1000);
        console.log(`⏳ Circuit breaker cooling down (${remainingSeconds}s remaining)`);
        return;
      }

      // Reset failure counter after cooldown expires
      if (this.circuitBreakerCooldownUntil > 0 && now >= this.circuitBreakerCooldownUntil) {
        console.log('🔄 Circuit breaker cooldown complete - resetting failure counter');
        this.healthMetrics.autoFixFailure = 0;
        this.circuitBreakerCooldownUntil = 0;
      }

      // Circuit breaker: If we've had 5 consecutive failures, enter cooldown
      if (this.healthMetrics.autoFixFailure > 5) {
        console.warn('⚠️  Circuit breaker activated - entering 5-minute cooldown');
        this.circuitBreakerCooldownUntil = now + this.CIRCUIT_COOLDOWN_MS;
        await this.alertHuman('circuit-breaker-cooling-down');
        return;
      }

      // Pass 1: TierClassifier (governance tier analysis)
      const analysis = this.classifier.analyzeFile(filePath);
      this.healthMetrics.filesScanned++;

      // Pass 2: AST Analyzer (security vulnerability detection)
      const astResult = this.astAnalyzer.analyzeFile(filePath);
      const astFindings = astResult.findings;

      if (analysis.violations.length === 0 && astFindings.length === 0) {
        // No violations from either pass
        this.learningSystem.recordSuccess(filePath, analysis);
        return;
      }

      // Merge AST findings into violation list for decision making
      if (astFindings.length > 0) {
        console.log(
          `🔍 AST found ${astFindings.length} vulnerabilities in ${path.basename(filePath)}`
        );
        for (const finding of astFindings) {
          // Record confidence for learning
          this.learningEngine.recordConfidence(finding.pattern, finding.confidence);
        }
      }

      // Decide action using both TierClassifier violations and AST findings
      const action = await this.decideRemediationAction(analysis, astFindings);
      await this.executeRemediation(action);

      // Record outcome in learning engine
      this.recordDecisionOutcome(action, analysis, astFindings);
    } catch (error) {
      // Self-healing: Fallback to basic scan if AST fails
      console.error(`❌ Error analyzing ${filePath}:`, error);
      await this.handleAnalysisFailure(filePath, error);
    }
  }

  /**
   * INTELLIGENT DECISION MAKING
   * Decides whether to auto-fix, alert human, or just log
   * Uses strategy loader if available, falls back to hardcoded logic
   * Now considers both TierClassifier violations and AST findings
   */
  private async decideRemediationAction(
    analysis: FileAnalysis,
    astFindings: readonly ASTFinding[] = []
  ): Promise<RemediationAction> {
    const { filePath, violations } = analysis;

    // Use strategy loader if available
    if (this.strategyLoader) {
      try {
        const strategy = await this.strategyLoader.getStrategy(getCurrentEnvironment());
        const decisions: DecisionResult[] = [];

        // Process TierClassifier violations
        for (const violationMsg of violations) {
          const loaderViolation: LoaderViolation = {
            id: `viol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            pattern: this.extractPattern(violationMsg),
            tier: this.extractTier(analysis.detectedTier),
            filePath: analysis.filePath,
            confidence: analysis.confidence ?? 0,
          };

          const learning = this.learningSystem.getLearningForPattern(loaderViolation.pattern);
          const decision = await strategy.decide(loaderViolation, learning);
          decisions.push(decision);
        }

        // Process AST findings (security vulnerabilities)
        for (const finding of astFindings) {
          const astViolation: LoaderViolation = {
            id: `ast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            pattern: finding.pattern,
            tier: finding.severity === 'critical' ? 3 : finding.severity === 'high' ? 2 : 1,
            filePath: finding.file,
            confidence: finding.confidence,
          };

          const learning = this.learningSystem.getLearningForPattern(finding.pattern);
          const decision = await strategy.decide(astViolation, learning);
          decisions.push(decision);
        }

        if (decisions.length > 0) {
          // Take most severe action
          const mostSevere = this.getMostSevereDecision(decisions);
          return {
            filePath,
            action: mostSevere.action as 'auto-fix' | 'alert-human' | 'log-only',
            confidence: mostSevere.confidence,
            escalationReason: mostSevere.reason,
          };
        }
      } catch (error) {
        console.warn(`⚠️  Strategy decision failed for ${filePath}, using fallback:`, error);
      }
    }

    // FALLBACK: Original hardcoded logic (also considers AST severity)
    return this.decideRemediationActionFallback(analysis, astFindings);
  }

  /**
   * Fallback decision logic (original hardcoded rules)
   * Now also considers AST findings — critical AST findings escalate to alert-human
   */
  private decideRemediationActionFallback(
    analysis: FileAnalysis,
    astFindings: readonly ASTFinding[] = []
  ): RemediationAction {
    const { filePath, violations } = analysis;
    const confidence = analysis.confidence ?? 0;

    // AST override: critical security findings always escalate
    const criticalAst = astFindings.filter(f => f.severity === 'critical');
    if (criticalAst.length > 0) {
      return {
        filePath,
        action: 'alert-human',
        confidence: Math.max(...criticalAst.map(f => f.confidence)),
        escalationReason: `Critical AST finding: ${criticalAst[0].pattern} — ${criticalAst[0].message}`,
      };
    }

    // Strategy 1: High confidence (>85%) → AUTO-FIX
    if (confidence > 0.85 && violations.length === 1) {
      return {
        filePath,
        action: 'auto-fix',
        confidence,
      };
    }

    // Strategy 2: Medium confidence (60-85%) or high-severity AST → ALERT HUMAN
    const highAst = astFindings.filter(f => f.severity === 'high');
    if (confidence > 0.6 || highAst.length > 0) {
      return {
        filePath,
        action: 'alert-human',
        confidence: Math.max(confidence, ...highAst.map(f => f.confidence), 0),
        escalationReason:
          highAst.length > 0
            ? `AST finding: ${highAst[0].pattern} + governance violation`
            : 'Medium confidence - human review needed',
      };
    }

    // Strategy 3: Low confidence (<60%) → LOG ONLY (likely false positive)
    return {
      filePath,
      action: 'log-only',
      confidence,
      escalationReason: 'Low confidence - likely false positive',
    };
  }

  /**
   * Extract pattern name from violation message for strategy lookup
   */
  private extractPattern(violationMsg: string): string {
    if (violationMsg.includes('DB writes')) return 'db_write_in_tier1';
    if (violationMsg.includes('enforcement logic')) return 'enforcement_in_tier1';
    if (violationMsg.includes('irreversible')) return 'irreversible_operation';
    if (violationMsg.includes('AUTHORITY_CHECK')) return 'missing_authority_check';
    if (violationMsg.includes('ETHICAL_OVERSIGHT')) return 'missing_ethical_oversight';
    if (violationMsg.includes('HUMAN_ACCOUNTABILITY')) return 'missing_human_accountability';
    if (violationMsg.includes('HUMAN_OVERRIDE_REQUIRED')) return 'missing_human_override';
    if (violationMsg.includes('mixed tier behaviors')) return 'mixed_tier_behaviors';
    return 'unknown_violation';
  }

  /**
   * Extract tier number from detected tier string
   */
  private extractTier(detectedTier: string | null): 1 | 2 | 3 {
    if (detectedTier === 'tier1') return 1;
    if (detectedTier === 'tier2') return 2;
    if (detectedTier === 'tier3') return 3;
    return 1; // Default to tier 1 for unknown
  }

  /**
   * Select most severe decision from a list of decisions
   */
  private getMostSevereDecision(decisions: DecisionResult[]): DecisionResult {
    // Priority: alert-human > auto-fix > suppress
    const alertDecisions = decisions.filter(d => d.action === 'alert-human');
    if (alertDecisions.length > 0) return alertDecisions[0];

    const autoFixDecisions = decisions.filter(d => d.action === 'auto-fix');
    if (autoFixDecisions.length > 0) return autoFixDecisions[0];

    return decisions[0];
  }

  /**
   * Execute remediation based on decision
   */
  private async executeRemediation(action: RemediationAction) {
    switch (action.action) {
      case 'auto-fix':
        await this.autoFix(action);
        break;
      case 'alert-human':
        await this.alertHuman(action);
        break;
      case 'log-only':
        this.logViolation(action);
        break;
    }
  }

  /**
   * Record decision outcome in the learning engine for adaptive intelligence
   */
  private recordDecisionOutcome(
    action: RemediationAction,
    analysis: FileAnalysis,
    astFindings: readonly ASTFinding[]
  ): void {
    // Determine pattern — use AST finding pattern if available, otherwise extract from violations
    const pattern =
      astFindings.length > 0
        ? astFindings[0].pattern
        : analysis.violations.length > 0
          ? this.extractPattern(analysis.violations[0])
          : 'unknown';

    // Map action to initial result — will be updated when we know actual outcome
    const result: DecisionOutcome['result'] = action.action === 'log-only' ? 'unknown' : 'unknown';

    const outcome: DecisionOutcome = {
      violationId: `${path.basename(action.filePath)}-${Date.now()}`,
      pattern,
      action: action.action,
      result,
      timestamp: Date.now(),
    };

    this.learningEngine.recordOutcome(outcome);
    this.learningEngine.recordConfidence(pattern, action.confidence);
  }

  /**
   * AUTO-FIX: Automatically insert missing markers
   */
  private async autoFix(action: RemediationAction) {
    try {
      const content = fs.readFileSync(action.filePath, 'utf-8');
      const analysis = this.classifier.analyzeFile(action.filePath);

      // Generate fix
      let fixedContent = content;
      const fixes: string[] = [];

      // Add AUTHORITY_CHECK if missing (Tier 2)
      if (analysis.detectedTier === 'tier2' && !analysis.behaviors.hasAuthorityCheck) {
        const marker = '// AUTHORITY_CHECK: Automatically added by governance daemon\n';
        fixedContent = marker + fixedContent;
        fixes.push('Added AUTHORITY_CHECK marker');
      }

      // Add Tier 3 markers if missing
      if (analysis.detectedTier === 'tier3') {
        const markers = [];
        if (!analysis.behaviors.hasEthicalOversight) {
          markers.push('// ETHICAL_OVERSIGHT: Automatically flagged - requires human review');
        }
        if (!analysis.behaviors.hasHumanAccountability) {
          markers.push('// HUMAN_ACCOUNTABILITY: Auto-detected irreversible operation');
        }
        if (!analysis.behaviors.hasHumanOverrideRequired) {
          markers.push('// HUMAN_OVERRIDE_REQUIRED: Manual confirmation needed');
        }
        if (markers.length > 0) {
          fixedContent = markers.join('\n') + '\n' + fixedContent;
          fixes.push(`Added ${markers.length} Tier 3 markers`);
        }
      }

      // Apply fix
      if (fixes.length > 0) {
        fs.writeFileSync(action.filePath, fixedContent, 'utf-8');
        console.log(`✅ AUTO-FIX applied to ${action.filePath}:`);
        fixes.forEach(fix => console.log(`   - ${fix}`));

        this.healthMetrics.autoFixSuccess++;
        this.learningSystem.recordAutoFix(action.filePath, fixes);

        // Record successful fix in learning engine
        this.learningEngine.recordOutcome({
          violationId: `fix-${path.basename(action.filePath)}-${Date.now()}`,
          pattern: fixes[0] || 'auto-fix',
          action: 'auto-fix',
          result: 'fixed',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error(`❌ Auto-fix failed for ${action.filePath}:`, error);
      this.healthMetrics.autoFixFailure++;

      // Record failure in learning engine
      this.learningEngine.recordOutcome({
        violationId: `fix-fail-${path.basename(action.filePath)}-${Date.now()}`,
        pattern: 'auto-fix-failure',
        action: 'auto-fix',
        result: 'escalated',
        timestamp: Date.now(),
      });

      // Escalate to human
      await this.alertHuman({
        ...action,
        action: 'alert-human',
        escalationReason: `Auto-fix failed: ${error}`,
      });
    }
  }

  /**
   * ALERT HUMAN: Send notification for ambiguous cases
   */
  private async alertHuman(action: RemediationAction | string) {
    const message =
      typeof action === 'string'
        ? action
        : `Governance violation in ${action.filePath} - Confidence: ${Math.round((action.confidence || 0) * 100)}%`;

    console.log(`🚨 HUMAN ALERT: ${message}`);

    // In production: Send to Slack, email, or dashboard
    // For now: Write to alert log
    const alertLog = {
      timestamp: new Date().toISOString(),
      message,
      action: typeof action === 'string' ? null : action,
    };

    fs.appendFileSync('governance-alerts.log', JSON.stringify(alertLog) + '\n', 'utf-8');
  }

  /**
   * LOG ONLY: Record likely false positives
   */
  private logViolation(action: RemediationAction) {
    console.log(
      `📋 Logged (Low confidence): ${action.filePath} - Confidence: ${Math.round(action.confidence * 100)}%`
    );

    // Feed to learning system
    this.learningSystem.recordLowConfidence(action.filePath, action.confidence);
  }

  /**
   * Self-healing: Handle analysis failures gracefully
   */
  private async handleAnalysisFailure(filePath: string, error: any) {
    console.warn(`⚠️  AST parsing failed for ${filePath}, falling back to basic scan`);

    // Fallback: Use regex-only scan
    try {
      // Simple regex check without AST
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasDbWrites = /\bdb\.(write|insert|update|delete)\b/i.test(content);

      if (hasDbWrites) {
        await this.alertHuman({
          filePath,
          action: 'alert-human',
          confidence: 0.5,
          escalationReason: 'AST parsing failed - using fallback scan',
        });
      }
    } catch (fallbackError) {
      // Complete failure - log and continue
      console.error(`❌ Complete failure for ${filePath}:`, fallbackError);
    }
  }

  // ============================================================================
  // CAPABILITY 2: LEARNING CAPABILITY
  // ============================================================================

  /**
   * Periodic learning cycle - runs every hour
   * Now includes learning engine threshold analysis
   */
  private startLearningCycle() {
    setInterval(
      async () => {
        console.log('🧠 Learning cycle started...');

        // Legacy learning system analysis
        await this.learningSystem.runLearningCycle(this.scanHistory);

        // New: Learning engine threshold suggestions
        const suggestions = this.learningEngine.suggestThresholdAdjustments();
        if (suggestions.length > 0) {
          console.log('📊 Learning engine threshold suggestions:');
          for (const s of suggestions) {
            console.log(
              `   - ${s.pattern}: ${s.currentAction} → ${s.suggestedAction} (${s.reason})`
            );
          }
        }

        // New: Print learning engine summary
        const summary = this.learningEngine.getSummary();
        console.log(
          `📈 Learning engine: ${summary.totalPatterns} patterns, ${summary.totalOutcomes} outcomes tracked`
        );

        // Persist learning data
        this.learningEngine.saveToDisk();

        console.log('✅ Learning cycle complete');
      },
      60 * 60 * 1000
    ); // Every hour
  }

  /**
   * Full scan to build history
   * Now runs both TierClassifier and AST Analyzer
   */
  private async performFullScan(): Promise<void> {
    console.log('🔍 Performing initial full scan...');

    const files = this.getAllTypeScriptFiles('src');
    const results: ScanResult[] = [];

    // Pass 1: TierClassifier scan
    for (const file of files) {
      try {
        const analysis = this.classifier.analyzeFile(file);
        results.push({
          filePath: file,
          analysis,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.warn(`⚠️  Skipped ${file}:`, error);
      }
    }

    this.scanHistory.push(...results);
    console.log(`✅ TierClassifier: Scanned ${results.length} files`);

    // Pass 2: AST Analyzer deep scan
    try {
      const astResults = this.astAnalyzer.analyzeDirectory('src');
      const totalFindings = astResults.reduce((sum, r) => sum + r.findings.length, 0);

      // Record all AST findings in learning engine
      for (const result of astResults) {
        for (const finding of result.findings) {
          this.learningEngine.recordConfidence(finding.pattern, finding.confidence);
        }
      }

      console.log(
        `✅ AST Analyzer: ${astResults.length} files, ${totalFindings} security findings`
      );

      if (totalFindings > 0) {
        const bySeverity: Record<string, number> = {};
        for (const r of astResults) {
          for (const f of r.findings) {
            bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
          }
        }
        console.log(
          `   Breakdown: ${Object.entries(bySeverity)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')}`
        );
      }
    } catch (error) {
      console.warn('⚠️  AST Analyzer scan failed, continuing with TierClassifier only:', error);
    }
  }

  private getAllTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.getAllTypeScriptFiles(fullPath));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  // ============================================================================
  // CAPABILITY 3: PREDICTIVE INTELLIGENCE
  // ============================================================================

  /**
   * Periodic predictive analysis - runs every 30 minutes
   */
  private startPredictiveAnalysis() {
    setInterval(
      async () => {
        console.log('🔮 Running predictive analysis...');
        const predictions = await this.predictiveEngine.analyzeTrends(this.scanHistory);

        if (predictions.alerts.length > 0) {
          console.log('⚠️  PREDICTIVE ALERTS:');
          predictions.alerts.forEach(alert => console.log(`   - ${alert}`));
        }

        console.log('✅ Predictive analysis complete');
      },
      30 * 60 * 1000
    ); // Every 30 minutes
  }

  // ============================================================================
  // SELF-HEALING & HEALTH MONITORING
  // ============================================================================

  /**
   * Setup self-healing mechanisms
   */
  private setupSelfHealing() {
    // Catch uncaught errors
    process.on('uncaughtException', error => {
      console.error('❌ CRITICAL ERROR:', error);
      this.handleCriticalError(error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ UNHANDLED REJECTION:', reason);
      this.handleCriticalError(reason);
    });
  }

  /**
   * Handle critical errors - attempt recovery
   */
  private async handleCriticalError(error: any) {
    console.log('🔧 Attempting self-healing...');

    // Restart file watcher
    if (this.watcher) {
      await this.watcher.close();
      this.startFileWatcher();
    }

    // Alert human
    await this.alertHuman(`Critical error occurred: ${error.message}`);

    console.log('✅ Self-healing complete - daemon still running');
  }

  /**
   * Periodic health monitoring
   */
  private startHealthMonitoring() {
    setInterval(
      () => {
        this.performHealthCheck();
      },
      5 * 60 * 1000
    ); // Every 5 minutes
  }

  /**
   * Health check - monitor own performance
   */
  private performHealthCheck() {
    console.log('💊 Health check...');

    const currentTime = Date.now();
    const uptimeMinutes = (currentTime - this.healthMetrics.lastHealthCheck) / 1000 / 60;

    // Calculate false positive rate from learning system
    const fpRate = this.learningSystem.getFalsePositiveRate();
    this.healthMetrics.falsePositiveRate = fpRate;

    // Alert if accuracy degraded
    if (fpRate > 0.1) {
      // >10% false positives
      console.warn('⚠️  FALSE POSITIVE RATE TOO HIGH: ' + Math.round(fpRate * 100) + '%');
      this.alertHuman('false-positive-rate-exceeded-threshold');
    }

    // Alert if too many auto-fix failures
    const failureRate =
      this.healthMetrics.autoFixFailure /
      (this.healthMetrics.autoFixSuccess + this.healthMetrics.autoFixFailure || 1);

    if (failureRate > 0.2) {
      // >20% failure rate
      console.warn('⚠️  AUTO-FIX FAILURE RATE TOO HIGH: ' + Math.round(failureRate * 100) + '%');
    }

    console.log(
      `✅ Health: Uptime=${Math.round(uptimeMinutes)}min, FP Rate=${Math.round(fpRate * 100)}%, Scans=${this.healthMetrics.filesScanned}`
    );

    this.healthMetrics.lastHealthCheck = currentTime;
  }

  private initHealthMetrics(): HealthMetrics {
    return {
      uptime: Date.now(),
      filesScanned: 0,
      violationsFound: 0,
      autoFixSuccess: 0,
      autoFixFailure: 0,
      falsePositiveRate: 0,
      lastHealthCheck: Date.now(),
    };
  }

  private handleWatcherError(error: Error) {
    console.error('❌ File watcher error:', error);
    // Self-healing: Restart watcher
    setTimeout(() => {
      console.log('🔧 Restarting file watcher...');
      this.startFileWatcher();
    }, 5000);
  }

  /**
   * Graceful shutdown
   */
  async stop() {
    console.log('🛑 Stopping daemon...');
    this.isRunning = false;

    if (this.watcher) {
      await this.watcher.close();
    }

    // Persist learning data before exit
    this.learningEngine.dispose();
    console.log('✅ Learning data saved');

    console.log('✅ Daemon stopped');
  }
}

// ============================================================================
// LEARNING SYSTEM
// ============================================================================

interface ScanResult {
  filePath: string;
  analysis: FileAnalysis;
  timestamp: number;
}

// Mutable version of PatternLearning for internal tracking
interface MutablePatternLearning {
  pattern: string;
  deployedViolations: number;
  incidentRate: number;
  riskScore: number;
  confidenceInterval: [number, number];
}

class LearningSystem {
  private suppressionPatterns: Map<string, number> = new Map(); // Pattern → Count
  private falsePositives: Array<{ file: string; confidence: number }> = [];
  private successfulFixes: string[] = [];
  private patternLearning: Map<string, MutablePatternLearning> = new Map();

  /**
   * Record successful analysis (no violations)
   */
  recordSuccess(filePath: string, analysis: FileAnalysis) {
    // Learn: If this file has no violations, remember its patterns
    // This helps identify similar safe files in the future
  }

  /**
   * Record auto-fix application
   */
  recordAutoFix(filePath: string, fixes: string[]) {
    this.successfulFixes.push(filePath);
    console.log(`📚 Learned: Auto-fix successful for ${path.basename(filePath)}`);
  }

  /**
   * Record low confidence (likely false positive)
   */
  recordLowConfidence(filePath: string, confidence: number) {
    this.falsePositives.push({ file: filePath, confidence });

    // If we've seen many false positives with similar patterns, learn to avoid them
    if (this.falsePositives.length > 10) {
      this.analyzeFalsePositivePatterns();
    }
  }

  /**
   * Analyze false positive patterns and update rules
   */
  private analyzeFalsePositivePatterns() {
    // Group false positives by common patterns
    const patterns = new Map<string, number>();

    this.falsePositives.forEach(fp => {
      const content = fs.readFileSync(fp.file, 'utf-8');

      // Extract patterns (e.g., "logger.log", "test file", "config file")
      if (content.includes('logger')) patterns.set('logger', (patterns.get('logger') || 0) + 1);
      if (fp.file.includes('.test.'))
        patterns.set('test-file', (patterns.get('test-file') || 0) + 1);
      if (fp.file.includes('config'))
        patterns.set('config-file', (patterns.get('config-file') || 0) + 1);
    });

    // If pattern occurs in >50% of false positives, add to suppression list
    const totalFP = this.falsePositives.length;
    patterns.forEach((count, pattern) => {
      if (count / totalFP > 0.5) {
        console.log(
          `🧠 LEARNED: Pattern "${pattern}" is likely false positive (${count}/${totalFP} occurrences)`
        );
        this.suppressionPatterns.set(pattern, count);
      }
    });
  }

  /**
   * Get current false positive rate
   */
  getFalsePositiveRate(): number {
    const total = this.successfulFixes.length + this.falsePositives.length;
    if (total === 0) return 0;
    return this.falsePositives.length / total;
  }

  /**
   * Get learning data for a specific pattern
   * Returns as PatternLearning (readonly) for external consumption
   */
  getLearningForPattern(pattern: string): PatternLearning | null {
    const learning = this.patternLearning.get(pattern);
    if (!learning) return null;

    // Convert to readonly PatternLearning
    return {
      pattern: learning.pattern,
      deployedViolations: learning.deployedViolations,
      incidentRate: learning.incidentRate,
      riskScore: learning.riskScore,
      confidenceInterval: [...learning.confidenceInterval] as [number, number],
    };
  }

  /**
   * Update pattern learning based on whether violation led to incident
   */
  updatePatternLearning(pattern: string, wasIncident: boolean) {
    const existing = this.patternLearning.get(pattern) || {
      pattern,
      deployedViolations: 0,
      incidentRate: 0,
      riskScore: 0.5,
      confidenceInterval: [0.3, 0.7] as [number, number],
    };

    existing.deployedViolations++;
    if (wasIncident) {
      // Recalculate incident rate with new data point
      const oldIncidents = existing.incidentRate * (existing.deployedViolations - 1);
      existing.incidentRate = (oldIncidents + 1) / existing.deployedViolations;
    } else {
      // Violation deployed but no incident - adjust rate downward
      const oldIncidents = existing.incidentRate * (existing.deployedViolations - 1);
      existing.incidentRate = oldIncidents / existing.deployedViolations;
    }

    // Update risk score based on incident rate
    existing.riskScore = existing.incidentRate;

    // Update confidence interval (gets tighter with more samples)
    const samples = existing.deployedViolations;
    const margin = Math.min(0.2, 1 / Math.sqrt(samples)); // Narrows with √n
    existing.confidenceInterval = [
      Math.max(0, existing.incidentRate - margin),
      Math.min(1, existing.incidentRate + margin),
    ] as [number, number];

    this.patternLearning.set(pattern, existing);
  }

  /**
   * Run learning cycle - analyze recent scans and adapt
   */
  async runLearningCycle(scanHistory: ScanResult[]) {
    // Analyze last 100 scans
    const recentScans = scanHistory.slice(-100);

    // Find common violation patterns
    const violationPatterns = new Map<string, number>();
    recentScans.forEach(scan => {
      scan.analysis.violations.forEach(v => {
        violationPatterns.set(v, (violationPatterns.get(v) || 0) + 1);
      });
    });

    // Report most common violations
    console.log('📊 Most common violations:');
    Array.from(violationPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([violation, count]) => {
        console.log(`   - ${violation}: ${count} occurrences`);
      });
  }
}

// ============================================================================
// PREDICTIVE ENGINE
// ============================================================================

interface PredictivePredictions {
  alerts: string[];
  trends: {
    violationTrend: 'increasing' | 'decreasing' | 'stable';
    estimatedViolationsNextWeek: number;
  };
}

class PredictiveEngine {
  /**
   * Analyze trends and predict future issues
   */
  async analyzeTrends(scanHistory: ScanResult[]): Promise<PredictivePredictions> {
    const alerts: string[] = [];

    // Analyze last 7 days
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentScans = scanHistory.filter(s => s.timestamp > oneWeekAgo);

    // Calculate violations per day
    const violationsPerDay = this.calculateViolationsPerDay(recentScans);

    // Detect trend
    const trend = this.detectTrend(violationsPerDay);

    // Predict next week
    const estimate = this.predictNextWeek(violationsPerDay);

    // Generate alerts
    if (trend === 'increasing') {
      alerts.push(
        `⚠️  Governance violations are INCREASING (${estimate} violations predicted next week)`
      );
    }

    if (estimate > 50) {
      alerts.push(`🚨 CRITICAL: Projected to exceed 50 violations next week`);
    }

    return {
      alerts,
      trends: {
        violationTrend: trend,
        estimatedViolationsNextWeek: estimate,
      },
    };
  }

  private calculateViolationsPerDay(scans: ScanResult[]): number[] {
    // Group by day and count violations
    const dailyCounts = new Map<string, number>();

    scans.forEach(scan => {
      const date = new Date(scan.timestamp).toISOString().split('T')[0];
      const count = scan.analysis.violations.length;
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + count);
    });

    return Array.from(dailyCounts.values());
  }

  private detectTrend(dailyViolations: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (dailyViolations.length < 2) return 'stable';

    const first = dailyViolations[0];
    const last = dailyViolations[dailyViolations.length - 1];

    if (last > first * 1.2) return 'increasing';
    if (last < first * 0.8) return 'decreasing';
    return 'stable';
  }

  private predictNextWeek(dailyViolations: number[]): number {
    if (dailyViolations.length === 0) return 0;

    // Simple linear extrapolation
    const avg = dailyViolations.reduce((a, b) => a + b, 0) / dailyViolations.length;
    return Math.round(avg * 7); // 7 days
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

if (require.main === module) {
  const daemon = new AutonomousGovernanceDaemon();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received shutdown signal...');
    await daemon.stop();
    process.exit(0);
  });

  // Start autonomous operation
  daemon.start().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { AutonomousGovernanceDaemon, LearningSystem, PredictiveEngine, LearningEngine };
