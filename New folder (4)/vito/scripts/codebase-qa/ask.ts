#!/usr/bin/env npx tsx

/**
 * OLYMPUS 3.0 - Codebase Q&A CLI
 * ==============================
 * Ask questions about the codebase and get answers
 */

import * as readline from 'readline';
import * as path from 'path';
import { getAllSourceFiles, chunkFile, CodeChunk } from './lib/chunker';
import { Embedder } from './lib/embedder';
import { QAEngine } from './lib/qa-engine';

async function loadIndex(): Promise<Embedder> {
  const embedder = new Embedder();

  // Check if we need to build index in memory
  console.log('Loading codebase index...');

  try {
    // Try to use existing Qdrant index
    await embedder.initCollection();

    // Test if index has data
    const testResults = await embedder.search('test', 1);
    if (testResults.length > 0) {
      console.log('Using existing index');
      return embedder;
    }
  } catch {
    // Continue to build in-memory index
  }

  // Build in-memory index
  console.log('Building in-memory index...');
  const srcDir = path.join(process.cwd(), 'src');
  const files = getAllSourceFiles(srcDir);

  if (files.length === 0) {
    console.log('No source files found. Make sure you are in the project root.');
    process.exit(1);
  }

  const allChunks: CodeChunk[] = [];
  for (const file of files) {
    const chunks = chunkFile(file);
    allChunks.push(...chunks);
  }

  await embedder.indexChunks(allChunks);
  console.log(`Indexed ${allChunks.length} chunks from ${files.length} files`);

  return embedder;
}

async function main(): Promise<void> {
  // Check for command line argument
  const question = process.argv.slice(2).join(' ');

  // Load or build index
  const embedder = await loadIndex();
  const qa = new QAEngine(embedder);

  if (question) {
    // Single question mode
    console.log('');
    const answer = await qa.ask(question);
    console.log('\n' + answer);
    return;
  }

  // Interactive mode
  console.log(`
╔══════════════════════════════════════════════════╗
║     OLYMPUS Codebase Q&A                         ║
╚══════════════════════════════════════════════════╝

Commands:
  - Type your question and press Enter
  - "explain <component>" - Get explanation of a component
  - "impact <target>" - Analyze impact of changing something
  - "find <concept>" - Find implementation of a concept
  - "exit" or "quit" - Exit the program

`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (): void => {
    rl.question('You: ', async input => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
        console.log('Goodbye!');
        rl.close();
        return;
      }

      try {
        let answer: string;

        // Check for special commands
        if (trimmed.toLowerCase().startsWith('explain ')) {
          const component = trimmed.slice(8).trim();
          console.log(`\nExplaining ${component}...`);
          answer = await qa.explainComponent(component);
        } else if (trimmed.toLowerCase().startsWith('impact ')) {
          const target = trimmed.slice(7).trim();
          console.log(`\nAnalyzing impact of ${target}...`);
          answer = await qa.analyzeImpact(target);
        } else if (trimmed.toLowerCase().startsWith('find ')) {
          const concept = trimmed.slice(5).trim();
          console.log(`\nFinding ${concept}...`);
          answer = await qa.findImplementation(concept);
        } else {
          answer = await qa.ask(trimmed);
        }

        console.log('\n' + '='.repeat(50));
        console.log(answer);
        console.log('='.repeat(50) + '\n');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
      }

      prompt();
    });
  };

  prompt();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
