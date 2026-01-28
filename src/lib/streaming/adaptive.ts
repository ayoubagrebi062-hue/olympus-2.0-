/**
 * OLYMPUS 2.0 - Adaptive Streaming
 *
 * Intelligent chunk sizing and rate adaptation based on
 * network conditions, client capabilities, and content type.
 */

import { StreamConfig, DEFAULT_STREAM_CONFIG } from './types';

export interface NetworkConditions {
  /** Estimated bandwidth (bytes/second) */
  bandwidth: number;
  /** Round-trip time (ms) */
  rtt: number;
  /** Packet loss rate (0-1) */
  packetLoss: number;
  /** Connection type */
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi' | 'ethernet' | 'unknown';
}

export interface AdaptiveConfig {
  /** Minimum chunk size (tokens) */
  minChunkSize: number;
  /** Maximum chunk size (tokens) */
  maxChunkSize: number;
  /** Target latency (ms) */
  targetLatencyMs: number;
  /** Adaptation rate (0-1, how quickly to adjust) */
  adaptationRate: number;
  /** Enable compression for large chunks */
  enableCompression: boolean;
  /** Compression threshold (bytes) */
  compressionThreshold: number;
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  minChunkSize: 1,
  maxChunkSize: 100,
  targetLatencyMs: 100,
  adaptationRate: 0.3,
  enableCompression: true,
  compressionThreshold: 1024,
};

/**
 * Network quality estimator
 */
export class NetworkQualityEstimator {
  private rttSamples: number[] = [];
  private bandwidthSamples: number[] = [];
  private maxSamples: number = 20;

  /**
   * Record a round-trip time sample
   */
  recordRTT(rttMs: number): void {
    this.rttSamples.push(rttMs);
    if (this.rttSamples.length > this.maxSamples) {
      this.rttSamples.shift();
    }
  }

  /**
   * Record a bandwidth sample
   */
  recordBandwidth(bytesPerSecond: number): void {
    this.bandwidthSamples.push(bytesPerSecond);
    if (this.bandwidthSamples.length > this.maxSamples) {
      this.bandwidthSamples.shift();
    }
  }

  /**
   * Estimate current network conditions
   */
  estimate(): NetworkConditions {
    const avgRTT = this.rttSamples.length > 0
      ? this.rttSamples.reduce((a, b) => a + b, 0) / this.rttSamples.length
      : 100;

    const avgBandwidth = this.bandwidthSamples.length > 0
      ? this.bandwidthSamples.reduce((a, b) => a + b, 0) / this.bandwidthSamples.length
      : 1000000; // 1 MB/s default

    // Estimate packet loss from RTT variance
    const rttVariance = this.calculateVariance(this.rttSamples);
    const packetLoss = Math.min(rttVariance / 10000, 0.5);

    // Determine connection type
    const connectionType = this.inferConnectionType(avgBandwidth, avgRTT);

    return {
      bandwidth: avgBandwidth,
      rtt: avgRTT,
      packetLoss,
      connectionType,
    };
  }

  private calculateVariance(samples: number[]): number {
    if (samples.length < 2) return 0;
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    return samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
  }

  private inferConnectionType(bandwidth: number, rtt: number): NetworkConditions['connectionType'] {
    if (bandwidth > 10000000 && rtt < 10) return 'ethernet';
    if (bandwidth > 5000000 && rtt < 30) return 'wifi';
    if (bandwidth > 1000000 && rtt < 50) return '5g';
    if (bandwidth > 500000 && rtt < 100) return '4g';
    if (bandwidth > 100000) return '3g';
    if (bandwidth > 50000) return '2g';
    return 'slow-2g';
  }

  /**
   * Get quality score (0-1)
   */
  getQualityScore(): number {
    const conditions = this.estimate();

    // Score based on bandwidth (0-0.4)
    const bandwidthScore = Math.min(conditions.bandwidth / 5000000, 1) * 0.4;

    // Score based on RTT (0-0.3)
    const rttScore = Math.max(0, 1 - conditions.rtt / 500) * 0.3;

    // Score based on packet loss (0-0.3)
    const lossScore = (1 - conditions.packetLoss * 2) * 0.3;

    return Math.max(0, Math.min(1, bandwidthScore + rttScore + lossScore));
  }

  /**
   * Reset samples
   */
  reset(): void {
    this.rttSamples = [];
    this.bandwidthSamples = [];
  }
}

/**
 * Adaptive stream configuration
 */
export class AdaptiveStreamConfig {
  private config: AdaptiveConfig;
  private networkEstimator: NetworkQualityEstimator;
  private currentChunkSize: number;
  private currentProgressDebounce: number;

  constructor(config: Partial<AdaptiveConfig> = {}) {
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
    this.networkEstimator = new NetworkQualityEstimator();
    this.currentChunkSize = DEFAULT_STREAM_CONFIG.chunkSize;
    this.currentProgressDebounce = DEFAULT_STREAM_CONFIG.progressDebounceMs;
  }

  /**
   * Update configuration based on network feedback
   */
  adapt(feedback: { latencyMs: number; bytesTransferred: number; durationMs: number }): void {
    // Record network metrics
    this.networkEstimator.recordRTT(feedback.latencyMs);
    if (feedback.durationMs > 0) {
      this.networkEstimator.recordBandwidth(
        (feedback.bytesTransferred / feedback.durationMs) * 1000
      );
    }

    const conditions = this.networkEstimator.estimate();
    const qualityScore = this.networkEstimator.getQualityScore();

    // Adapt chunk size
    this.adaptChunkSize(feedback.latencyMs, qualityScore);

    // Adapt progress debounce
    this.adaptProgressDebounce(conditions.rtt);
  }

