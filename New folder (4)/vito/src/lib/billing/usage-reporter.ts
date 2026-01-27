/**
 * OLYMPUS 2.0 - Usage Reporter (Stripe Metered Billing)
 */

import { getStripe, withStripeErrorHandling } from './stripe';
import { createServiceRoleClient } from '@/lib/auth/clients';
import { STRIPE_METERED_PRICES } from './constants';
import type { UsageMetric } from './types';

interface UnreportedUsage {
  id: string; tenant_id: string; metric: UsageMetric; quantity: number; stripe_subscription_id: string | null;
}

/**
 * Report unreported usage to Stripe. Run as daily cron job.
 */
export async function reportUsageToStripe(): Promise<{ reported: number; failed: number; skipped: number }> {
  const supabase = createServiceRoleClient();
  let reported = 0, failed = 0, skipped = 0;

  const { data: unreported } = await supabase
    .from('usage_records')
    .select(`id, tenant_id, metric, quantity, subscriptions!inner(stripe_subscription_id)`)
    .eq('reported_to_stripe', false)
    .not('metric', 'eq', 'api_calls')
    .order('created_at', { ascending: true })
    .limit(1000);

  if (!unreported?.length) return { reported: 0, failed: 0, skipped: 0 };

  const grouped: Record<string, UnreportedUsage[]> = {};
  for (const r of unreported as any[]) {
    const key = `${r.tenant_id}:${r.metric}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  const stripe = getStripe();

  for (const [key, records] of Object.entries(grouped)) {
    const [tenantId, metric] = key.split(':');
    const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
    const subscriptionId = records[0]?.stripe_subscription_id;
    const meteredPriceId = getMeteredPriceId(metric as UsageMetric);

    if (!subscriptionId || !meteredPriceId) { skipped += records.length; continue; }

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const meteredItem = subscription.items.data.find((item) => item.price.id === meteredPriceId);
      if (!meteredItem) { skipped += records.length; continue; }

      await withStripeErrorHandling(
        () => (stripe.subscriptionItems as any).createUsageRecord(meteredItem.id, {
          quantity: totalQuantity, timestamp: Math.floor(Date.now() / 1000), action: 'increment',
        }),
        `Report ${metric} usage`
      );

      await (supabase.from('usage_records') as any)
        .update({ reported_to_stripe: true, reported_at: new Date().toISOString() })
        .in('id', records.map((r) => r.id));

      reported += records.length;
    } catch (error) {
      console.error(`[usage-reporter] Failed for ${tenantId}:`, error);
      failed += records.length;
    }
  }

  console.log(`[usage-reporter] Complete: ${reported} reported, ${failed} failed, ${skipped} skipped`);
  return { reported, failed, skipped };
}

function getMeteredPriceId(metric: UsageMetric): string | null {
  const map: Record<string, string | undefined> = {
    builds: STRIPE_METERED_PRICES.build_overage,
    deploys: STRIPE_METERED_PRICES.deploy_overage,
    storage: STRIPE_METERED_PRICES.storage_overage,
    ai_tokens: STRIPE_METERED_PRICES.ai_token_overage,
  };
  return map[metric] || null;
}

/**
 * Get usage report for a specific period.
 */
export async function getUsageReport(tenantId: string, startDate: Date, endDate: Date): Promise<Record<UsageMetric, number>> {
  const supabase = createServiceRoleClient();
  const metrics: UsageMetric[] = ['builds', 'deploys', 'storage', 'ai_tokens', 'api_calls'];
  const report: Record<string, number> = {};

  for (const metric of metrics) {
    const { data } = await (supabase.rpc as any)('get_usage_for_period', {
      p_tenant_id: tenantId, p_metric: metric,
      p_period_start: startDate.toISOString(), p_period_end: endDate.toISOString(),
    });
    report[metric] = Number(data) || 0;
  }
  return report as Record<UsageMetric, number>;
}
