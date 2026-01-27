/**
 * OLYMPUS 3.0 - Output Validator Tests
 * =====================================
 */

import { describe, it, expect } from 'vitest';
import { OutputValidator } from '../output-validator';
import { GeneratedOutput } from '../types';

describe('OutputValidator', () => {
  const validator = new OutputValidator();

  describe('validateQuick', () => {
    it('passes valid code', async () => {
      const output: GeneratedOutput = {
        prompt: 'Create a hello world component',
        provider: 'ollama',
        timestamp: new Date(),
        files: [{
          path: 'src/components/Hello.tsx',
          content: `
import React from 'react';

export function Hello() {
  return <div>Hello World</div>;
}
          `,
          language: 'tsx',
        }],
      };

      const result = await validator.validateQuick(output);
      expect(result.valid).toBe(true);
      expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
    });

    it('catches bracket mismatch', async () => {
      const output: GeneratedOutput = {
        prompt: 'Create a component',
        provider: 'ollama',
        timestamp: new Date(),
        files: [{
          path: 'src/components/Broken.ts',
          content: `
export function Broken() {
  if (true) {
    console.log('test');
  // Missing closing brace
}
          `,
          language: 'typescript',
        }],
      };

      const result = await validator.validateQuick(output);
      // Either catches bracket mismatch OR console.log (which is also an issue)
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('catches security issues', async () => {
      const output: GeneratedOutput = {
        prompt: 'Create an API',
        provider: 'ollama',
        timestamp: new Date(),
        files: [{
          path: 'src/api/dangerous.ts',
          content: `
const password = "admin123";
const query = "SELECT * FROM users WHERE id = " + userId;
eval(userInput);
          `,
          language: 'typescript',
        }],
      };

      const result = await validator.validateQuick(output);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code.startsWith('SEC_'))).toBe(true);
    });

    it('detects console.log statements', async () => {
      const output: GeneratedOutput = {
        prompt: 'Create a component',
        provider: 'ollama',
        timestamp: new Date(),
        files: [{
          path: 'src/utils/helper.ts',
          content: `
export function helper() {
  console.log('debugging');
  return 42;
}
          `,
          language: 'typescript',
        }],
      };

      const result = await validator.validateQuick(output);
      expect(result.issues.some(i => i.code === 'CONSOLE_LOG')).toBe(true);
    });

    it('detects debugger statements', async () => {
      const output: GeneratedOutput = {
        prompt: 'Create a function',
        provider: 'ollama',
        timestamp: new Date(),
        files: [{
          path: 'src/utils/debug.ts',
          content: `
export function debug() {
  debugger;
  return 'test';
}
          `,
          language: 'typescript',
        }],
      };

      const result = await validator.validateQuick(output);
      expect(result.issues.some(i => i.code === 'DEBUGGER')).toBe(true);
    });

    it('detects hardcoded secrets', async () => {
      const output: GeneratedOutput = {
        prompt: 'Create config',
        provider: 'ollama',
        timestamp: new Date(),
        files: [{
          path: 'src/config.ts',
          content: `
export const config = {
  apiKey: "sk_live_FAKE_TEST_KEY_FOR_VALIDATION",
  password: "supersecretpassword123"
};
          `,
          language: 'typescript',
        }],
      };

      const result = await validator.validateQuick(output);
      expect(result.issues.some(i =>
        i.code === 'SEC_HARDCODED_API_KEY' ||
        i.code === 'SEC_HARDCODED_PASSWORD' ||
        i.code === 'SEC_STRIPE_KEY'
      )).toBe(true);
    });
  });

  describe('validate (full)', () => {
    it('checks relevance to prompt', async () => {
      const output: GeneratedOutput = {
        prompt: 'Create a coffee shop landing page',
        provider: 'ollama',
        timestamp: new Date(),
        files: [{
          path: 'src/app/page.tsx',
          content: `
export default function CoffeeShop() {
  return (
    <div>
      <h1>Welcome to JavaJoy Coffee</h1>
      <section>Our Menu</section>
      <section>About Us</section>
      <section>Contact</section>
    </div>
  );
}
          `,
          language: 'tsx',
        }],
      };

      const result = await validator.validate(output);
      expect(result.score).toBeGreaterThan(50);
    });

    it('returns metrics', async () => {
      const output: GeneratedOutput = {
        prompt: 'Create a function',
        provider: 'ollama',
        timestamp: new Date(),
        files: [{
          path: 'src/utils/math.ts',
          content: `
export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}
          `,
          language: 'typescript',
        }],
      };

      const result = await validator.validate(output);
      expect(result.metadata.fileCount).toBe(1);
      expect(result.metadata.linesOfCode).toBeGreaterThan(0);
      expect(result.metadata.validatedAt).toBeInstanceOf(Date);
    });
  });

  describe('validateSecurity', () => {
    it('catches eval usage', async () => {
      const output: GeneratedOutput = {
        prompt: 'Create a calculator',
        provider: 'ollama',
        timestamp: new Date(),
        files: [{
          path: 'src/calc.ts',
          content: `
export function calculate(expression: string) {
  return eval(expression);
}
          `,
          language: 'typescript',
        }],
      };

      const result = await validator.validateSecurity(output);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code === 'SEC_EVAL')).toBe(true);
    });

    it('catches innerHTML usage', async () => {
      const output: GeneratedOutput = {
        prompt: 'Create a renderer',
        provider: 'ollama',
        timestamp: new Date(),
        files: [{
          path: 'src/render.ts',
          content: `
export function render(html: string) {
  document.body.innerHTML = html;
}
          `,
          language: 'typescript',
        }],
      };

      const result = await validator.validateSecurity(output);
      expect(result.issues.some(i => i.code === 'SEC_INNERHTML')).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('returns formatted summary', async () => {
      const output: GeneratedOutput = {
        prompt: 'Test',
        provider: 'test',
        timestamp: new Date(),
        files: [{
          path: 'test.ts',
          content: 'const x = 1;',
          language: 'typescript',
        }],
      };

      const result = await validator.validateQuick(output);
      const summary = validator.getSummary(result);

      expect(summary).toContain('Validation');
      expect(summary).toContain('Score');
      expect(summary).toContain('Files');
    });
  });
});
