/**
 * COMPLETE TODO APP BUILD - ALL FILES
 */

import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const OUTPUT_DIR = path.join(__dirname, 'generated-todo-app');

async function generateFile(filename: string, description: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4000,
    messages: [
      {
        role: 'system',
        content: `You are an expert developer. Generate ONLY the code for the requested file. No explanations, no markdown, just pure code.`
      },
      {
        role: 'user',
        content: `Generate the complete code for: ${filename}\n\nDescription: ${description}\n\nOutput ONLY the code, nothing else.`
      }
    ]
  });

  let content = response.choices[0]?.message?.content || '';

  // Remove markdown code blocks if present
  content = content.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim();

  return content;
}

async function main() {
  console.log('═'.repeat(70));
  console.log('GENERATING COMPLETE TODO APP');
  console.log('═'.repeat(70));
  console.log('');

  // Create output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = [
    // Database Schema
    {
      path: 'prisma/schema.prisma',
      desc: 'Prisma schema for todo app with User (id, email, password, name, createdAt), Task (id, title, completed, userId, categoryId, createdAt), Category (id, name, userId) models with proper relations'
    },
    // Types
    {
      path: 'src/lib/types/index.ts',
      desc: 'TypeScript types: User (id, email, name), Task (id, title, completed, category, createdAt), Category (id, name), CreateTaskInput, UpdateTaskInput, LoginInput, SignupInput'
    },
    // Services
    {
      path: 'src/lib/services/auth-service.ts',
      desc: 'Auth service with: login(email, password) -> User, signup(email, password, name) -> User, logout(), getCurrentUser() -> User | null. Use mock data, no real DB.'
    },
    {
      path: 'src/lib/services/task-service.ts',
      desc: 'Task service with: getTasks(userId) -> Task[], getTask(id) -> Task, createTask(input) -> Task, updateTask(id, input) -> Task, deleteTask(id) -> void, toggleTask(id) -> Task. Use in-memory array.'
    },
    // UI Components
    {
      path: 'src/components/ui/Button.tsx',
      desc: 'React Button component with TypeScript. Props: variant (primary/secondary/danger), size (sm/md/lg), loading boolean, disabled boolean, onClick, children. Use Tailwind CSS classes.'
    },
    {
      path: 'src/components/ui/Input.tsx',
      desc: 'React Input component with TypeScript. Props: label, type, placeholder, value, onChange, error string, disabled. Use Tailwind CSS with focus states.'
    },
    {
      path: 'src/components/ui/Card.tsx',
      desc: 'React Card component. Props: children, className. Simple container with shadow and rounded corners using Tailwind.'
    },
    // Task Components
    {
      path: 'src/components/tasks/TaskItem.tsx',
      desc: 'TaskItem component. Props: task (Task type), onToggle(id), onDelete(id). Shows checkbox, title (strikethrough if completed), delete button. Tailwind styling.'
    },
    {
      path: 'src/components/tasks/TaskList.tsx',
      desc: 'TaskList component. Props: tasks (Task[]), onToggle, onDelete. Maps tasks to TaskItem components. Shows empty state if no tasks.'
    },
    {
      path: 'src/components/tasks/AddTaskForm.tsx',
      desc: 'AddTaskForm component. Props: onAdd(title: string). Input field and Add button. Clears input after submit. Uses Button and Input components.'
    },
    // Pages
    {
      path: 'src/app/page.tsx',
      desc: 'Next.js 14 App Router landing page. Shows app title "Todo App", description, and two buttons: "Login" linking to /login, "Sign Up" linking to /signup. Use Tailwind, centered layout.'
    },
    {
      path: 'src/app/login/page.tsx',
      desc: 'Next.js 14 login page with "use client". Form with email/password inputs, Login button, link to signup. On submit call auth-service login. Redirect to /tasks on success.'
    },
    {
      path: 'src/app/signup/page.tsx',
      desc: 'Next.js 14 signup page with "use client". Form with name/email/password inputs, Sign Up button, link to login. On submit call auth-service signup.'
    },
    {
      path: 'src/app/tasks/page.tsx',
      desc: 'Next.js 14 tasks page with "use client". Shows AddTaskForm at top, TaskList below. Uses task-service to get/create/toggle/delete tasks. Include logout button.'
    },
    {
      path: 'src/app/layout.tsx',
      desc: 'Next.js 14 root layout. Import globals.css. Basic HTML structure with children prop. Add Inter font from next/font/google.'
    },
    // Config
    {
      path: 'tailwind.config.ts',
      desc: 'Tailwind config for Next.js. Content paths for app and components. No custom theme extensions needed.'
    },
    {
      path: 'src/app/globals.css',
      desc: 'Global CSS with Tailwind directives: @tailwind base; @tailwind components; @tailwind utilities; Plus basic body styles.'
    },
  ];

  let totalTime = 0;

  for (const file of files) {
    process.stdout.write(`Generating ${file.path}... `);
    const start = Date.now();

    const content = await generateFile(file.path, file.desc);
    const duration = Date.now() - start;
    totalTime += duration;

    // Save file
    const filePath = path.join(OUTPUT_DIR, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);

    console.log(`✓ (${duration}ms, ${content.length} chars)`);
  }

  console.log('');
  console.log('═'.repeat(70));
  console.log(`COMPLETE! Generated ${files.length} files in ${(totalTime/1000).toFixed(1)}s`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('═'.repeat(70));
  console.log('');

  // Show all files
  console.log('GENERATED FILES:');
  console.log('');

  for (const file of files) {
    const filePath = path.join(OUTPUT_DIR, file.path);
    const content = fs.readFileSync(filePath, 'utf-8');

    console.log('━'.repeat(70));
    console.log(`📄 ${file.path}`);
    console.log('━'.repeat(70));
    console.log(content);
    console.log('');
  }
}

main().catch(console.error);
