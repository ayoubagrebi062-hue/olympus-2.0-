import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  const startTime = Date.now();

  try {
    // Path to the master build prompt
    const promptPath = join(process.cwd(), 'OLYMPUS_BUILD_PROMPT.md');

    let promptContent: string;
    try {
      promptContent = await readFile(promptPath, 'utf-8');
    } catch {
      return NextResponse.json({
        loaded: false,
        error: `Build prompt file not found at: ${promptPath}`,
        duration: Date.now() - startTime,
      });
    }

    // Parse sections
    const sections = promptContent.split(/^#\s/m).filter(Boolean);
    const sectionCount = sections.length;

    // Word count
    const wordCount = promptContent.split(/\s+/).length;

    // Extract key information
    const hasTechStack = promptContent.includes('SECTION 1: TECH STACK');
    const hasDesignSystem = promptContent.includes('SECTION 2: DESIGN SYSTEM');
    const hasLandingPage = promptContent.includes('SECTION 3: LANDING PAGE');
    const hasDatabase = promptContent.includes('SECTION 5: DATABASE SCHEMA');
    const hasAPI = promptContent.includes('SECTION 6: API ROUTES');
    const hasPages = promptContent.includes('SECTION 10: PAGES TO BUILD');

    const missingCritical: string[] = [];
    if (!hasTechStack) missingCritical.push('Tech Stack');
    if (!hasDesignSystem) missingCritical.push('Design System');
    if (!hasLandingPage) missingCritical.push('Landing Page');
    if (!hasDatabase) missingCritical.push('Database Schema');
    if (!hasAPI) missingCritical.push('API Routes');
    if (!hasPages) missingCritical.push('Pages to Build');

    if (missingCritical.length > 3) {
      return NextResponse.json({
        loaded: false,
        error: `Build prompt is missing critical sections: ${missingCritical.join(', ')}`,
        duration: Date.now() - startTime,
      });
    }

    return NextResponse.json({
      loaded: true,
      sections: sectionCount,
      wordCount,
      characteristics: {
        hasTechStack,
        hasDesignSystem,
        hasLandingPage,
        hasDatabase,
        hasAPI,
        hasPages,
      },
      missingCritical: missingCritical.length > 0 ? missingCritical : null,
      promptPreview: promptContent.substring(0, 500) + '...',
      duration: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        loaded: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
