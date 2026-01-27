/**
 * FULL BUILD - SAVE ALL GENERATED FILES
 */

import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const OUTPUT_DIR = path.join(__dirname, 'generated-todo-app');

const AGENTS = [
  {
    id: 'oracle',
    name: 'ORACLE',
    prompt: `You are ORACLE. Analyze the market for a todo app with user login.
Output JSON: { "market_analysis": {...}, "competitors": [...], "opportunities": [...], "risks": [...] }`,
  },
  {
    id: 'strategos',
    name: 'STRATEGOS',
    prompt: `You are STRATEGOS. Define MVP features for a todo app.
Output JSON: { "mvp_features": [...], "technical_requirements": {...}, "tech_stack": {...} }`,
  },
  {
    id: 'datum',
    name: 'DATUM',
    prompt: `You are DATUM, database architect. Design PostgreSQL schema for todo app with users, tasks, categories.
Output JSON with "files" array. Each file needs "path" and "content".
Create: prisma/schema.prisma with User, Task, Category models.`,
  },
  {
    id: 'pixel',
    name: 'PIXEL',
    prompt: `You are PIXEL, React component designer. Create UI components for todo app.
Output JSON with "files" array. Each file needs "path" and "content".
Create these TypeScript React components with Tailwind CSS:
- src/components/ui/Button.tsx (primary/secondary variants, loading state)
- src/components/ui/Input.tsx (with label, error state)
- src/components/ui/Card.tsx (container component)
- src/components/tasks/TaskItem.tsx (checkbox, title, delete button)
- src/components/tasks/TaskList.tsx (renders list of TaskItems)
- src/components/tasks/AddTaskForm.tsx (input + button to add task)
Make them fully functional with proper TypeScript types.`,
  },
  {
    id: 'wire',
    name: 'WIRE',
    prompt: `You are WIRE, page router. Create Next.js App Router pages for todo app.
Output JSON with "files" array. Each file needs "path" and "content".
Create:
- src/app/page.tsx (landing page with login/signup links)
- src/app/login/page.tsx (login form)
- src/app/signup/page.tsx (signup form)
- src/app/tasks/page.tsx (main todo list page - protected)
- src/app/layout.tsx (root layout with providers)
Use TypeScript, Tailwind, and proper Next.js 14 patterns.`,
  },
  {
    id: 'engine',
    name: 'ENGINE',
    prompt: `You are ENGINE, backend developer. Create services for todo app.
Output JSON with "files" array. Each file needs "path" and "content".
Create:
- src/lib/services/auth-service.ts (login, signup, logout, getCurrentUser)
- src/lib/services/task-service.ts (CRUD for tasks)
- src/lib/types/index.ts (User, Task, Category types)
Use TypeScript with proper error handling.`,
  },
];

async function runAgent(agent: typeof AGENTS[0], context: string): Promise<any> {
  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4000,
    messages: [
      { role: 'system', content: agent.prompt },
      { role: 'user', content: `Build a simple todo app with user login.\n\nContext from previous agents:\n${context}\n\nReturn ONLY valid JSON.` }
    ]
  });

  const content = response.choices[0]?.message?.content || '{}';

  // Parse JSON
  try {
    let jsonText = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonText = jsonMatch[1];
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objectMatch) jsonText = objectMatch[0];
    return JSON.parse(jsonText);
  } catch {
    return { raw: content };
  }
}

async function main() {
  console.log('═'.repeat(70));
  console.log('BUILDING TODO APP - SAVING ALL FILES');
  console.log('═'.repeat(70));
  console.log('');

  // Create output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let context = '';
  const allFiles: Array<{ path: string; content: string }> = [];

  for (const agent of AGENTS) {
    console.log(`[${agent.name}] Running...`);
    const startTime = Date.now();

    const output = await runAgent(agent, context);
    const duration = Date.now() - startTime;

    console.log(`  Done in ${duration}ms`);

    // Collect context for next agent
    context += `\n${agent.name}: ${JSON.stringify(output).slice(0, 1000)}`;

    // Save files if present
    if (output.files && Array.isArray(output.files)) {
      for (const file of output.files) {
        if (file.path && file.content) {
          allFiles.push(file);
          const filePath = path.join(OUTPUT_DIR, file.path);
          const dir = path.dirname(filePath);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, file.content);
          console.log(`  Saved: ${file.path}`);
        }
      }
    }
  }

  console.log('');
  console.log('═'.repeat(70));
  console.log('ALL GENERATED FILES');
  console.log('═'.repeat(70));
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Total files: ${allFiles.length}`);
  console.log('');

  for (const file of allFiles) {
    console.log('─'.repeat(70));
    console.log(`FILE: ${file.path}`);
    console.log('─'.repeat(70));
    console.log(file.content);
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log('BUILD COMPLETE');
  console.log('═'.repeat(70));
}

main().catch(console.error);
