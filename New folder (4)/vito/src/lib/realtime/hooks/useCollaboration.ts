/**
 * OLYMPUS 2.1 - 10X UPGRADE: React Hook for Collaboration
 *
 * Drop-in hook for real-time collaboration features.
 *
 * Usage:
 * ```tsx
 * const {
 *   participants,
 *   cursors,
 *   chat,
 *   sendMessage,
 *   moveCursor,
 *   prompt,
 *   updatePrompt,
 * } = useCollaboration(buildId, currentUser);
 *
 * return (
 *   <div onMouseMove={(e) => moveCursor(e.clientX, e.clientY)}>
 *     <ParticipantAvatars users={participants} />
 *     <CursorOverlay cursors={cursors} />
 *     <PromptEditor value={prompt} onChange={updatePrompt} />
 *     <ChatPanel messages={chat} onSend={sendMessage} />
 *   </div>
 * );
 * ```
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
  User,
  Cursor,
  ChatMessage,
  CollaborationEvent,
} from '../collaboration';

// ============================================================================
// TYPES
// ============================================================================

export interface UseCollaborationOptions {
  /** Build ID to collaborate on */
  buildId: string;
  /** Current user info */
  user: User;
  /** WebSocket endpoint URL */
  wsEndpoint?: string;
  /** Enable cursor sharing */
  enableCursors?: boolean;
  /** Enable chat */
  enableChat?: boolean;
  /** Cursor update throttle (ms) */
  cursorThrottle?: number;
}

export interface CollaborationHookResult {
  /** All participants in session */
  participants: User[];
  /** Other users' cursors */
  cursors: Cursor[];
  /** Chat messages */
  chat: ChatMessage[];
  /** Current shared prompt */
  prompt: string;
  /** Prompt version (for conflict detection) */
  promptVersion: number;
  /** Who last edited the prompt */
  lastEditor: User | null;
  /** Connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Your permissions */
  permissions: { canEdit: boolean; canControl: boolean };
  /** Is current user the owner? */
  isOwner: boolean;
  /** Send your cursor position */
  moveCursor: (x: number, y: number, element?: string) => void;
  /** Send a chat message */
  sendMessage: (content: string, replyTo?: string) => void;
  /** Update the shared prompt */
  updatePrompt: (content: string) => void;
  /** Grant permission to another user */
  grantPermission: (userId: string, permission: 'edit' | 'control') => void;
  /** Revoke permission from another user */
  revokePermission: (userId: string, permission: 'edit' | 'control') => void;
  /** Transfer control to another user */
  transferControl: (toUserId: string) => void;
  /** Leave the session */
  leave: () => void;
  /** Typing indicators */
  typingUsers: User[];
  /** Set typing status */
  setTyping: (isTyping: boolean) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCollaboration(
  options: UseCollaborationOptions
): CollaborationHookResult {
  const {
    buildId,
    user,
    wsEndpoint = '/api/olympus/collab/ws',
    enableCursors = true,
    enableChat = true,
    cursorThrottle = 50,
  } = options;

  // State
  const [participants, setParticipants] = useState<User[]>([user]);
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [promptVersion, setPromptVersion] = useState(0);
  const [lastEditor, setLastEditor] = useState<User | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [permissions, setPermissions] = useState({ canEdit: true, canControl: true });
  const [isOwner, setIsOwner] = useState(true);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);

