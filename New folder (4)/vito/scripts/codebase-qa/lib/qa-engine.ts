/**
 * OLYMPUS 3.0 - Q&A Engine
 * ========================
 * Answers questions about the codebase using semantic search
 */

import { Embedder, SearchResult } from './embedder';

export class QAEngine {
  private embedder: Embedder;
  private useAI: boolean = false;

  constructor(embedder?: Embedder) {
    this.embedder = embedder || new Embedder();
    // Check if Anthropic API is available
    this.useAI = !!process.env.ANTHROPIC_API_KEY;
  }

  async ask(question: string): Promise<string> {
    console.log('Searching codebase...');

    // Find relevant code chunks
    const results = await this.embedder.search(question, 10);

    if (results.length === 0) {
      return 'No relevant code found. Try rephrasing your question or ensure the codebase is indexed.';
    }

    // Filter low-score results
    const relevantResults = results.filter(r => r.score > 0.1);

    if (relevantResults.length === 0) {
      return 'Found code but relevance scores are low. Try using more specific terms from the codebase.';
    }

    console.log(`Found ${relevantResults.length} relevant sections`);

    // Build context from results
    const context = this.buildContext(relevantResults);

    if (this.useAI) {
      return this.answerWithAI(question, context);
    } else {
      return this.answerWithoutAI(question, relevantResults);
    }
  }

  private buildContext(results: SearchResult[]): string {
    return results
      .map(r => {
        const p = r.payload;
        const header = p.name
          ? `### ${p.name} in ${p.file} (lines ${p.startLine}-${p.endLine})`
          : `### ${p.file} (lines ${p.startLine}-${p.endLine})`;

        return `${header}
\`\`\`${p.language}
${p.content.slice(0, 2000)}
\`\`\``;
      })
      .join('\n\n---\n\n');
  }

  private async answerWithAI(question: string, context: string): Promise<string> {
    console.log('Generating answer with AI...');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: `You are a helpful assistant that answers questions about the OLYMPUS codebase.
You have access to relevant code snippets found by semantic search.
Answer based on the code provided. If you're not sure, say so.
Be specific and reference file names and line numbers when relevant.
Keep answers concise but complete.`,
          messages: [
            {
              role: 'user',
              content: `Based on this code context:

${context}

Question: ${question}

Please provide a clear, accurate answer based on the code shown above.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.log('AI unavailable, falling back to code-only response');
        return this.answerWithoutAI(question, []);
      }

      const data = await response.json();
      const content = data.content?.[0];

      if (content?.type === 'text') {
        return content.text;
      }

      return 'Unable to generate answer';
    } catch (error) {
      console.log('AI request failed, showing relevant code');
      return this.answerWithoutAI(question, []);
    }
  }

  private answerWithoutAI(question: string, results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No relevant code found.';
    }

    let answer = `## Relevant Code for: "${question}"\n\n`;
    answer += `Found ${results.length} relevant sections:\n\n`;

    for (const result of results.slice(0, 5)) {
      const p = result.payload;
      const scorePct = (result.score * 100).toFixed(1);

      answer += `### ${p.name || 'Code'} (${scorePct}% match)\n`;
      answer += `**File:** \`${p.file}\` (lines ${p.startLine}-${p.endLine})\n`;
      answer += `**Type:** ${p.type}\n\n`;
      answer += `\`\`\`${p.language}\n`;
      answer += p.content.slice(0, 500);
      if (p.content.length > 500) {
        answer += '\n// ... (truncated)';
      }
      answer += '\n```\n\n';
    }

    return answer;
  }

  async analyzeImpact(target: string): Promise<string> {
    const question = `What components, files, or functions use or depend on "${target}"? What would need updating if "${target}" was modified?`;
    return this.ask(question);
  }

  async explainComponent(componentName: string): Promise<string> {
    const question = `Explain how ${componentName} works. What does it do? What are its inputs and outputs? How does it fit into the system?`;
    return this.ask(question);
  }

  async findImplementation(concept: string): Promise<string> {
    const question = `Where is ${concept} implemented? Show the main code that handles ${concept}.`;
    return this.ask(question);
  }
}
