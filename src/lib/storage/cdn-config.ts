/**
 * OLYMPUS 2.0 - CDN Configuration
 * ================================
 * CDN settings, cache headers, and image transformation utilities.
 */

import { CACHE_CONTROL, CACHE_BY_CATEGORY, getCategoryFromMime } from './constants';
import type { FileCategory, CdnOptions, ImageTransformOptions, CdnUrl } from './types';

// ============================================================
// CDN PROVIDERS
// ============================================================

export type CdnProvider = 'vercel' | 'cloudflare' | 'supabase' | 'custom';

export interface CdnConfig {
  provider: CdnProvider;
  baseUrl?: string;
  customDomain?: string;
  imageOptimization: boolean;
  defaultQuality: number;
  defaultFormat: 'webp' | 'avif' | 'auto';
}

export const DEFAULT_CDN_CONFIG: CdnConfig = {
  provider: 'vercel',
  imageOptimization: true,
  defaultQuality: 75,
  defaultFormat: 'auto',
};

// ============================================================
// CACHE CONTROL HELPERS
// ============================================================

/**
 * Get cache control header for file type
 */
export function getCacheControl(mimeType: string): string {
  const category = getCategoryFromMime(mimeType);
  return CACHE_BY_CATEGORY[category] || CACHE_CONTROL.private;
}

/**
 * Get cache control for category
 */
export function getCacheControlForCategory(category: FileCategory): string {
  return CACHE_BY_CATEGORY[category] || CACHE_CONTROL.private;
}

/**
 * Build cache control header with custom options
 */
