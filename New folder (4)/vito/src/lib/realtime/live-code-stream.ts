/**
 * OLYMPUS 2.1 - 10X UPGRADE: Live Code Preview Stream
 *
 * THE "HOLY SHIT" MOMENT - WATCH CODE BEING WRITTEN.
 *
 * What users see:
 * - Real-time code generation like watching a programmer type
 * - Token-by-token streaming with natural typing effect
 * - Syntax highlighting that updates live
 * - AI reasoning overlay explaining each decision
 * - Multiple simultaneous streams for parallel agents
 * - Diff view showing what's being added/changed
 * - Line-by-line blame tracking (which agent wrote what)
 */

import { logger } from '../observability/logger';
import { incCounter, setGauge } from '../observability/metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface CodeStreamConfig {
  /** Typing speed simulation (chars per second) */
  typingSpeed: number;
  /** Enable syntax highlighting */
  enableSyntaxHighlight: boolean;
  /** Enable reasoning overlay */
  enableReasoning: boolean;
  /** Maximum concurrent streams */
  maxConcurrentStreams: number;
  /** Buffer size for batching tokens */
  bufferSize: number;
  /** Flush interval (ms) */
  flushInterval: number;
}

export interface CodeStream {
  /** Unique stream ID */
  id: string;
  /** Agent generating this code */
  agentId: string;
  /** Agent name for display */
  agentName: string;
  /** File path being generated */
  filePath: string;
  /** Programming language */
  language: CodeLanguage;
  /** Current content */
  content: string;
  /** Cursor position */
  cursor: CursorPosition;
  /** Generation state */
  state: 'idle' | 'streaming' | 'paused' | 'complete' | 'error';
  /** Tokens generated so far */
  tokensGenerated: number;
  /** Lines generated so far */
  linesGenerated: number;
  /** Start time */
  startTime: number;
  /** End time (if complete) */
  endTime?: number;
  /** Error message (if error) */
  error?: string;
  /** Reasoning segments */
  reasoning: ReasoningSegment[];
  /** Diff from previous version */
  diff?: CodeDiff;
  /** Line blame (which reasoning led to which lines) */
  lineBlame: Map<number, string>;
}

export type CodeLanguage =
  | 'typescript'
  | 'javascript'
  | 'tsx'
  | 'jsx'
  | 'css'
  | 'scss'
  | 'json'
  | 'sql'
  | 'prisma'
  | 'graphql'
  | 'yaml'
  | 'markdown'
  | 'html'
  | 'shell'
  | 'unknown';

export interface CursorPosition {
  line: number;
  column: number;
  offset: number;
}

export interface ReasoningSegment {
  /** Segment ID */
  id: string;
  /** Type of reasoning */
  type: 'decision' | 'pattern' | 'constraint' | 'optimization' | 'reference';
  /** Short title */
  title: string;
  /** Full explanation */
  explanation: string;
  /** Lines this reasoning applies to */
  lineRange: { start: number; end: number };
  /** Confidence in this decision */
  confidence: number;
  /** Timestamp */
  timestamp: number;
  /** Related code snippet */
  codeSnippet?: string;
  /** Alternative approaches considered */
  alternatives?: string[];
}

export interface CodeDiff {
  /** Lines added */
  additions: DiffLine[];
  /** Lines removed */
  deletions: DiffLine[];
  /** Lines modified */
  modifications: DiffModification[];
  /** Total additions */
  addedCount: number;
  /** Total deletions */
  deletedCount: number;
}

export interface DiffLine {
  lineNumber: number;
  content: string;
}

export interface DiffModification {
  lineNumber: number;
  oldContent: string;
  newContent: string;
  changeType: 'insert' | 'delete' | 'replace';
}

export interface StreamToken {
  /** Token content */
  content: string;
  /** Token type for highlighting */
  tokenType?: TokenType;
  /** Reasoning ID this token relates to */
  reasoningId?: string;
  /** Timestamp */
  timestamp: number;
}

export type TokenType =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'operator'
  | 'function'
  | 'variable'
  | 'type'
  | 'punctuation'
  | 'whitespace'
  | 'unknown';

export interface StreamEvent {
  type: 'token' | 'line' | 'reasoning' | 'state' | 'complete' | 'error';
  streamId: string;
  timestamp: number;
  data: unknown;
}

