/**
 * OLYMPUS 2.0 — Governance Invariant Core
 * Version 8.0.0 - Runtime enforcement layer
 */

import { AgentIdentity } from '../types';
import { GovernanceInvariant, InvariantResult, VerificationEvent } from '../store/transaction/types';
import { sealInvariant } from './seal-invariant';

export interface InvariantEngine {
  register(invariant: GovernanceInvariant): void;
  verifyAll(identity: AgentIdentity): Promise<VerificationEvent>;
}

export class MinimalInvariantEngine implements InvariantEngine {
  private invariants: Map<string, GovernanceInvariant> = new Map();

  constructor() {
    // Seal invariant is ALWAYS registered by default
    // This is non-negotiable: seal must be checked on every verification
    this.register(sealInvariant);
  }

  register(invariant: GovernanceInvariant): void {
    this.invariants.set(invariant.name, invariant);
    console.log(`[InvariantEngine] Registered invariant: ${invariant.name}`);
  }

  async verifyAll(identity: AgentIdentity): Promise<VerificationEvent> {
    const verificationId = crypto.randomUUID();
    const startTime = Date.now();
    
    console.log(`[InvariantEngine] Starting verification ${verificationId} for agent ${identity.agentId}`);
    
    const results: InvariantResult[] = [];
    const invariantNames = Array.from(this.invariants.keys());
    
    for (const invariantName of invariantNames) {
      const invariant = this.invariants.get(invariantName)!;
      
      try {
        const checkStartTime = Date.now();
        const result = await invariant.check(identity);
        const checkDuration = Date.now() - checkStartTime;
        
        results.push({
          ...result,
          duration: checkDuration
        });
        
        console.log(`[InvariantEngine] ${invariantName}: ${result.passed ? 'PASS' : 'FAIL'} (${checkDuration}ms)${result.reason ? ` - ${result.reason}` : ''}`);
      } catch (error: any) {
        console.error(`[InvariantEngine] ${invariantName} threw error: ${error.message}`);
        
        results.push({
          invariantName,
          passed: false,
          reason: `ERROR: ${error.message}`,
          duration: 0
        });
      }
    }
    
    const allPassed = results.every(r => r.passed);
    const duration = Date.now() - startTime;
    
    const event: VerificationEvent = {
      verificationId,
      agentId: identity.agentId,
      buildId: identity.buildId,
      invariantResults: results,
      timestamp: new Date()
    };
    
    console.log(`[InvariantEngine] Verification ${verificationId} complete: ${allPassed ? 'ALL PASS' : 'SOME FAIL'} (${duration}ms)`);
    
    return event;
  }
}
