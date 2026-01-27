/**
 * OLYMPUS 2.0 - Webhook Event Storage
 */

import type Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/auth/clients';

/**
 * Store webhook event in database.
 */
export async function storeWebhookEvent(event: Stripe.Event): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await (supabase.from('webhook_events') as any).insert({
    stripe_event_id: event.id,
    type: event.type,
    api_version: event.api_version,
    data: event.data as unknown as Record<string, unknown>,
    status: 'pending',
  });

  if (error && error.code !== '23505') {
    console.error('[webhook] Failed to store event:', error);
    throw error;
  }
}

/**
 * Check if event has already been processed.
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data: rawData } = await supabase
    .from('webhook_events')
    .select('status')
    .eq('stripe_event_id', eventId)
    .single();
  const data = rawData as any;

  return data?.status === 'processed';
}

/**
 * Mark event as processed.
 */
export async function markEventProcessed(eventId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await (supabase.from('webhook_events') as any)
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('stripe_event_id', eventId);
}

/**
 * Mark event as failed.
 */
export async function markEventFailed(eventId: string, error: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: rawData } = await supabase
    .from('webhook_events')
    .select('retry_count')
    .eq('stripe_event_id', eventId)
    .single();
  const data = rawData as any;

  await (supabase.from('webhook_events') as any)
    .update({ status: 'failed', error, retry_count: (data?.retry_count || 0) + 1 })
    .eq('stripe_event_id', eventId);
}

/**
 * Mark event as skipped.
 */
export async function markEventSkipped(eventId: string, reason: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await (supabase.from('webhook_events') as any)
    .update({ status: 'skipped', error: reason, processed_at: new Date().toISOString() })
    .eq('stripe_event_id', eventId);
}

/**
 * Get pending events for retry.
 */
export async function getPendingEvents(limit: number = 10): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data: rawData } = await supabase
    .from('webhook_events')
    .select('stripe_event_id')
    .in('status', ['pending', 'failed'])
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })
    .limit(limit);
  const data = rawData as any;

  return data?.map((e: any) => e.stripe_event_id) || [];
}
