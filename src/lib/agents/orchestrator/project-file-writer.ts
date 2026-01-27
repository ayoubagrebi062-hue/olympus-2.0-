/**
 * PROJECT FILE WRITER
 *
 * FIXES THE CRITICAL BUG: Agents generate file artifacts that are saved to DB
 * but never written to disk. This causes "build success" claims while the
 * generated project doesn't actually exist.
 *
 * This module:
 * 1. Loads all agent artifacts from the database
 * 2. Extracts files with path and content
 * 3. Writes them to the target output directory
 */

import { mkdir, writeFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import type { AgentId, AgentOutput, Artifact } from '../types';
import { loadAgentOutputs } from '../context/persistence';

export interface FileWriterConfig {
  buildId: string;
  outputPath: string;
  cleanBeforeWrite?: boolean; // Delete existing files first
  dryRun?: boolean; // Just report what would be written
  agentOutputs?: Map<AgentId, AgentOutput>; // Pass outputs directly (avoids DB dependency)
}

export interface FileWriterResult {
  success: boolean;
  filesWritten: number;
  errors: string[];
  files: Array<{
    path: string;
    source: AgentId;
    size: number;
  }>;
  skipped: Array<{
    path: string;
    reason: string;
  }>;
}

/**
 * Extract all file artifacts from agent outputs and write to disk
 */
export async function writeProjectFiles(config: FileWriterConfig): Promise<FileWriterResult> {
  const {
    buildId,
    outputPath,
    cleanBeforeWrite = false,
    dryRun = false,
    agentOutputs: providedOutputs,
  } = config;

  const result: FileWriterResult = {
    success: false,
    filesWritten: 0,
    errors: [],
    files: [],
    skipped: [],
  };

  console.log(`[FileWriter] Starting file extraction for build ${buildId}`);
  console.log(`[FileWriter] Output path: ${outputPath}`);
  console.log(`[FileWriter] Dry run: ${dryRun}`);

  try {
    // Step 1: Use provided outputs OR load from database
    let agentOutputs: Map<AgentId, AgentOutput>;
    if (providedOutputs && providedOutputs.size > 0) {
      agentOutputs = providedOutputs;
      console.log(
        `[FileWriter] Using ${agentOutputs.size} provided agent outputs (no DB required)`
      );
    } else {
      agentOutputs = await loadAgentOutputs(buildId);
      console.log(`[FileWriter] Loaded outputs from ${agentOutputs.size} agents (from DB)`);
    }

    if (agentOutputs.size === 0) {
      result.errors.push('No agent outputs found in database');
      return result;
    }

    // Step 2: Clean output directory if requested
    if (cleanBeforeWrite && !dryRun && existsSync(outputPath)) {
      console.log(`[FileWriter] Cleaning output directory: ${outputPath}`);
      await rm(outputPath, { recursive: true, force: true });
    }

    // Step 3: Create output directory
    if (!dryRun) {
      await mkdir(outputPath, { recursive: true });
    }

    // Step 4: Extract and write files from each agent's artifacts
    const fileMap = new Map<string, { content: string; source: AgentId }>();

    for (const [agentId, output] of agentOutputs) {
      if (!output.artifacts || output.artifacts.length === 0) {
        continue;
      }

      for (const artifact of output.artifacts) {
        const filePath = extractFilePath(artifact);
        const fileContent = extractFileContent(artifact);

        if (!filePath) {
          result.skipped.push({
            path: `${agentId}:${artifact.id || 'unknown'}`,
            reason: 'No file path specified',
          });
          continue;
        }

        if (!fileContent) {
          result.skipped.push({
            path: filePath,
            reason: 'No content to write',
          });
          continue;
        }

        // Later agents override earlier ones (intentional - allows refinement)
        if (fileMap.has(filePath)) {
          console.log(
            `[FileWriter] File ${filePath} updated by ${agentId} (was from ${fileMap.get(filePath)!.source})`
          );
        }

        fileMap.set(filePath, { content: fileContent, source: agentId });
      }
    }

    console.log(`[FileWriter] Found ${fileMap.size} unique files to write`);

    // Step 5: Write all files
    for (const [relativePath, { content, source }] of fileMap) {
      const fullPath = join(outputPath, relativePath);

      try {
        if (!dryRun) {
          // Create directory structure
          await mkdir(dirname(fullPath), { recursive: true });
          // Write file
          await writeFile(fullPath, content, 'utf-8');
        }

        result.files.push({
          path: relativePath,
          source,
          size: Buffer.byteLength(content, 'utf-8'),
        });
        result.filesWritten++;

        console.log(
          `[FileWriter] ${dryRun ? 'Would write' : 'Wrote'}: ${relativePath} (${source})`
        );
      } catch (writeError) {
        const errorMsg = writeError instanceof Error ? writeError.message : 'Unknown error';
        result.errors.push(`Failed to write ${relativePath}: ${errorMsg}`);
      }
    }

    // Step 6: Generate package.json if missing
    const hasPackageJson = fileMap.has('package.json');
    if (!hasPackageJson) {
      console.log(`[FileWriter] WARNING: No package.json found in artifacts`);
      result.skipped.push({
        path: 'package.json',
        reason: 'Not generated by any agent',
      });
    }

    result.success = result.errors.length === 0 && result.filesWritten > 0;

    console.log(
      `[FileWriter] Complete. Files written: ${result.filesWritten}, Errors: ${result.errors.length}`
    );

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`File writer failed: ${errorMsg}`);
    console.error(`[FileWriter] Fatal error:`, error);
    return result;
  }
}

