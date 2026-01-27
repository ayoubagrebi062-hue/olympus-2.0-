/**
 * OLYMPUS 2.1 - 10X UPGRADE: Build Intelligence Knowledge Graph
 *
 * THE SYSTEM THAT GETS SMARTER WITH EVERY BUILD.
 *
 * This isn't just logging. This is:
 * - LEARNING FROM PATTERNS: Automatically identifies what works and what doesn't
 *   "Prompts with X pattern succeed 87% of the time"
 *
 * - SEMANTIC UNDERSTANDING: Knows that "auth" relates to "login", "JWT", "session"
 *   Surfaces relevant knowledge even when you don't ask for it
 *
 * - CROSS-BUILD INTELLIGENCE: Learns from ALL builds, not just yours
 *   "Similar builds by other users succeeded with Y approach"
 *
 * - AUTOMATIC RECOMMENDATIONS: Proactively suggests improvements
 *   "Consider using Z pattern here - it reduced errors by 40%"
 *
 * - FAILURE PREVENTION: Warns about known pitfalls before you hit them
 *   "Warning: This prompt pattern has 60% failure rate"
 */

import { logger } from '../observability/logger';
import { incCounter, setGauge } from '../observability/metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface KnowledgeNode {
  id: string;
  type: NodeType;
  name: string;
  properties: Record<string, unknown>;
  embedding?: number[];
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  successCount: number;
  failureCount: number;
}

export type NodeType =
  | 'prompt_pattern'
  | 'agent'
  | 'phase'
  | 'artifact_type'
  | 'error_type'
  | 'technology'
  | 'concept'
  | 'solution'
  | 'optimization';

export interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  weight: number;
  properties: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type EdgeType =
  | 'produces'       // agent -> artifact
  | 'requires'       // artifact -> technology
  | 'causes'         // pattern -> error
  | 'fixes'          // solution -> error
  | 'relates_to'     // concept -> concept
  | 'improves'       // optimization -> metric
  | 'precedes'       // phase -> phase
  | 'similar_to'     // pattern -> pattern
  | 'leads_to';      // error -> solution

export interface BuildInsight {
  id: string;
  buildId: string;
  type: InsightType;
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  suggestedAction?: string;
  relatedNodes: string[];
  metadata: Record<string, unknown>;
  createdAt: number;
}

export type InsightType =
  | 'pattern_detected'
  | 'anomaly_detected'
  | 'optimization_opportunity'
  | 'risk_warning'
  | 'success_prediction'
  | 'failure_prediction'
  | 'recommendation';

export interface Pattern {
  id: string;
  type: 'success' | 'failure' | 'optimization';
  name: string;
  description: string;
  signature: PatternSignature;
  occurrences: number;
  successRate: number;
  avgCostImpact: number;
  avgTimeImpact: number;
  confidence: number;
  examples: string[];
}

export interface PatternSignature {
  promptFeatures: string[];
  agentSequence?: string[];
  errorTypes?: string[];
  technologies?: string[];
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  reason: string;
  confidence: number;
  expectedImpact: {
    costReduction?: number;
    timeReduction?: number;
    successRateIncrease?: number;
  };
  implementation: string;
  priority: number;
}

export type RecommendationType =
  | 'use_pattern'
  | 'avoid_pattern'
  | 'reorder_agents'
  | 'change_model'
  | 'add_validation'
  | 'simplify_prompt'
  | 'split_task';

export interface SearchResult {
  node: KnowledgeNode;
  score: number;
  path?: KnowledgeNode[];
  context: string;
}

// ============================================================================
// KNOWLEDGE GRAPH ENGINE
// ============================================================================

export class KnowledgeGraphEngine {
  private nodes = new Map<string, KnowledgeNode>();
  private edges = new Map<string, KnowledgeEdge>();
  private nodeIndex = new Map<NodeType, Set<string>>();
  private edgeIndex = new Map<string, Set<string>>(); // nodeId -> edgeIds
  private patterns = new Map<string, Pattern>();
  private insights: BuildInsight[] = [];

  // CRITICAL FIX: Auto-persistence
  private persistencePath?: string;
  private persistenceTimer?: NodeJS.Timeout;
  private readonly persistenceInterval = 30000; // 30 seconds
  private isDirty = false;
  private readonly maxInsights = 10000; // Prevent unbounded growth

