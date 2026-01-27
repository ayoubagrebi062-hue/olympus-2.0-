/**
 * OLYMPUS 2.0 - Prompt Validation
 *
 * Validates user prompts before agent processing.
 * Catches empty, vague, over-complex, and malicious prompts.
 */

export interface PromptValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  suggestion?: string;
  category: 'empty' | 'vague' | 'complex' | 'malicious' | 'valid';
  metadata?: {
    wordCount: number;
    complexityMarkers: string[];
    maliciousTerms: string[];
  };
}

// Malicious intent patterns
const MALICIOUS_PATTERNS = [
  'hack',
  'hacking',
  'crack',
  'cracking',
  'exploit',
  'exploiting',
  'bypass security',
  'bypass authentication',
  'steal',
  'stealing',
  'phishing',
  'malware',
  'ransomware',
  'ddos',
  'denial of service',
  'sql injection',
  'xss attack',
  'illegal',
  'unauthorized access',
  'break into',
  'scrape without permission',
];

// Complexity markers - features that significantly increase scope
const COMPLEXITY_MARKERS = [
  'blockchain',
  'cryptocurrency',
  'nft',
  'web3',
  'machine learning',
  'ai model',
  'neural network',
  'deep learning',
  'ar ',
  'augmented reality',
  'vr ',
  'virtual reality',
  '3d',
  'social network',
  'marketplace',
  'real-time multiplayer',
  'video streaming',
  'live streaming',
  'payment processing',
  'multi-tenant',
  'microservices',
  'distributed system',
];

/**
 * Validate a user prompt before processing.
 * Returns validation result with error/warning messages.
 *
 * CHAOS FIX: Added type guard to handle non-string inputs gracefully.
 * Previously crashed on objects, arrays, null, undefined, etc.
 */
export function validatePrompt(prompt: string): PromptValidationResult {
  // CHAOS FIX: Type guard - handle non-string inputs gracefully
  // This prevents crashes when receiving objects, arrays, null, undefined, etc.
  if (prompt === null || prompt === undefined) {
    console.warn('[PromptValidator] REJECTED: Null/undefined prompt');
    return {
      valid: false,
      error: 'Please provide a description of what you want to build.',
      suggestion: 'Describe your app idea, who will use it, and what features it needs.',
      category: 'empty',
      metadata: { wordCount: 0, complexityMarkers: [], maliciousTerms: [] },
    };
  }

  // CHAOS FIX: Coerce to string if not already a string
  // Objects, arrays, numbers, etc. get stringified instead of crashing
  let promptString: string;
  if (typeof prompt !== 'string') {
    try {
      promptString = String(prompt);
      console.warn(`[PromptValidator] WARNING: Coerced ${typeof prompt} to string`);
    } catch {
      console.warn('[PromptValidator] REJECTED: Unable to convert input to string');
      return {
        valid: false,
        error: 'Invalid input type. Please provide a text description.',
        category: 'empty',
        metadata: { wordCount: 0, complexityMarkers: [], maliciousTerms: [] },
      };
    }
  } else {
    promptString = prompt;
  }

  // Normalize input
  const trimmed = promptString.trim();
  const lower = trimmed.toLowerCase();
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // 1. Check for empty prompts
  if (trimmed.length === 0) {
    console.warn('[PromptValidator] REJECTED: Empty prompt');
    return {
      valid: false,
      error: 'Please provide a description of what you want to build.',
      suggestion: 'Describe your app idea, who will use it, and what features it needs.',
      category: 'empty',
      metadata: { wordCount: 0, complexityMarkers: [], maliciousTerms: [] },
    };
  }

  // 2. Check for malicious intent
  const foundMalicious = MALICIOUS_PATTERNS.filter(pattern =>
    lower.includes(pattern.toLowerCase())
  );

  if (foundMalicious.length > 0) {
    console.warn(`[PromptValidator] REJECTED: Malicious intent detected - ${foundMalicious.join(', ')}`);
    return {
      valid: false,
      error: 'Cannot build applications with potentially harmful intent.',
      suggestion: 'Please describe a legitimate application that helps users.',
      category: 'malicious',
      metadata: { wordCount, complexityMarkers: [], maliciousTerms: foundMalicious },
    };
  }

  // 3. Check for too vague prompts
  if (wordCount < 10) {
    console.warn(`[PromptValidator] REJECTED: Too vague - only ${wordCount} words`);
    return {
      valid: false,
      error: 'Your description is too vague. Please include: what the app does, who will use it, and key features.',
      suggestion: 'Example: "Build a todo app where users can create tasks, mark them complete, and organize by category. Target users are busy professionals."',
      category: 'vague',
      metadata: { wordCount, complexityMarkers: [], maliciousTerms: [] },
    };
  }

  // 4. Check for over-complex prompts
  const foundComplexity = COMPLEXITY_MARKERS.filter(marker =>
    lower.includes(marker.toLowerCase())
  );

  if (foundComplexity.length >= 3) {
    console.warn(`[PromptValidator] WARNING: Over-complex - ${foundComplexity.length} major features`);
    return {
      valid: true, // Still valid, but with warning
      warning: `This is a complex project combining ${foundComplexity.join(', ')}. We'll focus on core features first and can add more later.`,
      suggestion: 'Consider starting with 1-2 core features for the MVP, then iterate.',
      category: 'complex',
      metadata: { wordCount, complexityMarkers: foundComplexity, maliciousTerms: [] },
    };
  }

  // 5. Valid prompt
  console.info(`[PromptValidator] ACCEPTED: ${wordCount} words, ${foundComplexity.length} complexity markers`);
  return {
    valid: true,
    category: 'valid',
    metadata: { wordCount, complexityMarkers: foundComplexity, maliciousTerms: [] },
  };
}

/**
 * Validate prompt and throw if invalid.
 * Use this in pipelines that need to halt on invalid input.
 */
export function assertValidPrompt(prompt: string): void {
  const result = validatePrompt(prompt);
  if (!result.valid) {
    throw new Error(result.error);
  }
}

export default validatePrompt;
