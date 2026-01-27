/**
 * OLYMPUS 2.0 - Stripe Customer Management
 */

import { getStripe, withStripeErrorHandling } from './stripe';
import { createServiceRoleClient } from '@/lib/auth/clients';
import { BillingError, BILLING_ERROR_CODES } from './errors';

interface CreateCustomerParams {
  tenantId: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

/**
 * Get or create Stripe customer for tenant.
 */
export async function getOrCreateCustomer(params: CreateCustomerParams): Promise<string> {
  const { tenantId, email, name, metadata } = params;
  const supabase = createServiceRoleClient();

  // Check if customer already exists
  const { data: rawExisting } = await supabase
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .single();
  const existing = rawExisting as any;

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  // Create new Stripe customer
  const stripe = getStripe();
  const customer = await withStripeErrorHandling(
    () =>
      stripe.customers.create({
        email,
        name,
        metadata: { tenant_id: tenantId, ...metadata },
      }),
    'Create customer'
  );

  // Store in database
  await supabase.from('billing_customers').insert({
    tenant_id: tenantId,
    stripe_customer_id: customer.id,
    email,
    name,
  } as any);

  return customer.id;
}

/**
 * Get Stripe customer ID for tenant.
 */
export async function getCustomerId(tenantId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data: rawData } = await supabase
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .single();
  const data = rawData as any;

  return data?.stripe_customer_id || null;
}

/**
 * Get tenant ID from Stripe customer ID.
 */
export async function getTenantFromCustomer(customerId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data: rawData } = await supabase
    .from('billing_customers')
    .select('tenant_id')
    .eq('stripe_customer_id', customerId)
    .single();
  const data = rawData as any;

  return data?.tenant_id || null;
}

/**
 * Update customer in Stripe.
 */
export async function updateCustomer(
  tenantId: string,
  updates: { email?: string; name?: string }
): Promise<void> {
  const customerId = await getCustomerId(tenantId);
  if (!customerId) {
    throw new BillingError(BILLING_ERROR_CODES.STRIPE_CUSTOMER_NOT_FOUND, { tenantId });
  }

  const stripe = getStripe();
  await withStripeErrorHandling(
    () => stripe.customers.update(customerId, updates),
    'Update customer'
  );

  // Update local record
  const supabase = createServiceRoleClient();
  await (supabase.from('billing_customers') as any).update(updates).eq('tenant_id', tenantId);
}

/**
 * Get Stripe customer details.
 */
export async function getCustomerDetails(tenantId: string) {
  const customerId = await getCustomerId(tenantId);
  if (!customerId) return null;

  const stripe = getStripe();
  return withStripeErrorHandling(() => stripe.customers.retrieve(customerId), 'Get customer');
}
