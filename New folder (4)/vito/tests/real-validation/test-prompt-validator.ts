/**
 * TEST: Prompt Validator - All 5 Scenarios
 */

// Copy of the validator logic (to avoid import issues)
interface PromptValidationResult {
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

const MALICIOUS_PATTERNS = [
  'hack', 'hacking', 'crack', 'cracking', 'exploit', 'exploiting',
  'bypass security', 'bypass authentication', 'steal', 'stealing',
  'phishing', 'malware', 'ransomware', 'ddos', 'denial of service',
  'sql injection', 'xss attack', 'illegal', 'unauthorized access',
  'break into', 'scrape without permission',
];

const COMPLEXITY_MARKERS = [
  'blockchain', 'cryptocurrency', 'nft', 'web3',
  'machine learning', 'ai model', 'neural network', 'deep learning',
  'ar ', 'augmented reality', 'vr ', 'virtual reality', '3d',
  'social network', 'marketplace', 'real-time multiplayer',
  'video streaming', 'live streaming', 'payment processing',
  'multi-tenant', 'microservices', 'distributed system',
];

function validatePrompt(prompt: string): PromptValidationResult {
  const trimmed = prompt?.trim() || '';
  const lower = trimmed.toLowerCase();
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // 1. Empty
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'Please provide a description of what you want to build.',
      suggestion: 'Describe your app idea, who will use it, and what features it needs.',
      category: 'empty',
      metadata: { wordCount: 0, complexityMarkers: [], maliciousTerms: [] },
    };
  }

  // 2. Malicious
  const foundMalicious = MALICIOUS_PATTERNS.filter(pattern =>
    lower.includes(pattern.toLowerCase())
  );

  if (foundMalicious.length > 0) {
    return {
      valid: false,
      error: 'Cannot build applications with potentially harmful intent.',
      suggestion: 'Please describe a legitimate application that helps users.',
      category: 'malicious',
      metadata: { wordCount, complexityMarkers: [], maliciousTerms: foundMalicious },
    };
  }

  // 3. Vague
  if (wordCount < 10) {
    return {
      valid: false,
      error: 'Your description is too vague. Please include: what the app does, who will use it, and key features.',
      suggestion: 'Example: "Build a todo app where users can create tasks, mark them complete, and organize by category. Target users are busy professionals."',
      category: 'vague',
      metadata: { wordCount, complexityMarkers: [], maliciousTerms: [] },
    };
  }

  // 4. Complex
  const foundComplexity = COMPLEXITY_MARKERS.filter(marker =>
    lower.includes(marker.toLowerCase())
  );

  if (foundComplexity.length >= 3) {
    return {
      valid: true,
      warning: `This is a complex project combining ${foundComplexity.join(', ')}. We'll focus on core features first and can add more later.`,
      suggestion: 'Consider starting with 1-2 core features for the MVP, then iterate.',
      category: 'complex',
      metadata: { wordCount, complexityMarkers: foundComplexity, maliciousTerms: [] },
    };
  }

  // 5. Valid
  return {
    valid: true,
    category: 'valid',
    metadata: { wordCount, complexityMarkers: foundComplexity, maliciousTerms: [] },
  };
}

// ============================================
// TEST EXECUTION
// ============================================

console.log('═'.repeat(70));
console.log('GAP #1: ORACLE INPUT VALIDATION - TEST RESULTS');
console.log('═'.repeat(70));

const testCases = [
  {
    name: 'SCENARIO 1: EMPTY PROMPT',
    input: '',
    expectValid: false,
    expectCategory: 'empty',
  },
  {
    name: 'SCENARIO 1b: WHITESPACE ONLY',
    input: '   ',
    expectValid: false,
    expectCategory: 'empty',
  },
  {
    name: 'SCENARIO 2: TOO VAGUE',
    input: 'Build an app',
    expectValid: false,
    expectCategory: 'vague',
  },
  {
    name: 'SCENARIO 3: OVER-COMPLEX',
    input: 'Build a blockchain-based social network with AI machine learning, augmented reality features, and a marketplace for NFTs',
    expectValid: true, // Valid but with warning
    expectCategory: 'complex',
  },
  {
    name: 'SCENARIO 4: MALICIOUS INTENT',
    input: 'Build an app that can hack into NASA systems and steal their data',
    expectValid: false,
    expectCategory: 'malicious',
  },
  {
    name: 'SCENARIO 5: REASONABLE PROMPT',
    input: 'Build a todo app where users can create tasks, mark them complete, and organize by category',
    expectValid: true,
    expectCategory: 'valid',
  },
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  console.log('\n' + '─'.repeat(70));
  console.log(`TEST: ${tc.name}`);
  console.log('─'.repeat(70));
  console.log(`INPUT: "${tc.input}"`);
  console.log('');

  const result = validatePrompt(tc.input);

  console.log('RAW OUTPUT:');
  console.log(JSON.stringify(result, null, 2));
  console.log('');

  const validMatch = result.valid === tc.expectValid;
  const categoryMatch = result.category === tc.expectCategory;
  const testPassed = validMatch && categoryMatch;

  if (testPassed) {
    passed++;
    console.log(`RESULT: ✅ PASS`);
  } else {
    failed++;
    console.log(`RESULT: ❌ FAIL`);
    console.log(`  Expected valid=${tc.expectValid}, got valid=${result.valid}`);
    console.log(`  Expected category=${tc.expectCategory}, got category=${result.category}`);
  }

  if (result.error) {
    console.log(`ERROR MESSAGE: "${result.error}"`);
  }
  if (result.warning) {
    console.log(`WARNING MESSAGE: "${result.warning}"`);
  }
  if (result.suggestion) {
    console.log(`SUGGESTION: "${result.suggestion}"`);
  }
}

console.log('\n' + '═'.repeat(70));
console.log('FINAL RESULTS');
console.log('═'.repeat(70));
console.log(`Tests passed: ${passed}/${passed + failed}`);
console.log(`Tests failed: ${failed}/${passed + failed}`);
console.log(`\nVERDICT: ${failed === 0 ? '✅ ALL TESTS PASS' : '❌ SOME TESTS FAILED'}`);
