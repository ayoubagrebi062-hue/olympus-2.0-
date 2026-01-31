/**
 * PROJECT SCAFFOLDER
 *
 * Ensures critical config files exist after agent generation.
 * Agents often miss config files like tsconfig.node.json, postcss.config.js.
 * This scaffolder fills in the gaps with sensible defaults.
 *
 * IMPORTANT: This is a fallback. Agents SHOULD generate these files.
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export interface ScaffoldConfig {
  projectPath: string;
  projectName?: string;
  overwrite?: boolean; // Overwrite existing files
}

export interface ScaffoldResult {
  created: string[];
  skipped: string[];
  errors: string[];
}

// Required config files with their default content
const REQUIRED_CONFIG_FILES: Record<string, (name: string) => string> = {
  'package.json': name =>
    JSON.stringify(
      {
        name: name.toLowerCase().replace(/\s+/g, '-'),
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          next: '^14.0.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          '@supabase/supabase-js': '^2.38.0',
          '@supabase/ssr': '^0.0.10',
          '@prisma/client': '^5.7.0',
          zustand: '^4.4.0',
          zod: '^3.22.0',
          'lucide-react': '^0.294.0',
          'class-variance-authority': '^0.7.0',
          clsx: '^2.0.0',
          'tailwind-merge': '^2.1.0',
          axios: '^1.6.0',
        },
        devDependencies: {
          typescript: '^5.3.0',
          '@types/node': '^20.10.0',
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          tailwindcss: '^3.3.0',
          postcss: '^8.4.0',
          autoprefixer: '^10.4.0',
          eslint: '^8.55.0',
          'eslint-config-next': '^14.0.0',
          prisma: '^5.7.0',
        },
      },
      null,
      2
    ),

  'tsconfig.json': () =>
    JSON.stringify(
      {
        compilerOptions: {
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [{ name: 'next' }],
          paths: {
            '@/*': ['./src/*'],
          },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      },
      null,
      2
    ),

  // This file is often referenced by tsconfig.json but never created
  'tsconfig.node.json': () =>
    JSON.stringify(
      {
        compilerOptions: {
          composite: true,
          skipLibCheck: true,
          module: 'ESNext',
          moduleResolution: 'bundler',
          allowSyntheticDefaultImports: true,
        },
        include: ['vite.config.ts', 'tailwind.config.ts', 'postcss.config.js'],
      },
      null,
      2
    ),

  'next.config.js': () => `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
`,

  'postcss.config.js': () => `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,

  'tailwind.config.ts': () => `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};

export default config;
`,

  '.env.local': () => `# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
`,

  '.gitignore': () => `# Dependencies
node_modules/
.pnp
.pnp.js

# Build
.next/
out/
build/
dist/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
`,

  'src/app/globals.css': () => `@tailwind base;
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

  'src/app/layout.tsx': () => `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OLYMPUS App',
  description: 'Built with OLYMPUS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
`,

  'src/app/page.tsx': () => `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to OLYMPUS</h1>
      <p className="mt-4 text-muted-foreground">Your app is ready.</p>
    </main>
  );
}
`,

  'src/lib/utils.ts': () => `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,

  // Common lib files that agents import but often forget to generate
  'src/lib/prisma.ts': () => `import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
`,

  'src/lib/auth.ts': () => `import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getServerSession() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Auth error:', error);
    return null;
  }

  return session;
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
`,

  // Common UI components that pages import but agents might not generate
  'src/components/Header.tsx': () => `'use client';

import Link from 'next/link';

interface HeaderProps {
  title?: string;
}

export function Header({ title = 'Dashboard' }: HeaderProps) {
  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        <h1 className="text-lg font-semibold">{title}</h1>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Home
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
`,

  'src/components/Sidebar.tsx': () => `'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface SidebarProps {
  items?: SidebarItem[];
}

const defaultItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/console' },
  { label: 'Builds', href: '/console/builds' },
  { label: 'Settings', href: '/console/settings' },
];

export function Sidebar({ items = defaultItems }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/40 min-h-screen">
      <nav className="p-4 space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={\`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors \${
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }\`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
`,

  'src/components/BuildDetail.tsx': () => `'use client';

import { useState, useEffect } from 'react';

interface Build {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface BuildDetailProps {
  buildId: string;
}

export function BuildDetail({ buildId }: BuildDetailProps) {
  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBuild() {
      try {
        const res = await fetch(\`/api/v1/builds/\${buildId}\`);
        if (res.ok) {
          const data = await res.json();
          setBuild(data);
        }
      } catch (error) {
        console.error('Failed to fetch build:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchBuild();
  }, [buildId]);

  if (loading) {
    return <div className="animate-pulse">Loading build details...</div>;
  }

  if (!build) {
    return <div className="text-destructive">Build not found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Build {build.id}</h2>
        <span className={\`px-2 py-1 rounded text-sm \${
          build.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
          build.status === 'FAILED' ? 'bg-red-100 text-red-800' :
          build.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }\`}>
          {build.status}
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: \`\${build.progress}%\` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">Progress: {build.progress}%</p>

      {build.error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-sm text-destructive">{build.error}</p>
        </div>
      )}
    </div>
  );
}

export default BuildDetail;
`,
};

/**
 * Scaffold missing config files for a generated project
 */
export async function scaffoldProject(config: ScaffoldConfig): Promise<ScaffoldResult> {
  const { projectPath, projectName = 'olympus-app', overwrite = false } = config;

  const result: ScaffoldResult = {
    created: [],
    skipped: [],
    errors: [],
  };

  console.log(`[Scaffolder] Scaffolding project at: ${projectPath}`);

  for (const [relativePath, generator] of Object.entries(REQUIRED_CONFIG_FILES)) {
    const fullPath = join(projectPath, relativePath);

    try {
      // Check if file already exists
      if (existsSync(fullPath) && !overwrite) {
        result.skipped.push(relativePath);
        continue;
      }

      // Create directory if needed
      await mkdir(dirname(fullPath), { recursive: true });

      // Generate and write content
      const content = generator(projectName);
      await writeFile(fullPath, content, 'utf-8');

      result.created.push(relativePath);
      console.log(`[Scaffolder] Created: ${relativePath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`${relativePath}: ${errorMsg}`);
    }
  }

  console.log(
    `[Scaffolder] Complete. Created: ${result.created.length}, Skipped: ${result.skipped.length}, Errors: ${result.errors.length}`
  );

  return result;
}

/**
 * Check which required files are missing
 */
export function getMissingRequiredFiles(projectPath: string): string[] {
  const missing: string[] = [];

  const criticalFiles = [
    'package.json',
    'tsconfig.json',
    'next.config.js',
    'postcss.config.js',
    'tailwind.config.ts',
    'src/app/layout.tsx',
    'src/app/page.tsx',
    'src/app/globals.css',
  ];

  for (const file of criticalFiles) {
    const fullPath = join(projectPath, file);
    if (!existsSync(fullPath)) {
      missing.push(file);
    }
  }

  return missing;
}
