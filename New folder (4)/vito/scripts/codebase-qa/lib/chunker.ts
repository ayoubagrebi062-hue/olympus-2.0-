/**
 * OLYMPUS 3.0 - Code Chunker
 * ==========================
 * Splits source files into logical chunks for embedding
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CodeChunk {
  id: string;
  file: string;
  content: string;
  type: 'function' | 'class' | 'component' | 'interface' | 'config' | 'other';
  startLine: number;
  endLine: number;
  language: string;
  name?: string;
}

const IGNORED_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'coverage',
  '.turbo',
  '.cache',
];

const IGNORED_FILES = [
  '.DS_Store',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

export function getAllSourceFiles(rootDir: string): string[] {
  const files: string[] = [];

  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        if (
          !IGNORED_FILES.includes(entry.name) &&
          CODE_EXTENSIONS.some(ext => entry.name.endsWith(ext))
        ) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(rootDir);
  return files;
}

export function chunkFile(filePath: string): CodeChunk[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const language = getLanguage(filePath);

  // Strategy: chunk by logical units (functions, classes, components)
  // or by fixed size if no logical boundaries found
  const logicalChunks = extractLogicalChunks(content, filePath, language);

  if (logicalChunks.length > 0) {
    return logicalChunks;
  }

  // Fallback: fixed-size chunks with overlap
  const chunks: CodeChunk[] = [];
  const CHUNK_SIZE = 50; // lines
  const OVERLAP = 10;

  for (let i = 0; i < lines.length; i += CHUNK_SIZE - OVERLAP) {
    const chunkLines = lines.slice(i, i + CHUNK_SIZE);
    if (chunkLines.length < 5) continue; // Skip tiny chunks

    chunks.push({
      id: `${filePath}#L${i + 1}`,
      file: filePath,
      content: chunkLines.join('\n'),
      type: 'other',
      startLine: i + 1,
      endLine: Math.min(i + CHUNK_SIZE, lines.length),
      language,
    });
  }

  // If no chunks from fixed-size, create one for the whole file
  if (chunks.length === 0 && lines.length > 0) {
    chunks.push({
      id: `${filePath}#full`,
      file: filePath,
      content: content.slice(0, 5000), // Limit size
      type: 'other',
      startLine: 1,
      endLine: lines.length,
      language,
    });
  }

  return chunks;
}

interface LogicalChunk {
  content: string;
  type: CodeChunk['type'];
  startLine: number;
  endLine: number;
  name?: string;
}

function extractLogicalChunks(
  content: string,
  filePath: string,
  language: string
): CodeChunk[] {
  const chunks: LogicalChunk[] = [];
  const lines = content.split('\n');

  // Patterns for different constructs
  const patterns: { type: CodeChunk['type']; pattern: RegExp }[] = [
    // React components (capitalized functions)
    { type: 'component', pattern: /^(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w+)/ },
    // Arrow function components
    { type: 'component', pattern: /^(?:export\s+)?(?:const|let)\s+([A-Z]\w+)\s*[:=].*(?:React\.FC|FC<|=>)/ },
    // Classes
    { type: 'class', pattern: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/ },
    // Regular functions
    { type: 'function', pattern: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/ },
    // Arrow functions assigned to const
    { type: 'function', pattern: /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*\w+(?:<[^>]+>)?)?\s*=>/ },
    // Interfaces
    { type: 'interface', pattern: /^(?:export\s+)?interface\s+(\w+)/ },
    // Type aliases
    { type: 'interface', pattern: /^(?:export\s+)?type\s+(\w+)\s*=/ },
  ];

  type ChunkState = {
    startLine: number;
    content: string[];
    type: CodeChunk['type'];
    name: string;
  };

  let currentChunk: ChunkState | null = null;
  let braceCount = 0;
  let parenCount = 0;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const trimmedLine = line.trim();

    // Check if this starts a new construct (only when not inside a block)
    if (braceCount === 0 && parenCount === 0) {
      for (const { type, pattern } of patterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          // Save previous chunk if exists
          if (currentChunk && currentChunk.content.length > 0) {
            chunks.push({
              content: currentChunk.content.join('\n'),
              type: currentChunk.type,
              startLine: currentChunk.startLine,
              endLine: lineNum,
              name: currentChunk.name,
            });
          }

          currentChunk = {
            startLine: lineNum + 1,
            content: [line],
            type,
            name: match[1] || 'anonymous',
          };
          break;
        }
      }
    }

    // Track braces and parens to know when construct ends
    for (const char of line) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
    }

    // Add line to current chunk (avoid duplicates)
    if (currentChunk) {
      if (currentChunk.content[currentChunk.content.length - 1] !== line) {
        currentChunk.content.push(line);
      }

      // If braces balanced and we have substantial content, chunk is complete
      if (braceCount === 0 && parenCount === 0 && currentChunk.content.length > 2) {
        // Check if this line ends the construct (closing brace or semicolon)
        if (trimmedLine.endsWith('}') || trimmedLine.endsWith('};') || trimmedLine.endsWith(';')) {
          chunks.push({
            content: currentChunk.content.join('\n'),
            type: currentChunk.type,
            startLine: currentChunk.startLine,
            endLine: lineNum + 1,
            name: currentChunk.name,
          });
          currentChunk = null;
        }
      }
    }
  }

  // Don't forget last chunk
  if (currentChunk && currentChunk.content.length > 0) {
    chunks.push({
      content: currentChunk.content.join('\n'),
      type: currentChunk.type,
      startLine: currentChunk.startLine,
      endLine: lines.length,
      name: currentChunk.name,
    });
  }

  // Convert to CodeChunk format
  return chunks.map((chunk, index) => ({
    id: `${filePath}#${chunk.name || index}`,
    file: filePath,
    content: chunk.content.slice(0, 5000), // Limit size
    type: chunk.type,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    language,
    name: chunk.name,
  }));
}

function getLanguage(filePath: string): string {
  if (filePath.endsWith('.tsx')) return 'tsx';
  if (filePath.endsWith('.ts')) return 'typescript';
  if (filePath.endsWith('.jsx')) return 'jsx';
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) return 'javascript';
  if (filePath.endsWith('.json')) return 'json';
  return 'unknown';
}

// Stats helper
export function getChunkStats(chunks: CodeChunk[]): {
  total: number;
  byType: Record<string, number>;
  byLanguage: Record<string, number>;
  avgLength: number;
} {
  const byType: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  let totalLength = 0;

  for (const chunk of chunks) {
    byType[chunk.type] = (byType[chunk.type] || 0) + 1;
    byLanguage[chunk.language] = (byLanguage[chunk.language] || 0) + 1;
    totalLength += chunk.content.length;
  }

  return {
    total: chunks.length,
    byType,
    byLanguage,
    avgLength: chunks.length > 0 ? Math.round(totalLength / chunks.length) : 0,
  };
}
