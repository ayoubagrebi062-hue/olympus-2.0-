/**
 * OLYMPUS 2.1 - 10X UPGRADE: Predictive Code Stream
 *
 * THE "WATCH THE AI THINK" EXPERIENCE.
 *
 * This isn't just streaming code. This is:
 * - GHOST TEXT: See what the AI is ABOUT to write (faded preview)
 *   Like GitHub Copilot but for entire files being generated
 *
 * - AI REASONING OVERLAY: Thought bubbles explaining each decision
 *   "Using useCallback here to prevent re-renders..."
 *
 * - REWIND/REPLAY: Scrub through generation like a video
 *   See exactly how the code evolved, step by step
 *
 * - LIVE BLAME TRACKING: Click any line to see which agent wrote it
 *   and WHY they made that decision
 *
 * - MULTI-CURSOR: Watch multiple agents write simultaneously
 *   Color-coded cursors showing who's writing what
 */

import { logger } from '../observability/logger';
import { incCounter, setGauge } from '../observability/metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface PredictiveStreamConfig {
  /** Enable ghost text prediction */
  enableGhostText: boolean;
  /** Ghost text lookahead (characters) */
  ghostTextLookahead: number;
  /** Enable reasoning overlay */
  enableReasoning: boolean;
  /** Enable rewind functionality */
  enableRewind: boolean;
  /** Maximum history for rewind (events) */
  maxHistorySize: number;
  /** Typing animation speed (ms per char) */
  typingSpeed: number;
  /** Enable multi-cursor mode */
  enableMultiCursor: boolean;
}

export interface CodeFile {
  id: string;
  path: string;
  language: string;
  content: string;
  cursors: Cursor[];
  history: HistoryEntry[];
  blame: Map<number, BlameInfo>;
  reasoning: ReasoningBubble[];
  ghostText: GhostText | null;
}

export interface Cursor {
  id: string;
  agentId: string;
  agentName: string;
  color: string;
  position: Position;
  selection?: Selection;
  isTyping: boolean;
  lastActivity: number;
}

export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface Selection {
  start: Position;
  end: Position;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  agentId: string;
  type: 'insert' | 'delete' | 'replace';
  position: Position;
  content: string;
  oldContent?: string;
  reasoning?: string;
}

export interface BlameInfo {
  agentId: string;
  agentName: string;
  timestamp: number;
  reasoning: string;
  confidence: number;
}

export interface ReasoningBubble {
  id: string;
  agentId: string;
  type: 'decision' | 'pattern' | 'optimization' | 'warning' | 'reference';
  title: string;
  content: string;
  lineRange: { start: number; end: number };
  timestamp: number;
  dismissed: boolean;
}

export interface GhostText {
  content: string;
  position: Position;
  confidence: number;
  source: 'prediction' | 'template' | 'history' | 'pattern';
  expiresAt: number;
}

export interface StreamFrame {
  frameId: number;
  timestamp: number;
  files: Map<string, FileSnapshot>;
  cursors: Cursor[];
  reasoning: ReasoningBubble[];
}

export interface FileSnapshot {
  path: string;
  content: string;
  cursorPositions: Map<string, Position>;
}

export interface RewindState {
  isRewinding: boolean;
  currentFrame: number;
  totalFrames: number;
  playbackSpeed: number;
  isPlaying: boolean;
}

export type StreamEvent =
  | { type: 'cursor_move'; fileId: string; cursor: Cursor }
  | { type: 'text_insert'; fileId: string; position: Position; content: string; agentId: string }
  | { type: 'text_delete'; fileId: string; position: Position; length: number; agentId: string }
  | { type: 'ghost_text'; fileId: string; ghost: GhostText }
  | { type: 'reasoning'; fileId: string; bubble: ReasoningBubble }
  | { type: 'frame_captured'; frame: StreamFrame }
  | { type: 'rewind_start'; state: RewindState }
  | { type: 'rewind_frame'; frame: StreamFrame }
  | { type: 'rewind_end' };

