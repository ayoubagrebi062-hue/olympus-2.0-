# CONVERSION AGENTS - CONDITIONAL ROUTING (IMPLEMENTED)

**Date:** January 25, 2026
**File Modified:** `olympus-38-agent-orchestration.ts`
**Status:** ✅ WIRED INTO WORKING PIPELINE

---

## 🎯 WHAT WAS CHANGED

The conversion agents (PSYCHE → SCRIBE → ARCHITECT_CONVERSION) are now **conditionally executed** based on content keyword detection, instead of running for every project.

---

## 📊 CURRENT PIPELINE FLOW

### OPTION A: Content Keywords Detected (Landing Pages, Sales Pages, etc.)

```
USER PROMPT: "Build a landing page for my SaaS product"
    ↓
[1] DISCOVERY PHASE (Sequential)
    ├─ Oracle: Market analysis
    ├─ Empathy: User personas
    ├─ Venture: Business model
    ├─ Strategos: Competitive analysis
    └─ Scope: Requirements
    ↓
    ✅ CONTENT DETECTION: "landing page" keyword found
    ↓
[2] CONVERSION PHASE (Sequential) ← INJECTED HERE
    ├─ PSYCHE: Psychology triggers (fear, greed, urgency)
    ├─ SCRIBE: Conversion copywriting (PAS, HSO, AIDA)
    └─ ARCHITECT_CONVERSION: Funnel design
    ↓
    📦 Conversion output passed as "content requirements"
    ↓
[3] DESIGN PHASE (Parallel)
    ├─ Palette: Colors/branding (uses conversion strategy)
    ├─ Grid: Layout system (uses funnel design)
    ├─ Blocks: Components (uses copy requirements)
    ├─ Cartographer: Navigation (uses funnel flows)
    └─ Flow: Interactions (uses psychology triggers)
    ↓
[4] ARCHITECTURE PHASE
    └─ ... continues
```

### OPTION B: No Content Keywords (Standard Web App)

```
USER PROMPT: "Build a dashboard for project management"
    ↓
[1] DISCOVERY PHASE (Sequential)
    └─ Oracle → Empathy → Venture → Strategos → Scope
    ↓
    ❌ CONTENT DETECTION: No keywords found
    ↓
    ⏭️ CONVERSION PHASE SKIPPED
    ↓
[2] DESIGN PHASE (Parallel)
    └─ Palette → Grid → Blocks → Cartographer → Flow
    ↓
[3] ARCHITECTURE PHASE
    └─ ... continues
```

---

## 🔍 KEYWORD DETECTION (Content Triggers)

The following keywords trigger the conversion phase:

| Keyword           | Category |
| ----------------- | -------- |
| `landing page`    | Pages    |
| `sales page`      | Pages    |
| `marketing page`  | Pages    |
| `opt-in page`     | Pages    |
| `checkout page`   | Pages    |
| `squeeze page`    | Pages    |
| `funnel`          | Strategy |
| `conversion`      | Strategy |
| `blog`            | Content  |
| `email sequence`  | Content  |
| `copy`            | Content  |
| `copywriting`     | Content  |
| `sales letter`    | Content  |
| `lead generation` | Strategy |
| `lead magnet`     | Strategy |

**Location:** `needsConversionAgents()` method (line 409)

---

## 🛠️ MODIFIED CODE SECTIONS

### 1. Content Detection Method (NEW)

```typescript
// olympus-38-agent-orchestration.ts:409
private needsConversionAgents(prompt: string): boolean {
  const prompt_lower = prompt.toLowerCase();

  const contentKeywords = [
    'landing page', 'sales page', 'funnel', 'blog',
    'email sequence', 'marketing page', 'opt-in page',
    'checkout page', 'conversion', 'copy', 'copywriting',
    'sales letter', 'squeeze page', 'lead generation', 'lead magnet'
  ];

  return contentKeywords.some(keyword => prompt_lower.includes(keyword));
}
```

### 2. Discovery Phase Integration (MODIFIED)

```typescript
// olympus-38-agent-orchestration.ts:90-101
private async runDiscoveryAnalysis(prompt: AgentPrompt) {
  // ... oracle, empathy, venture, strategos, scope agents ...

  // ✅ NEW: Detect if conversion agents are needed
  const needsConversion = this.needsConversionAgents(prompt.userPrompt);

  return {
    oracle,
    empathy,
    venture,
    strategos,
    scope,
    projectType: this.detectProjectType(prompt.userPrompt),
    complexity: this.assessComplexity(prompt.userPrompt),
    timeline: this.estimateTimeline(scope.output),
    needsConversion  // ← KEY FLAG for phase routing
  };
}
```

### 3. Phase Determination Logic (MODIFIED)

```typescript
// olympus-38-agent-orchestration.ts:264-296
private determineRequiredPhases(analysis: any): string[] {
  const basePhases = ['discovery'];

  // ✅ CONDITIONAL: Add conversion phase ONLY if content keywords detected
  if (analysis.needsConversion === true) {
    console.log('🎯 Content keywords detected → Adding CONVERSION phase');
    basePhases.push('conversion');
  } else {
    console.log('⏭️ No content keywords → Skipping conversion phase');
  }

  // Design and architecture always needed
  basePhases.push('design', 'architecture', 'frontend');

  // ... backend, integration, testing, deployment (conditional) ...

  return basePhases;
}
```