export function buildCacheControl(options: {
  public?: boolean;
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  immutable?: boolean;
  noStore?: boolean;
  noCache?: boolean;
  mustRevalidate?: boolean;
}): string {
  const directives: string[] = [];

  if (options.noStore) {
    return 'no-store';
  }

  if (options.noCache) {
    directives.push('no-cache');
  }

  directives.push(options.public ? 'public' : 'private');

  if (options.maxAge !== undefined) {
    directives.push(`max-age=${options.maxAge}`);
  }

  if (options.sMaxAge !== undefined) {
    directives.push(`s-maxage=${options.sMaxAge}`);
  }

  if (options.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  if (options.immutable) {
    directives.push('immutable');
  }

  if (options.mustRevalidate) {
    directives.push('must-revalidate');
  }

  return directives.join(', ');
}

// ============================================================
// URL TRANSFORMATIONS
// ============================================================

/**
 * Transform URL for Vercel Image Optimization
 */
export function transformForVercel(url: string, options: ImageTransformOptions): string {
  const params = new URLSearchParams();

  params.set('url', url);

  if (options.width) {
    params.set('w', options.width.toString());
  }
  if (options.quality) {
    params.set('q', options.quality.toString());
  }

  return `/_next/image?${params.toString()}`;
}

/**
 * Transform URL for Cloudflare Image Resizing
 */
export function transformForCloudflare(url: string, options: ImageTransformOptions): string {
  const params: string[] = [];

  if (options.width) {
    params.push(`width=${options.width}`);
  }
  if (options.height) {
    params.push(`height=${options.height}`);
  }
  if (options.fit) {
    params.push(`fit=${options.fit}`);
  }
  if (options.quality) {
    params.push(`quality=${options.quality}`);
  }
  if (options.format && options.format !== 'auto') {
    params.push(`format=${options.format}`);
  }

  if (params.length === 0) {
    return url;
  }

  return `/cdn-cgi/image/${params.join(',')}/${url}`;
}

/**
 * Transform URL for Supabase Image Transformation
 */
export function transformForSupabase(url: string, options: ImageTransformOptions): string {
  const urlObj = new URL(url);

  if (options.width) {
    urlObj.searchParams.set('width', options.width.toString());
  }
  if (options.height) {
    urlObj.searchParams.set('height', options.height.toString());
  }
  if (options.quality) {
    urlObj.searchParams.set('quality', options.quality.toString());
  }
  if (options.format && options.format !== 'auto') {
    urlObj.searchParams.set('format', options.format);
  }

  return urlObj.toString();
}

/**
 * Transform URL based on CDN provider
 */
export function transformImageUrl(
  url: string,
  options: ImageTransformOptions,
  provider: CdnProvider = 'vercel'
): string {
  switch (provider) {
    case 'vercel':
      return transformForVercel(url, options);
    case 'cloudflare':
      return transformForCloudflare(url, options);
    case 'supabase':
      return transformForSupabase(url, options);
    default:
      return url;
  }
}

// ============================================================
// CDN URL BUILDER
// ============================================================

export interface CdnUrlBuilder {
  width(w: number): CdnUrlBuilder;
  height(h: number): CdnUrlBuilder;
  quality(q: number): CdnUrlBuilder;
  format(f: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto'): CdnUrlBuilder;
  fit(f: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'): CdnUrlBuilder;
  build(): string;
}

/**
 * Create a fluent CDN URL builder
 */
export function cdnUrl(baseUrl: string, provider: CdnProvider = 'vercel'): CdnUrlBuilder {
  const options: ImageTransformOptions = {};

  const builder: CdnUrlBuilder = {
    width(w: number) {
      options.width = w;
      return builder;
    },
    height(h: number) {
      options.height = h;
      return builder;
    },
    quality(q: number) {
      options.quality = q;
      return builder;
    },
    format(f: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto') {
      options.format = f;
      return builder;
    },
    fit(f: 'cover' | 'contain' | 'fill' | 'inside' | 'outside') {
      options.fit = f;
      return builder;
    },
    build() {
      return transformImageUrl(baseUrl, options, provider);
    },
  };

  return builder;
}

// ============================================================
// RESPONSIVE IMAGE HELPERS
// ============================================================

export interface ResponsiveImageSrcSet {
  srcset: string;
  sizes: string;
  src: string;
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  url: string,
  widths: number[] = [320, 640, 960, 1280, 1920],
  provider: CdnProvider = 'vercel'
): ResponsiveImageSrcSet {
  const srcsetEntries = widths.map(w => {
    const transformedUrl = transformImageUrl(url, { width: w }, provider);
    return `${transformedUrl} ${w}w`;
  });

  // Default sizes attribute
  const sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  return {
    srcset: srcsetEntries.join(', '),
    sizes,
    src: transformImageUrl(url, { width: widths[Math.floor(widths.length / 2)] }, provider),
  };
}

/**
 * Generate picture element sources for multiple formats
 */
export function generatePictureSources(
  url: string,
  width: number,
  provider: CdnProvider = 'vercel'
): Array<{ type: string; srcset: string }> {
  return [
    {
      type: 'image/avif',
      srcset: transformImageUrl(url, { width, format: 'avif' }, provider),
    },
    {
      type: 'image/webp',
      srcset: transformImageUrl(url, { width, format: 'webp' }, provider),
    },
  ];
}

// ============================================================
// ALLOWED SOURCES
// ============================================================

const ALLOWED_DOMAINS = ['localhost', '127.0.0.1', '*.supabase.co', '*.supabase.in', 'supabase.co'];

/**
 * Check if source URL is allowed for image optimization
 */
export function isAllowedSource(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    return ALLOWED_DOMAINS.some(domain => {
      if (domain.startsWith('*.')) {
        const baseDomain = domain.slice(2);
        return hostname.endsWith(baseDomain);
      }
      return hostname === domain;
    });
  } catch {
    return false;
  }
}

/**
 * Add custom allowed domain
 */
export function addAllowedDomain(domain: string): void {
  if (!ALLOWED_DOMAINS.includes(domain)) {
    ALLOWED_DOMAINS.push(domain);
  }
}

// ============================================================
// CONTENT TYPE HELPERS
// ============================================================

/**
 * Get content type for format
 */
export function getContentType(
  format: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto',
  originalType?: string
): string {
  switch (format) {
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'auto':
      return originalType || 'image/webp';
    default:
      return 'image/webp';
  }
}

/**
 * Determine best format based on Accept header
 */
export function getBestFormat(acceptHeader: string): 'avif' | 'webp' | 'jpeg' {
  if (acceptHeader.includes('image/avif')) {
    return 'avif';
  }
  if (acceptHeader.includes('image/webp')) {
    return 'webp';
  }
  return 'jpeg';
}

// ============================================================
// PRELOAD HINTS
// ============================================================

/**
 * Generate preload link header for critical images
 */
export function generatePreloadHeader(
  url: string,
  options?: { as?: string; type?: string; crossorigin?: boolean }
): string {
  const parts = [`<${url}>`, 'rel=preload'];

  parts.push(`as=${options?.as || 'image'}`);

  if (options?.type) {
    parts.push(`type=${options.type}`);
  }

  if (options?.crossorigin) {
    parts.push('crossorigin');
  }

  return parts.join('; ');
}

/**
 * Generate multiple preload headers
 */
export function generatePreloadHeaders(urls: Array<{ url: string; type?: string }>): string {
  return urls.map(({ url, type }) => generatePreloadHeader(url, { type })).join(', ');
}

// ============================================================
// BLURHASH PLACEHOLDER
// ============================================================

/**
 * Generate CSS for blurred placeholder
 */
export function generatePlaceholderCSS(dominantColor: string, blurDataUrl?: string): string {
  if (blurDataUrl) {
    return `background-image: url(${blurDataUrl}); background-size: cover; background-color: ${dominantColor};`;
  }
  return `background-color: ${dominantColor};`;
}

// ============================================================
// CDN SERVICE CLASS
// ============================================================

export class CdnService {
  private config: CdnConfig;

  constructor(config: Partial<CdnConfig> = {}) {
    this.config = { ...DEFAULT_CDN_CONFIG, ...config };
  }

  /**
   * Get optimized image URL
   */
  getImageUrl(url: string, options: ImageTransformOptions = {}): string {
    if (!this.config.imageOptimization) {
      return url;
    }

    const transformOptions: ImageTransformOptions = {
      quality: options.quality || this.config.defaultQuality,
      format: options.format || this.config.defaultFormat,
      ...options,
    };

    return transformImageUrl(url, transformOptions, this.config.provider);
  }

  /**
   * Get responsive image set
   */
  getResponsiveImage(url: string, widths?: number[]): ResponsiveImageSrcSet {
    return generateSrcSet(url, widths, this.config.provider);
  }

  /**
   * Get cache headers for response
   */
  getCacheHeaders(mimeType: string): Record<string, string> {
    return {
      'Cache-Control': getCacheControl(mimeType),
      'CDN-Cache-Control': getCacheControl(mimeType),
      'Vercel-CDN-Cache-Control': getCacheControl(mimeType),
    };
  }

  /**
   * Check if URL is allowed for optimization
   */
  isAllowed(url: string): boolean {
    return isAllowedSource(url);
  }
}

// ============================================================
// SINGLETON
// ============================================================

let cdnServiceInstance: CdnService | null = null;

export function getCdnService(config?: Partial<CdnConfig>): CdnService {
  if (!cdnServiceInstance) {
    cdnServiceInstance = new CdnService(config);
  }
  return cdnServiceInstance;
}

export function createCdnService(config?: Partial<CdnConfig>): CdnService {
  return new CdnService(config);
}
