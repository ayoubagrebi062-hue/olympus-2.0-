#!/usr/bin/env node
/**
 * VISION CLI — AI code generation in 5 seconds.
 *
 * The version that makes you say "holy shit."
 *
 * @example npx vision "Create a login form"
 * @license MIT
 */

import { exec } from 'child_process';
import { platform } from 'os';

// ═══════════════════════════════════════════════════════════════════════════════
// TERMINAL MAGIC
// ═══════════════════════════════════════════════════════════════════════════════

const t = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  inverse: '\x1b[7m',
  pink: '\x1b[38;5;198m',
  green: '\x1b[38;5;114m',
  cyan: '\x1b[38;5;81m',
  yellow: '\x1b[38;5;220m',
  orange: '\x1b[38;5;208m',
  purple: '\x1b[38;5;141m',
  blue: '\x1b[38;5;75m',
  white: '\x1b[38;5;255m',
  gray: '\x1b[38;5;245m',
  check: '\x1b[38;5;82m✓\x1b[0m',
  sparkle: '\x1b[38;5;226m✦\x1b[0m',
  bolt: '\x1b[38;5;226m⚡\x1b[0m',
  hide: '\x1b[?25l',
  show: '\x1b[?25h',
  clear: '\x1b[2J\x1b[H',
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const sanitize = (s: string): string =>
  s
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/<[^>]*>/g, '')
    .slice(0, 5000);

// ═══════════════════════════════════════════════════════════════════════════════
// THE FLASH (The "holy shit" moment)
// ═══════════════════════════════════════════════════════════════════════════════

