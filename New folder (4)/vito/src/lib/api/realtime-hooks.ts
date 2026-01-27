/**
 * OLYMPUS 2.0 - Realtime Client Hooks
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Realtime hook options */
interface UseRealtimeOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/** Build update data */
interface BuildUpdate {
  buildId: string;
  status?: string;
  progress?: number;
  step?: string;
  message?: string;
  error?: { code: string; message: string };
  timestamp: string;
}

/** Deploy update data */
interface DeployUpdate {
  deployId: string;
  status?: string;
  progress?: number;
  url?: string;
  error?: { code: string; message: string };
  timestamp: string;
}

function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Subscribe to build updates */
export function useBuildUpdates(buildId: string, options: UseRealtimeOptions = {}) {
  const [update, setUpdate] = useState<BuildUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!buildId) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`olympus:build:${buildId}`)
      .on('broadcast', { event: 'build:update' }, ({ payload }) => {
        setUpdate(payload as BuildUpdate);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { setIsConnected(true); options.onConnect?.(); }
        if (status === 'CLOSED') { setIsConnected(false); options.onDisconnect?.(); }
        if (status === 'CHANNEL_ERROR') { options.onError?.(new Error('Channel error')); }
      });

    return () => { supabase.removeChannel(channel); };
  }, [buildId]);

  return { update, isConnected };
}

/** Subscribe to deploy updates */
export function useDeployUpdates(deployId: string, options: UseRealtimeOptions = {}) {
  const [update, setUpdate] = useState<DeployUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!deployId) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`olympus:deploy:${deployId}`)
      .on('broadcast', { event: 'deploy:update' }, ({ payload }) => {
        setUpdate(payload as DeployUpdate);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { setIsConnected(true); options.onConnect?.(); }
        if (status === 'CLOSED') { setIsConnected(false); options.onDisconnect?.(); }
      });

    return () => { supabase.removeChannel(channel); };
  }, [deployId]);

  return { update, isConnected };
}

/** Subscribe to project file changes */
export function useProjectUpdates(projectId: string, options: UseRealtimeOptions = {}) {
  const [lastEvent, setLastEvent] = useState<{ event: string; payload: unknown } | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`olympus:project:${projectId}`)
      .on('broadcast', { event: '*' }, ({ event, payload }) => {
        setLastEvent({ event, payload });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  return { lastEvent };
}

/** Presence hook for collaborative editing */
export function usePresence(projectId: string, userId: string, userData?: Record<string, unknown>) {
  const [users, setUsers] = useState<Array<{ userId: string; data?: Record<string, unknown> }>>([]);

  useEffect(() => {
    if (!projectId || !userId) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`project:${projectId}:presence`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const userList = Object.values(state).flat().map((p: any) => ({ userId: p.userId, data: p.data }));
        setUsers(userList);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, data: userData, joinedAt: new Date().toISOString() });
        }
      });

    return () => { channel.untrack(); supabase.removeChannel(channel); };
  }, [projectId, userId]);

  return { users, isCollaborating: users.length > 1 };
}
