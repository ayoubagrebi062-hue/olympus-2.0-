/**
 * DESIGN-TOKEN-PROVIDER - Comprehensive Unit Tests
 * =================================================
 * Tests for the OLYMPUS design token system.
 * Target: 80%+ coverage
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TOKENS,
  BRAND_INTERPRETATIONS,
  interpretBrand,
  getDesignTokens,
  getTokenValue,
  tokensToTailwindConfig,
  deepMerge,
  type DesignTokens,
  type BrandInterpretation,
} from '../design-token-provider';

// ============================================================================
// DEFAULT_TOKENS
// ============================================================================

describe('DEFAULT_TOKENS', () => {
  describe('structure', () => {
    it('should have all required top-level keys', () => {
      expect(DEFAULT_TOKENS).toHaveProperty('colors');
      expect(DEFAULT_TOKENS).toHaveProperty('typography');
      expect(DEFAULT_TOKENS).toHaveProperty('spacing');
      expect(DEFAULT_TOKENS).toHaveProperty('radius');
      expect(DEFAULT_TOKENS).toHaveProperty('shadows');
      expect(DEFAULT_TOKENS).toHaveProperty('motion');
      expect(DEFAULT_TOKENS).toHaveProperty('effects');
      expect(DEFAULT_TOKENS).toHaveProperty('components');
      expect(DEFAULT_TOKENS).toHaveProperty('breakpoints');
      expect(DEFAULT_TOKENS).toHaveProperty('zIndex');
    });

    it('should have proper color structure', () => {
      expect(DEFAULT_TOKENS.colors).toHaveProperty('primary');
      expect(DEFAULT_TOKENS.colors).toHaveProperty('primaryHover');
      expect(DEFAULT_TOKENS.colors).toHaveProperty('background');
      expect(DEFAULT_TOKENS.colors).toHaveProperty('surface');
      expect(DEFAULT_TOKENS.colors).toHaveProperty('text');
      expect(DEFAULT_TOKENS.colors).toHaveProperty('semantic');
    });

    it('should have nested text colors', () => {
      expect(DEFAULT_TOKENS.colors.text).toHaveProperty('primary');
      expect(DEFAULT_TOKENS.colors.text).toHaveProperty('secondary');
      expect(DEFAULT_TOKENS.colors.text).toHaveProperty('muted');
      expect(DEFAULT_TOKENS.colors.text).toHaveProperty('disabled');
    });

    it('should have nested semantic colors', () => {
      expect(DEFAULT_TOKENS.colors.semantic).toHaveProperty('success');
      expect(DEFAULT_TOKENS.colors.semantic).toHaveProperty('warning');
      expect(DEFAULT_TOKENS.colors.semantic).toHaveProperty('error');
      expect(DEFAULT_TOKENS.colors.semantic).toHaveProperty('info');
    });
  });

  describe('values', () => {
    it('should have VIOLET as primary color (not blue)', () => {
      // OLYMPUS brand is VIOLET
      expect(DEFAULT_TOKENS.colors.primary).toBe('#7c3aed');
    });

    it('should have valid hex colors', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      expect(DEFAULT_TOKENS.colors.primary).toMatch(hexPattern);
      expect(DEFAULT_TOKENS.colors.background).toMatch(hexPattern);
      expect(DEFAULT_TOKENS.colors.text.primary).toMatch(hexPattern);
    });

    it('should have proper font families', () => {
      expect(DEFAULT_TOKENS.typography.fontFamily.sans).toContain('Inter');
      expect(DEFAULT_TOKENS.typography.fontFamily.mono).toContain('JetBrains Mono');
    });

    it('should have spacing scale as array', () => {
      expect(Array.isArray(DEFAULT_TOKENS.spacing.scale)).toBe(true);
      expect(DEFAULT_TOKENS.spacing.scale.length).toBeGreaterThan(0);
    });

    it('should have proper z-index values', () => {
      expect(DEFAULT_TOKENS.zIndex.modal).toBeGreaterThan(DEFAULT_TOKENS.zIndex.dropdown);
      expect(DEFAULT_TOKENS.zIndex.tooltip).toBeGreaterThan(DEFAULT_TOKENS.zIndex.modal);
    });
  });

  describe('typography', () => {
    it('should have all font sizes', () => {
      expect(DEFAULT_TOKENS.typography.fontSize).toHaveProperty('xs');
      expect(DEFAULT_TOKENS.typography.fontSize).toHaveProperty('sm');
      expect(DEFAULT_TOKENS.typography.fontSize).toHaveProperty('base');
      expect(DEFAULT_TOKENS.typography.fontSize).toHaveProperty('lg');
      expect(DEFAULT_TOKENS.typography.fontSize).toHaveProperty('xl');
    });

    it('should have all font weights', () => {
      expect(DEFAULT_TOKENS.typography.fontWeight).toHaveProperty('normal');
      expect(DEFAULT_TOKENS.typography.fontWeight).toHaveProperty('medium');
      expect(DEFAULT_TOKENS.typography.fontWeight).toHaveProperty('semibold');
      expect(DEFAULT_TOKENS.typography.fontWeight).toHaveProperty('bold');
    });

    it('should have font weights as numbers', () => {
      expect(typeof DEFAULT_TOKENS.typography.fontWeight.normal).toBe('number');
      expect(DEFAULT_TOKENS.typography.fontWeight.bold).toBeGreaterThan(
        DEFAULT_TOKENS.typography.fontWeight.normal
      );
    });
  });

  describe('motion', () => {
    it('should have all duration values', () => {
      expect(DEFAULT_TOKENS.motion.duration).toHaveProperty('instant');
      expect(DEFAULT_TOKENS.motion.duration).toHaveProperty('fast');
      expect(DEFAULT_TOKENS.motion.duration).toHaveProperty('normal');
      expect(DEFAULT_TOKENS.motion.duration).toHaveProperty('slow');
    });

    it('should have easing functions', () => {
      expect(DEFAULT_TOKENS.motion.easing.default).toContain('cubic-bezier');
      expect(DEFAULT_TOKENS.motion.easing.spring).toContain('cubic-bezier');
    });

    it('should have motion patterns', () => {
      expect(DEFAULT_TOKENS.motion.patterns).toHaveProperty('buttonHover');
      expect(DEFAULT_TOKENS.motion.patterns).toHaveProperty('modalEnter');
      expect(DEFAULT_TOKENS.motion.patterns.buttonHover).toHaveProperty('duration');
      expect(DEFAULT_TOKENS.motion.patterns.buttonHover).toHaveProperty('easing');
    });
  });

  describe('effects', () => {
    it('should have glassmorphism settings', () => {
      expect(DEFAULT_TOKENS.effects.glassmorphism).toHaveProperty('background');
      expect(DEFAULT_TOKENS.effects.glassmorphism).toHaveProperty('blur');
      expect(DEFAULT_TOKENS.effects.glassmorphism).toHaveProperty('border');
    });

    it('should have glow effects', () => {
      expect(DEFAULT_TOKENS.effects.glow).toHaveProperty('subtle');
      expect(DEFAULT_TOKENS.effects.glow).toHaveProperty('medium');
      expect(DEFAULT_TOKENS.effects.glow).toHaveProperty('strong');
    });

    it('should have gradients', () => {
      expect(DEFAULT_TOKENS.effects.gradients).toHaveProperty('primary');
      expect(DEFAULT_TOKENS.effects.gradients.primary).toContain('linear-gradient');
    });
  });

  describe('components', () => {
    it('should have button configuration', () => {
      expect(DEFAULT_TOKENS.components.button).toHaveProperty('sizes');
      expect(DEFAULT_TOKENS.components.button).toHaveProperty('variants');
      expect(DEFAULT_TOKENS.components.button.sizes).toHaveProperty('sm');
      expect(DEFAULT_TOKENS.components.button.sizes).toHaveProperty('md');
      expect(DEFAULT_TOKENS.components.button.sizes).toHaveProperty('lg');
    });

    it('should have input configuration', () => {
      expect(DEFAULT_TOKENS.components.input).toHaveProperty('sizes');
      expect(DEFAULT_TOKENS.components.input).toHaveProperty('borderRadius');
    });

    it('should have card configuration', () => {
      expect(DEFAULT_TOKENS.components.card).toHaveProperty('padding');
      expect(DEFAULT_TOKENS.components.card).toHaveProperty('radius');
      expect(DEFAULT_TOKENS.components.card).toHaveProperty('background');
    });

    it('should have modal configuration', () => {
      expect(DEFAULT_TOKENS.components.modal).toHaveProperty('maxWidth');
      expect(DEFAULT_TOKENS.components.modal.maxWidth).toHaveProperty('sm');
      expect(DEFAULT_TOKENS.components.modal.maxWidth).toHaveProperty('lg');
    });
  });
});

// ============================================================================
// BRAND_INTERPRETATIONS
// ============================================================================

describe('BRAND_INTERPRETATIONS', () => {
  describe('theme keywords', () => {
    it('should have dark theme interpretation', () => {
      expect(BRAND_INTERPRETATIONS['dark']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['dark'].colors).toBeDefined();
    });

    it('should have light theme interpretation', () => {
      expect(BRAND_INTERPRETATIONS['light']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['light'].colors?.text?.primary).toBe('#18181B');
    });
  });

  describe('style keywords', () => {
    it('should have modern style', () => {
      expect(BRAND_INTERPRETATIONS['modern']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['modern'].colors?.primary).toBe('#3B82F6');
    });

    it('should have minimal style', () => {
      expect(BRAND_INTERPRETATIONS['minimal']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['minimal'].colors?.background).toBe('#FFFFFF');
    });

    it('should have playful style', () => {
      expect(BRAND_INTERPRETATIONS['playful']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['playful'].colors?.primary).toBe('#EC4899');
    });

    it('should have corporate style', () => {
      expect(BRAND_INTERPRETATIONS['corporate']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['corporate'].colors?.primary).toBe('#1E40AF');
    });

    it('should have elegant style', () => {
      expect(BRAND_INTERPRETATIONS['elegant']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['elegant'].typography?.fontFamily?.sans).toContain(
        'Playfair Display'
      );
    });
  });

  describe('brand keywords', () => {
    it('should have stripe interpretation', () => {
      expect(BRAND_INTERPRETATIONS['stripe']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['stripe'].colors?.primary).toBe('#635BFF');
      expect(BRAND_INTERPRETATIONS['stripe'].colors?.background).toBe('#0A2540');
    });

    it('should have linear interpretation', () => {
      expect(BRAND_INTERPRETATIONS['linear']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['linear'].colors?.primary).toBe('#5E6AD2');
    });

    it('should have vercel interpretation', () => {
      expect(BRAND_INTERPRETATIONS['vercel']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['vercel'].colors?.primary).toBe('#000000');
      expect(BRAND_INTERPRETATIONS['vercel'].typography?.fontFamily?.sans).toContain('Geist');
    });

    it('should have apple interpretation', () => {
      expect(BRAND_INTERPRETATIONS['apple']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['apple'].colors?.primary).toBe('#007AFF');
    });

    it('should have spotify interpretation', () => {
      expect(BRAND_INTERPRETATIONS['spotify']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['spotify'].colors?.primary).toBe('#1DB954');
    });

    it('should have notion interpretation', () => {
      expect(BRAND_INTERPRETATIONS['notion']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['notion'].colors?.background).toBe('#FFFFFF');
    });

    it('should have github interpretation', () => {
      expect(BRAND_INTERPRETATIONS['github']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['github'].colors?.primary).toBe('#238636');
    });

    it('should have discord interpretation', () => {
      expect(BRAND_INTERPRETATIONS['discord']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['discord'].colors?.primary).toBe('#5865F2');
    });

    it('should have figma interpretation', () => {
      expect(BRAND_INTERPRETATIONS['figma']).toBeDefined();
      expect(BRAND_INTERPRETATIONS['figma'].colors?.primary).toBe('#A259FF');
    });
  });
});

// ============================================================================
// interpretBrand()
// ============================================================================

describe('interpretBrand', () => {
  describe('basic functionality', () => {
    it('should return BrandInterpretation object', () => {
      const result = interpretBrand('test request');

      expect(result).toHaveProperty('userRequest');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('matchedKeywords');
      expect(result).toHaveProperty('reasoning');
    });

    it('should preserve original user request', () => {
      const request = 'make it like stripe';
      const result = interpretBrand(request);

      expect(result.userRequest).toBe(request);
    });

    it('should always return valid tokens', () => {
      const result = interpretBrand('random nonsense');

      expect(result.tokens).toBeDefined();
      expect(result.tokens.colors).toBeDefined();
      expect(result.tokens.typography).toBeDefined();
    });
  });

  describe('brand matching', () => {
    it('should match stripe keyword', () => {
      const result = interpretBrand('make it like stripe');

      expect(result.matchedKeywords).toContain('stripe');
      expect(result.tokens.colors.primary).toBe('#635BFF');
    });

    it('should match linear keyword', () => {
      const result = interpretBrand('linear style please');

      expect(result.matchedKeywords).toContain('linear');
      expect(result.tokens.colors.primary).toBe('#5E6AD2');
    });

    it('should match vercel keyword', () => {
      const result = interpretBrand('vercel inspired design');

      expect(result.matchedKeywords).toContain('vercel');
    });

    it('should match apple keyword', () => {
      const result = interpretBrand('apple-like interface');

      expect(result.matchedKeywords).toContain('apple');
    });
  });

  describe('theme matching', () => {
    it('should match dark theme', () => {
      const result = interpretBrand('dark theme please');

      expect(result.matchedKeywords).toContain('dark');
    });

    it('should match light theme', () => {
      const result = interpretBrand('light mode design');

      expect(result.matchedKeywords).toContain('light');
      expect(result.tokens.colors.background).toBe('#FFFFFF');
    });
  });

  describe('style matching', () => {
    it('should match modern style', () => {
      const result = interpretBrand('modern design');

      expect(result.matchedKeywords).toContain('modern');
    });

    it('should match minimal style', () => {
      const result = interpretBrand('minimal clean look');

      expect(result.matchedKeywords).toContain('minimal');
    });

    it('should match playful style', () => {
      const result = interpretBrand('playful and fun');

      expect(result.matchedKeywords).toContain('playful');
    });
  });

  describe('multiple matches', () => {
    it('should match multiple keywords', () => {
      const result = interpretBrand('dark minimal stripe');

      expect(result.matchedKeywords.length).toBeGreaterThan(1);
      expect(result.matchedKeywords).toContain('dark');
      expect(result.matchedKeywords).toContain('minimal');
      expect(result.matchedKeywords).toContain('stripe');
    });

    it('should merge multiple overrides', () => {
      const result = interpretBrand('dark stripe');

      // Should have stripe's primary color
      expect(result.tokens.colors.primary).toBe('#635BFF');
    });
  });

  describe('case insensitivity', () => {
    it('should match uppercase keywords', () => {
      const result = interpretBrand('STRIPE DESIGN');

      expect(result.matchedKeywords).toContain('stripe');
    });

    it('should match mixed case keywords', () => {
      const result = interpretBrand('Stripe Design');

      expect(result.matchedKeywords).toContain('stripe');
    });
  });

  describe('no matches', () => {
    it('should return empty matchedKeywords when no match', () => {
      const result = interpretBrand('random unrelated text');

      expect(result.matchedKeywords).toHaveLength(0);
    });

    it('should use default tokens when no match', () => {
      const result = interpretBrand('xyz abc 123');

      expect(result.tokens.colors.primary).toBe(DEFAULT_TOKENS.colors.primary);
    });

    it('should provide appropriate reasoning when no match', () => {
      const result = interpretBrand('no keywords here');

      expect(result.reasoning).toContain('No brand keywords matched');
      expect(result.reasoning).toContain('OLYMPUS');
    });
  });

  describe('reasoning', () => {
    it('should include matched keywords in reasoning', () => {
      const result = interpretBrand('stripe design');

      expect(result.reasoning).toContain('stripe');
      expect(result.reasoning).toContain('Matched');
    });

    it('should mention token overrides', () => {
      const result = interpretBrand('linear style');

      expect(result.reasoning).toContain('overrides');
    });
  });
});

// ============================================================================
// getDesignTokens()
// ============================================================================

describe('getDesignTokens', () => {
  describe('without user request', () => {
    it('should return default tokens', () => {
      const tokens = getDesignTokens();

      expect(tokens).toEqual(DEFAULT_TOKENS);
    });

    it('should return valid token structure', () => {
      const tokens = getDesignTokens();

      expect(tokens.colors).toBeDefined();
      expect(tokens.typography).toBeDefined();
      expect(tokens.spacing).toBeDefined();
    });
  });

  describe('with user request', () => {
    it('should interpret brand from request', () => {
      const tokens = getDesignTokens('stripe style');

      expect(tokens.colors.primary).toBe('#635BFF');
    });

    it('should return modified tokens', () => {
      const tokens = getDesignTokens('dark theme');

      expect(tokens.colors.background).not.toBe(DEFAULT_TOKENS.colors.background);
    });

    it('should handle empty string', () => {
      const tokens = getDesignTokens('');

      expect(tokens).toEqual(DEFAULT_TOKENS);
    });
  });

  describe('undefined handling', () => {
    it('should handle undefined user request', () => {
      const tokens = getDesignTokens(undefined);

      expect(tokens).toEqual(DEFAULT_TOKENS);
    });
  });
});

// ============================================================================
// getTokenValue()
// ============================================================================

describe('getTokenValue', () => {
  describe('basic path access', () => {
    it('should get top-level token', () => {
      // No top-level string tokens, but breakpoints are strings
      const value = getTokenValue('breakpoints.sm');

      expect(value).toBe('640px');
    });

    it('should get nested color value', () => {
      const value = getTokenValue('colors.primary');

      expect(value).toBe('#7c3aed');
    });

    it('should get deeply nested value', () => {
      const value = getTokenValue('colors.text.primary');

      expect(value).toBe('#FAFAFA');
    });

    it('should get numeric value', () => {
      const value = getTokenValue('spacing.base');

      expect(value).toBe(4);
    });

    it('should get z-index value', () => {
      const value = getTokenValue('zIndex.modal');

      expect(value).toBe(50);
    });
  });

  describe('with custom tokens', () => {
    it('should use provided tokens', () => {
      const customTokens = { ...DEFAULT_TOKENS };
      customTokens.colors = { ...customTokens.colors, primary: '#FF0000' };

      const value = getTokenValue('colors.primary', customTokens);

      expect(value).toBe('#FF0000');
    });
  });

  describe('invalid paths', () => {
    it('should return undefined for non-existent path', () => {
      const value = getTokenValue('colors.nonexistent');

      expect(value).toBeUndefined();
    });

    it('should return undefined for empty path', () => {
      const value = getTokenValue('');

      expect(value).toBeUndefined();
    });

    it('should return undefined for deeply invalid path', () => {
      const value = getTokenValue('a.b.c.d.e.f');

      expect(value).toBeUndefined();
    });

    it('should return undefined for object values', () => {
      // colors.text is an object, not a string/number
      const value = getTokenValue('colors.text');

      expect(value).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle single-part path', () => {
      // spacing is an object, should return undefined
      const value = getTokenValue('spacing');

      expect(value).toBeUndefined();
    });

    it('should handle typography fontSize', () => {
      const value = getTokenValue('typography.fontSize.base');

      expect(value).toBe('1rem');
    });

    it('should handle typography fontWeight', () => {
      const value = getTokenValue('typography.fontWeight.bold');

      expect(value).toBe(700);
    });
  });
});

// ============================================================================
// tokensToTailwindConfig()
// ============================================================================

describe('tokensToTailwindConfig', () => {
  describe('output format', () => {
    it('should return a string', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(typeof config).toBe('string');
    });

    it('should include module.exports', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain('module.exports');
    });

    it('should include theme.extend', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain('theme:');
      expect(config).toContain('extend:');
    });
  });

  describe('colors', () => {
    it('should include primary colors', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain(`DEFAULT: '${DEFAULT_TOKENS.colors.primary}'`);
      expect(config).toContain(`hover: '${DEFAULT_TOKENS.colors.primaryHover}'`);
    });

    it('should include semantic colors', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain('success:');
      expect(config).toContain('warning:');
      expect(config).toContain('error:');
      expect(config).toContain('info:');
    });

    it('should include text colors', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain('text:');
      expect(config).toContain(`primary: '${DEFAULT_TOKENS.colors.text.primary}'`);
    });
  });

  describe('typography', () => {
    it('should include font family', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain('fontFamily:');
      expect(config).toContain('sans:');
      expect(config).toContain('mono:');
    });
  });

  describe('border radius', () => {
    it('should include radius values', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain('borderRadius:');
      expect(config).toContain(`sm: '${DEFAULT_TOKENS.radius.sm}'`);
      expect(config).toContain(`lg: '${DEFAULT_TOKENS.radius.lg}'`);
    });
  });

  describe('shadows', () => {
    it('should include shadow values', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain('boxShadow:');
      expect(config).toContain('glow:');
    });
  });

  describe('motion', () => {
    it('should include transition duration', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain('transitionDuration:');
      expect(config).toContain('fast:');
      expect(config).toContain('slow:');
    });

    it('should include transition timing functions', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain('transitionTimingFunction:');
      expect(config).toContain('spring:');
    });
  });

  describe('z-index', () => {
    it('should include z-index values', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain('zIndex:');
      expect(config).toContain('modal:');
      expect(config).toContain('tooltip:');
    });
  });

  describe('with custom tokens', () => {
    it('should use provided token values', () => {
      const customTokens = {
        ...DEFAULT_TOKENS,
        colors: {
          ...DEFAULT_TOKENS.colors,
          primary: '#FF0000',
        },
      };

      const config = tokensToTailwindConfig(customTokens);

      expect(config).toContain(`DEFAULT: '#FF0000'`);
    });
  });

  describe('comments', () => {
    it('should include auto-generated comment', () => {
      const config = tokensToTailwindConfig(DEFAULT_TOKENS);

      expect(config).toContain('Auto-generated from OLYMPUS Design Tokens');
      expect(config).toContain('DO NOT EDIT DIRECTLY');
    });
  });
});

// ============================================================================
// deepMerge()
// ============================================================================

describe('deepMerge', () => {
  describe('basic merging', () => {
    it('should merge flat objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };

      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should not mutate original target', () => {
      const target = { a: 1 };
      const source = { b: 2 } as Partial<typeof target>;

      deepMerge(target, source);

      expect(target).toEqual({ a: 1 });
    });

    it('should not mutate original source', () => {
      const target = { a: 1 };
      const source = { b: 2 } as Partial<typeof target>;

      deepMerge(target, source);

      expect(source).toEqual({ b: 2 });
    });
  });

  describe('nested merging', () => {
    it('should merge nested objects', () => {
      const target = { a: { x: 1, y: 2 }, b: 3 };
      const source = { a: { y: 5, z: 6 } };

      const result = deepMerge(target, source as unknown as Partial<typeof target>);

      expect(result).toEqual({ a: { x: 1, y: 5, z: 6 }, b: 3 });
    });

    it('should handle deeply nested objects', () => {
      const target = { a: { b: { c: 1 } } };
      const source = { a: { b: { d: 2 } } };

      const result = deepMerge(target, source as unknown as Partial<typeof target>);

      expect(result).toEqual({ a: { b: { c: 1, d: 2 } } });
    });
  });

  describe('array handling', () => {
    it('should replace arrays (not merge)', () => {
      const target = { arr: [1, 2, 3] };
      const source = { arr: [4, 5] };

      const result = deepMerge(target, source);

      expect(result.arr).toEqual([4, 5]);
    });
  });

  describe('undefined handling', () => {
    it('should not override with undefined', () => {
      const target = { a: 1, b: 2 };
      const source = { a: undefined };

      const result = deepMerge(target, source);

      expect(result.a).toBe(1);
    });
  });

  describe('null handling', () => {
    it('should handle null in source', () => {
      const target = { a: { x: 1 }, b: 2 };
      const source = { a: null };

      const result = deepMerge(target, source as unknown as Partial<typeof target>);

      // null should replace the nested object
      expect(result.a).toBe(null);
    });

    it('should handle null in target', () => {
      const target = { a: null, b: 2 };
      const source = { a: { x: 1 } };

      const result = deepMerge(target, source as unknown as Partial<typeof target>);

      expect(result.a).toEqual({ x: 1 });
    });
  });

  describe('empty objects', () => {
    it('should handle empty source', () => {
      const target = { a: 1, b: 2 };
      const source = {};

      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle empty target', () => {
      const target = {};
      const source = { a: 1, b: 2 };

      const result = deepMerge(target as { a?: number; b?: number }, source);

      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('type preservation', () => {
    it('should preserve string values', () => {
      const target = { color: 'red' };
      const source = { color: 'blue' };

      const result = deepMerge(target, source);

      expect(typeof result.color).toBe('string');
      expect(result.color).toBe('blue');
    });

    it('should preserve number values', () => {
      const target = { count: 5 };
      const source = { count: 10 };

      const result = deepMerge(target, source);

      expect(typeof result.count).toBe('number');
      expect(result.count).toBe(10);
    });

    it('should preserve boolean values', () => {
      const target = { enabled: true };
      const source = { enabled: false };

      const result = deepMerge(target, source);

      expect(typeof result.enabled).toBe('boolean');
      expect(result.enabled).toBe(false);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration', () => {
  it('should generate valid Tailwind config from interpreted tokens', () => {
    const { tokens } = interpretBrand('stripe style');
    const config = tokensToTailwindConfig(tokens);

    // Should contain stripe's primary color
    expect(config).toContain('#635BFF');
    expect(config).toContain('module.exports');
  });

  it('should maintain consistency across functions', () => {
    const request = 'make it like linear';

    // Get tokens via interpretBrand
    const interpretation = interpretBrand(request);

    // Get tokens via getDesignTokens
    const tokens = getDesignTokens(request);

    // Both should have the same primary color
    expect(interpretation.tokens.colors.primary).toBe(tokens.colors.primary);
  });

  it('should allow token value extraction from interpreted tokens', () => {
    const { tokens } = interpretBrand('apple design');
    const primary = getTokenValue('colors.primary', tokens);

    expect(primary).toBe('#007AFF');
  });

  it('should handle full workflow: request → tokens → config', () => {
    // 1. User request
    const request = 'dark theme with modern feel';

    // 2. Interpret brand
    const interpretation = interpretBrand(request);
    expect(interpretation.matchedKeywords).toContain('dark');
    expect(interpretation.matchedKeywords).toContain('modern');

    // 3. Get specific token
    const primary = getTokenValue('colors.primary', interpretation.tokens);
    expect(primary).toBeDefined();

    // 4. Generate config
    const config = tokensToTailwindConfig(interpretation.tokens);
    expect(config).toContain('module.exports');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('should handle very long user request', () => {
    const longRequest = 'a'.repeat(10000) + ' stripe ' + 'b'.repeat(10000);
    const result = interpretBrand(longRequest);

    expect(result.matchedKeywords).toContain('stripe');
  });

  it('should handle special characters in request', () => {
    const result = interpretBrand('stripe!!! $$$$ @@@');

    expect(result.matchedKeywords).toContain('stripe');
  });

  it('should handle unicode in request', () => {
    const result = interpretBrand('设计像 stripe 一样的');

    expect(result.matchedKeywords).toContain('stripe');
  });

  it('should handle newlines in request', () => {
    const result = interpretBrand('make it\nlike\nstripe');

    expect(result.matchedKeywords).toContain('stripe');
  });

  it('should not crash on empty DEFAULT_TOKENS access', () => {
    expect(() => getTokenValue('nonexistent.deep.path')).not.toThrow();
  });

  it('should handle partial brand override structure', () => {
    // Brand interpretations may only override some properties
    const result = interpretBrand('spotify');

    // Should still have all required token properties from default
    expect(result.tokens.typography).toBeDefined();
    expect(result.tokens.spacing).toBeDefined();
    expect(result.tokens.motion).toBeDefined();
  });
});
