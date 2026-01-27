/**
 * OLYMPUS 2.1 - 10X UPGRADE: Live Collaboration Layer
 *
 * MULTIPLAYER APP BUILDING.
 *
 * What users can do:
 * - Watch builds together in real-time
 * - See other users' cursors and selections
 * - Chat during builds
 * - Take over / assist builds
 * - Share build outputs instantly
 * - Collaborative prompt editing
 */

import { logger } from '../observability/logger';
import { incCounter, setGauge } from '../observability/metrics';

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string; // Unique color for cursor/selection
}

export interface Cursor {
  userId: string;
  x: number;
  y: number;
  element?: string; // DOM element ID being hovered
  timestamp: number;
}

export interface Selection {
  userId: string;
  start: number;
  end: number;
  text?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system' | 'reaction';
  replyTo?: string;
}

export interface CollaborationState {
  sessionId: string;
  buildId: string;
  owner: User;
  participants: Map<string, User>;
  cursors: Map<string, Cursor>;
  selections: Map<string, Selection>;
  chat: ChatMessage[];
  prompt: {
    content: string;
    version: number;
    lastEditor?: string;
  };
  permissions: {
    canEdit: Set<string>;
    canControl: Set<string>;
  };
  mode: 'view' | 'edit' | 'control';
}

export type CollaborationEvent =
  | { type: 'user_joined'; user: User }
  | { type: 'user_left'; userId: string }
  | { type: 'cursor_moved'; cursor: Cursor }
  | { type: 'selection_changed'; selection: Selection }
  | { type: 'chat_message'; message: ChatMessage }
  | { type: 'prompt_changed'; prompt: CollaborationState['prompt'] }
  | { type: 'permission_changed'; userId: string; permission: 'edit' | 'control'; granted: boolean }
  | { type: 'control_transferred'; fromUserId: string; toUserId: string };

// ============================================================================
// COLOR PALETTE FOR USERS
// ============================================================================

const USER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Sky
];

function getColorForUser(index: number): string {
  return USER_COLORS[index % USER_COLORS.length];
}

// ============================================================================
// COLLABORATION SESSION
// ============================================================================

