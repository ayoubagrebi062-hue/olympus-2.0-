import * as fs from 'fs';
import * as path from 'path';

interface ActionTiersConfig {
  version: string;
  tiers: {
    tier1: TierConfig;
    tier2: TierConfig;
    tier3: TierConfig;
  };
  irreversibility_patterns: string[];
  ethical_markers: string[];
  human_accountability_markers: string[];
  human_override_markers: string[];
  authority_markers: string[];
}

interface TierConfig {
  name: string;
  description: string;
  path_patterns: string[];
  prohibited_patterns?: string[];
  required_markers?: string[];
}

export interface FileAnalysis {
  filePath: string;
  detectedTier: string | null;
  behaviors: DetectedBehaviors;
  violations: string[];
  confidence?: number;
  lineNumbers?: number[];
  codeSnippets?: string[];
}

export interface DetectedBehaviors {
  hasDbWrites: boolean;
  hasEnforcement: boolean;
  hasIrreversibility: boolean;
  hasEthicalOversight: boolean;
  hasHumanAccountability: boolean;
  hasHumanOverrideRequired: boolean;
  hasAuthorityCheck: boolean;
  matchedPatterns: string[];
}

export class TierClassifier {
  private config: ActionTiersConfig;

  constructor(configPath: string = 'contracts/action-tiers.json') {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    this.config = JSON.parse(configContent);
  }

  analyzeFile(filePath: string): FileAnalysis {
    const relativePath = this.getRelativePath(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');

    const behaviors = this.detectBehaviors(content);
    const detectedTier = this.classifyTier(relativePath, behaviors, content);
    const violations = this.detectTierViolations(detectedTier, behaviors);

    return {
      filePath,
      detectedTier,
      behaviors,
      violations,
    };
  }

  private detectBehaviors(content: string): DetectedBehaviors {
    const lowerContent = content.toLowerCase();

    const hasDbWrites = /db\.(write|insert|update|delete|create|drop|exec\s*\()/i.test(content);
    const hasEnforcement = /(enforce|reject|block)\s*\(/i.test(content);
    const hasIrreversibility = this.matchesAnyPattern(
      content,
      this.config.irreversibility_patterns
    );
    const hasEthicalOversight = this.matchesAnyPattern(content, this.config.ethical_markers);
    const hasHumanAccountability = this.matchesAnyPattern(
      content,
      this.config.human_accountability_markers
    );
    const hasHumanOverrideRequired = this.matchesAnyPattern(
      content,
      this.config.human_override_markers
    );
    const hasAuthorityCheck = this.matchesAnyPattern(content, this.config.authority_markers);

    const matchedPatterns = this.findMatchedPatterns(content);

    return {
      hasDbWrites,
      hasEnforcement,
      hasIrreversibility,
      hasEthicalOversight,
      hasHumanAccountability,
      hasHumanOverrideRequired,
      hasAuthorityCheck,
      matchedPatterns,
    };
  }

  private matchesAnyPattern(content: string, patterns: string[]): boolean {
    return patterns.some(pattern => new RegExp(pattern, 'i').test(content));
  }

  private findMatchedPatterns(content: string): string[] {
    const matched: string[] = [];

    const allPatterns = [
      ...this.config.irreversibility_patterns,
      ...this.config.ethical_markers,
      ...this.config.human_accountability_markers,
      ...this.config.human_override_markers,
      ...this.config.authority_markers,
    ];

    allPatterns.forEach(pattern => {
      if (new RegExp(pattern, 'i').test(content)) {
        matched.push(pattern);
      }
    });

    return matched;
  }

  private classifyTier(
    relativePath: string,
    behaviors: DetectedBehaviors,
    content: string
  ): string | null {
    for (const [tierName, tierConfig] of Object.entries(this.config.tiers)) {
      if (this.pathMatches(relativePath, tierConfig.path_patterns)) {
        return tierName;
      }
    }

    if (behaviors.hasIrreversibility) {
      return 'tier3';
    }

    if (behaviors.hasDbWrites || behaviors.hasEnforcement) {
      return 'tier2';
    }

    return 'tier1';
  }

  private pathMatches(filePath: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$');
      return regex.test(filePath);
    });
  }

  private detectTierViolations(
    detectedTier: string | null,
    behaviors: DetectedBehaviors
  ): string[] {
    const violations: string[] = [];

    if (!detectedTier) {
      return violations;
    }

    const tierConfig = this.config.tiers[detectedTier as keyof typeof this.config.tiers];
    if (!tierConfig) {
      return violations;
    }

    if (detectedTier === 'tier1') {
      if (behaviors.hasDbWrites) {
        violations.push('Tier1 code contains DB write operations');
      }
      if (behaviors.hasEnforcement) {
        violations.push('Tier1 code contains enforcement logic');
      }
      if (behaviors.hasIrreversibility) {
        violations.push('Tier1 code contains irreversible operations');
      }
    }

    if (detectedTier === 'tier2') {
      if (behaviors.hasIrreversibility) {
        violations.push('Tier2 code contains irreversible operations');
      }
      if (behaviors.hasEthicalOversight) {
        violations.push('Tier2 code contains ethical oversight markers (Tier3 only)');
      }
    }

    if (detectedTier === 'tier3') {
      if (!behaviors.hasEthicalOversight) {
        violations.push('Tier3 code missing ETHICAL_OVERSIGHT marker');
      }
      if (!behaviors.hasHumanAccountability) {
        violations.push('Tier3 code missing HUMAN_ACCOUNTABILITY marker');
      }
      if (!behaviors.hasHumanOverrideRequired) {
        violations.push('Tier3 code missing HUMAN_OVERRIDE_REQUIRED marker');
      }
    }

    if (tierConfig.prohibited_patterns && tierConfig.prohibited_patterns.length > 0) {
      for (const pattern of tierConfig.prohibited_patterns) {
        if (new RegExp(pattern, 'i').test(behaviors.matchedPatterns.join(' '))) {
          violations.push(`Prohibited pattern in ${detectedTier}: ${pattern}`);
        }
      }
    }

    return violations;
  }

  private getRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  }
}