  // Connect to WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${wsEndpoint}?buildId=${buildId}&userId=${user.id}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      // Send join message
      ws.send(JSON.stringify({ type: 'join', user }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        const eventType = data.type as string;

        switch (eventType) {
          case 'user_joined': {
            const joinedUser = data.user as User;
            setParticipants(prev => [...prev.filter(p => p.id !== joinedUser.id), joinedUser]);
            break;
          }

          case 'user_left': {
            const leftUserId = data.userId as string;
            setParticipants(prev => prev.filter(p => p.id !== leftUserId));
            setCursors(prev => prev.filter(c => c.userId !== leftUserId));
            setTypingUsers(prev => prev.filter(u => u.id !== leftUserId));
            break;
          }

          case 'cursor_moved': {
            const cursor = data.cursor as Cursor;
            if (enableCursors && cursor.userId !== user.id) {
              setCursors(prev => {
                const filtered = prev.filter(c => c.userId !== cursor.userId);
                return [...filtered, cursor];
              });
            }
            break;
          }

          case 'chat_message': {
            if (enableChat) {
              const message = data.message as ChatMessage;
              setChat(prev => [...prev, message]);
            }
            break;
          }

          case 'prompt_changed': {
            const promptData = data.prompt as { content: string; version: number; lastEditor?: string };
            setPrompt(promptData.content);
            setPromptVersion(promptData.version);
            if (promptData.lastEditor) {
              const editor = participants.find(p => p.id === promptData.lastEditor);
              setLastEditor(editor || null);
            }
            break;
          }

          case 'permission_changed': {
            const permUserId = data.userId as string;
            const permission = data.permission as 'edit' | 'control';
            const granted = data.granted as boolean;
            if (permUserId === user.id) {
              setPermissions(prev => ({
                ...prev,
                [permission === 'edit' ? 'canEdit' : 'canControl']: granted,
              }));
            }
            break;
          }

          case 'control_transferred': {
            const toUserId = data.toUserId as string;
            if (toUserId === user.id) {
              setPermissions({ canEdit: true, canControl: true });
            }
            break;
          }

          case 'typing': {
            const typingUserId = data.userId as string;
            const isTyping = data.isTyping as boolean;
            const typingUser = participants.find(p => p.id === typingUserId);
            if (typingUser && typingUser.id !== user.id) {
              if (isTyping) {
                setTypingUsers(prev => [...prev.filter(u => u.id !== typingUser.id), typingUser]);
              } else {
                setTypingUsers(prev => prev.filter(u => u.id !== typingUser.id));
              }
            }
            break;
          }

          case 'state': {
            // Full state sync
            const state = data as Record<string, unknown>;
            setParticipants((state.participants as User[]) || []);
            setChat((state.chat as ChatMessage[]) || []);
            const statePrompt = state.prompt as { content?: string; version?: number } | undefined;
            setPrompt(statePrompt?.content || '');
            setPromptVersion(statePrompt?.version || 0);
            const stateOwner = state.owner as User | undefined;
            setIsOwner(stateOwner?.id === user.id);
            const statePerms = state.permissions as { canEdit?: string[]; canControl?: string[] } | undefined;
            setPermissions({
              canEdit: statePerms?.canEdit?.includes(user.id) ?? true,
              canControl: statePerms?.canControl?.includes(user.id) ?? true,
            });
            break;
          }
        }
      } catch (e) {
        console.error('Failed to parse collaboration message:', e);
      }
    };

    ws.onerror = () => {
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [buildId, user.id, wsEndpoint, enableCursors, enableChat, participants]);

  // Send helper
  const send = useCallback((type: string, payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  // Move cursor (throttled)
  const moveCursor = useCallback((x: number, y: number, element?: string) => {
    if (!enableCursors) return;

    lastCursorRef.current = { x, y };

    if (cursorThrottleRef.current) return; // Already throttled

    cursorThrottleRef.current = setTimeout(() => {
      if (lastCursorRef.current) {
        send('cursor', {
          x: lastCursorRef.current.x,
          y: lastCursorRef.current.y,
          element,
        });
      }
      cursorThrottleRef.current = null;
    }, cursorThrottle);
  }, [enableCursors, cursorThrottle, send]);

  // Send message
  const sendMessage = useCallback((content: string, replyTo?: string) => {
    if (!enableChat) return;
    send('message', { content, replyTo });
  }, [enableChat, send]);

  // Update prompt
  const updatePrompt = useCallback((content: string) => {
    if (!permissions.canEdit) return;
    setPrompt(content); // Optimistic update
    send('prompt', { content });
  }, [permissions.canEdit, send]);

  // Grant permission
  const grantPermission = useCallback((userId: string, permission: 'edit' | 'control') => {
    if (!permissions.canControl) return;
    send('grant_permission', { userId, permission });
  }, [permissions.canControl, send]);

  // Revoke permission
  const revokePermission = useCallback((userId: string, permission: 'edit' | 'control') => {
    if (!isOwner) return;
    send('revoke_permission', { userId, permission });
  }, [isOwner, send]);

  // Transfer control
  const transferControl = useCallback((toUserId: string) => {
    if (!permissions.canControl) return;
    send('transfer_control', { toUserId });
  }, [permissions.canControl, send]);

  // Leave session
  const leave = useCallback(() => {
    wsRef.current?.close();
  }, []);

  // Set typing status
  const setTyping = useCallback((isTyping: boolean) => {
    send('typing', { isTyping });
  }, [send]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
    };
  }, []);

  return {
    participants,
    cursors,
    chat,
    prompt,
    promptVersion,
    lastEditor,
    connectionStatus,
    permissions,
    isOwner,
    moveCursor,
    sendMessage,
    updatePrompt,
    grantPermission,
    revokePermission,
    transferControl,
    leave,
    typingUsers,
    setTyping,
  };
}

export default useCollaboration;