export class CollaborationSession {
  private state: CollaborationState;
  private listeners: Set<(event: CollaborationEvent) => void> = new Set();
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    sessionId: string,
    buildId: string,
    owner: User
  ) {
    this.state = {
      sessionId,
      buildId,
      owner: { ...owner, color: USER_COLORS[0] },
      participants: new Map([[owner.id, { ...owner, color: USER_COLORS[0] }]]),
      cursors: new Map(),
      selections: new Map(),
      chat: [],
      prompt: {
        content: '',
        version: 0,
      },
      permissions: {
        canEdit: new Set([owner.id]),
        canControl: new Set([owner.id]),
      },
      mode: 'view',
    };

    logger.info('Collaboration session created', { sessionId, buildId, owner: owner.id });
    setGauge('olympus_collab_sessions', 1);
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * Add a user to the session
   */
  join(user: User): void {
    if (this.state.participants.has(user.id)) {
      return; // Already in session
    }

    const userWithColor = {
      ...user,
      color: getColorForUser(this.state.participants.size),
    };

    this.state.participants.set(user.id, userWithColor);

    // System message
    this.addSystemMessage(`${user.name} joined the session`);

    this.emit({ type: 'user_joined', user: userWithColor });

    incCounter('olympus_collab_joins');
    setGauge('olympus_collab_participants', this.state.participants.size);

    logger.info('User joined collaboration', {
      sessionId: this.state.sessionId,
      userId: user.id,
      participantCount: this.state.participants.size,
    });
  }

  /**
   * Remove a user from the session
   */
  leave(userId: string): void {
    const user = this.state.participants.get(userId);
    if (!user) return;

    this.state.participants.delete(userId);
    this.state.cursors.delete(userId);
    this.state.selections.delete(userId);
    this.state.permissions.canEdit.delete(userId);
    this.state.permissions.canControl.delete(userId);

    // System message
    this.addSystemMessage(`${user.name} left the session`);

    this.emit({ type: 'user_left', userId });

    setGauge('olympus_collab_participants', this.state.participants.size);

    logger.info('User left collaboration', {
      sessionId: this.state.sessionId,
      userId,
      participantCount: this.state.participants.size,
    });

    // If owner left, transfer to next participant
    if (userId === this.state.owner.id && this.state.participants.size > 0) {
      const newOwner = this.state.participants.values().next().value;
      if (newOwner) {
        this.transferControl(userId, newOwner.id);
      }
    }
  }

  /**
   * Get all participants
   */
  getParticipants(): User[] {
    return Array.from(this.state.participants.values());
  }

  // ============================================================================
  // CURSOR & SELECTION
  // ============================================================================

  /**
   * Update user's cursor position
   */
  moveCursor(userId: string, x: number, y: number, element?: string): void {
    const cursor: Cursor = { userId, x, y, element, timestamp: Date.now() };
    this.state.cursors.set(userId, cursor);

    // Debounced emit to reduce network traffic
    this.debouncedEmit(userId, 'cursor', { type: 'cursor_moved', cursor });

    // Auto-cleanup stale cursors after 5 seconds
    this.scheduleCursorCleanup(userId);
  }

  /**
   * Update user's text selection
   */
  updateSelection(userId: string, start: number, end: number, text?: string): void {
    const selection: Selection = { userId, start, end, text };
    this.state.selections.set(userId, selection);
    this.emit({ type: 'selection_changed', selection });
  }

  /**
   * Get all cursors
   */
  getCursors(): Cursor[] {
    return Array.from(this.state.cursors.values());
  }

  private scheduleCursorCleanup(userId: string): void {
    // Clear existing timer
    const existing = this.cleanupTimers.get(`cursor:${userId}`);
    if (existing) clearTimeout(existing);

    // Set new timer
    const timer = setTimeout(() => {
      this.state.cursors.delete(userId);
      this.cleanupTimers.delete(`cursor:${userId}`);
    }, 5000);

    this.cleanupTimers.set(`cursor:${userId}`, timer);
  }

  // ============================================================================
  // CHAT
  // ============================================================================

  /**
   * Send a chat message
   */
  sendMessage(userId: string, content: string, replyTo?: string): ChatMessage {
    const user = this.state.participants.get(userId);
    if (!user) throw new Error('User not in session');

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId,
      userName: user.name,
      content,
      timestamp: Date.now(),
      type: 'message',
      replyTo,
    };

    this.state.chat.push(message);
    this.emit({ type: 'chat_message', message });

    // Keep chat history manageable
    if (this.state.chat.length > 500) {
      this.state.chat = this.state.chat.slice(-500);
    }

    return message;
  }

  /**
   * Add a reaction to a message
   */
  addReaction(userId: string, messageId: string, reaction: string): void {
    const user = this.state.participants.get(userId);
    if (!user) return;

    const reactionMessage: ChatMessage = {
      id: `react_${Date.now()}`,
      userId,
      userName: user.name,
      content: reaction,
      timestamp: Date.now(),
      type: 'reaction',
      replyTo: messageId,
    };

    this.state.chat.push(reactionMessage);
    this.emit({ type: 'chat_message', message: reactionMessage });
  }

  private addSystemMessage(content: string): void {
    const message: ChatMessage = {
      id: `sys_${Date.now()}`,
      userId: 'system',
      userName: 'System',
      content,
      timestamp: Date.now(),
      type: 'system',
    };

    this.state.chat.push(message);
    this.emit({ type: 'chat_message', message });
  }

  /**
   * Get chat history
   */
  getChatHistory(limit = 100): ChatMessage[] {
    return this.state.chat.slice(-limit);
  }

  // ============================================================================
  // COLLABORATIVE PROMPT EDITING
  // ============================================================================

  /**
   * Update the shared prompt
   */
  updatePrompt(userId: string, content: string): void {
    if (!this.state.permissions.canEdit.has(userId)) {
      throw new Error('User does not have edit permission');
    }

    this.state.prompt = {
      content,
      version: this.state.prompt.version + 1,
      lastEditor: userId,
    };

    this.emit({ type: 'prompt_changed', prompt: this.state.prompt });
  }

  /**
   * Get current prompt
   */
  getPrompt(): CollaborationState['prompt'] {
    return { ...this.state.prompt };
  }

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  /**
   * Grant a permission to a user
   */
  grantPermission(
    granterId: string,
    userId: string,
    permission: 'edit' | 'control'
  ): void {
    // Only owner or those with control can grant permissions
    if (granterId !== this.state.owner.id && !this.state.permissions.canControl.has(granterId)) {
      throw new Error('Insufficient permissions to grant');
    }

    if (permission === 'edit') {
      this.state.permissions.canEdit.add(userId);
    } else {
      this.state.permissions.canControl.add(userId);
      this.state.permissions.canEdit.add(userId); // Control implies edit
    }

    const user = this.state.participants.get(userId);
    this.addSystemMessage(`${user?.name || userId} was granted ${permission} permission`);

    this.emit({ type: 'permission_changed', userId, permission, granted: true });
  }

  /**
   * Revoke a permission from a user
   */
  revokePermission(
    revokerId: string,
    userId: string,
    permission: 'edit' | 'control'
  ): void {
    if (revokerId !== this.state.owner.id) {
      throw new Error('Only owner can revoke permissions');
    }

    if (permission === 'edit') {
      this.state.permissions.canEdit.delete(userId);
    } else {
      this.state.permissions.canControl.delete(userId);
    }

    const user = this.state.participants.get(userId);
    this.addSystemMessage(`${user?.name || userId}'s ${permission} permission was revoked`);

    this.emit({ type: 'permission_changed', userId, permission, granted: false });
  }

  /**
   * Transfer build control to another user
   */
  transferControl(fromUserId: string, toUserId: string): void {
    if (fromUserId !== this.state.owner.id && !this.state.permissions.canControl.has(fromUserId)) {
      throw new Error('User does not have control permission');
    }

    const toUser = this.state.participants.get(toUserId);
    if (!toUser) {
      throw new Error('Target user not in session');
    }

    // Grant full permissions to new controller
    this.state.permissions.canControl.add(toUserId);
    this.state.permissions.canEdit.add(toUserId);

    this.addSystemMessage(`Control transferred to ${toUser.name}`);

    this.emit({ type: 'control_transferred', fromUserId, toUserId });

    logger.info('Control transferred', {
      sessionId: this.state.sessionId,
      from: fromUserId,
      to: toUserId,
    });
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId: string, permission: 'edit' | 'control'): boolean {
    if (permission === 'edit') {
      return this.state.permissions.canEdit.has(userId);
    }
    return this.state.permissions.canControl.has(userId);
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  /**
   * Subscribe to collaboration events
   */
  subscribe(listener: (event: CollaborationEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: CollaborationEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.warn('Collaboration event listener error', { error: error instanceof Error ? error : new Error(String(error)) });
      }
    }
  }

  // Debounce high-frequency events
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  private debouncedEmit(userId: string, type: string, event: CollaborationEvent): void {
    const key = `${userId}:${type}`;
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.emit(event);
      this.debounceTimers.delete(key);
    }, 50); // 50ms debounce

    this.debounceTimers.set(key, timer);
  }

  // ============================================================================
  // STATE
  // ============================================================================

  /**
   * Get full session state
   */
  getState(): Omit<CollaborationState, 'participants' | 'cursors' | 'selections' | 'permissions'> & {
    participants: User[];
    cursors: Cursor[];
    selections: Selection[];
    permissions: { canEdit: string[]; canControl: string[] };
  } {
    return {
      sessionId: this.state.sessionId,
      buildId: this.state.buildId,
      owner: this.state.owner,
      participants: Array.from(this.state.participants.values()),
      cursors: Array.from(this.state.cursors.values()),
      selections: Array.from(this.state.selections.values()),
      chat: this.state.chat,
      prompt: this.state.prompt,
      permissions: {
        canEdit: Array.from(this.state.permissions.canEdit),
        canControl: Array.from(this.state.permissions.canControl),
      },
      mode: this.state.mode,
    };
  }

  /**
   * Clean up session resources
   */
  destroy(): void {
    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.listeners.clear();

    logger.info('Collaboration session destroyed', { sessionId: this.state.sessionId });
    setGauge('olympus_collab_sessions', 0);
  }
}

// ============================================================================
// SESSION MANAGER (Singleton)
// ============================================================================

class CollaborationManager {
  private sessions = new Map<string, CollaborationSession>();

  /**
   * Create a new collaboration session
   */
  createSession(buildId: string, owner: User): CollaborationSession {
    const sessionId = `collab_${buildId}_${Date.now()}`;
    const session = new CollaborationSession(sessionId, buildId, owner);
    this.sessions.set(sessionId, session);

    incCounter('olympus_collab_sessions_created');

    return session;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Find session by build ID
   */
  findByBuildId(buildId: string): CollaborationSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.getState().buildId === buildId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.destroy();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalParticipants = 0;
    for (const session of this.sessions.values()) {
      totalParticipants += session.getParticipants().length;
    }

    return {
      activeSessions: this.sessions.size,
      totalParticipants,
    };
  }
}

export const collaborationManager = new CollaborationManager();

export default collaborationManager;