export type StreamEventHandler = (event: StreamEvent) => void;

// ============================================================================
// GHOST TEXT PREDICTOR
// ============================================================================

interface GhostTextPredictor {
  predict(
    content: string,
    position: Position,
    language: string,
    context: PredictionContext
  ): GhostText | null;
}

interface PredictionContext {
  recentContent: string;
  agentId: string;
  patterns: CodePattern[];
}

interface CodePattern {
  trigger: string;
  completion: string;
  confidence: number;
}

/**
 * Simple pattern-based predictor
 * In production, use a fine-tuned model or API call
 */
class PatternBasedPredictor implements GhostTextPredictor {
  private patterns: Map<string, CodePattern[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  predict(
    content: string,
    position: Position,
    language: string,
    context: PredictionContext
  ): GhostText | null {
    const lines = content.split('\n');
    const currentLine = lines[position.line - 1] || '';
    const beforeCursor = currentLine.slice(0, position.column);

    // Check language-specific patterns
    const langPatterns = this.patterns.get(language) || [];
    for (const pattern of langPatterns) {
      if (beforeCursor.endsWith(pattern.trigger)) {
        return {
          content: pattern.completion,
          position,
          confidence: pattern.confidence,
          source: 'pattern',
          expiresAt: Date.now() + 5000,
        };
      }
    }

    // Check context patterns
    for (const pattern of context.patterns) {
      if (beforeCursor.endsWith(pattern.trigger)) {
        return {
          content: pattern.completion,
          position,
          confidence: pattern.confidence,
          source: 'prediction',
          expiresAt: Date.now() + 5000,
        };
      }
    }

    // Check for common completions based on recent content
    const historyPrediction = this.predictFromHistory(beforeCursor, context.recentContent);
    if (historyPrediction) {
      return {
        content: historyPrediction,
        position,
        confidence: 0.6,
        source: 'history',
        expiresAt: Date.now() + 3000,
      };
    }

    return null;
  }

  private initializePatterns(): void {
    // TypeScript/JavaScript patterns
    this.patterns.set('typescript', [
      { trigger: 'const ', completion: 'name = ', confidence: 0.7 },
      { trigger: 'function ', completion: 'name() {\n  \n}', confidence: 0.8 },
      { trigger: 'export default ', completion: 'function ', confidence: 0.75 },
      { trigger: 'import ', completion: "{ } from '';", confidence: 0.8 },
      { trigger: 'interface ', completion: 'Name {\n  \n}', confidence: 0.8 },
      { trigger: 'type ', completion: 'Name = ', confidence: 0.75 },
      { trigger: 'async ', completion: 'function ', confidence: 0.8 },
      { trigger: 'await ', completion: '', confidence: 0.5 },
      { trigger: 'return ', completion: '', confidence: 0.5 },
      { trigger: '.map(', completion: '(item) => )', confidence: 0.85 },
      { trigger: '.filter(', completion: '(item) => )', confidence: 0.85 },
      { trigger: '.reduce(', completion: '(acc, item) => , initialValue)', confidence: 0.8 },
      { trigger: 'useState(', completion: 'initialValue)', confidence: 0.9 },
      { trigger: 'useEffect(', completion: '() => {\n    \n  }, [])', confidence: 0.9 },
      { trigger: 'useCallback(', completion: '() => {\n    \n  }, [])', confidence: 0.9 },
      { trigger: 'useMemo(', completion: '() => {\n    \n  }, [])', confidence: 0.9 },
    ]);

    // TSX patterns
    this.patterns.set('tsx', [
      ...this.patterns.get('typescript')!,
      { trigger: '<div', completion: ' className="">\n  \n</div>', confidence: 0.85 },
      { trigger: '<button', completion: ' onClick={}>\n  \n</button>', confidence: 0.85 },
      { trigger: '<input', completion: ' type="" value={} onChange={} />', confidence: 0.85 },
      { trigger: 'className="', completion: '', confidence: 0.5 },
      { trigger: 'onClick={', completion: '() => }', confidence: 0.8 },
    ]);

    // CSS patterns
    this.patterns.set('css', [
      { trigger: 'display: ', completion: 'flex;', confidence: 0.8 },
      { trigger: 'flex-direction: ', completion: 'column;', confidence: 0.75 },
      { trigger: 'justify-content: ', completion: 'center;', confidence: 0.75 },
      { trigger: 'align-items: ', completion: 'center;', confidence: 0.75 },
      { trigger: 'padding: ', completion: '1rem;', confidence: 0.7 },
      { trigger: 'margin: ', completion: '0 auto;', confidence: 0.7 },
      { trigger: 'background: ', completion: '#ffffff;', confidence: 0.6 },
      { trigger: 'border-radius: ', completion: '0.5rem;', confidence: 0.75 },
    ]);
  }

  private predictFromHistory(beforeCursor: string, recentContent: string): string | null {
    // Find similar patterns in recent content
    const lines = recentContent.split('\n');
    const trimmedBefore = beforeCursor.trim();

    if (trimmedBefore.length < 3) return null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith(trimmedBefore) && trimmedLine.length > trimmedBefore.length) {
        return trimmedLine.slice(trimmedBefore.length);
      }
    }

