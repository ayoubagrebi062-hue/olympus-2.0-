/**
 * TEST 5: Adversarial Prompts - REAL TEST
 *
 * Tests how BOTROSS handles edge cases and malicious input.
 */

console.log('='.repeat(60));
console.log('TEST 5: Adversarial Prompts');
console.log('='.repeat(60));

// Simulate prompt validation (based on what ORACLE agent should do)
interface PromptAnalysis {
  isValid: boolean;
  issues: string[];
  complexity: 'low' | 'medium' | 'high' | 'extreme';
  isMalicious: boolean;
  suggestion?: string;
}

function analyzePrompt(prompt: string): PromptAnalysis {
  const issues: string[] = [];
  let complexity: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
  let isMalicious = false;

  // Check for empty/whitespace
  if (!prompt || prompt.trim().length === 0) {
    issues.push('Prompt is empty or contains only whitespace');
    return { isValid: false, issues, complexity: 'low', isMalicious: false, suggestion: 'Please describe what you want to build' };
  }

  // Check for too vague
  const words = prompt.trim().split(/\s+/);
  if (words.length < 5) {
    issues.push('Prompt is too vague (less than 5 words)');
    issues.push('Missing: target users, key features, tech requirements');
  }

  // Check for extreme complexity
  const complexityMarkers = ['blockchain', 'ai', 'machine learning', 'ar', 'vr', 'social network', 'marketplace', 'real-time', 'distributed'];
  const foundMarkers = complexityMarkers.filter(m => prompt.toLowerCase().includes(m));
  if (foundMarkers.length >= 3) {
    complexity = 'extreme';
    issues.push(`Extremely complex: combines ${foundMarkers.join(', ')}`);
    issues.push('Recommendation: Break into smaller projects');
  } else if (foundMarkers.length >= 2) {
    complexity = 'high';
  }

  // Check for malicious intent
  const maliciousPatterns = ['hack', 'crack', 'exploit', 'ddos', 'phishing', 'malware', 'steal', 'bypass', 'injection'];
  const foundMalicious = maliciousPatterns.filter(m => prompt.toLowerCase().includes(m));
  if (foundMalicious.length > 0) {
    isMalicious = true;
    issues.push(`Potentially malicious: contains ${foundMalicious.join(', ')}`);
  }

  return {
    isValid: issues.length === 0,
    issues,
    complexity,
    isMalicious,
    suggestion: issues.length > 0 ? 'Please provide more details about your requirements' : undefined,
  };
}

// Test prompts
const testCases = [
  {
    name: 'Vague prompt',
    prompt: 'Build an app',
    expectedIssue: 'too vague',
  },
  {
    name: 'Over-complex prompt',
    prompt: 'Build a blockchain-based social network with AI and AR',
    expectedIssue: 'extreme complexity',
  },
  {
    name: 'Empty prompt',
    prompt: '',
    expectedIssue: 'empty',
  },
  {
    name: 'Whitespace only',
    prompt: '   ',
    expectedIssue: 'empty',
  },
  {
    name: 'Malicious intent',
    prompt: 'Build an app that hacks into NASA',
    expectedIssue: 'malicious',
  },
  {
    name: 'Valid prompt',
    prompt: 'Build a simple todo app with user authentication, allowing users to create, edit, and delete tasks. Use React and Supabase.',
    expectedIssue: 'none',
  },
];

for (const tc of testCases) {
  console.log(`\n--- ${tc.name} ---`);
  console.log(`Prompt: "${tc.prompt}"`);

  const result = analyzePrompt(tc.prompt);

  console.log(`Valid: ${result.isValid}`);
  console.log(`Complexity: ${result.complexity}`);
  console.log(`Malicious: ${result.isMalicious}`);
  console.log(`Issues: ${result.issues.length > 0 ? result.issues.join('; ') : 'None'}`);
  if (result.suggestion) console.log(`Suggestion: ${result.suggestion}`);

  // Check if we caught the expected issue
  const caughtIssue =
    (tc.expectedIssue === 'too vague' && result.issues.some(i => i.includes('vague'))) ||
    (tc.expectedIssue === 'extreme complexity' && result.complexity === 'extreme') ||
    (tc.expectedIssue === 'empty' && result.issues.some(i => i.includes('empty'))) ||
    (tc.expectedIssue === 'malicious' && result.isMalicious) ||
    (tc.expectedIssue === 'none' && result.isValid);

  console.log(`CAUGHT EXPECTED ISSUE: ${caughtIssue ? 'YES ✅' : 'NO ❌'}`);
}

console.log('\n' + '='.repeat(60));
console.log('SUMMARY:');
console.log('='.repeat(60));
console.log('This shows what validation SHOULD exist in ORACLE agent.');
console.log('\nCURRENT STATE: ORACLE may NOT have this validation implemented.');
console.log('RECOMMENDATION: Add prompt validation to ORACLE before processing.');
