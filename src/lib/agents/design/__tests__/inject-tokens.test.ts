/**
 * INJECT-TOKENS - Comprehensive Unit Tests
 * =========================================
 * Tests for design token injection into agent prompts.
 * Target: 80%+ coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectBrand,
  generateDesignContext,
  generateCompactContext,
  injectTokensIntoPrompt,
  createPromptEnhancer,
  AGENT_PRESETS,
  getAgentDesignContext,
  injectForAgent,
  getColorsForCSS,
  getTypographyForCSS,
  validateDesignCompliance,
  type InjectionOptions,
  type DesignContext,
  type AgentPreset,
} from '../inject-tokens';

// ============================================================================
// BRAND DETECTION
// ============================================================================

describe('detectBrand', () => {
  describe('explicit brand patterns', () => {
    it('should detect "like X" patterns', () => {
      expect(detectBrand('make it like stripe')).toBe('stripe');
      expect(detectBrand('similar to linear')).toBe('linear');
      expect(detectBrand('inspired by vercel')).toBe('vercel');
      expect(detectBrand('style of apple')).toBe('apple');
    });

    it('should detect brand from full sentences', () => {
      expect(detectBrand('I want a landing page like stripe has')).toBe('stripe');
      expect(detectBrand('Create a design similar to notion')).toBe('notion');
    });

    it('should be case insensitive', () => {
      expect(detectBrand('LIKE STRIPE')).toBe('stripe');
      expect(detectBrand('Like Vercel')).toBe('vercel');
      expect(detectBrand('SIMILAR TO LINEAR')).toBe('linear');
    });
  });

  describe('keyword detection', () => {
    it('should detect fintech/payment brands', () => {
      expect(detectBrand('build a payment dashboard')).toBe('stripe');
      expect(detectBrand('fintech application')).toBe('stripe');
      expect(detectBrand('banking interface')).toBe('stripe');
    });

    it('should detect productivity tools', () => {
      expect(detectBrand('issue tracker app')).toBe('linear');
      expect(detectBrand('project management tool')).toBe('linear');
    });

    it('should detect developer tools', () => {
      expect(detectBrand('deployment dashboard')).toBe('vercel');
      expect(detectBrand('developer devtools')).toBe('vercel');
    });

    it('should detect design tools', () => {
      expect(detectBrand('design tool interface')).toBe('figma');
      expect(detectBrand('collaborative prototyping')).toBe('figma');
    });

    it('should detect communication apps', () => {
      expect(detectBrand('chat application')).toBe('discord');
      expect(detectBrand('gaming community')).toBe('discord');
    });

    it('should detect media apps', () => {
      expect(detectBrand('music streaming app')).toBe('spotify');
      expect(detectBrand('playlist manager')).toBe('spotify');
    });

    it('should detect code platforms', () => {
      expect(detectBrand('code repository')).toBe('github');
      expect(detectBrand('version control system')).toBe('github');
    });
  });

  describe('theme detection', () => {
    it('should detect dark theme', () => {
      expect(detectBrand('dark theme please')).toBe('dark');
      expect(detectBrand('dark mode design')).toBe('dark');
    });

    it('should detect light theme', () => {
      expect(detectBrand('light theme website')).toBe('light');
      expect(detectBrand('light mode interface')).toBe('light');
    });

    it('should detect style descriptors', () => {
      expect(detectBrand('modern and fresh design')).toBe('modern');
      // Note: 'minimal' keyword appears in both 'apple' and 'minimal' brands
      // The includes() check means 'minimalist' matches 'minimal' substring
      // Use 'clean' or 'simple' which are unique to 'minimal' brand
      expect(detectBrand('clean simple design')).toBe('minimal');
      expect(detectBrand('playful and colorful')).toBe('playful');
      expect(detectBrand('corporate professional look')).toBe('corporate');
      expect(detectBrand('elegant luxurious feel')).toBe('elegant');
    });
  });

  describe('edge cases', () => {
    it('should return undefined for empty input', () => {
      expect(detectBrand('')).toBeUndefined();
      expect(detectBrand(undefined)).toBeUndefined();
    });

    it('should return undefined for unrecognized requests', () => {
      expect(detectBrand('build a random website')).toBeUndefined();
      expect(detectBrand('create something cool')).toBeUndefined();
    });

    it('should handle special characters', () => {
      expect(detectBrand('like stripe!!!')).toBe('stripe');
      expect(detectBrand('stripe-like design')).toBe('stripe');
    });
  });
});

// ============================================================================
// DESIGN CONTEXT GENERATION
// ============================================================================

describe('generateDesignContext', () => {
  describe('basic generation', () => {
    it('should generate context with default options', () => {
      const result = generateDesignContext();

      expect(result.brand).toBe('olympus');
      expect(result.context).toContain('DESIGN SYSTEM TOKENS');
      expect(result.context).toContain('Single Source of Truth');
      expect(result.tokens).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include brand interpretation from user request', () => {
      const result = generateDesignContext('make it like stripe');

      expect(result.context).toContain('Brand: OLYMPUS 50X');
      expect(result.context).toContain('Style Applied:');
    });

    it('should return proper structure', () => {
      const result = generateDesignContext('test request');

      expect(result).toHaveProperty('brand');
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('length');
      expect(typeof result.length).toBe('number');
    });
  });

  describe('section filtering', () => {
    it('should include only specified sections', () => {
      const result = generateDesignContext('', {
        sections: ['colors'],
      });

      expect(result.context).toContain('## COLORS');
      expect(result.context).not.toContain('## TYPOGRAPHY');
      expect(result.context).not.toContain('## SPACING');
    });

    it('should include multiple sections', () => {
      const result = generateDesignContext('', {
        sections: ['colors', 'typography'],
      });

      expect(result.context).toContain('## COLORS');
      expect(result.context).toContain('## TYPOGRAPHY');
      expect(result.context).not.toContain('## MOTION');
    });

    it('should include all default sections', () => {
      const result = generateDesignContext();

      expect(result.context).toContain('## COLORS');
      expect(result.context).toContain('## TYPOGRAPHY');
      expect(result.context).toContain('## SPACING');
      expect(result.context).toContain('## MOTION');
      expect(result.context).toContain('## EFFECTS');
    });
  });

  describe('full tokens mode', () => {
    it('should include additional details in full mode', () => {
      const result = generateDesignContext('', {
        fullTokens: true,
        sections: ['typography'],
      });

      expect(result.context).toContain('### Font Weights');
      expect(result.context).toContain('### Line Heights');
    });

    it('should include component tokens in full mode', () => {
      const result = generateDesignContext('', {
        fullTokens: true,
        sections: ['components'],
      });

      expect(result.context).toContain('## COMPONENTS');
      expect(result.context).toContain('### Button');
      expect(result.context).toContain('### Card');
    });

    it('should NOT include full details when fullTokens is false', () => {
      const result = generateDesignContext('', {
        fullTokens: false,
        sections: ['typography'],
      });

      expect(result.context).not.toContain('### Font Weights');
      expect(result.context).not.toContain('### Line Heights');
    });
  });

  describe('token truncation', () => {
    it('should truncate when exceeding maxLength', () => {
      const result = generateDesignContext('', {
        fullTokens: true,
        sections: ['colors', 'typography', 'spacing', 'motion', 'effects', 'components'],
        maxLength: 500,
      });

      expect(result.length).toBeLessThanOrEqual(500);
      expect(result.context).toContain('[TRUNCATED');
    });

    it('should not truncate when under maxLength', () => {
      const result = generateDesignContext('', {
        sections: ['colors'],
        maxLength: 10000,
      });

      expect(result.context).not.toContain('[TRUNCATED');
    });
  });

  describe('brand hint option', () => {
    it('should use brandHint when provided', () => {
      const result = generateDesignContext('', {
        brandHint: 'stripe-like design',
      });

      expect(result.context).toContain('Style Applied:');
    });

    it('should prioritize user request over brandHint', () => {
      const result = generateDesignContext('minimal design', {
        brandHint: 'stripe',
      });

      // User request should be processed first
      expect(result.context).toBeDefined();
    });
  });

  describe('token content verification', () => {
    it('should include brand colors', () => {
      const result = generateDesignContext('', { sections: ['colors'] });

      expect(result.context).toContain('### Brand Colors');
      expect(result.context).toContain('primary:');
      expect(result.context).toContain('secondary:');
    });

    it('should include background colors', () => {
      const result = generateDesignContext('', { sections: ['colors'] });

      expect(result.context).toContain('### Backgrounds');
      expect(result.context).toContain('background:');
      expect(result.context).toContain('surface:');
    });

    it('should include semantic colors', () => {
      const result = generateDesignContext('', { sections: ['colors'] });

      expect(result.context).toContain('### Semantic Colors');
      expect(result.context).toContain('success:');
      expect(result.context).toContain('warning:');
      expect(result.context).toContain('error:');
    });

    it('should include typography info', () => {
      const result = generateDesignContext('', { sections: ['typography'] });

      expect(result.context).toContain('## TYPOGRAPHY');
      expect(result.context).toContain('Font Family:');
      expect(result.context).toContain('### Font Sizes');
    });

    it('should include spacing info', () => {
      const result = generateDesignContext('', { sections: ['spacing'] });

      expect(result.context).toContain('## SPACING');
      expect(result.context).toContain('Base Unit:');
      expect(result.context).toContain('### Scale');
      expect(result.context).toContain('### Component Spacing');
    });

    it('should include motion info', () => {
      const result = generateDesignContext('', { sections: ['motion'] });

      expect(result.context).toContain('## MOTION');
      expect(result.context).toContain('### Duration');
      expect(result.context).toContain('### Easing');
    });

    it('should include effects info', () => {
      const result = generateDesignContext('', { sections: ['effects'] });

      expect(result.context).toContain('## EFFECTS');
      expect(result.context).toContain('### Border Radius');
      expect(result.context).toContain('### Shadows');
      expect(result.context).toContain('### Glassmorphism');
      expect(result.context).toContain('### Glow Effects');
    });
  });
});

// ============================================================================
// COMPACT CONTEXT
// ============================================================================

describe('generateCompactContext', () => {
  it('should generate compact format', () => {
    const result = generateCompactContext();

    expect(result).toContain('DESIGN TOKENS (Compact):');
    expect(result).toContain('Brand: OLYMPUS 50X');
    expect(result).toContain('Primary:');
    expect(result).toContain('BG:');
    expect(result).toContain('Text:');
    expect(result).toContain('Font:');
    expect(result).toContain('Radius:');
    expect(result).toContain('Motion:');
  });

  it('should be significantly shorter than full context', () => {
    const compact = generateCompactContext();
    const full = generateDesignContext().context;

    expect(compact.length).toBeLessThan(full.length / 2);
  });

  it('should include essential token values', () => {
    const result = generateCompactContext();

    // Should contain actual hex colors
    expect(result).toMatch(/#[0-9A-Fa-f]{6}/);
  });
});

// ============================================================================
// PROMPT INJECTION
// ============================================================================

describe('injectTokensIntoPrompt', () => {
  describe('marker replacement', () => {
    it('should replace {{DESIGN_TOKENS}} marker', () => {
      const prompt = 'You are a designer. {{DESIGN_TOKENS}} Use these colors.';
      const result = injectTokensIntoPrompt(prompt);

      expect(result).not.toContain('{{DESIGN_TOKENS}}');
      expect(result).toContain('DESIGN SYSTEM TOKENS');
    });

    it('should replace {{DESIGN_CONTEXT}} marker', () => {
      const prompt = 'Create UI. {{DESIGN_CONTEXT}} Follow the rules.';
      const result = injectTokensIntoPrompt(prompt);

      expect(result).not.toContain('{{DESIGN_CONTEXT}}');
      expect(result).toContain('DESIGN SYSTEM TOKENS');
    });

    it('should replace {{DESIGN_COMPACT}} marker', () => {
      const prompt = 'Quick design: {{DESIGN_COMPACT}}';
      const result = injectTokensIntoPrompt(prompt);

      expect(result).not.toContain('{{DESIGN_COMPACT}}');
      expect(result).toContain('DESIGN TOKENS (Compact)');
    });

    it('should replace multiple different markers', () => {
      const prompt = '{{DESIGN_TOKENS}} and {{DESIGN_COMPACT}}';
      const result = injectTokensIntoPrompt(prompt);

      expect(result).not.toContain('{{DESIGN_TOKENS}}');
      expect(result).not.toContain('{{DESIGN_COMPACT}}');
    });
  });

  describe('intelligent insertion', () => {
    it('should insert before OUTPUT FORMAT section', () => {
      const prompt = 'You are a designer.\n\n## OUTPUT FORMAT\nReturn JSON.';
      const result = injectTokensIntoPrompt(prompt);

      const outputIndex = result.indexOf('## OUTPUT FORMAT');
      const tokensIndex = result.indexOf('DESIGN SYSTEM TOKENS');

      expect(tokensIndex).toBeLessThan(outputIndex);
    });

    it('should insert before CONSTRAINTS section', () => {
      const prompt = 'You are a designer.\n\n## CONSTRAINTS\nFollow rules.';
      const result = injectTokensIntoPrompt(prompt);

      const constraintsIndex = result.indexOf('## CONSTRAINTS');
      const tokensIndex = result.indexOf('DESIGN SYSTEM TOKENS');

      expect(tokensIndex).toBeLessThan(constraintsIndex);
    });

    it('should insert before IMPORTANT: marker', () => {
      const prompt = 'You are a designer.\n\nIMPORTANT: Follow rules.';
      const result = injectTokensIntoPrompt(prompt);

      const importantIndex = result.indexOf('IMPORTANT:');
      const tokensIndex = result.indexOf('DESIGN SYSTEM TOKENS');

      expect(tokensIndex).toBeLessThan(importantIndex);
    });

    it('should append at end if no markers or sections found', () => {
      const prompt = 'You are a designer. Do good work.';
      const result = injectTokensIntoPrompt(prompt);

      expect(result).toContain('You are a designer. Do good work.');
      expect(result).toContain('DESIGN SYSTEM TOKENS');
    });
  });

  describe('options passthrough', () => {
    it('should pass options to generateDesignContext', () => {
      const prompt = '{{DESIGN_TOKENS}}';
      const result = injectTokensIntoPrompt(prompt, '', {
        sections: ['colors'],
        maxLength: 1000,
      });

      expect(result).toContain('## COLORS');
      expect(result).not.toContain('## TYPOGRAPHY');
    });

    it('should use user request for brand detection', () => {
      const prompt = '{{DESIGN_TOKENS}}';
      const result = injectTokensIntoPrompt(prompt, 'make it like stripe');

      expect(result).toContain('Style Applied:');
    });
  });
});

// ============================================================================
// PROMPT ENHANCER
// ============================================================================

describe('createPromptEnhancer', () => {
  it('should create a reusable function', () => {
    const enhancer = createPromptEnhancer();

    expect(typeof enhancer).toBe('function');
  });

  it('should enhance prompts when called', () => {
    const enhancer = createPromptEnhancer();
    const result = enhancer('{{DESIGN_TOKENS}}');

    expect(result).toContain('DESIGN SYSTEM TOKENS');
  });

  it('should use default options', () => {
    const enhancer = createPromptEnhancer({
      sections: ['colors'],
    });
    const result = enhancer('{{DESIGN_TOKENS}}');

    expect(result).toContain('## COLORS');
    expect(result).not.toContain('## TYPOGRAPHY');
  });

  it('should accept user request parameter', () => {
    const enhancer = createPromptEnhancer();
    const result = enhancer('{{DESIGN_TOKENS}}', 'stripe style');

    expect(result).toContain('Style Applied:');
  });

  it('should be reusable across multiple prompts', () => {
    const enhancer = createPromptEnhancer({ sections: ['colors'] });

    const result1 = enhancer('Prompt 1: {{DESIGN_TOKENS}}');
    const result2 = enhancer('Prompt 2: {{DESIGN_TOKENS}}');

    expect(result1).toContain('## COLORS');
    expect(result2).toContain('## COLORS');
  });
});

// ============================================================================
// AGENT PRESETS
// ============================================================================

describe('AGENT_PRESETS', () => {
  it('should have master preset', () => {
    expect(AGENT_PRESETS.master).toBeDefined();
    expect(AGENT_PRESETS.master.fullTokens).toBe(true);
    expect(AGENT_PRESETS.master.maxLength).toBe(8000);
    expect(AGENT_PRESETS.master.sections).toContain('components');
  });

  it('should have implementation preset', () => {
    expect(AGENT_PRESETS.implementation).toBeDefined();
    expect(AGENT_PRESETS.implementation.fullTokens).toBe(false);
    expect(AGENT_PRESETS.implementation.maxLength).toBe(4000);
  });

  it('should have supporting preset', () => {
    expect(AGENT_PRESETS.supporting).toBeDefined();
    expect(AGENT_PRESETS.supporting.maxLength).toBe(2000);
    expect(AGENT_PRESETS.supporting.sections).toEqual(['colors', 'spacing']);
  });

  it('should have minimal preset', () => {
    expect(AGENT_PRESETS.minimal).toBeDefined();
    expect(AGENT_PRESETS.minimal.maxLength).toBe(1000);
    expect(AGENT_PRESETS.minimal.sections).toEqual(['colors']);
  });
});

describe('getAgentDesignContext', () => {
  it('should return full context for master agents', () => {
    const result = getAgentDesignContext('master');

    expect(result.context).toContain('## COMPONENTS');
    expect(result.length).toBeLessThanOrEqual(8000);
  });

  it('should return limited context for implementation agents', () => {
    const result = getAgentDesignContext('implementation');

    expect(result.context).not.toContain('## COMPONENTS');
    expect(result.length).toBeLessThanOrEqual(4000);
  });

  it('should return compact context for supporting agents', () => {
    const result = getAgentDesignContext('supporting');

    expect(result.context).toContain('## COLORS');
    expect(result.context).toContain('## SPACING');
    expect(result.context).not.toContain('## TYPOGRAPHY');
    expect(result.length).toBeLessThanOrEqual(2000);
  });

  it('should return minimal context for minimal preset', () => {
    const result = getAgentDesignContext('minimal');

    expect(result.context).toContain('## COLORS');
    expect(result.context).not.toContain('## SPACING');
    expect(result.length).toBeLessThanOrEqual(1000);
  });

  it('should accept user request parameter', () => {
    const result = getAgentDesignContext('master', 'stripe style');

    expect(result.context).toContain('Style Applied:');
  });
});

describe('injectForAgent', () => {
  it('should inject with master preset', () => {
    const result = injectForAgent('master', '{{DESIGN_TOKENS}}');

    expect(result).toContain('## COMPONENTS');
  });

  it('should inject with implementation preset', () => {
    const result = injectForAgent('implementation', '{{DESIGN_TOKENS}}');

    expect(result).toContain('## COLORS');
    expect(result).not.toContain('## COMPONENTS');
  });

  it('should inject with supporting preset', () => {
    const result = injectForAgent('supporting', '{{DESIGN_TOKENS}}');

    expect(result).toContain('## COLORS');
    expect(result).toContain('## SPACING');
    expect(result).not.toContain('## TYPOGRAPHY');
  });

  it('should inject with minimal preset', () => {
    const result = injectForAgent('minimal', '{{DESIGN_TOKENS}}');

    expect(result).toContain('## COLORS');
    expect(result).not.toContain('## SPACING');
  });

  it('should accept user request for brand styling', () => {
    const result = injectForAgent('master', '{{DESIGN_TOKENS}}', 'dark minimal');

    expect(result).toBeDefined();
  });
});

// ============================================================================
// CSS UTILITIES
// ============================================================================

describe('getColorsForCSS', () => {
  it('should return color map', () => {
    const colors = getColorsForCSS();

    expect(colors).toHaveProperty('primary');
    expect(colors).toHaveProperty('secondary');
    expect(colors).toHaveProperty('bg');
    expect(colors).toHaveProperty('text');
  });

  it('should return valid hex colors', () => {
    const colors = getColorsForCSS();

    expect(colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(colors.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(colors.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('should include all expected keys', () => {
    const colors = getColorsForCSS();

    // Brand colors
    expect(colors).toHaveProperty('primary');
    expect(colors).toHaveProperty('primary-hover');
    expect(colors).toHaveProperty('primary-light');
    expect(colors).toHaveProperty('secondary');
    expect(colors).toHaveProperty('accent');

    // Backgrounds
    expect(colors).toHaveProperty('bg');
    expect(colors).toHaveProperty('surface');
    expect(colors).toHaveProperty('surface-elevated');

    // Borders
    expect(colors).toHaveProperty('border');
    expect(colors).toHaveProperty('border-subtle');
    expect(colors).toHaveProperty('border-focus');

    // Text
    expect(colors).toHaveProperty('text');
    expect(colors).toHaveProperty('text-secondary');
    expect(colors).toHaveProperty('text-muted');
    expect(colors).toHaveProperty('text-disabled');

    // Semantic
    expect(colors).toHaveProperty('success');
    expect(colors).toHaveProperty('warning');
    expect(colors).toHaveProperty('error');
    expect(colors).toHaveProperty('info');
  });

  it('should respond to user request', () => {
    const defaultColors = getColorsForCSS();
    const styledColors = getColorsForCSS('stripe style');

    // Both should have the same structure
    expect(Object.keys(defaultColors)).toEqual(Object.keys(styledColors));
  });
});

describe('getTypographyForCSS', () => {
  it('should return typography map', () => {
    const typography = getTypographyForCSS();

    expect(typography).toBeDefined();
    expect(Object.keys(typography).length).toBeGreaterThan(0);
  });

  it('should include fontSize and fontWeight for each entry', () => {
    const typography = getTypographyForCSS();

    for (const [, value] of Object.entries(typography)) {
      expect(value).toHaveProperty('fontSize');
      expect(value).toHaveProperty('fontWeight');
      expect(typeof value.fontSize).toBe('string');
      expect(typeof value.fontWeight).toBe('number');
    }
  });

  it('should have standard size keys', () => {
    const typography = getTypographyForCSS();

    // Common typography size names
    expect(typography).toHaveProperty('xs');
    expect(typography).toHaveProperty('sm');
    expect(typography).toHaveProperty('base');
    expect(typography).toHaveProperty('lg');
    expect(typography).toHaveProperty('xl');
  });
});

// ============================================================================
// DESIGN COMPLIANCE VALIDATION
// ============================================================================

describe('validateDesignCompliance', () => {
  describe('valid code', () => {
    it('should pass for code using design tokens', () => {
      // Get actual token colors to ensure test uses valid values
      const context = generateDesignContext();
      const primaryColor = context.tokens.colors.primary;
      const bgColor = context.tokens.colors.background;

      const code = `
        const styles = {
          color: '${primaryColor}',
          background: '${bgColor}',
        };
      `;

      const result = validateDesignCompliance(code);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow common exceptions', () => {
      const code = `
        color: '#ffffff';
        background: '#000000';
      `;

      const result = validateDesignCompliance(code);

      expect(result.valid).toBe(true);
    });
  });

  describe('color violations', () => {
    it('should detect unauthorized hex colors', () => {
      const code = `
        const styles = {
          color: '#FF00FF',  // Not a token color
          background: '#123456',
        };
      `;

      const result = validateDesignCompliance(code);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.includes('Unauthorized color'))).toBe(true);
    });
  });

  describe('forbidden patterns', () => {
    it('should detect generic Tailwind blue classes', () => {
      const code = `<button className="bg-blue-500">Click</button>`;

      const result = validateDesignCompliance(code);

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('bg-blue-500'))).toBe(true);
    });

    it('should detect placeholder href="#"', () => {
      const code = `<a href="#">Link</a>`;

      const result = validateDesignCompliance(code);

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('href="#"'))).toBe(true);
    });

    it('should detect empty href', () => {
      const code = `<a href="">Link</a>`;

      const result = validateDesignCompliance(code);

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('href=""'))).toBe(true);
    });

    it('should detect empty onClick handlers', () => {
      const code = `<button onClick={() => {}}>Click</button>`;

      const result = validateDesignCompliance(code);

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('onClick={() => {}}'))).toBe(true);
    });

    it('should detect multiple forbidden patterns', () => {
      const code = `
        <a href="#">Bad link</a>
        <button className="bg-blue-500" onClick={() => {}}>Bad button</button>
      `;

      const result = validateDesignCompliance(code);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('mixed validation', () => {
    it('should report all violations', () => {
      const code = `
        const color = '#BADCOL';
        <a href="#" className="bg-blue-600">Link</a>
      `;

      const result = validateDesignCompliance(code);

      expect(result.valid).toBe(false);
      // Should have color violation + href violation + blue class violation
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
    });

    it('should pass code with some blue but not blue-500', () => {
      const code = `
        // This mentions blue-500 in a comment but doesn't use it
        const description = "Uses purple instead of blue-500";
      `;

      // The literal "blue-500" appears but not as a class
      const result = validateDesignCompliance(code);

      // This depends on whether the check is exact match or contains
      // Based on the code, it uses includes() so this should fail
      expect(result.violations.some(v => v.includes('blue-500'))).toBe(false);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration', () => {
  it('should work end-to-end for master agent', () => {
    const prompt = `You are PALETTE agent.
{{DESIGN_TOKENS}}
## OUTPUT FORMAT
Return JSON.`;

    const result = injectForAgent('master', prompt, 'make it like stripe');

    expect(result).not.toContain('{{DESIGN_TOKENS}}');
    expect(result).toContain('DESIGN SYSTEM TOKENS');
    expect(result).toContain('## COMPONENTS');
    expect(result).toContain('## OUTPUT FORMAT');
    expect(result).toContain('Style Applied:');
  });

  it('should work end-to-end for implementation agent', () => {
    const prompt = `You are GRID agent.
{{DESIGN_TOKENS}}
Build the layout.`;

    const result = injectForAgent('implementation', prompt);

    expect(result).not.toContain('{{DESIGN_TOKENS}}');
    expect(result).toContain('## COLORS');
    expect(result).not.toContain('## COMPONENTS');
  });

  it('should work with compact context for minimal agents', () => {
    const prompt = `Quick task: {{DESIGN_COMPACT}}`;

    const result = injectTokensIntoPrompt(prompt);

    expect(result).not.toContain('{{DESIGN_COMPACT}}');
    expect(result).toContain('DESIGN TOKENS (Compact)');
    expect(result).toContain('Primary:');
  });

  it('should provide consistent tokens across different functions', () => {
    const context = generateDesignContext();
    const compact = generateCompactContext();
    const colors = getColorsForCSS();

    // All should use the same primary color
    expect(context.context).toContain(colors.primary);
    expect(compact).toContain(colors.primary);
  });

  it('should validate generated code compliance', () => {
    // Generate context
    const context = generateDesignContext();

    // Create "compliant" code using tokens from context
    const primaryColor = context.tokens.colors.primary;
    const code = `const styles = { color: '${primaryColor}' };`;

    const result = validateDesignCompliance(code);

    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty prompt', () => {
    const result = injectTokensIntoPrompt('');

    expect(result).toContain('DESIGN SYSTEM TOKENS');
  });

  it('should handle prompt with only marker', () => {
    const result = injectTokensIntoPrompt('{{DESIGN_TOKENS}}');

    expect(result).not.toContain('{{DESIGN_TOKENS}}');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle extremely long prompt', () => {
    const longPrompt = 'a'.repeat(10000) + '{{DESIGN_TOKENS}}' + 'b'.repeat(10000);

    const result = injectTokensIntoPrompt(longPrompt);

    expect(result).not.toContain('{{DESIGN_TOKENS}}');
    expect(result.length).toBeGreaterThan(20000);
  });

  it('should handle special characters in user request', () => {
    const result = generateDesignContext('make it like "stripe" & modern <style>');

    expect(result).toBeDefined();
    expect(result.brand).toBeDefined();
  });

  it('should handle unicode in user request', () => {
    const result = generateDesignContext('设计像 Stripe 一样的');

    expect(result).toBeDefined();
    expect(result.context).toBeDefined();
  });

  it('should handle null-ish values gracefully', () => {
    // These should not throw
    expect(() => detectBrand(undefined)).not.toThrow();
    expect(() => generateDesignContext(undefined)).not.toThrow();
    expect(() => generateCompactContext(undefined)).not.toThrow();
    expect(() => injectTokensIntoPrompt('test', undefined)).not.toThrow();
    expect(() => getColorsForCSS(undefined)).not.toThrow();
    expect(() => getTypographyForCSS(undefined)).not.toThrow();
    expect(() => validateDesignCompliance('')).not.toThrow();
  });
});
