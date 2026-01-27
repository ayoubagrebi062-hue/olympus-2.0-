/**
 * OLYMPUS 3.0 - Relevance Validator
 * ==================================
 * Validates if generated code matches user requirements
 */

import { ValidationIssue, GeneratedOutput, RelevanceResult } from '../types';

/**
 * Validate relevance of generated output to user prompt
 */
export async function validateRelevance(output: GeneratedOutput): Promise<RelevanceResult> {
  // Use keyword matching for relevance
  return keywordRelevanceCheck(output);
}

/**
 * Keyword-based relevance check
 */
function keywordRelevanceCheck(output: GeneratedOutput): RelevanceResult {
  const issues: ValidationIssue[] = [];
  const prompt = output.prompt.toLowerCase();
  const code = output.files
    .map(f => f.content)
    .join('\n')
    .toLowerCase();

  // Extract key terms from prompt
  const keyTerms = extractKeyTerms(prompt);

  let matchedTerms = 0;
  const missingTerms: string[] = [];

  for (const term of keyTerms) {
    if (code.includes(term)) {
      matchedTerms++;
    } else {
      missingTerms.push(term);
    }
  }

  const score = keyTerms.length > 0 ? Math.round((matchedTerms / keyTerms.length) * 100) : 70; // Default score if no key terms

  if (missingTerms.length > 0 && missingTerms.length <= 5) {
    issues.push({
      code: 'MISSING_KEYWORDS',
      message: `Some requested terms not found: ${missingTerms.slice(0, 5).join(', ')}`,
      severity: 'warning',
      suggestion: 'Verify the generated code addresses all requirements',
    });
  }

  // Check for common patterns that indicate incomplete code
  if (output.files.some(f => f.content.includes('// TODO'))) {
    issues.push({
      code: 'INCOMPLETE_CODE',
      message: 'Code contains TODO comments indicating incomplete implementation',
      severity: 'info',
    });
  }

  // Check for placeholder text
  if (output.files.some(f => /lorem ipsum|placeholder|example\.com/i.test(f.content))) {
    issues.push({
      code: 'PLACEHOLDER_CONTENT',
      message: 'Code contains placeholder text that should be replaced',
      severity: 'warning',
      suggestion: 'Replace placeholder content with real data',
    });
  }

  // Check for empty components
  if (output.files.some(f => /return\s*\(\s*<>\s*<\/>\s*\)|return\s+null/.test(f.content))) {
    issues.push({
      code: 'EMPTY_COMPONENT',
      message: 'Component returns empty or null content',
      severity: 'warning',
      suggestion: 'Add meaningful content to the component',
    });
  }

  return { issues, score };
}

/**
 * Extract key terms from user prompt
 */
function extractKeyTerms(prompt: string): string[] {
  // Remove common words
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'dare',
    'ought',
    'used',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'up',
    'about',
    'into',
    'over',
    'after',
    'beneath',
    'under',
    'above',
    'create',
    'make',
    'build',
    'generate',
    'add',
    'include',
    'and',
    'or',
    'but',
    'if',
    'then',
    'else',
    'when',
    'where',
    'why',
    'how',
    'all',
    'each',
    'every',
    'both',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'nor',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    'just',
    'also',
    'now',
    'page',
    'website',
    'app',
    'application',
    'section',
    'component',
    'feature',
    'modern',
    'simple',
    'want',
    'need',
    'please',
    'help',
    'me',
    'my',
    'i',
    'you',
    'your',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'we',
    'our',
    'they',
  ]);

  const words = prompt
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return [...new Set(words)];
}

/**
 * Check if code structure matches expected patterns
 */
export function checkCodeStructure(output: GeneratedOutput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const prompt = output.prompt.toLowerCase();

  // Check for expected file types based on prompt
  const _hasReactFiles = output.files.some(f => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));
  const hasApiFiles = output.files.some(f => f.path.includes('/api/') || f.path.includes('route.'));
  const hasStyleFiles = output.files.some(f => f.path.endsWith('.css') || f.path.endsWith('.scss'));

  // If prompt mentions API but no API files
  if (
    (prompt.includes('api') || prompt.includes('backend') || prompt.includes('endpoint')) &&
    !hasApiFiles
  ) {
    issues.push({
      code: 'MISSING_API',
      message: 'Prompt mentions API but no API routes generated',
      severity: 'warning',
      suggestion: 'Add API routes if backend functionality is needed',
    });
  }

  // If prompt mentions styling but no style files (and no Tailwind)
  if (
    (prompt.includes('style') || prompt.includes('design') || prompt.includes('css')) &&
    !hasStyleFiles &&
    !output.files.some(f => f.content.includes('className'))
  ) {
    issues.push({
      code: 'MISSING_STYLES',
      message: 'Prompt mentions styling but no styles found',
      severity: 'info',
      suggestion: 'Add CSS or Tailwind classes for styling',
    });
  }

  return issues;
}