const flash = async (): Promise<void> => {
  process.stdout.write(t.inverse);
  await sleep(50);
  process.stdout.write(t.reset);
  await sleep(30);
  process.stdout.write(t.inverse);
  await sleep(30);
  process.stdout.write(t.reset);
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTELLIGENT DEMOS
// ═══════════════════════════════════════════════════════════════════════════════

const DEMOS: Record<string, { name: string; code: string }> = {
  form: {
    name: 'LoginForm',
    code: `import { useState } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto p-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}`,
  },

  button: {
    name: 'Button',
    code: `import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, disabled, className, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={\`\${baseStyles} \${variants[variant]} \${sizes[size]} \${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} \${className || ''}\`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';`,
  },

  card: {
    name: 'Card',
    code: `interface CardProps {
  title: string;
  description?: string;
  image?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function Card({ title, description, image, actions, children }: CardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {image && (
        <img src={image} alt={title} className="w-full h-48 object-cover" />
      )}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-2 text-gray-600">{description}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
        {actions && (
          <div className="mt-6 flex gap-3">{actions}</div>
        )}
      </div>
    </div>
  );
}`,
  },
};

const getDemo = (prompt: string): { name: string; code: string } => {
  const p = prompt.toLowerCase();
  if (p.includes('button')) return DEMOS.button;
  if (p.includes('card')) return DEMOS.card;
  return DEMOS.form;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SYNTAX HIGHLIGHTING (Rich, vibrant, alive)
// ═══════════════════════════════════════════════════════════════════════════════

const highlight = (line: string): string => {
  return line
    .replace(
      /\b(import|export|from|const|let|var|function|return|if|else|try|catch|finally|async|await|throw|interface|type|extends)\b/g,
      `${t.pink}$1${t.reset}`
    )
    .replace(/\b(true|false|null|undefined)\b/g, `${t.cyan}$1${t.reset}`)
    .replace(/'([^']+)'/g, `${t.green}'$1'${t.reset}`)
    .replace(/"([^"]+)"/g, `${t.green}"$1"${t.reset}`)
    .replace(/\b([A-Z][a-zA-Z]*)\b(?=\s*[({<]|\s*=\s*forwardRef)/g, `${t.yellow}$1${t.reset}`)
    .replace(/\/\/.*$/gm, `${t.gray}$&${t.reset}`);
};

// ═══════════════════════════════════════════════════════════════════════════════
// THE TYPING ENGINE (Confidence builds, rhythm feels human)
// ═══════════════════════════════════════════════════════════════════════════════

const typeCode = async (code: string): Promise<void> => {
  const lines = code.split('\n');
  const totalLines = lines.length;
  let lineIndex = 0;

  for (const line of lines) {
    lineIndex++;
    let buffer = '';

    // Progress through the code = more confidence = faster
    const confidence = lineIndex / totalLines;
    const speedMultiplier = 1 - confidence * 0.6; // Starts at 1x, ends at 0.4x

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      buffer += char;

      process.stdout.write(`\r\x1b[K${highlight(buffer)}`);

      // Base delay modified by confidence
      let delay: number;
      if ('{([<'.includes(char)) {
        delay = (15 + Math.random() * 10) * speedMultiplier;
      } else if ('});>'.includes(char)) {
        delay = (10 + Math.random() * 8) * speedMultiplier;
      } else if (char === ' ') {
        delay = (1 + Math.random() * 2) * speedMultiplier;
      } else {
        delay = (2 + Math.random() * 3) * speedMultiplier;
      }

      await sleep(delay);
    }

    // THE DRAMATIC PAUSE — before the final closing brace
    if (lineIndex === totalLines && line.trim() === '}') {
      await sleep(400); // Hold... hold...
    }

    process.stdout.write('\n');

    // Thinking pauses on complex lines
    if (
      line.includes('interface') ||
      line.includes('export function') ||
      line.includes('export const')
    ) {
      await sleep(80 + Math.random() * 40);
    } else {
      await sleep((5 + Math.random() * 10) * speedMultiplier);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLIPBOARD
// ═══════════════════════════════════════════════════════════════════════════════

const copyToClipboard = (text: string): Promise<boolean> => {
  return new Promise(resolve => {
    const cmd =
      platform() === 'darwin'
        ? 'pbcopy'
        : platform() === 'win32'
          ? 'clip'
          : 'xclip -selection clipboard';

    const proc = exec(cmd, err => resolve(!err));
    proc.stdin?.write(text);
    proc.stdin?.end();
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// THINKING (With personality)
// ═══════════════════════════════════════════════════════════════════════════════

const think = async (componentName: string): Promise<void> => {
  const thoughts = [
    { text: `${t.dim}Analyzing "${componentName}"`, duration: 400 },
    { text: `${t.dim}Hmm...`, duration: 200 },
    { text: `${t.dim}Structuring`, duration: 300 },
    { text: `${t.dim}Writing`, duration: 200 },
  ];

  for (const thought of thoughts) {
    const frames = ['', '.', '..', '...'];
    const start = Date.now();
    let i = 0;

    while (Date.now() - start < thought.duration) {
      process.stdout.write(`\r\x1b[K${thought.text}${frames[i % 4]}${t.reset}`);
      await sleep(100);
      i++;
    }
  }
  process.stdout.write('\r\x1b[K');
};

// ═══════════════════════════════════════════════════════════════════════════════
// EASTER EGG
// ═══════════════════════════════════════════════════════════════════════════════

const magic = async (): Promise<void> => {
  console.log();

  const art = [
    `${t.purple}    ╔═══════════════════════════════════════╗`,
    `${t.purple}    ║${t.reset}                                       ${t.purple}║`,
    `${t.purple}    ║${t.reset}   ${t.bold}${t.cyan}V I S I O N${t.reset}                        ${t.purple}║`,
    `${t.purple}    ║${t.reset}                                       ${t.purple}║`,
    `${t.purple}    ║${t.reset}   ${t.yellow}⚡${t.reset} You found the easter egg.        ${t.purple}║`,
    `${t.purple}    ║${t.reset}                                       ${t.purple}║`,
    `${t.purple}    ║${t.reset}   ${t.dim}Built with love at 2am.${t.reset}           ${t.purple}║`,
    `${t.purple}    ║${t.reset}   ${t.dim}For developers who ship.${t.reset}          ${t.purple}║`,
    `${t.purple}    ║${t.reset}                                       ${t.purple}║`,
    `${t.purple}    ║${t.reset}   ${t.green}Go build something amazing.${t.reset}       ${t.purple}║`,
    `${t.purple}    ║${t.reset}                                       ${t.purple}║`,
    `${t.purple}    ╚═══════════════════════════════════════╝${t.reset}`,
  ];

  for (const line of art) {
    console.log(line);
    await sleep(50);
  }

  console.log();
};

// ═══════════════════════════════════════════════════════════════════════════════
// GRACEFUL INTERRUPTION
// ═══════════════════════════════════════════════════════════════════════════════

process.on('SIGINT', () => {
  process.stdout.write(t.show);
  console.log(`\n\n${t.dim}Stopped.${t.reset}\n`);
  process.exit(0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);

  // Help
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
${t.bold}VISION${t.reset} ${t.dim}— AI code generation${t.reset}

${t.dim}Usage:${t.reset}  vision "Create a login form"
        vision "Build a button component"
        vision "Make a product card"

${t.dim}Code is copied to your clipboard automatically.${t.reset}
`);
    return;
  }

  if (args[0] === '--version' || args[0] === '-v') {
    console.log('1.0.0');
    return;
  }

  // Easter egg
  if (args[0] === 'magic' || args[0] === '✨' || args[0] === '🪄') {
    await magic();
    return;
  }

  const prompt = sanitize(args.join(' '));

  if (prompt.length < 3) {
    console.log(`
${t.dim}Tell me more! Try:${t.reset}

  vision "Create a signup form with validation"
  vision "Build a button with loading state"
  vision "Make a card with image and actions"
`);
    return;
  }

  const demo = getDemo(prompt);
  const displayPrompt = prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt;

  // Hide cursor during generation
  process.stdout.write(t.hide);

  // Header
  console.log(`\n${t.bold}VISION${t.reset}\n`);
  console.log(`${t.dim}>${t.reset} ${displayPrompt}\n`);

  // Think with personality
  await think(demo.name);

  // Stream with confidence acceleration
  await typeCode(demo.code);

  // THE FLASH — the "holy shit" moment
  await flash();

  // Show cursor
  process.stdout.write(t.show);

  // Copy to clipboard
  const copied = await copyToClipboard(demo.code);
  const lines = demo.code.split('\n').length;

  // Finale with flair
  console.log();
  if (copied) {
    console.log(
      `${t.sparkle} ${t.bold}${demo.name}${t.reset} ${t.dim}·${t.reset} ${lines} lines ${t.dim}·${t.reset} ${t.green}copied${t.reset}\n`
    );
  } else {
    console.log(`${t.check} ${t.bold}${demo.name}${t.reset} ${t.dim}·${t.reset} ${lines} lines\n`);
  }
};

main().catch(() => {
  process.stdout.write(t.show);
  console.log(`\n${t.dim}Something went wrong. Please try again.${t.reset}\n`);
  process.exit(1);
});