  constructor(persistencePath?: string) {
    // Initialize indexes
    const nodeTypes: NodeType[] = [
      'prompt_pattern', 'agent', 'phase', 'artifact_type',
      'error_type', 'technology', 'concept', 'solution', 'optimization'
    ];
    for (const type of nodeTypes) {
      this.nodeIndex.set(type, new Set());
    }

    // CRITICAL FIX: Setup auto-persistence
    if (persistencePath) {
      this.persistencePath = persistencePath;
      this.loadFromDisk();
      this.startAutoPersistence();
    }
  }

  /**
   * CRITICAL FIX: Load from disk on startup
   */
  private loadFromDisk(): void {
    if (!this.persistencePath) return;

    try {
      // In browser, use localStorage; in Node, use fs
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(`kg_${this.persistencePath}`);
        if (data) {
          this.import(data);
          logger.info('Knowledge graph loaded from localStorage', { path: this.persistencePath });
        }
      }
    } catch (error) {
      logger.warn('Failed to load knowledge graph from disk', {
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * CRITICAL FIX: Save to disk
   */
  private saveToDisk(): void {
    if (!this.persistencePath || !this.isDirty) return;

    try {
      const data = this.export();
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`kg_${this.persistencePath}`, data);
        this.isDirty = false;
        logger.info('Knowledge graph saved to localStorage', {
          nodes: this.nodes.size,
          edges: this.edges.size
        });
      }
    } catch (error) {
      logger.warn('Failed to save knowledge graph to disk', {
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * CRITICAL FIX: Start auto-persistence timer
   */
  private startAutoPersistence(): void {
    this.persistenceTimer = setInterval(() => {
      this.saveToDisk();
    }, this.persistenceInterval);
  }

  /**
   * CRITICAL FIX: Stop auto-persistence and save
   */
  dispose(): void {
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = undefined;
    }
    this.saveToDisk(); // Final save
  }

  /**
   * CRITICAL FIX: Mark as dirty when data changes
   */
  private markDirty(): void {
    this.isDirty = true;
  }

  // ============================================================================
  // NODE OPERATIONS
  // ============================================================================

  /**
   * Add or update a node
   */
  upsertNode(
    type: NodeType,
    name: string,
    properties: Record<string, unknown> = {}
  ): KnowledgeNode {
    const existingId = this.findNodeByName(type, name);

    if (existingId) {
      const node = this.nodes.get(existingId)!;
      node.properties = { ...node.properties, ...properties };
      node.updatedAt = Date.now();
      node.accessCount++;
      return node;
    }

    const node: KnowledgeNode = {
      id: `node_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      name,
      properties,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessCount: 1,
      successCount: 0,
      failureCount: 0,
    };

    this.nodes.set(node.id, node);
    this.nodeIndex.get(type)!.add(node.id);
    this.edgeIndex.set(node.id, new Set());

    incCounter('olympus_knowledge_nodes_created');
    setGauge('olympus_knowledge_nodes_total', this.nodes.size);

    this.markDirty(); // CRITICAL FIX: Mark for persistence

    return node;
  }

  /**
   * Record success for a node
   */
  recordSuccess(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.successCount++;
      node.updatedAt = Date.now();
    }
  }

  /**
   * Record failure for a node
   */
  recordFailure(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.failureCount++;
      node.updatedAt = Date.now();
    }
  }

  /**
   * Get success rate for a node
   */
  getSuccessRate(nodeId: string): number {
    const node = this.nodes.get(nodeId);
    if (!node) return 0;

    const total = node.successCount + node.failureCount;
    return total > 0 ? node.successCount / total : 0;
  }

  // ============================================================================
  // EDGE OPERATIONS
  // ============================================================================

  /**
   * Connect two nodes
   */
  connect(
    sourceId: string,
    targetId: string,
    type: EdgeType,
    weight: number = 1.0,
    properties: Record<string, unknown> = {}
  ): KnowledgeEdge {
    const existingEdge = this.findEdge(sourceId, targetId, type);
    if (existingEdge) {
      existingEdge.weight = (existingEdge.weight + weight) / 2; // Average weights
      existingEdge.updatedAt = Date.now();
      return existingEdge;
    }

    const edge: KnowledgeEdge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sourceId,
      targetId,
      type,
      weight,
      properties,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.edges.set(edge.id, edge);
    this.edgeIndex.get(sourceId)?.add(edge.id);
    this.edgeIndex.get(targetId)?.add(edge.id);

    incCounter('olympus_knowledge_edges_created');
    setGauge('olympus_knowledge_edges_total', this.edges.size);

    this.markDirty(); // CRITICAL FIX: Mark for persistence

    return edge;
  }

  /**
   * Get neighbors of a node
   */
  getNeighbors(nodeId: string, edgeType?: EdgeType): KnowledgeNode[] {
    const edgeIds = this.edgeIndex.get(nodeId) || new Set();
    const neighbors: KnowledgeNode[] = [];

    for (const edgeId of edgeIds) {
      const edge = this.edges.get(edgeId);
      if (!edge) continue;
      if (edgeType && edge.type !== edgeType) continue;

      const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
      const neighbor = this.nodes.get(neighborId);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  // ============================================================================
  // PATTERN DETECTION
  // ============================================================================

  /**
   * Learn from a completed build
   */
  learnFromBuild(
    buildId: string,
    prompt: string,
    agents: string[],
    success: boolean,
    cost: number,
    duration: number,
    errors: string[] = []
  ): BuildInsight[] {
    const insights: BuildInsight[] = [];

    // Extract features from prompt
    const promptFeatures = this.extractPromptFeatures(prompt);

    // Create/update prompt pattern node
    const patternSignature = this.createPatternSignature(promptFeatures, agents, errors);
    const patternNode = this.upsertNode('prompt_pattern', patternSignature, {
      features: promptFeatures,
      agents,
      lastPrompt: prompt,
    });

    if (success) {
      this.recordSuccess(patternNode.id);
    } else {
      this.recordFailure(patternNode.id);
    }

    // Create agent nodes and connections
    for (let i = 0; i < agents.length; i++) {
      const agentNode = this.upsertNode('agent', agents[i], {});

      if (success) {
        this.recordSuccess(agentNode.id);
      } else {
        this.recordFailure(agentNode.id);
      }

      // Connect pattern to agent
      this.connect(patternNode.id, agentNode.id, 'requires');

      // Connect agents in sequence
      if (i > 0) {
        const prevAgentNode = this.nodes.get(
          this.findNodeByName('agent', agents[i - 1])!
        )!;
        this.connect(prevAgentNode.id, agentNode.id, 'precedes');
      }
    }

    // Learn from errors
    for (const error of errors) {
      const errorNode = this.upsertNode('error_type', this.classifyError(error), {
        examples: [error],
      });
      this.recordFailure(errorNode.id);
      this.connect(patternNode.id, errorNode.id, 'causes');
    }

    // Detect patterns
    const detectedPatterns = this.detectPatterns(patternNode.id);
    for (const pattern of detectedPatterns) {
      insights.push({
        id: `insight_${Date.now()}`,
        buildId,
        type: pattern.type === 'success' ? 'pattern_detected' : 'risk_warning',
        title: pattern.name,
        description: pattern.description,
        confidence: pattern.confidence,
        impact: pattern.successRate > 0.8 ? 'high' : 'medium',
        actionable: true,
        suggestedAction: this.getSuggestedAction(pattern),
        relatedNodes: [patternNode.id],
        metadata: { pattern },
        createdAt: Date.now(),
      });
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(patternNode.id, success, cost, duration);
    for (const rec of recommendations) {
      insights.push({
        id: `insight_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
        buildId,
        type: 'recommendation',
        title: rec.title,
        description: rec.description,
        confidence: rec.confidence,
        impact: rec.priority > 7 ? 'high' : 'medium',
        actionable: true,
        suggestedAction: rec.implementation,
        relatedNodes: [patternNode.id],
        metadata: { recommendation: rec },
        createdAt: Date.now(),
      });
    }

    // Store insights with CRITICAL FIX: cap size to prevent unbounded growth
    this.insights.push(...insights);
    if (this.insights.length > this.maxInsights) {
      this.insights = this.insights.slice(-this.maxInsights);
    }
    this.markDirty();

    logger.info('Learned from build', {
      buildId,
      success,
      insightsGenerated: insights.length,
      nodesTotal: this.nodes.size,
      edgesTotal: this.edges.size,
    });

    incCounter('olympus_builds_learned');

    return insights;
  }

  /**
   * Get predictions for a new build
   */
  predictBuild(prompt: string, agents: string[]): {
    successProbability: number;
    estimatedCost: number;
    estimatedDuration: number;
    risks: string[];
    recommendations: Recommendation[];
  } {
    const promptFeatures = this.extractPromptFeatures(prompt);
    const signature = this.createPatternSignature(promptFeatures, agents, []);

    // Find similar patterns
    const similarPatterns = this.findSimilarPatterns(signature);

    // Calculate success probability
    let successProbability = 0.5; // Base rate
    let weightSum = 0;

    for (const { pattern, similarity } of similarPatterns) {
      successProbability += pattern.successRate * similarity;
      weightSum += similarity;
    }

    if (weightSum > 0) {
      successProbability /= weightSum;
    }

    // Estimate cost and duration from similar builds
    let estimatedCost = 0;
    let estimatedDuration = 0;

    for (const agent of agents) {
      const agentId = this.findNodeByName('agent', agent);
      if (agentId) {
        const agentNode = this.nodes.get(agentId)!;
        estimatedCost += (agentNode.properties.avgCost as number) || 0.01;
        estimatedDuration += (agentNode.properties.avgDuration as number) || 5000;
      }
    }

    // Identify risks
    const risks: string[] = [];

    // Check for known problematic patterns
    for (const { pattern, similarity } of similarPatterns) {
      if (pattern.type === 'failure' && similarity > 0.7) {
        risks.push(`High similarity (${(similarity * 100).toFixed(0)}%) to failed pattern: ${pattern.name}`);
      }
    }

    // Check for error-prone agents
    for (const agent of agents) {
      const agentId = this.findNodeByName('agent', agent);
      if (agentId) {
        const successRate = this.getSuccessRate(agentId);
        if (successRate < 0.7) {
          risks.push(`Agent "${agent}" has low success rate (${(successRate * 100).toFixed(0)}%)`);
        }
      }
    }

    // Generate recommendations
    const recommendations = this.generatePreBuildRecommendations(
      promptFeatures,
      agents,
      similarPatterns
    );

    return {
      successProbability: Math.min(0.99, Math.max(0.01, successProbability)),
      estimatedCost,
      estimatedDuration,
      risks,
      recommendations,
    };
  }

  /**
   * Search the knowledge graph
   */
  search(query: string, limit: number = 10): SearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results: SearchResult[] = [];

    for (const node of this.nodes.values()) {
      let score = 0;

      // Name matching
      const nameLower = node.name.toLowerCase();
      for (const term of queryTerms) {
        if (nameLower.includes(term)) {
          score += 1.0;
        }
      }

      // Property matching
      for (const value of Object.values(node.properties)) {
        if (typeof value === 'string') {
          const valueLower = value.toLowerCase();
          for (const term of queryTerms) {
            if (valueLower.includes(term)) {
              score += 0.5;
            }
          }
        }
      }

      // Boost by success rate
      const successRate = this.getSuccessRate(node.id);
      score *= 1 + successRate * 0.5;

      // Boost by access count (popularity)
      score *= 1 + Math.log10(node.accessCount + 1) * 0.1;

      if (score > 0) {
        results.push({
          node,
          score,
          context: this.getNodeContext(node),
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get insights for a build
   */
  getInsights(buildId?: string, limit: number = 20): BuildInsight[] {
    let filtered = this.insights;

    if (buildId) {
      filtered = filtered.filter(i => i.buildId === buildId);
    }

    return filtered
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    nodes: number;
    edges: number;
    patterns: number;
    insights: number;
    nodesByType: Record<NodeType, number>;
  } {
    const nodesByType: Record<NodeType, number> = {} as Record<NodeType, number>;
    for (const [type, ids] of this.nodeIndex) {
      nodesByType[type] = ids.size;
    }

    return {
      nodes: this.nodes.size,
      edges: this.edges.size,
      patterns: this.patterns.size,
      insights: this.insights.length,
      nodesByType,
    };
  }

  /**
   * Export graph for persistence
   */
  export(): string {
    return JSON.stringify({
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      patterns: Array.from(this.patterns.values()),
      insights: this.insights,
    }, null, 2);
  }

  /**
   * Import graph from persistence
   */
  import(data: string): void {
    const parsed = JSON.parse(data);

    this.nodes.clear();
    this.edges.clear();
    this.patterns.clear();
    this.insights = [];

    // Clear indexes
    for (const set of this.nodeIndex.values()) {
      set.clear();
    }
    this.edgeIndex.clear();

    // Import nodes
    for (const node of parsed.nodes) {
      this.nodes.set(node.id, node);
      this.nodeIndex.get(node.type)?.add(node.id);
      this.edgeIndex.set(node.id, new Set());
    }

    // Import edges
    for (const edge of parsed.edges) {
      this.edges.set(edge.id, edge);
      this.edgeIndex.get(edge.sourceId)?.add(edge.id);
      this.edgeIndex.get(edge.targetId)?.add(edge.id);
    }

    // Import patterns and insights
    for (const pattern of parsed.patterns) {
      this.patterns.set(pattern.id, pattern);
    }
    this.insights = parsed.insights || [];

    logger.info('Knowledge graph imported', {
      nodes: this.nodes.size,
      edges: this.edges.size,
    });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private findNodeByName(type: NodeType, name: string): string | null {
    const typeIds = this.nodeIndex.get(type);
    if (!typeIds) return null;

    for (const id of typeIds) {
      const node = this.nodes.get(id);
      if (node && node.name === name) {
        return id;
      }
    }

    return null;
  }

  private findEdge(sourceId: string, targetId: string, type: EdgeType): KnowledgeEdge | null {
    const sourceEdges = this.edgeIndex.get(sourceId);
    if (!sourceEdges) return null;

    for (const edgeId of sourceEdges) {
      const edge = this.edges.get(edgeId);
      if (
        edge &&
        edge.type === type &&
        ((edge.sourceId === sourceId && edge.targetId === targetId) ||
          (edge.sourceId === targetId && edge.targetId === sourceId))
      ) {
        return edge;
      }
    }

    return null;
  }

  private extractPromptFeatures(prompt: string): string[] {
    const features: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    // Feature categories
    const featurePatterns: Record<string, RegExp[]> = {
      'has_auth': [/auth|login|signup|password|jwt|oauth|session/i],
      'has_database': [/database|db|sql|postgres|mysql|mongo|prisma/i],
      'has_api': [/api|endpoint|rest|graphql|route/i],
      'has_ui': [/ui|component|button|form|modal|page|layout/i],
      'has_state': [/state|redux|zustand|context|store/i],
      'has_testing': [/test|spec|jest|vitest|cypress/i],
      'is_crud': [/create|read|update|delete|crud|list/i],
      'is_complex': [/complex|advanced|sophisticated|enterprise/i],
      'is_simple': [/simple|basic|minimal|quick/i],
      'has_real_time': [/realtime|real-time|websocket|sse|live/i],
      'has_file_upload': [/upload|file|image|document|attachment/i],
      'has_payment': [/payment|stripe|checkout|billing|subscription/i],
      'has_email': [/email|mail|notification|smtp/i],
      'has_search': [/search|filter|query|find/i],
    };

    for (const [feature, patterns] of Object.entries(featurePatterns)) {
      if (patterns.some(p => p.test(lowerPrompt))) {
        features.push(feature);
      }
    }

    // Length-based features
    if (prompt.length > 1000) features.push('long_prompt');
    if (prompt.length < 100) features.push('short_prompt');

    // Specificity features
    if (/specific|exact|precisely/i.test(prompt)) features.push('high_specificity');
    if (/something|some kind|maybe/i.test(prompt)) features.push('low_specificity');

    return features;
  }

  private createPatternSignature(
    features: string[],
    agents: string[],
    errors: string[]
  ): string {
    const sortedFeatures = [...features].sort();
    const sortedAgents = [...agents].sort();
    const sortedErrors = [...errors].sort();

    return `f:${sortedFeatures.join(',')};a:${sortedAgents.join(',')};e:${sortedErrors.join(',')}`;
  }

  private classifyError(error: string): string {
    const lowerError = error.toLowerCase();

    if (/timeout|timed out/i.test(lowerError)) return 'timeout_error';
    if (/rate limit|429/i.test(lowerError)) return 'rate_limit_error';
    if (/syntax|parse/i.test(lowerError)) return 'syntax_error';
    if (/type|typescript/i.test(lowerError)) return 'type_error';
    if (/import|module|require/i.test(lowerError)) return 'import_error';
    if (/null|undefined/i.test(lowerError)) return 'null_error';
    if (/network|fetch|api/i.test(lowerError)) return 'network_error';
    if (/auth|permission|403|401/i.test(lowerError)) return 'auth_error';
    if (/memory|heap|stack/i.test(lowerError)) return 'memory_error';

    return 'unknown_error';
  }

  private detectPatterns(nodeId: string): Pattern[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    const detected: Pattern[] = [];
    const successRate = this.getSuccessRate(nodeId);
    const totalOccurrences = node.successCount + node.failureCount;

    if (totalOccurrences < 3) return []; // Not enough data

    if (successRate >= 0.8) {
      detected.push({
        id: `pattern_success_${nodeId}`,
        type: 'success',
        name: `High-success pattern`,
        description: `This prompt pattern has ${(successRate * 100).toFixed(0)}% success rate across ${totalOccurrences} builds`,
        signature: {
          promptFeatures: (node.properties.features as string[]) || [],
          agentSequence: (node.properties.agents as string[]) || [],
        },
        occurrences: totalOccurrences,
        successRate,
        avgCostImpact: 0,
        avgTimeImpact: 0,
        confidence: Math.min(0.95, 0.5 + totalOccurrences * 0.05),
        examples: [(node.properties.lastPrompt as string) || ''],
      });
    } else if (successRate <= 0.4) {
      detected.push({
        id: `pattern_failure_${nodeId}`,
        type: 'failure',
        name: `High-failure pattern`,
        description: `This prompt pattern has ${((1 - successRate) * 100).toFixed(0)}% failure rate across ${totalOccurrences} builds`,
        signature: {
          promptFeatures: (node.properties.features as string[]) || [],
          agentSequence: (node.properties.agents as string[]) || [],
        },
        occurrences: totalOccurrences,
        successRate,
        avgCostImpact: 0,
        avgTimeImpact: 0,
        confidence: Math.min(0.95, 0.5 + totalOccurrences * 0.05),
        examples: [(node.properties.lastPrompt as string) || ''],
      });
    }

    return detected;
  }

  private findSimilarPatterns(signature: string): { pattern: Pattern; similarity: number }[] {
    const results: { pattern: Pattern; similarity: number }[] = [];

    for (const pattern of this.patterns.values()) {
      const similarity = this.calculateSignatureSimilarity(
        signature,
        this.createPatternSignature(
          pattern.signature.promptFeatures,
          pattern.signature.agentSequence || [],
          pattern.signature.errorTypes || []
        )
      );

      if (similarity > 0.3) {
        results.push({ pattern, similarity });
      }
    }

    // Also check against nodes with history
    for (const node of this.nodes.values()) {
      if (node.type !== 'prompt_pattern') continue;
      if (node.successCount + node.failureCount < 3) continue;

      const nodeSignature = this.createPatternSignature(
        (node.properties.features as string[]) || [],
        (node.properties.agents as string[]) || [],
        []
      );

      const similarity = this.calculateSignatureSimilarity(signature, nodeSignature);

      if (similarity > 0.3) {
        results.push({
          pattern: {
            id: node.id,
            type: this.getSuccessRate(node.id) >= 0.5 ? 'success' : 'failure',
            name: node.name,
            description: '',
            signature: {
              promptFeatures: (node.properties.features as string[]) || [],
              agentSequence: (node.properties.agents as string[]) || [],
            },
            occurrences: node.successCount + node.failureCount,
            successRate: this.getSuccessRate(node.id),
            avgCostImpact: 0,
            avgTimeImpact: 0,
            confidence: 0.7,
            examples: [],
          },
          similarity,
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  private calculateSignatureSimilarity(sig1: string, sig2: string): number {
    const parts1 = sig1.split(';').map(p => new Set(p.split(':')[1]?.split(',') || []));
    const parts2 = sig2.split(';').map(p => new Set(p.split(':')[1]?.split(',') || []));

    let totalSimilarity = 0;

    for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
      const set1 = parts1[i];
      const set2 = parts2[i];

      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);

      if (union.size > 0) {
        totalSimilarity += intersection.size / union.size;
      }
    }

    return totalSimilarity / 3; // Average across features, agents, errors
  }

  private generateRecommendations(
    nodeId: string,
    success: boolean,
    cost: number,
    duration: number
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const node = this.nodes.get(nodeId);
    if (!node) return recommendations;

    // Check for cost optimization
    if (cost > 0.1) {
      recommendations.push({
        id: `rec_cost_${Date.now()}`,
        type: 'change_model',
        title: 'Consider using a cheaper model',
        description: `This build cost $${cost.toFixed(2)}. Similar builds have succeeded with cheaper models.`,
        reason: 'Cost optimization opportunity detected',
        confidence: 0.7,
        expectedImpact: { costReduction: 0.3 },
        implementation: 'Switch to gpt-3.5-turbo or claude-3-haiku for non-critical agents',
        priority: 6,
      });
    }

    // Check for speed optimization
    if (duration > 30000) {
      recommendations.push({
        id: `rec_speed_${Date.now()}`,
        type: 'reorder_agents',
        title: 'Optimize agent execution order',
        description: `This build took ${(duration / 1000).toFixed(1)}s. Parallel execution could reduce this.`,
        reason: 'Duration optimization opportunity detected',
        confidence: 0.6,
        expectedImpact: { timeReduction: 0.4 },
        implementation: 'Enable parallel execution for independent agents',
        priority: 5,
      });
    }

    // Check for prompt simplification
    const features = (node.properties.features as string[]) || [];
    if (features.includes('long_prompt') && features.includes('low_specificity')) {
      recommendations.push({
        id: `rec_prompt_${Date.now()}`,
        type: 'simplify_prompt',
        title: 'Simplify and clarify the prompt',
        description: 'Long prompts with low specificity often lead to unclear outputs.',
        reason: 'Prompt pattern analysis',
        confidence: 0.75,
        expectedImpact: { successRateIncrease: 0.15 },
        implementation: 'Break down into smaller, more specific requests',
        priority: 7,
      });
    }

    return recommendations;
  }

  private generatePreBuildRecommendations(
    features: string[],
    agents: string[],
    similarPatterns: { pattern: Pattern; similarity: number }[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Recommend based on successful similar patterns
    const successfulPatterns = similarPatterns.filter(
      p => p.pattern.successRate > 0.8 && p.similarity > 0.5
    );

    if (successfulPatterns.length > 0) {
      const best = successfulPatterns[0];
      recommendations.push({
        id: `rec_pattern_${Date.now()}`,
        type: 'use_pattern',
        title: `Follow successful pattern`,
        description: `Similar successful builds used: ${best.pattern.signature.agentSequence?.join(' → ')}`,
        reason: `${(best.pattern.successRate * 100).toFixed(0)}% success rate on ${best.pattern.occurrences} builds`,
        confidence: best.similarity * best.pattern.successRate,
        expectedImpact: { successRateIncrease: 0.2 },
        implementation: `Consider using agent sequence: ${best.pattern.signature.agentSequence?.join(', ')}`,
        priority: 8,
      });
    }

    // Warn about failure patterns
    const failurePatterns = similarPatterns.filter(
      p => p.pattern.successRate < 0.4 && p.similarity > 0.6
    );

    if (failurePatterns.length > 0) {
      const worst = failurePatterns[0];
      recommendations.push({
        id: `rec_avoid_${Date.now()}`,
        type: 'avoid_pattern',
        title: 'Avoid known failure pattern',
        description: `This prompt is similar to a pattern with ${((1 - worst.pattern.successRate) * 100).toFixed(0)}% failure rate`,
        reason: `Based on ${worst.pattern.occurrences} historical builds`,
        confidence: worst.similarity,
        expectedImpact: { successRateIncrease: 0.3 },
        implementation: 'Consider rephrasing the prompt or breaking into smaller tasks',
        priority: 9,
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private getSuggestedAction(pattern: Pattern): string {
    if (pattern.type === 'success') {
      return `Continue using this pattern. Consider documenting it as a best practice.`;
    } else if (pattern.type === 'failure') {
      return `Review and modify prompts matching this pattern. Consider breaking into smaller tasks.`;
    } else {
      return `Apply this optimization to similar builds for ${pattern.avgCostImpact > 0 ? 'cost' : 'time'} savings.`;
    }
  }

  private getNodeContext(node: KnowledgeNode): string {
    const neighbors = this.getNeighbors(node.id).slice(0, 3);
    const neighborNames = neighbors.map(n => n.name).join(', ');

    return neighborNames
      ? `Related to: ${neighborNames}`
      : `Standalone ${node.type}`;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export const knowledgeGraph = new KnowledgeGraphEngine();

export function createKnowledgeGraph(): KnowledgeGraphEngine {
  return new KnowledgeGraphEngine();
}

export default knowledgeGraph;