  private adaptChunkSize(latencyMs: number, qualityScore: number): void {
    const { targetLatencyMs, adaptationRate, minChunkSize, maxChunkSize } = this.config;

    // Calculate target chunk size based on latency
    let targetChunkSize: number;

    if (latencyMs < targetLatencyMs * 0.5) {
      // Network is fast, increase chunk size
      targetChunkSize = this.currentChunkSize * 1.5;
    } else if (latencyMs > targetLatencyMs * 2) {
      // Network is slow, decrease chunk size
      targetChunkSize = this.currentChunkSize * 0.5;
    } else {
      // Network is acceptable, make small adjustments
      const ratio = targetLatencyMs / latencyMs;
      targetChunkSize = this.currentChunkSize * (1 + (ratio - 1) * 0.1);
    }

    // Apply quality score modifier
    targetChunkSize *= (0.5 + qualityScore * 0.5);

    // Smooth adaptation
    this.currentChunkSize = Math.round(
      this.currentChunkSize * (1 - adaptationRate) + targetChunkSize * adaptationRate
    );

    // Clamp to limits
    this.currentChunkSize = Math.max(minChunkSize, Math.min(maxChunkSize, this.currentChunkSize));
  }

  private adaptProgressDebounce(rttMs: number): void {
    // Progress updates should be at least as frequent as RTT
    this.currentProgressDebounce = Math.max(50, Math.min(500, rttMs * 2));
  }

  /**
   * Get current stream configuration
   */
  getStreamConfig(): StreamConfig {
    return {
      chunkSize: this.currentChunkSize,
      progressDebounceMs: this.currentProgressDebounce,
      tokenLevel: this.currentChunkSize <= 1,
      maxBufferSize: Math.max(1000, this.currentChunkSize * 20),
      heartbeatMs: Math.max(10000, this.currentProgressDebounce * 100),
    };
  }

  /**
   * Check if compression should be used
   */
  shouldCompress(payloadSize: number): boolean {
    return this.config.enableCompression && payloadSize >= this.config.compressionThreshold;
  }

  /**
   * Get recommended batch size for multiple events
   */
  getRecommendedBatchSize(): number {
    const quality = this.networkEstimator.getQualityScore();

    if (quality > 0.8) return 10;
    if (quality > 0.5) return 5;
    if (quality > 0.3) return 3;
    return 1;
  }

  /**
   * Get network quality
   */
  getNetworkQuality(): { score: number; conditions: NetworkConditions } {
    return {
      score: this.networkEstimator.getQualityScore(),
      conditions: this.networkEstimator.estimate(),
    };
  }

  /**
   * Reset adaptation state
   */
  reset(): void {
    this.networkEstimator.reset();
    this.currentChunkSize = DEFAULT_STREAM_CONFIG.chunkSize;
    this.currentProgressDebounce = DEFAULT_STREAM_CONFIG.progressDebounceMs;
  }
}

/**
 * Content-aware chunking strategy
 */
export class ContentAwareChunker {
  private buffer: string = '';
  private minChunkSize: number;
  private maxChunkSize: number;

  constructor(minChunkSize: number = 5, maxChunkSize: number = 50) {
    this.minChunkSize = minChunkSize;
    this.maxChunkSize = maxChunkSize;
  }

  /**
   * Add content and get chunks that should be emitted
   */
  addContent(content: string): string[] {
    this.buffer += content;
    const chunks: string[] = [];

    while (this.buffer.length >= this.minChunkSize) {
      const chunk = this.extractChunk();
      if (chunk) {
        chunks.push(chunk);
      } else {
        break;
      }
    }

    return chunks;
  }

  /**
   * Extract a natural chunk from the buffer
   */
  private extractChunk(): string | null {
    if (this.buffer.length < this.minChunkSize) return null;

    // Look for natural break points
    const breakPoints = [
      { char: '\n', priority: 3 },
      { char: '. ', priority: 2 },
      { char: ', ', priority: 1 },
      { char: ' ', priority: 0 },
    ];

    let bestBreak = -1;
    let bestPriority = -1;

    for (const { char, priority } of breakPoints) {
      const index = this.buffer.indexOf(char, this.minChunkSize - 1);

      if (index > 0 && index <= this.maxChunkSize) {
        if (priority > bestPriority) {
          bestBreak = index + char.length;
          bestPriority = priority;
        }
      }
    }

    // If no natural break, use max size
    if (bestBreak === -1) {
      if (this.buffer.length >= this.maxChunkSize) {
        bestBreak = this.maxChunkSize;
      } else {
        return null; // Wait for more content
      }
    }

    const chunk = this.buffer.slice(0, bestBreak);
    this.buffer = this.buffer.slice(bestBreak);
    return chunk;
  }

  /**
   * Flush remaining buffer
   */
  flush(): string | null {
    if (this.buffer.length === 0) return null;
    const chunk = this.buffer;
    this.buffer = '';
    return chunk;
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}

/**
 * Compression utilities (using browser/node APIs)
 */
export async function compressContent(content: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  // Use CompressionStream if available (modern browsers/Node 18+)
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(data);
    writer.close();

    const chunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  // Fallback: return uncompressed
  return data;
}

/**
 * Decompress content
 */
export async function decompressContent(data: Uint8Array): Promise<string> {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(data);
    writer.close();

    const chunks: Uint8Array[] = [];
    const reader = ds.readable.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine and decode
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(result);
  }

  // Fallback: assume uncompressed
  return new TextDecoder().decode(data);
}