export type StreamEventHandler = (event: StreamEvent) => void;

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

const FILE_EXTENSIONS: Record<string, CodeLanguage> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.css': 'css',
  '.scss': 'scss',
  '.json': 'json',
  '.sql': 'sql',
  '.prisma': 'prisma',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.html': 'html',
  '.sh': 'shell',
  '.bash': 'shell',
};

function detectLanguage(filePath: string): CodeLanguage {
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  return FILE_EXTENSIONS[ext.toLowerCase()] || 'unknown';
}

// ============================================================================
// SIMPLE TOKENIZER (For Demo - Use Prism/Shiki in Production)
// ============================================================================

const KEYWORD_PATTERNS: Record<CodeLanguage, RegExp[]> = {
  typescript: [
    /\b(const|let|var|function|class|interface|type|enum|export|import|from|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|async|await|new|this|super|extends|implements|public|private|protected|static|readonly|abstract|override)\b/g,
  ],
  javascript: [
    /\b(const|let|var|function|class|export|import|from|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|async|await|new|this|super|extends)\b/g,
  ],
  tsx: [
    /\b(const|let|var|function|class|interface|type|enum|export|import|from|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|async|await|new|this|super|extends|implements|public|private|protected|static|readonly|abstract|override)\b/g,
  ],
  jsx: [
    /\b(const|let|var|function|class|export|import|from|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|async|await|new|this|super|extends)\b/g,
  ],
  css: [
    /(@media|@keyframes|@import|@font-face|!important)\b/g,
  ],
  scss: [
    /(@media|@keyframes|@import|@font-face|@mixin|@include|@extend|@if|@else|@for|@each|@while|!important)\b/g,
  ],
  sql: [
    /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|AS|DISTINCT|NULL|TRUE|FALSE|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|AUTO_INCREMENT|CASCADE)\b/gi,
  ],
  prisma: [
    /\b(model|enum|datasource|generator|provider|relation|fields|references|default|unique|id|map|autoincrement|now|uuid|cuid|Int|String|Boolean|DateTime|Float|Decimal|Json|Bytes)\b/g,
  ],
  json: [],
  graphql: [
    /\b(type|query|mutation|subscription|input|enum|interface|union|scalar|schema|extend|fragment|on|implements)\b/g,
  ],
  yaml: [],
  markdown: [],
  html: [
    /(<\/?\w+|>|\/?>)/g,
  ],
  shell: [
    /\b(if|then|else|elif|fi|for|do|done|while|until|case|esac|function|return|export|source|alias|unalias|echo|printf|read|cd|pwd|ls|mkdir|rmdir|rm|cp|mv|cat|grep|sed|awk|find|xargs|sort|uniq|wc|head|tail|chmod|chown|sudo|apt|yum|npm|yarn|pip|git|docker|kubectl)\b/g,
  ],
  unknown: [],
};

