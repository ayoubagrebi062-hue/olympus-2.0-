/**
 * Compression Utilities for Checkpoint State
 *
 * Provides compression/decompression for checkpoint data to reduce storage.
 * Uses pako (zlib) for browser compatibility when Node.js zlib isn't available.
 */

// ============================================================================
// COMPRESSION FUNCTIONS
// ============================================================================

/**
 * Compress a string using gzip and return base64
 */
export async function compress(data: string): Promise<string> {
  // Check if running in Node.js environment
  if (typeof window === 'undefined') {
    // Node.js environment - use zlib
    const { gzip } = await import('zlib');
    const { promisify } = await import('util');
    const gzipAsync = promisify(gzip);

    const buffer = Buffer.from(data, 'utf-8');
    const compressed = await gzipAsync(buffer);
    return compressed.toString('base64');
  }

  // Browser environment - use pako or simple encoding
  return browserCompress(data);
}

/**
 * Decompress a base64 gzip string
 */
export async function decompress(data: string): Promise<string> {
  // Check if running in Node.js environment
  if (typeof window === 'undefined') {
    // Node.js environment - use zlib
    const { gunzip } = await import('zlib');
    const { promisify } = await import('util');
    const gunzipAsync = promisify(gunzip);

    const buffer = Buffer.from(data, 'base64');
    const decompressed = await gunzipAsync(buffer);
    return decompressed.toString('utf-8');
  }

  // Browser environment
  return browserDecompress(data);
}

// ============================================================================
// BROWSER COMPRESSION (using built-in CompressionStream)
// ============================================================================

/**
 * Browser-compatible compression using CompressionStream API
 */
async function browserCompress(data: string): Promise<string> {
  // Check if CompressionStream is available
  if (typeof CompressionStream !== 'undefined') {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);

    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(encoded.buffer);
    writer.close();

    const compressed = await new Response(cs.readable).arrayBuffer();
    return arrayBufferToBase64(compressed);
  }

  // Fallback: simple base64 encoding without compression
  return btoa(encodeURIComponent(data));
}

/**
 * Browser-compatible decompression using DecompressionStream API
 */
async function browserDecompress(data: string): Promise<string> {
  // Check if DecompressionStream is available
  if (typeof DecompressionStream !== 'undefined') {
    const compressed = base64ToArrayBuffer(data);

    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(compressed.buffer as ArrayBuffer);
    writer.close();

    const decompressed = await new Response(ds.readable).arrayBuffer();
    const decoder = new TextDecoder();
    return decoder.decode(decompressed);
  }

  // Fallback: simple base64 decoding
  return decodeURIComponent(atob(data));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Estimate compression ratio for monitoring
 */
export function estimateCompressionRatio(original: string, compressed: string): number {
  return compressed.length / original.length;
}

/**
 * Check if data should be compressed based on size
 */
export function shouldCompress(data: string, threshold: number): boolean {
  return data.length > threshold;
}

/**
 * Get size in bytes of a string
 */
export function getStringByteSize(str: string): number {
  // UTF-8 encoding
  return new TextEncoder().encode(str).length;
}

// ============================================================================
// SYNCHRONOUS COMPRESSION (for testing)
// ============================================================================

/**
 * Simple synchronous compression using LZ-style algorithm
 * Used for testing when async isn't needed
 */
export function compressSync(data: string): string {
  // Simple RLE + base64 for testing
  let compressed = '';
  let count = 1;

  for (let i = 0; i < data.length; i++) {
    if (data[i] === data[i + 1] && count < 255) {
      count++;
    } else {
      if (count > 3) {
        compressed += `\x00${String.fromCharCode(count)}${data[i]}`;
      } else {
        compressed += data[i].repeat(count);
      }
      count = 1;
    }
  }

  // Return base64 encoded
  if (typeof btoa !== 'undefined') {
    return btoa(compressed);
  }
  return Buffer.from(compressed).toString('base64');
}

/**
 * Simple synchronous decompression
 */
export function decompressSync(data: string): string {
  // Decode base64
  let decoded: string;
  if (typeof atob !== 'undefined') {
    decoded = atob(data);
  } else {
    decoded = Buffer.from(data, 'base64').toString();
  }

  // Expand RLE
  let decompressed = '';
  let i = 0;

  while (i < decoded.length) {
    if (decoded[i] === '\x00') {
      const count = decoded.charCodeAt(i + 1);
      const char = decoded[i + 2];
      decompressed += char.repeat(count);
      i += 3;
    } else {
      decompressed += decoded[i];
      i++;
    }
  }

  return decompressed;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that compression/decompression is working correctly
 */
export async function validateCompression(): Promise<boolean> {
  const testData = 'Hello, World! '.repeat(100);

  try {
    const compressed = await compress(testData);
    const decompressed = await decompress(compressed);
    return decompressed === testData;
  } catch {
    return false;
  }
}

/**
 * Validate sync compression
 */
export function validateCompressionSync(): boolean {
  const testData = 'Hello, World! '.repeat(100);

  try {
    const compressed = compressSync(testData);
    const decompressed = decompressSync(compressed);
    return decompressed === testData;
  } catch {
    return false;
  }
}