### 4. Phase Context Builder (MODIFIED)

```typescript
// olympus-38-agent-orchestration.ts:612-625
private getPhaseContext(phase: string, analysis: any, results: any): any {
  // If we're in the design phase and conversion ran, pass conversion output
  if (phase === 'design' && results.conversion) {
    console.log('📦 Passing CONVERSION output to DESIGN agents as content requirements');
    return {
      ...analysis,
      conversionRequirements: results.conversion,
      contentStrategy: results.conversion
    };
  }

  return { ...analysis, previousPhases: results };
}
```

---

## 🎪 CONVERSION AGENTS (The 3 Specialists)

### PSYCHE (Psychology Specialist)

- **Role:** Analyze user psychology and identify conversion triggers
- **Frameworks:** Fear, Greed, Exclusivity, Salvation, Urgency
- **Output:** Psychological trigger map for design decisions

### SCRIBE (Copywriting Specialist)

- **Role:** Create compelling conversion copy
- **Frameworks:** PAS (Problem-Agitate-Solution), HSO (Hook-Story-Offer), AIDA
- **Output:** Conversion-optimized copy for all page sections

### ARCHITECT_CONVERSION (Funnel Designer)

- **Role:** Design conversion-optimized user flows and funnels
- **Input:** Psychology triggers + copy strategy
- **Output:** Funnel design with CTAs, flows, and optimization points

---

## 🔄 DATA FLOW

```
DISCOVERY
└─ needsConversion flag → true/false
    ↓
PHASE DETERMINATION
└─ if (needsConversion) → include 'conversion' in phases
    ↓
CONVERSION EXECUTION (if included)
├─ PSYCHE → psychology analysis
├─ SCRIBE → copy strategy
└─ ARCHITECT_CONVERSION → funnel design
    ↓
DESIGN PHASE
└─ receives results.conversion as contentStrategy
    └─ PALETTE uses conversion branding
    └─ GRID uses funnel layout
    └─ BLOCKS uses copy requirements
    └─ CARTOGRAPHER uses funnel flows
    └─ FLOW uses psychology triggers
```

---

## 📝 TESTING THE ROUTING

### Test Case 1: Landing Page (Should Include Conversion)

```bash
# User prompt: "Build a landing page for my crypto wallet app"
# Expected: Discovery → CONVERSION → Design → ...
# Logs should show:
🎯 Content keywords detected → Adding CONVERSION phase
🤖 Agent psyche: Starting task...
🤖 Agent scribe: Starting task...
🤖 Agent architect_conversion: Starting task...
📦 Passing CONVERSION output to DESIGN agents
```

### Test Case 2: Dashboard (Should Skip Conversion)

```bash
# User prompt: "Build a project management dashboard"
# Expected: Discovery → Design → ... (no conversion)
# Logs should show:
⏭️ No content keywords → Skipping conversion phase
```

---

## 🚀 HOW TO USE

When creating a build request, just use natural language:

```typescript
// Triggers conversion agents
await generateFullApplication('Create a sales page for my course', {
  projectType: 'landing-page',
  complexity: 'medium',
});

// Skips conversion agents
await generateFullApplication('Build a task management app', {
  projectType: 'saas-app',
  complexity: 'medium',
});
```

---

## ✅ VERIFICATION CHECKLIST

- [x] Content detection keywords defined (15 keywords)
- [x] `needsConversionAgents()` method implemented
- [x] Discovery phase sets `needsConversion` flag
- [x] Phase determination conditionally includes 'conversion'
- [x] Conversion output passed to design agents
- [x] Console logs show routing decisions
- [x] No changes to agent registry (uses existing definitions)
- [x] No separate pipeline created (modified existing flow)

---

## 🔧 FILES MODIFIED

| File                                | Changes                            |
| ----------------------------------- | ---------------------------------- |
| `olympus-38-agent-orchestration.ts` | 4 methods modified, 1 method added |

**Total Lines Changed:** ~60 lines
**Breaking Changes:** None (backward compatible)

---

## 📈 PERFORMANCE IMPACT

### With Conversion (Content Projects)

- **Additional Agents:** 3 (PSYCHE, SCRIBE, ARCHITECT_CONVERSION)
- **Additional Time:** ~12 hours (estimated)
- **Additional Cost:** ~$1.50 (using gpt-4o at $0.005/1K tokens)

### Without Conversion (Standard Projects)

- **No overhead** - same as before

---

## 🎯 NEXT STEPS (Optional Enhancements)

1. **Add more keywords** - Track user requests and expand keyword list
2. **Confidence scoring** - Return "60% confident this needs conversion"
3. **User override** - Allow manual `includeConversion: true` flag
4. **Analytics** - Track how often conversion is triggered
5. **A/B testing** - Compare conversion vs non-conversion outcomes

---

**STATUS:** ✅ COMPLETE - Conversion agents wired into working pipeline with conditional routing
