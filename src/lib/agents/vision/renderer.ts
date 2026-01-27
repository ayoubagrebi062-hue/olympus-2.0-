/**
 * OLYMPUS 50X - Component Renderer
 *
 * Renders React components in a headless browser for visual validation.
 * Uses Playwright for screenshot capture.
 */

// Note: Playwright is a dev dependency, this module is for build-time validation
// In production, you may want to use a serverless rendering service

// ============================================
// TYPES
// ============================================

export interface RenderOptions {
  width?: number;
  height?: number;
  darkMode?: boolean;
  fullPage?: boolean;
  waitForSelector?: string;
  waitTimeout?: number;
}

export interface RenderResult {
  screenshot: Buffer;
  width: number;
  height: number;
  renderTimeMs: number;
}

// ============================================
// HTML TEMPLATE
// ============================================

function buildHtmlTemplate(code: string, options: RenderOptions): string {
  const { darkMode = true } = options;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: {
              50: '#faf5ff',
              100: '#f3e8ff',
              200: '#e9d5ff',
              300: '#d8b4fe',
              400: '#c084fc',
              500: '#a855f7',
              600: '#9333ea',
              700: '#7c3aed',
              800: '#6b21a8',
              900: '#581c87',
            },
            violet: {
              400: '#a78bfa',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
            },
          },
        },
      },
    }
  </script>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 24px;
      background: ${darkMode ? '#0a0a0a' : '#ffffff'};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #root {
      width: 100%;
      max-width: 100%;
    }
    /* Utility function for cn() */
  </style>
</head>
<body class="${darkMode ? 'dark' : ''}">
  <div id="root"></div>
  <script type="text/babel">
    // Utility function
    const cn = (...classes) => classes.filter(Boolean).join(' ');

    // forwardRef polyfill for simple cases
    const { forwardRef, useState, useEffect, useRef } = React;

    ${code}

    // Try to find and render the component
    const componentNames = Object.keys(window).filter(k =>
      k[0] === k[0].toUpperCase() &&
      typeof window[k] === 'function' &&
      !['React', 'ReactDOM', 'Babel'].includes(k)
    );

    // Find exported component
    let Component = null;
    ${
      code.includes('export const')
        ? `
    // Extract component name from export
    const exportMatch = \`${code.replace(/`/g, '\\`')}\`.match(/export const (\\w+)/);
    if (exportMatch) {
      Component = eval(exportMatch[1]);
    }
    `
        : ''
    }

    // Fallback: look for common component patterns
    if (!Component) {
      const possibleNames = ['Component', 'Button', 'Card', 'Input', 'Hero', 'Navbar', 'Footer', 'Modal', 'Form'];
      for (const name of possibleNames) {
        try {
          Component = eval(name);
          if (Component) break;
        } catch {}
      }
    }

    // Last resort: use first capitalized function
    if (!Component && componentNames.length > 0) {
      Component = window[componentNames[0]];
    }

    if (Component) {
      ReactDOM.render(
        <Component>
          Sample Content
        </Component>,
        document.getElementById('root')
      );
    } else {
      document.getElementById('root').innerHTML = '<div style="color: red; padding: 20px;">No component found to render</div>';
    }
  </script>
</body>
</html>`;
}

// ============================================
// COMPONENT RENDERER (Dynamic Import)
// ============================================

/**
 * Renders a component and captures a screenshot
 * Uses dynamic import to avoid bundling Playwright in production
 */
export async function renderComponent(
  code: string,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const startTime = Date.now();
  const { width = 800, height = 600, darkMode = true, waitTimeout = 5000 } = options;

  // Dynamic import of Playwright (dev dependency)
  const { chromium } = await import('playwright');

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width, height });

    // Build and set HTML content
    const html = buildHtmlTemplate(code, options);
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Wait for component to render
    await page.waitForTimeout(1000);

    // Optional: wait for specific selector
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: waitTimeout });
    }

    // Capture screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: options.fullPage,
    });

    return {
      screenshot,
      width,
      height,
      renderTimeMs: Date.now() - startTime,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Renders a full page from URL
 */
export async function renderPage(url: string, options: RenderOptions = {}): Promise<RenderResult> {
  const startTime = Date.now();
  const { width = 1440, height = 900, fullPage = false, waitTimeout = 10000 } = options;

  const { chromium } = await import('playwright');

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width, height });

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: waitTimeout,
    });

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage,
    });

    return {
      screenshot,
      width,
      height,
      renderTimeMs: Date.now() - startTime,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Batch render multiple components
 */
export async function renderBatch(
  components: Array<{ id: string; code: string }>,
  options: RenderOptions = {}
): Promise<Map<string, RenderResult>> {
  const { chromium } = await import('playwright');

  const results = new Map<string, RenderResult>();
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const { width = 800, height = 600, darkMode = true } = options;

    for (const { id, code } of components) {
      const startTime = Date.now();

      try {
        const page = await browser.newPage();
        await page.setViewportSize({ width, height });

        const html = buildHtmlTemplate(code, options);
        await page.setContent(html, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const screenshot = await page.screenshot({ type: 'png' });

        results.set(id, {
          screenshot,
          width,
          height,
          renderTimeMs: Date.now() - startTime,
        });

        await page.close();
      } catch (error) {
        console.error(`[Renderer] Failed to render ${id}:`, error);
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return results;
}

// ============================================
// COMPONENT RENDERER CLASS
// ============================================

/**
 * Reusable renderer with persistent browser instance
 */
export class ComponentRenderer {
  private browser: any = null;
  private defaultOptions: RenderOptions;

  constructor(options: RenderOptions = {}) {
    this.defaultOptions = {
      width: 800,
      height: 600,
      darkMode: true,
      ...options,
    };
  }

  /**
   * Initialize browser instance
   */
  async initialize(): Promise<void> {
    if (!this.browser) {
      const { chromium } = await import('playwright');
      this.browser = await chromium.launch({ headless: true });
    }
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Render a component
   */
  async render(code: string, options: RenderOptions = {}): Promise<RenderResult> {
    await this.initialize();

    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };

    const page = await this.browser.newPage();

    try {
      await page.setViewportSize({ width: opts.width!, height: opts.height! });

      const html = buildHtmlTemplate(code, opts);
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: opts.fullPage,
      });

      return {
        screenshot,
        width: opts.width!,
        height: opts.height!,
        renderTimeMs: Date.now() - startTime,
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Render page from URL
   */
  async renderUrl(url: string, options: RenderOptions = {}): Promise<RenderResult> {
    await this.initialize();

    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options, width: 1440, height: 900 };

    const page = await this.browser.newPage();

    try {
      await page.setViewportSize({ width: opts.width!, height: opts.height! });
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: opts.fullPage,
      });

      return {
        screenshot,
        width: opts.width!,
        height: opts.height!,
        renderTimeMs: Date.now() - startTime,
      };
    } finally {
      await page.close();
    }
  }
}

export default ComponentRenderer;