function tokenize(content: string, language: CodeLanguage): StreamToken[] {
  const tokens: StreamToken[] = [];
  const patterns = KEYWORD_PATTERNS[language] || [];

  // Simple character-by-character tokenization
  // In production, use a proper lexer
  let buffer = '';
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inLineComment = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    // Handle strings
    if (!inComment && !inLineComment && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        if (buffer) {
          tokens.push(...classifyBuffer(buffer, patterns));
          buffer = '';
        }
        inString = true;
        stringChar = char;
        buffer = char;
      } else if (char === stringChar && content[i - 1] !== '\\') {
        buffer += char;
        tokens.push({ content: buffer, tokenType: 'string', timestamp: Date.now() });
        buffer = '';
        inString = false;
        stringChar = '';
      } else {
        buffer += char;
      }
      continue;
    }

    if (inString) {
      buffer += char;
      continue;
    }

    // Handle comments
    if (!inComment && !inLineComment && char === '/' && nextChar === '/') {
      if (buffer) {
        tokens.push(...classifyBuffer(buffer, patterns));
        buffer = '';
      }
      inLineComment = true;
      buffer = char;
      continue;
    }

    if (!inComment && !inLineComment && char === '/' && nextChar === '*') {
      if (buffer) {
        tokens.push(...classifyBuffer(buffer, patterns));
        buffer = '';
      }
      inComment = true;
      buffer = char;
      continue;
    }

    if (inLineComment) {
      buffer += char;
      if (char === '\n') {
        tokens.push({ content: buffer, tokenType: 'comment', timestamp: Date.now() });
        buffer = '';
        inLineComment = false;
      }
      continue;
    }

    if (inComment) {
      buffer += char;
      if (char === '/' && content[i - 1] === '*') {
        tokens.push({ content: buffer, tokenType: 'comment', timestamp: Date.now() });
        buffer = '';
        inComment = false;
      }
      continue;
    }

    // Handle whitespace
    if (/\s/.test(char)) {
      if (buffer) {
        tokens.push(...classifyBuffer(buffer, patterns));
        buffer = '';
      }
      tokens.push({ content: char, tokenType: 'whitespace', timestamp: Date.now() });
      continue;
    }

    // Handle operators and punctuation
    if (/[+\-*/%=<>!&|^~?:;,.]/.test(char)) {
      if (buffer) {
        tokens.push(...classifyBuffer(buffer, patterns));
        buffer = '';
      }
      tokens.push({ content: char, tokenType: 'operator', timestamp: Date.now() });
      continue;
    }

    if (/[()[\]{}]/.test(char)) {
      if (buffer) {
        tokens.push(...classifyBuffer(buffer, patterns));
        buffer = '';
      }
      tokens.push({ content: char, tokenType: 'punctuation', timestamp: Date.now() });
      continue;
    }

    buffer += char;
  }

  // Flush remaining buffer
  if (buffer) {
    tokens.push(...classifyBuffer(buffer, patterns));
  }

  return tokens;
}

function classifyBuffer(buffer: string, patterns: RegExp[]): StreamToken[] {
  // Check for numbers
  if (/^\d+(\.\d+)?$/.test(buffer)) {
    return [{ content: buffer, tokenType: 'number', timestamp: Date.now() }];
  }

  // Check for keywords
  for (const pattern of patterns) {
    if (pattern.test(buffer)) {
      return [{ content: buffer, tokenType: 'keyword', timestamp: Date.now() }];
    }
  }

  // Check for types (PascalCase)
  if (/^[A-Z][a-zA-Z0-9]*$/.test(buffer)) {
    return [{ content: buffer, tokenType: 'type', timestamp: Date.now() }];
  }

  // Check for functions (followed by paren would be better)
  if (/^[a-z_][a-zA-Z0-9_]*$/.test(buffer)) {
    return [{ content: buffer, tokenType: 'variable', timestamp: Date.now() }];
  }

  return [{ content: buffer, tokenType: 'unknown', timestamp: Date.now() }];
}

// ============================================================================
// CODE STREAM MANAGER
// ============================================================================

