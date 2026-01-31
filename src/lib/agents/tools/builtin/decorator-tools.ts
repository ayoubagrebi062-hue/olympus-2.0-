/**
 * OLYMPUS 2.0 - Built-in Decorator Tools
 *
 * Ready-to-use tools created with the decorator system.
 */

import { z } from 'zod';
import { createTool } from '../create-tool';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File system tools
 */
export const readFileTool = createTool({
  id: 'decorator_read_file',
  name: 'Read File',
  description: 'Read the contents of a file at the specified path',
  category: 'filesystem',
  schema: z.object({
    path: z.string().describe('Path to the file to read'),
    encoding: z.enum(['utf-8', 'base64', 'binary']).default('utf-8').describe('File encoding'),
  }),
  execute: async ({ path: filePath, encoding }) => {
    const content = await fs.readFile(filePath, encoding as BufferEncoding);
    return content;
  },
  metadata: {
    tags: ['io', 'file'],
    retryable: true,
  },
});

export const writeFileTool = createTool({
  id: 'decorator_write_file',
  name: 'Write File',
  description: 'Write content to a file at the specified path',
  category: 'filesystem',
  schema: z.object({
    path: z.string().describe('Path where to write the file'),
    content: z.string().describe('Content to write'),
    encoding: z.enum(['utf-8', 'base64']).default('utf-8').describe('File encoding'),
  }),
  execute: async ({ path: filePath, content, encoding }) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, encoding as BufferEncoding);
    return { success: true, path: filePath };
  },
  metadata: {
    tags: ['io', 'file'],
  },
});

export const listDirectoryTool = createTool({
  id: 'decorator_list_directory',
  name: 'List Directory',
  description: 'List files and directories at the specified path',
  category: 'filesystem',
  schema: z.object({
    path: z.string().describe('Directory path to list'),
    recursive: z.boolean().default(false).describe('Whether to list recursively'),
  }),
  execute: async ({ path: dirPath }) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const items = await Promise.all(
      entries.map(async entry => {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);

        return {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
    );

    return items;
  },
  metadata: {
    tags: ['io', 'file'],
    retryable: true,
  },
});

/**
 * JSON tools
 */
export const parseJsonTool = createTool({
  id: 'decorator_parse_json',
  name: 'Parse JSON',
  description: 'Parse a JSON string into an object',
  category: 'data',
  schema: z.object({
    json: z.string().describe('JSON string to parse'),
  }),
  execute: async ({ json }) => {
    // SECURITY FIX (Jan 31, 2026): Proper error handling for untrusted JSON
    try {
      return JSON.parse(json);
    } catch (error) {
      const preview = json.length > 100 ? `${json.slice(0, 100)}...` : json;
      throw new Error(
        `Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}. Input preview: ${preview}`
      );
    }
  },
  metadata: {
    tags: ['json', 'parse'],
    retryable: false,
  },
});

export const stringifyJsonTool = createTool({
  id: 'decorator_stringify_json',
  name: 'Stringify JSON',
  description: 'Convert an object to a JSON string',
  category: 'data',
  schema: z.object({
    data: z.unknown().describe('Data to stringify'),
    pretty: z.boolean().default(true).describe('Whether to format with indentation'),
  }),
  execute: async ({ data, pretty }) => {
    return JSON.stringify(data, null, pretty ? 2 : 0);
  },
  metadata: {
    tags: ['json', 'stringify'],
    retryable: false,
  },
});

/**
 * HTTP tools
 */
export const httpRequestTool = createTool({
  id: 'decorator_http_request',
  name: 'HTTP Request',
  description: 'Make an HTTP request to the specified URL',
  category: 'http',
  schema: z.object({
    url: z.string().url().describe('URL to request'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
    headers: z.record(z.string()).optional().describe('HTTP headers'),
    body: z.string().optional().describe('Request body (for POST/PUT/PATCH)'),
    timeout: z.number().default(30000).describe('Timeout in milliseconds'),
  }),
  execute: async ({ url, method, headers, body, timeout }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body || undefined,
        signal: controller.signal,
      });

      const data = await response.text();

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: data,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },
  metadata: {
    tags: ['http', 'network'],
    retryable: true,
    timeout: 30000,
  },
});

/**
 * Utility tools
 */
export const sleepTool = createTool({
  id: 'decorator_sleep',
  name: 'Sleep',
  description: 'Wait for the specified duration',
  category: 'utility',
  schema: z.object({
    ms: z.number().min(0).max(60000).describe('Milliseconds to sleep (max 60 seconds)'),
  }),
  execute: async ({ ms }) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    return { slept: ms };
  },
  metadata: {
    tags: ['utility', 'time'],
  },
});

export const getCurrentTimeTool = createTool({
  id: 'decorator_get_current_time',
  name: 'Get Current Time',
  description: 'Get the current date and time',
  category: 'utility',
  schema: z.object({
    timezone: z.string().default('UTC').describe('Timezone (e.g., America/New_York)'),
  }),
  execute: async ({ timezone }) => {
    const now = new Date();
    return {
      iso: now.toISOString(),
      timestamp: now.getTime(),
      formatted: now.toLocaleString('en-US', { timeZone: timezone }),
      timezone,
    };
  },
  metadata: {
    tags: ['utility', 'time'],
  },
});

/**
 * Register all decorator-based built-in tools
 */
export function registerDecoratorBuiltinTools(): void {
  // Tools are auto-registered by createTool
  console.log('[DecoratorTools] Built-in tools registered');
}

// Export all tools
export const decoratorBuiltinTools = {
  readFileTool,
  writeFileTool,
  listDirectoryTool,
  parseJsonTool,
  stringifyJsonTool,
  httpRequestTool,
  sleepTool,
  getCurrentTimeTool,
};
