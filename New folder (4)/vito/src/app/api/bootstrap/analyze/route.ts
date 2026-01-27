import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  const startTime = Date.now();

  try {
    // Load the master build prompt
    const promptPath = join(process.cwd(), 'OLYMPUS_BUILD_PROMPT.md');
    let promptContent: string;

    try {
      promptContent = await readFile(promptPath, 'utf-8');
    } catch {
      return NextResponse.json({
        analyzed: false,
        error: 'Build prompt file not found',
        duration: Date.now() - startTime,
      });
    }

    // Analyze complexity based on content
    const analysis = analyzePrompt(promptContent);

    return NextResponse.json({
      analyzed: true,
      ...analysis,
      duration: Date.now() - startTime,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      analyzed: false,
      error: errorMessage,
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}

function analyzePrompt(content: string): {
  type: string;
  complexity: 'low' | 'medium' | 'high' | 'extreme';
  estimatedAgents: number;
  estimatedTokens: number;
  estimatedCost: number;
  features: string[];
  techStack: string[];
  pages: string[];
} {
  const features: string[] = [];
  const techStack: string[] = [];
  const pages: string[] = [];

  // Detect tech stack
  if (content.includes('Next.js')) techStack.push('Next.js');
  if (content.includes('React')) techStack.push('React');
  if (content.includes('TypeScript')) techStack.push('TypeScript');
  if (content.includes('Tailwind')) techStack.push('Tailwind CSS');
  if (content.includes('Supabase')) techStack.push('Supabase');
  if (content.includes('Stripe')) techStack.push('Stripe');
  if (content.includes('Framer Motion')) techStack.push('Framer Motion');

  // Detect features
  if (content.includes('Auth') || content.includes('login')) features.push('Authentication');
  if (content.includes('Dashboard')) features.push('Dashboard');
  if (content.includes('Glassmorphism')) features.push('Glassmorphism UI');
  if (content.includes('40 agents')) features.push('40 Agent System');
  if (content.includes('Real-time') || content.includes('SSE')) features.push('Real-time Updates');
  if (content.includes('API')) features.push('REST API');
  if (content.includes('Payment') || content.includes('Stripe')) features.push('Payments');
  if (content.includes('Team')) features.push('Team Management');

  // Detect pages
  const pageMatches = content.match(/\/[a-z\-\/\[\]]+/gi) || [];
  const uniquePages = [...new Set(pageMatches.filter((p) => p.length > 1 && !p.includes('//')))];
  pages.push(...uniquePages.slice(0, 20));

  // Calculate complexity
  const wordCount = content.split(/\s+/).length;
  const sectionCount = (content.match(/^#\s/gm) || []).length;

  let complexity: 'low' | 'medium' | 'high' | 'extreme';
  let estimatedAgents: number;

  if (wordCount > 5000 || sectionCount > 12) {
    complexity = 'extreme';
    estimatedAgents = 40;
  } else if (wordCount > 3000 || sectionCount > 8) {
    complexity = 'high';
    estimatedAgents = 30;
  } else if (wordCount > 1500 || sectionCount > 5) {
    complexity = 'medium';
    estimatedAgents = 20;
  } else {
    complexity = 'low';
    estimatedAgents = 10;
  }

  // Estimate tokens and cost
  const estimatedTokens = wordCount * 3 * estimatedAgents;
  const estimatedCost = (estimatedTokens / 1000) * 0.003; // Approximate cost

  return {
    type: 'Full Platform Build',
    complexity,
    estimatedAgents,
    estimatedTokens,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    features,
    techStack,
    pages,
  };
}