export class LiveCodeStreamManager {
  private config: CodeStreamConfig & {
    /** TTL for completed/errored streams before auto-cleanup (ms) */
    staleStreamTtlMs: number;
    /** Cleanup check interval (ms) */
    cleanupIntervalMs: number;
  };
  private streams = new Map<string, CodeStream>();
  private listeners = new Set<StreamEventHandler>();
  private tokenBuffers = new Map<string, StreamToken[]>();
  private flushTimers = new Map<string, NodeJS.Timeout>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CodeStreamConfig> = {}) {
    this.config = {
      typingSpeed: config.typingSpeed ?? 100,
      enableSyntaxHighlight: config.enableSyntaxHighlight ?? true,
      enableReasoning: config.enableReasoning ?? true,
      maxConcurrentStreams: config.maxConcurrentStreams ?? 10,
      bufferSize: config.bufferSize ?? 50,
      flushInterval: config.flushInterval ?? 50,
      staleStreamTtlMs: 5 * 60 * 1000, // 5 minutes
      cleanupIntervalMs: 60 * 1000, // 1 minute
    };

    // Start auto-cleanup for stale streams
    this.startCleanupTimer();
  }

  /**
   * Start periodic cleanup of stale streams
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleStreams();
    }, this.config.cleanupIntervalMs);

    // Don't keep process alive just for cleanup
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Remove completed/errored streams that are past TTL
   */
  private cleanupStaleStreams(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, stream] of this.streams) {
      // Only cleanup completed or errored streams
      if (stream.state !== 'complete' && stream.state !== 'error') {
        continue;
      }

      // Check if past TTL
      const endTime = stream.endTime || stream.startTime;
      if (now - endTime > this.config.staleStreamTtlMs) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.closeStream(id);
      incCounter('olympus_code_streams_auto_cleaned');
      logger.debug('Auto-cleaned stale stream', { streamId: id });
    }
  }

  /**
   * Create a new code stream
   */
  createStream(
    agentId: string,
    agentName: string,
    filePath: string,
    existingContent?: string
  ): CodeStream {
    if (this.streams.size >= this.config.maxConcurrentStreams) {
      throw new Error(`Maximum concurrent streams (${this.config.maxConcurrentStreams}) reached`);
    }

    const id = `stream_${agentId}_${Date.now()}`;
    const language = detectLanguage(filePath);

    const stream: CodeStream = {
      id,
      agentId,
      agentName,
      filePath,
      language,
      content: existingContent || '',
      cursor: this.calculateCursor(existingContent || ''),
      state: 'idle',
      tokensGenerated: 0,
      linesGenerated: (existingContent || '').split('\n').length,
      startTime: Date.now(),
      reasoning: [],
      lineBlame: new Map(),
    };

    this.streams.set(id, stream);
    this.tokenBuffers.set(id, []);

    setGauge('olympus_code_streams_active', this.streams.size);
    incCounter('olympus_code_streams_created');

    logger.info('Code stream created', {
      streamId: id,
      agentId,
      filePath,
      language,
    });

    this.emit({ type: 'state', streamId: id, timestamp: Date.now(), data: { state: 'idle' } });

    return stream;
  }

  /**
   * Start streaming code
   */
  startStreaming(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (!stream) throw new Error(`Stream not found: ${streamId}`);

    stream.state = 'streaming';
    stream.startTime = Date.now();

    this.startFlushTimer(streamId);

    this.emit({ type: 'state', streamId, timestamp: Date.now(), data: { state: 'streaming' } });

    logger.debug('Code stream started', { streamId });
  }

  /**
   * Append raw content to stream (will be tokenized and streamed)
   */
  async appendContent(streamId: string, content: string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream) throw new Error(`Stream not found: ${streamId}`);

    if (stream.state !== 'streaming') {
      stream.state = 'streaming';
      this.startFlushTimer(streamId);
    }

    // Tokenize the content
    const tokens = this.config.enableSyntaxHighlight
      ? tokenize(content, stream.language)
      : [{ content, tokenType: 'unknown' as TokenType, timestamp: Date.now() }];

    // Add to buffer
    const buffer = this.tokenBuffers.get(streamId)!;
    buffer.push(...tokens);

    // Update stream content (O(1) cursor update)
    const previousCursor = stream.cursor;
    stream.content += content;
    stream.cursor = this.calculateCursor(stream.content, previousCursor, content);
    stream.tokensGenerated += tokens.length;
    stream.linesGenerated = stream.cursor.line;

    // Flush if buffer is full
    if (buffer.length >= this.config.bufferSize) {
      this.flushBuffer(streamId);
    }
  }

  /**
   * Append a single token (for fine-grained streaming)
   */
  appendToken(streamId: string, token: StreamToken): void {
    const stream = this.streams.get(streamId);
    if (!stream) throw new Error(`Stream not found: ${streamId}`);

    const buffer = this.tokenBuffers.get(streamId)!;
    buffer.push(token);

    // O(1) cursor update
    const previousCursor = stream.cursor;
    stream.content += token.content;
    stream.cursor = this.calculateCursor(stream.content, previousCursor, token.content);
    stream.tokensGenerated++;
    stream.linesGenerated = stream.cursor.line;

    if (buffer.length >= this.config.bufferSize) {
      this.flushBuffer(streamId);
    }
  }

  /**
   * Add reasoning segment
   */
  addReasoning(streamId: string, reasoning: Omit<ReasoningSegment, 'id' | 'timestamp'>): void {
    const stream = this.streams.get(streamId);
    if (!stream) throw new Error(`Stream not found: ${streamId}`);

    const segment: ReasoningSegment = {
      ...reasoning,
      id: `reason_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };

    stream.reasoning.push(segment);

    // Update line blame
    for (let line = segment.lineRange.start; line <= segment.lineRange.end; line++) {
      stream.lineBlame.set(line, segment.id);
    }

    if (this.config.enableReasoning) {
      this.emit({
        type: 'reasoning',
        streamId,
        timestamp: Date.now(),
        data: segment,
      });
    }

    logger.debug('Reasoning added', {
      streamId,
      reasoningId: segment.id,
      type: segment.type,
      lines: `${segment.lineRange.start}-${segment.lineRange.end}`,
    });
  }

  /**
   * Complete the stream
   */
  completeStream(streamId: string, diff?: CodeDiff): void {
    const stream = this.streams.get(streamId);
    if (!stream) return;

    // Flush any remaining tokens
    this.flushBuffer(streamId);
    this.stopFlushTimer(streamId);

    stream.state = 'complete';
    stream.endTime = Date.now();
    stream.diff = diff;

    this.emit({
      type: 'complete',
      streamId,
      timestamp: Date.now(),
      data: {
        tokensGenerated: stream.tokensGenerated,
        linesGenerated: stream.linesGenerated,
        duration: stream.endTime - stream.startTime,
        diff,
      },
    });

    incCounter('olympus_code_streams_completed');

    logger.info('Code stream completed', {
      streamId,
      tokensGenerated: stream.tokensGenerated,
      linesGenerated: stream.linesGenerated,
      durationMs: stream.endTime - stream.startTime,
    });
  }

  /**
   * Mark stream as errored
   */
  errorStream(streamId: string, error: string): void {
    const stream = this.streams.get(streamId);
    if (!stream) return;

    this.stopFlushTimer(streamId);

    stream.state = 'error';
    stream.endTime = Date.now();
    stream.error = error;

    this.emit({
      type: 'error',
      streamId,
      timestamp: Date.now(),
      data: { error },
    });

    incCounter('olympus_code_streams_errors');

    logger.error('Code stream error', { streamId, error: new Error(error) });
  }

  /**
   * Pause stream
   */
  pauseStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (!stream || stream.state !== 'streaming') return;

    stream.state = 'paused';
    this.stopFlushTimer(streamId);

    this.emit({ type: 'state', streamId, timestamp: Date.now(), data: { state: 'paused' } });
  }

  /**
   * Resume stream
   */
  resumeStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (!stream || stream.state !== 'paused') return;

    stream.state = 'streaming';
    this.startFlushTimer(streamId);

    this.emit({ type: 'state', streamId, timestamp: Date.now(), data: { state: 'streaming' } });
  }

  /**
   * Get stream by ID
   */
  getStream(streamId: string): CodeStream | undefined {
    return this.streams.get(streamId);
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): CodeStream[] {
    return Array.from(this.streams.values()).filter(
      s => s.state === 'streaming' || s.state === 'paused'
    );
  }

  /**
   * Get all streams for an agent
   */
  getStreamsByAgent(agentId: string): CodeStream[] {
    return Array.from(this.streams.values()).filter(s => s.agentId === agentId);
  }

  /**
   * Subscribe to stream events
   */
  subscribe(handler: StreamEventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  /**
   * Close a stream
   */
  closeStream(streamId: string): void {
    this.stopFlushTimer(streamId);
    this.tokenBuffers.delete(streamId);
    this.streams.delete(streamId);

    setGauge('olympus_code_streams_active', this.streams.size);

    logger.debug('Code stream closed', { streamId });
  }

  /**
   * Close all streams
   */
  closeAll(): void {
    for (const streamId of this.streams.keys()) {
      this.closeStream(streamId);
    }
  }

  /**
   * Dispose of manager - MUST be called on shutdown
   * Cleans up all timers, listeners, and data
   */
  dispose(): void {
    // Stop all flush timers
    for (const timer of this.flushTimers.values()) {
      clearInterval(timer);
    }
    this.flushTimers.clear();

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear all data
    this.streams.clear();
    this.tokenBuffers.clear();
    this.listeners.clear();

    setGauge('olympus_code_streams_active', 0);

    logger.info('CodeStreamManager disposed');
  }

  /**
   * Get statistics
   */
  getStats(): CodeStreamStats {
    const streams = Array.from(this.streams.values());

    return {
      activeStreams: streams.filter(s => s.state === 'streaming').length,
      pausedStreams: streams.filter(s => s.state === 'paused').length,
      completedStreams: streams.filter(s => s.state === 'complete').length,
      erroredStreams: streams.filter(s => s.state === 'error').length,
      totalTokens: streams.reduce((sum, s) => sum + s.tokensGenerated, 0),
      totalLines: streams.reduce((sum, s) => sum + s.linesGenerated, 0),
      totalReasoningSegments: streams.reduce((sum, s) => sum + s.reasoning.length, 0),
      streamsByLanguage: this.countByLanguage(streams),
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private emit(event: StreamEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.warn('Stream event listener error', {
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }
  }

  private flushBuffer(streamId: string): void {
    const buffer = this.tokenBuffers.get(streamId);
    if (!buffer || buffer.length === 0) return;

    const tokens = buffer.splice(0, buffer.length);

    this.emit({
      type: 'token',
      streamId,
      timestamp: Date.now(),
      data: { tokens },
    });

    // Check for complete lines
    const stream = this.streams.get(streamId);
    if (stream) {
      const content = tokens.map(t => t.content).join('');
      const newlines = (content.match(/\n/g) || []).length;
      if (newlines > 0) {
        const currentLine = stream.content.split('\n').length;
        this.emit({
          type: 'line',
          streamId,
          timestamp: Date.now(),
          data: {
            lineNumber: currentLine,
            linesAdded: newlines,
          },
        });
      }
    }
  }

  private startFlushTimer(streamId: string): void {
    this.stopFlushTimer(streamId);

    const timer = setInterval(() => {
      this.flushBuffer(streamId);
    }, this.config.flushInterval);

    this.flushTimers.set(streamId, timer);
  }

  private stopFlushTimer(streamId: string): void {
    const timer = this.flushTimers.get(streamId);
    if (timer) {
      clearInterval(timer);
      this.flushTimers.delete(streamId);
    }
  }

  /**
   * Calculate cursor position incrementally (O(1) for appends)
   * Only falls back to O(n) scan when necessary
   */
  private calculateCursor(content: string, previousCursor?: CursorPosition, appendedContent?: string): CursorPosition {
    // Fast path: incremental update for appends
    if (previousCursor && appendedContent !== undefined) {
      let line = previousCursor.line;
      let column = previousCursor.column;

      for (const char of appendedContent) {
        if (char === '\n') {
          line++;
          column = 0;
        } else {
          column++;
        }
      }

      return {
        line,
        column,
        offset: content.length,
      };
    }

    // Slow path: full scan (only for initial calculation)
    const lines = content.split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length,
      offset: content.length,
    };
  }

  private countByLanguage(streams: CodeStream[]): Record<CodeLanguage, number> {
    const counts = {} as Record<CodeLanguage, number>;
    for (const stream of streams) {
      counts[stream.language] = (counts[stream.language] || 0) + 1;
    }
    return counts;
  }
}

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

export interface CodeStreamStats {
  activeStreams: number;
  pausedStreams: number;
  completedStreams: number;
  erroredStreams: number;
  totalTokens: number;
  totalLines: number;
  totalReasoningSegments: number;
  streamsByLanguage: Record<CodeLanguage, number>;
}

// ============================================================================
// DIFF CALCULATOR
// ============================================================================

export function calculateDiff(oldContent: string, newContent: string): CodeDiff {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const additions: DiffLine[] = [];
  const deletions: DiffLine[] = [];
  const modifications: DiffModification[] = [];

  // Simple line-by-line diff
  // In production, use a proper diff algorithm like Myers
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined && newLine !== undefined) {
      additions.push({ lineNumber: i + 1, content: newLine });
    } else if (oldLine !== undefined && newLine === undefined) {
      deletions.push({ lineNumber: i + 1, content: oldLine });
    } else if (oldLine !== newLine) {
      modifications.push({
        lineNumber: i + 1,
        oldContent: oldLine,
        newContent: newLine,
        changeType: 'replace',
      });
    }
  }

  return {
    additions,
    deletions,
    modifications,
    addedCount: additions.length + modifications.length,
    deletedCount: deletions.length + modifications.length,
  };
}

// ============================================================================
// FACTORY
// ============================================================================

export function createCodeStreamManager(
  config?: Partial<CodeStreamConfig>
): LiveCodeStreamManager {
  return new LiveCodeStreamManager(config);
}

// ============================================================================
// SINGLETON
// ============================================================================

export const codeStreamManager = new LiveCodeStreamManager();

export default codeStreamManager;