    return null;
  }
}

// ============================================================================
// PREDICTIVE STREAM MANAGER
// ============================================================================

export class PredictiveStreamManager {
  private config: PredictiveStreamConfig;
  private files = new Map<string, CodeFile>();
  private frames: StreamFrame[] = [];
  private currentFrame = 0;
  private rewindState: RewindState | null = null;
  private predictor: GhostTextPredictor;
  private listeners = new Set<StreamEventHandler>();
  private frameInterval: NodeJS.Timeout | null = null;
  private recentPatterns = new Map<string, CodePattern[]>();

  // Agent colors for multi-cursor
  private agentColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  ];
  private agentColorIndex = 0;

  // CRITICAL FIX: Connection resilience
  private connectionState: 'connected' | 'disconnected' | 'reconnecting' | 'fallback' = 'connected';
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private pendingUpdates: Array<{ fileId: string; content: string; position: Position }> = [];
  private readonly maxPendingUpdates = 100;
  private fallbackPollingInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<PredictiveStreamConfig> = {}) {
    this.config = {
      enableGhostText: config.enableGhostText ?? true,
      ghostTextLookahead: config.ghostTextLookahead ?? 100,
      enableReasoning: config.enableReasoning ?? true,
      enableRewind: config.enableRewind ?? true,
      maxHistorySize: config.maxHistorySize ?? 10000,
      typingSpeed: config.typingSpeed ?? 30,
      enableMultiCursor: config.enableMultiCursor ?? true,
    };

    this.predictor = new PatternBasedPredictor();

    // Start frame capture if rewind is enabled
    if (this.config.enableRewind) {
      this.startFrameCapture();
    }
  }

  /**
   * Create a new file stream
   */
  createFile(path: string, language: string, initialContent: string = ''): CodeFile {
    const file: CodeFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      path,
      language,
      content: initialContent,
      cursors: [],
      history: [],
      blame: new Map(),
      reasoning: [],
      ghostText: null,
    };

    this.files.set(file.id, file);

    // Initialize blame for existing content
    if (initialContent) {
      const lines = initialContent.split('\n').length;
      for (let i = 1; i <= lines; i++) {
        file.blame.set(i, {
          agentId: 'initial',
          agentName: 'Initial Content',
          timestamp: Date.now(),
          reasoning: 'Original file content',
          confidence: 1.0,
        });
      }
    }

    logger.info('Created predictive stream file', { fileId: file.id, path, language });
    incCounter('olympus_predictive_files_created');

    return file;
  }

  /**
   * Add a cursor for an agent
   */
  addCursor(fileId: string, agentId: string, agentName: string): Cursor {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    const cursor: Cursor = {
      id: `cursor_${agentId}_${Date.now()}`,
      agentId,
      agentName,
      color: this.agentColors[this.agentColorIndex++ % this.agentColors.length],
      position: { line: 1, column: 0, offset: 0 },
      isTyping: false,
      lastActivity: Date.now(),
    };

    file.cursors.push(cursor);

    this.emit({ type: 'cursor_move', fileId, cursor });

    logger.debug('Added cursor', { fileId, agentId, color: cursor.color });

    return cursor;
  }

  /**
   * Move a cursor
   */
  moveCursor(fileId: string, cursorId: string, position: Position): void {
    const file = this.files.get(fileId);
    if (!file) return;

    const cursor = file.cursors.find(c => c.id === cursorId);
    if (!cursor) return;

    cursor.position = position;
    cursor.lastActivity = Date.now();

    this.emit({ type: 'cursor_move', fileId, cursor });

    // Update ghost text prediction
    if (this.config.enableGhostText) {
      this.updateGhostText(file, cursor);
    }
  }

  /**
   * Insert text at a position (with typing animation support)
   */
  async insertText(
    fileId: string,
    agentId: string,
    position: Position,
    content: string,
    reasoning?: string,
    animate: boolean = true
  ): Promise<void> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    const cursor = file.cursors.find(c => c.agentId === agentId);
    if (cursor) {
      cursor.isTyping = true;
    }

    if (animate && this.config.typingSpeed > 0) {
      // Animate character by character
      let currentPosition = position;

      for (const char of content) {
        await this.insertChar(file, agentId, currentPosition, char);
        currentPosition = this.advancePosition(file.content, currentPosition);
        await this.sleep(this.config.typingSpeed);
      }
    } else {
      // Insert all at once
      this.insertContentAtPosition(file, position, content);

      // Update blame for affected lines
      const newLines = content.split('\n').length;
      const startLine = position.line;
      for (let i = 0; i < newLines; i++) {
        file.blame.set(startLine + i, {
          agentId,
          agentName: cursor?.agentName || agentId,
          timestamp: Date.now(),
          reasoning: reasoning || 'Generated content',
          confidence: 0.9,
        });
      }

      this.emit({
        type: 'text_insert',
        fileId,
        position,
        content,
        agentId,
      });
    }

    // Record history
    const historyEntry: HistoryEntry = {
      id: `history_${Date.now()}`,
      timestamp: Date.now(),
      agentId,
      type: 'insert',
      position,
      content,
      reasoning,
    };
    file.history.push(historyEntry);

    // Trim history if needed
    if (file.history.length > this.config.maxHistorySize) {
      file.history = file.history.slice(-this.config.maxHistorySize);
    }

    if (cursor) {
      cursor.isTyping = false;
      cursor.position = this.advancePosition(file.content, position, content.length);
    }

    // Clear ghost text after insert
    file.ghostText = null;
  }

  /**
   * Add reasoning bubble
   */
  addReasoning(
    fileId: string,
    agentId: string,
    type: ReasoningBubble['type'],
    title: string,
    content: string,
    lineRange: { start: number; end: number }
  ): ReasoningBubble {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    const bubble: ReasoningBubble = {
      id: `reason_${Date.now()}`,
      agentId,
      type,
      title,
      content,
      lineRange,
      timestamp: Date.now(),
      dismissed: false,
    };

    file.reasoning.push(bubble);

    if (this.config.enableReasoning) {
      this.emit({ type: 'reasoning', fileId, bubble });
    }

    logger.debug('Added reasoning', { fileId, type, title });

    return bubble;
  }

  /**
   * Get blame info for a line
   */
  getBlame(fileId: string, line: number): BlameInfo | undefined {
    const file = this.files.get(fileId);
    return file?.blame.get(line);
  }

  /**
   * Start rewind mode
   */
  startRewind(): RewindState {
    if (!this.config.enableRewind) {
      throw new Error('Rewind is not enabled');
    }

    this.rewindState = {
      isRewinding: true,
      currentFrame: this.frames.length - 1,
      totalFrames: this.frames.length,
      playbackSpeed: 1,
      isPlaying: false,
    };

    this.emit({ type: 'rewind_start', state: this.rewindState });

    logger.info('Started rewind mode', { totalFrames: this.frames.length });

    return this.rewindState;
  }

  /**
   * Seek to a specific frame
   */
  seekToFrame(frameIndex: number): StreamFrame | null {
    if (!this.rewindState) return null;

    if (frameIndex < 0 || frameIndex >= this.frames.length) {
      return null;
    }

    this.rewindState.currentFrame = frameIndex;
    const frame = this.frames[frameIndex];

    this.emit({ type: 'rewind_frame', frame });

    return frame;
  }

  /**
   * Play rewind at specified speed
   */
  async playRewind(speed: number = 1): Promise<void> {
    if (!this.rewindState) return;

    this.rewindState.isPlaying = true;
    this.rewindState.playbackSpeed = speed;

    const frameDelay = 100 / speed; // Base 100ms per frame

    while (
      this.rewindState.isPlaying &&
      this.rewindState.currentFrame < this.frames.length - 1
    ) {
      this.rewindState.currentFrame++;
      const frame = this.frames[this.rewindState.currentFrame];
      this.emit({ type: 'rewind_frame', frame });
      await this.sleep(frameDelay);
    }

    this.rewindState.isPlaying = false;
  }

  /**
   * Stop rewind mode
   */
  stopRewind(): void {
    if (!this.rewindState) return;

    this.rewindState = null;
    this.emit({ type: 'rewind_end' });

    logger.info('Stopped rewind mode');
  }

  /**
   * Get current ghost text
   */
  getGhostText(fileId: string): GhostText | null {
    const file = this.files.get(fileId);
    if (!file || !file.ghostText) return null;

    // Check if expired
    if (Date.now() > file.ghostText.expiresAt) {
      file.ghostText = null;
      return null;
    }

    return file.ghostText;
  }

  /**
   * Accept ghost text (insert it)
   */
  async acceptGhostText(fileId: string, agentId: string): Promise<boolean> {
    const file = this.files.get(fileId);
    if (!file || !file.ghostText) return false;

    const ghost = file.ghostText;
    file.ghostText = null;

    await this.insertText(
      fileId,
      agentId,
      ghost.position,
      ghost.content,
      'Accepted ghost text prediction',
      false
    );

    incCounter('olympus_ghost_text_accepted');

    return true;
  }

  /**
   * Subscribe to stream events
   */
  subscribe(handler: StreamEventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  /**
   * Get file content
   */
  getFile(fileId: string): CodeFile | undefined {
    return this.files.get(fileId);
  }

  /**
   * Get all files
   */
  getAllFiles(): CodeFile[] {
    return Array.from(this.files.values());
  }

  /**
   * CRITICAL FIX: Handle connection failure with graceful fallback
   */
  handleConnectionFailure(error?: Error): void {
    if (this.connectionState === 'fallback') {
      return; // Already in fallback mode
    }

    this.connectionState = 'disconnected';
    this.reconnectAttempts++;

    logger.warn('Stream connection failed', {
      error: error || new Error('Unknown error'),
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
    });

    // Emit disconnect event to listeners
    this.emit({
      type: 'connection_state',
      fileId: '',
      state: 'disconnected',
      attempt: this.reconnectAttempts,
    } as unknown as StreamEvent);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    } else {
      this.enterFallbackMode();
    }
  }

  /**
   * CRITICAL FIX: Attempt to reconnect
   */
  private async attemptReconnect(): Promise<void> {
    this.connectionState = 'reconnecting';

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info('Attempting reconnect', { delay, attempt: this.reconnectAttempts });

    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate reconnection success (in real implementation, this would actually reconnect)
    // The caller should call handleConnectionSuccess() when actually reconnected
  }

  /**
   * CRITICAL FIX: Handle successful reconnection
   */
  handleConnectionSuccess(): void {
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;

    // Flush pending updates
    if (this.pendingUpdates.length > 0) {
      logger.info('Flushing pending updates', { count: this.pendingUpdates.length });
      this.pendingUpdates = [];
    }

    // Stop fallback polling if running
    if (this.fallbackPollingInterval) {
      clearInterval(this.fallbackPollingInterval);
      this.fallbackPollingInterval = null;
    }

    this.emit({
      type: 'connection_state',
      fileId: '',
      state: 'connected',
    } as unknown as StreamEvent);

    logger.info('Stream connection restored');
  }

  /**
   * CRITICAL FIX: Enter fallback polling mode
   */
  private enterFallbackMode(): void {
    this.connectionState = 'fallback';

    logger.warn('Entering fallback mode - real-time streaming disabled', {
      pendingUpdates: this.pendingUpdates.length,
    });

    this.emit({
      type: 'connection_state',
      fileId: '',
      state: 'fallback',
      message: 'Real-time streaming unavailable. Using polling fallback.',
    } as unknown as StreamEvent);

    // Start polling for updates (simulated - in real implementation, poll the server)
    this.fallbackPollingInterval = setInterval(() => {
      this.pollForUpdates();
    }, 2000); // Poll every 2 seconds
  }

  /**
   * CRITICAL FIX: Poll for updates in fallback mode
   */
  private pollForUpdates(): void {
    // In real implementation, this would poll the server for updates
    // For now, just log that we're polling
    if (this.connectionState === 'fallback') {
      logger.debug('Polling for updates in fallback mode');
    }
  }

  /**
   * CRITICAL FIX: Queue update if disconnected
   */
  private queueUpdate(fileId: string, content: string, position: Position): boolean {
    if (this.connectionState !== 'connected') {
      if (this.pendingUpdates.length < this.maxPendingUpdates) {
        this.pendingUpdates.push({ fileId, content, position });
        return true;
      } else {
        logger.warn('Pending updates queue full, dropping update');
        return false;
      }
    }
    return false;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): typeof this.connectionState {
    return this.connectionState;
  }

  /**
   * Dispose
   */
  dispose(): void {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    // CRITICAL FIX: Clean up fallback polling
    if (this.fallbackPollingInterval) {
      clearInterval(this.fallbackPollingInterval);
      this.fallbackPollingInterval = null;
    }

    this.files.clear();
    this.frames = [];
    this.listeners.clear();
    this.pendingUpdates = [];

    logger.info('PredictiveStreamManager disposed');
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

  private async insertChar(
    file: CodeFile,
    agentId: string,
    position: Position,
    char: string
  ): Promise<void> {
    this.insertContentAtPosition(file, position, char);

    this.emit({
      type: 'text_insert',
      fileId: file.id,
      position,
      content: char,
      agentId,
    });

    // Update cursor position
    const cursor = file.cursors.find(c => c.agentId === agentId);
    if (cursor) {
      cursor.position = this.advancePosition(file.content, position);
      this.emit({ type: 'cursor_move', fileId: file.id, cursor });
    }
  }

  private insertContentAtPosition(file: CodeFile, position: Position, content: string): void {
    const lines = file.content.split('\n');
    const line = lines[position.line - 1] || '';

    const before = line.slice(0, position.column);
    const after = line.slice(position.column);

    const contentLines = content.split('\n');

    if (contentLines.length === 1) {
      lines[position.line - 1] = before + content + after;
    } else {
      const newLines = [
        before + contentLines[0],
        ...contentLines.slice(1, -1),
        contentLines[contentLines.length - 1] + after,
      ];
      lines.splice(position.line - 1, 1, ...newLines);
    }

    file.content = lines.join('\n');
  }

  private advancePosition(content: string, position: Position, chars: number = 1): Position {
    const lines = content.split('\n');
    let { line, column, offset } = position;

    for (let i = 0; i < chars; i++) {
      const currentLine = lines[line - 1] || '';

      if (column < currentLine.length) {
        column++;
      } else if (line < lines.length) {
        line++;
        column = 0;
      }

      offset++;
    }

    return { line, column, offset };
  }

  private updateGhostText(file: CodeFile, cursor: Cursor): void {
    const patterns = this.recentPatterns.get(file.id) || [];

    const context: PredictionContext = {
      recentContent: file.content.slice(-1000),
      agentId: cursor.agentId,
      patterns,
    };

    const ghost = this.predictor.predict(
      file.content,
      cursor.position,
      file.language,
      context
    );

    if (ghost && ghost.confidence >= 0.5) {
      file.ghostText = ghost;
      this.emit({ type: 'ghost_text', fileId: file.id, ghost });
      incCounter('olympus_ghost_text_shown');
    } else {
      file.ghostText = null;
    }
  }

  private startFrameCapture(): void {
    // Capture frame every 100ms
    this.frameInterval = setInterval(() => {
      this.captureFrame();
    }, 100);

    // Don't keep process alive
    if (this.frameInterval.unref) {
      this.frameInterval.unref();
    }
  }

  private captureFrame(): void {
    const files = new Map<string, FileSnapshot>();

    for (const [id, file] of this.files) {
      const cursorPositions = new Map<string, Position>();
      for (const cursor of file.cursors) {
        cursorPositions.set(cursor.id, { ...cursor.position });
      }

      files.set(id, {
        path: file.path,
        content: file.content,
        cursorPositions,
      });
    }

    // Collect all cursors
    const allCursors: Cursor[] = [];
    for (const file of this.files.values()) {
      allCursors.push(...file.cursors.map(c => ({ ...c })));
    }

    // Collect all reasoning
    const allReasoning: ReasoningBubble[] = [];
    for (const file of this.files.values()) {
      allReasoning.push(...file.reasoning.filter(r => !r.dismissed));
    }

    const frame: StreamFrame = {
      frameId: this.frames.length,
      timestamp: Date.now(),
      files,
      cursors: allCursors,
      reasoning: allReasoning,
    };

    this.frames.push(frame);

    // Trim old frames
    if (this.frames.length > this.config.maxHistorySize) {
      this.frames = this.frames.slice(-this.config.maxHistorySize);
    }

    this.emit({ type: 'frame_captured', frame });

    setGauge('olympus_rewind_frames', this.frames.length);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// REACT HOOK (for integration)
// ============================================================================

export interface UsePredictiveStreamResult {
  files: CodeFile[];
  rewindState: RewindState | null;
  createFile: (path: string, language: string) => CodeFile;
  insertText: (fileId: string, agentId: string, position: Position, content: string) => Promise<void>;
  addReasoning: (fileId: string, agentId: string, type: ReasoningBubble['type'], title: string, content: string, lineRange: { start: number; end: number }) => ReasoningBubble;
  getBlame: (fileId: string, line: number) => BlameInfo | undefined;
  startRewind: () => RewindState;
  seekToFrame: (index: number) => StreamFrame | null;
  playRewind: (speed: number) => Promise<void>;
  stopRewind: () => void;
  acceptGhostText: (fileId: string, agentId: string) => Promise<boolean>;
}

// Hook implementation would go in a separate React file

// ============================================================================
// FACTORY
// ============================================================================

export const predictiveStreamManager = new PredictiveStreamManager();

export function createPredictiveStreamManager(
  config?: Partial<PredictiveStreamConfig>
): PredictiveStreamManager {
  return new PredictiveStreamManager(config);
}

export default predictiveStreamManager;
