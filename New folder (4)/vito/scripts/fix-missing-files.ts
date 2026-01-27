/**
 * FIX MISSING FILES
 *
 * Adds missing critical files that agents failed to generate
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const OUTPUT_DIR = path.resolve(__dirname, '../generated-project');

// Missing files with their content
const MISSING_FILES: Record<string, string> = {
  'src/app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`,

  'src/lib/prisma.ts': `import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
`,

  'src/lib/auth.ts': `import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getServerUser() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireAuth() {
  const user = await getServerUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
`,

  'src/lib/utils.ts': `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,

  'src/components/landing/hero.tsx': `export function Hero() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6">
          Welcome to OLYMPUS
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          The next-generation app builder powered by AI
        </p>
        <div className="flex gap-4 justify-center">
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition">
            Get Started
          </button>
          <button className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
`,

  'prisma/schema.prisma': `// Prisma Schema for OLYMPUS

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`,
};

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING MISSING FILES');
  console.log('='.repeat(60));
  console.log('');

  let created = 0;
  let skipped = 0;

  for (const [relativePath, content] of Object.entries(MISSING_FILES)) {
    const fullPath = path.join(OUTPUT_DIR, relativePath);
    const dir = path.dirname(fullPath);

    // Create directory if needed
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Check if file exists
    if (existsSync(fullPath)) {
      console.log(`  SKIP: ${relativePath} (already exists)`);
      skipped++;
    } else {
      writeFileSync(fullPath, content, 'utf-8');
      console.log(`  CREATE: ${relativePath}`);
      created++;
    }
  }

  console.log('');
  console.log(`Created: ${created}, Skipped: ${skipped}`);
  console.log('');
  console.log('Now run: cd generated-project && npm run build');
}

main().catch(console.error);