/**
 * Extract file path from artifact
 * Supports multiple artifact formats
 */
function extractFilePath(artifact: Artifact): string | null {
  // Direct path field
  if (artifact.path) {
    return normalizePath(artifact.path);
  }

  // Check metadata for path
  if (artifact.metadata) {
    if (typeof artifact.metadata.path === 'string') {
      return normalizePath(artifact.metadata.path);
    }
    if (typeof artifact.metadata.filePath === 'string') {
      return normalizePath(artifact.metadata.filePath);
    }
    if (typeof artifact.metadata.file === 'string') {
      return normalizePath(artifact.metadata.file);
    }
  }

  // For code artifacts, try to extract from content
  if (artifact.type === 'code' && artifact.content) {
    // Check for file path comment at start
    const pathMatch = artifact.content.match(/^\/\/\s*file:\s*(.+)$/m);
    if (pathMatch) {
      return normalizePath(pathMatch[1].trim());
    }
  }

  return null;
}

/**
 * Extract file content from artifact
 */
function extractFileContent(artifact: Artifact): string | null {
  if (typeof artifact.content === 'string' && artifact.content.length > 0) {
    // Strip file path comment if present
    return artifact.content.replace(/^\/\/\s*file:\s*.+\n/, '').trim();
  }

  // Check metadata for content
  if (artifact.metadata && typeof artifact.metadata.content === 'string') {
    return artifact.metadata.content;
  }

  return null;
}

/**
 * Normalize file path to consistent format
 */
function normalizePath(path: string): string {
  // Remove leading slashes and ./
  let normalized = path.replace(/^[./\\]+/, '');

  // Convert backslashes to forward slashes
  normalized = normalized.replace(/\\/g, '/');

  // Remove any src/ prefix if present (we'll add it to output path)
  // Actually, keep it - the artifact should specify the full relative path

  return normalized;
}

/**
 * Get summary of files by type
 */
export function summarizeFiles(result: FileWriterResult): {
  byType: Record<string, number>;
  byAgent: Record<string, number>;
  totalSize: number;
} {
  const byType: Record<string, number> = {};
  const byAgent: Record<string, number> = {};
  let totalSize = 0;

  for (const file of result.files) {
    // Count by file extension
    const ext = file.path.split('.').pop() || 'unknown';
    byType[ext] = (byType[ext] || 0) + 1;

    // Count by source agent
    byAgent[file.source] = (byAgent[file.source] || 0) + 1;

    totalSize += file.size;
  }

  return { byType, byAgent, totalSize };
}
