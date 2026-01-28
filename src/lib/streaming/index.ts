/**
 * OLYMPUS 2.0 - Production Streaming System
 *
 * Enterprise-grade real-time streaming with:
 * - SSE encoding/decoding
 * - Backpressure handling
 * - Automatic reconnection with replay
 * - Stream multiplexing for parallel agents
 * - Adaptive chunking based on network conditions
 * - Graceful degradation to polling
 * - Comprehensive metrics and observability
 */

// Core Types
export * from './types';

// SSE encoding/decoding
export { SSEEncoder, SSEDecoder } from './sse-encoder';

// Stream controller
export { StreamController, type StreamEventHandler } from './stream-controller';

// Provider wrappers
export {
  streamAnthropicCompletion,
  streamOpenAICompletion,
  type StreamingResponse,
  type StreamingCompletionOptions,
} from './streaming-provider';

// React hooks
export { useStream, type UseStreamOptions, type UseStreamResult } from './use-stream';
export {
  useBuildStream,
  type UseBuildStreamOptions,
  type UseBuildStreamResult,
  type BuildStreamState,
  type AgentState,
} from './use-build-stream';

// Backpressure handling
export {
  BackpressureController,
  PriorityBackpressureController,
  type BackpressureConfig,
  type BackpressureMetrics,
  DEFAULT_BACKPRESSURE_CONFIG,
} from './backpressure';

// Reconnection management
export {
  ReconnectionManager,
  EventBuffer,
  type ReconnectionConfig,
  type ReconnectionMetrics,
  type ConnectionState,
  DEFAULT_RECONNECTION_CONFIG,
} from './reconnection';

// Stream multiplexing
export {
  StreamMultiplexer,
  createBuildMultiplexer,
  type MultiplexedEvent,
  type ChannelConfig,
  type MultiplexerMetrics,
} from './multiplexer';

// Metrics and observability
export {
  StreamMetricsCollector,
  getStreamMetrics,
  resetStreamMetrics,
  type StreamMetrics,
  type StreamSpan,
  type MetricsConfig,
} from './metrics';

// Adaptive streaming
export {
  AdaptiveStreamConfig,
  NetworkQualityEstimator,
  ContentAwareChunker,
  compressContent,
  decompressContent,
  type NetworkConditions,
  type AdaptiveConfig,
  DEFAULT_ADAPTIVE_CONFIG,
} from './adaptive';

// Graceful degradation
export {
  GracefulTransportManager,
  SSETransport,
  WebSocketTransport,
  LongPollingTransport,
  PollingTransport,
  detectCapabilities,
  type StreamTransport,
  type TransportType,
  type TransportCapabilities,
  type TransportMetrics,
  type DegradationConfig,
  DEFAULT_DEGRADATION_CONFIG,
} from './graceful-degradation';
