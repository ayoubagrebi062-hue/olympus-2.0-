/**
 * OLYMPUS 2.0 - Supabase Realtime Helpers
 */

import { createServiceRoleClient } from '@/lib/auth/clients';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/** Realtime channel names */
export const REALTIME_CHANNELS = {
  build: (id: string) => `build:${id}`,
  project: (id: string) => `project:${id}`,
  tenant: (id: string) => `tenant:${id}`,
  deploy: (id: string) => `deploy:${id}`,
} as const;

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/** Subscribe to table changes */
export function subscribeToTable<T extends Record<string, unknown>>(
  table: string, filter: { column: string; value: string },
  callback: (payload: RealtimePostgresChangesPayload<T>) => void, events: RealtimeEventType[] = ['*']
): RealtimeChannel {
  const supabase = createServiceRoleClient();
  const channel = supabase.channel(`db:${table}:${filter.value}`);
  for (const event of events) {
    channel.on('postgres_changes', { event: event as any, schema: 'public', table, filter: `${filter.column}=eq.${filter.value}` }, callback);
  }
  channel.subscribe();
  return channel;
}

/** Subscribe to build updates */
export function subscribeToBuild(buildId: string, callback: (e: { buildId: string; status: string; progress: number; updatedAt: string }) => void): RealtimeChannel {
  return subscribeToTable<{ id: string; status: string; progress: number; updated_at: string }>(
    'builds', { column: 'id', value: buildId },
    (payload) => { if (payload.new) callback({ buildId, status: (payload.new as any).status, progress: (payload.new as any).progress, updatedAt: (payload.new as any).updated_at }); },
    ['UPDATE']
  );
}

/** Subscribe to deployment updates */
export function subscribeToDeployment(deployId: string, callback: (e: { deployId: string; status: string; url: string | null; updatedAt: string }) => void): RealtimeChannel {
  return subscribeToTable<{ id: string; status: string; url: string | null; updated_at: string }>(
    'deployments', { column: 'id', value: deployId },
    (payload) => { if (payload.new) callback({ deployId, status: (payload.new as any).status, url: (payload.new as any).url, updatedAt: (payload.new as any).updated_at }); },
    ['UPDATE']
  );
}

/** Broadcast to channel */
export async function broadcast<T>(channelName: string, event: string, payload: T): Promise<void> {
  const supabase = createServiceRoleClient();
  const channel = supabase.channel(channelName);
  await channel.subscribe();
  await channel.send({ type: 'broadcast', event, payload: { ...payload, timestamp: new Date().toISOString() } });
  setTimeout(() => supabase.removeChannel(channel), 100);
}

/** Broadcast build progress */
export async function broadcastBuildProgress(buildId: string, progress: { status: string; progress: number; message?: string; step?: string }): Promise<void> {
  await broadcast(REALTIME_CHANNELS.build(buildId), 'progress', { buildId, ...progress });
}

/** Broadcast build update (alias for broadcastBuildProgress, P7 compat) */
export async function broadcastBuildUpdate(buildId: string, update: {
  status: string;
  progress?: number;
  message?: string;
  step?: string;
  currentPhase?: string | null;
  currentAgent?: string | null;
  error?: string;
  recoverable?: boolean;
}): Promise<void> {
  await broadcastBuildProgress(buildId, { ...update, progress: update.progress || 0 });
}

/** Broadcast deployment status */
export async function broadcastDeployStatus(deployId: string, status: { status: string; url?: string; error?: string }): Promise<void> {
  await broadcast(REALTIME_CHANNELS.deploy(deployId), 'status', { deployId, ...status });
}

/** Broadcast deployment update (alias for broadcastDeployStatus, P7 compat) */
export async function broadcastDeployUpdate(deployId: string, update: { status: string; progress?: number; url?: string; error?: string }): Promise<void> {
  await broadcastDeployStatus(deployId, update);
}

/** Unsubscribe from channel */
export function unsubscribe(channel: RealtimeChannel): void {
  createServiceRoleClient().removeChannel(channel);
}
