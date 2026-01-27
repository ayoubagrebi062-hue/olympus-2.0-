#!/usr/bin/env npx ts-node

/**
 * OLYMPUS 3.0 - API Documentation Generator
 * ==========================================
 * Generates API documentation from route files
 */

import * as fs from 'fs';
import * as path from 'path';

interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  requestBody?: string;
  responseBody?: string;
  file: string;
}

function extractEndpointsFromFile(filePath: string, routePath: string): APIEndpoint[] {
  const endpoints: APIEndpoint[] = [];

  if (!fs.existsSync(filePath)) return endpoints;

  const content = fs.readFileSync(filePath, 'utf-8');

  // Detect HTTP methods exported from the file
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  for (const method of methods) {
    // Check for exported function with method name
    const patterns = [
      new RegExp(`export\\s+(async\\s+)?function\\s+${method}`, 'i'),
      new RegExp(`export\\s+const\\s+${method}\\s*=`, 'i'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        // Try to extract description from comments
        const commentMatch = content.match(new RegExp(`\\/\\*\\*[\\s\\S]*?\\*\\/\\s*export\\s+(async\\s+)?function\\s+${method}`, 'i'));
        let description = 'No description available';

        if (commentMatch) {
          const commentText = commentMatch[0];
          const descMatch = commentText.match(/\*\s+(.+?)(?:\n|\*\/)/);
          if (descMatch) {
            description = descMatch[1].trim();
          }
        }

        endpoints.push({
          path: routePath,
          method: method.toUpperCase(),
          description,
          file: filePath,
        });
        break;
      }
    }
  }

  return endpoints;
}

function findAPIRoutes(dir: string, basePath: string = '/api'): APIEndpoint[] {
  const endpoints: APIEndpoint[] = [];

  if (!fs.existsSync(dir)) return endpoints;

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Handle dynamic routes
      let routeSegment = item;
      if (item.startsWith('[') && item.endsWith(']')) {
        routeSegment = `:${item.slice(1, -1)}`;
      }

      const subEndpoints = findAPIRoutes(fullPath, `${basePath}/${routeSegment}`);
      endpoints.push(...subEndpoints);
    } else if (item === 'route.ts' || item === 'route.js') {
      const fileEndpoints = extractEndpointsFromFile(fullPath, basePath);
      endpoints.push(...fileEndpoints);
    }
  }

  return endpoints;
}

function generateAPIDocs(rootDir: string): string {
  console.log('Scanning API routes...');

  const apiDir = path.join(rootDir, 'src', 'app', 'api');
  const endpoints = findAPIRoutes(apiDir);

  if (endpoints.length === 0) {
    console.log('No API routes found');
    return '# API Documentation\n\nNo API routes found in src/app/api/';
  }

  console.log(`Found ${endpoints.length} endpoints`);

  // Group by base path
  const grouped: Record<string, APIEndpoint[]> = {};

  for (const endpoint of endpoints) {
    const parts = endpoint.path.split('/').filter(Boolean);
    const group = parts[1] || 'root'; // e.g., /api/build -> build

    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(endpoint);
  }

  // Generate markdown
  let markdown = `# OLYMPUS API Documentation

> Auto-generated API documentation

## Base URL

\`\`\`
http://localhost:3000/api
\`\`\`

## Authentication

Most endpoints require authentication via Supabase session cookie or API key.

## Endpoints

`;

  for (const [group, eps] of Object.entries(grouped).sort()) {
    markdown += `### ${group.charAt(0).toUpperCase() + group.slice(1)}\n\n`;

    for (const ep of eps.sort((a, b) => a.path.localeCompare(b.path))) {
      const methodBadge = `\`${ep.method}\``;
      markdown += `#### ${methodBadge} ${ep.path}\n\n`;
      markdown += `${ep.description}\n\n`;
      markdown += `**Source:** \`${ep.file.replace(rootDir, '.')}\`\n\n`;
      markdown += `---\n\n`;
    }
  }

  markdown += `
## Error Responses

All endpoints return errors in a consistent format:

\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Rate Limiting

API requests are rate limited based on user tier:

| Tier | Requests/minute |
|------|-----------------|
| Free | 20 |
| Pro | 100 |
| Enterprise | Unlimited |

---

*Generated on ${new Date().toISOString().split('T')[0]}*
`;

  return markdown;
}

// Main execution
async function main(): Promise<void> {
  try {
    const rootDir = process.cwd();
    const docs = generateAPIDocs(rootDir);

    // Write to docs/generated
    const outputDir = path.join(rootDir, 'docs', 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'API.generated.md');
    fs.writeFileSync(outputPath, docs);

    console.log(`\nAPI documentation generated at ${outputPath}`);
  } catch (error) {
    console.error('Error generating API docs:', error);
    process.exit(1);
  }
}

main();
