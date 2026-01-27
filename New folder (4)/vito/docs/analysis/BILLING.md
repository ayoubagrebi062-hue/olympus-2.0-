# OLYMPUS 2.0 - Billing System (Prompt 5)

Complete Stripe-integrated billing system with subscriptions, usage tracking, feature gating, and trial management.

## Quick Start

### 1. Install Dependencies

```bash
npm install stripe
```

### 2. Configure Environment

Copy `.env.billing.example` to `.env.local` and fill in your Stripe keys.

### 3. Run Migrations

```bash
npx supabase db push
```

### 4. Configure Stripe Webhook

Point your Stripe webhook to: `https://your-domain.com/api/billing/webhooks/stripe`

Events to enable:
- `customer.subscription.*`
- `invoice.*`
- `payment_method.*`
- `checkout.session.*`
- `customer.updated`

## Architecture

```
lib/billing/
├── types/           # TypeScript types
├── constants/       # Plans, features, config
├── errors.ts        # Error handling
├── stripe.ts        # Stripe client
├── customer.ts      # Customer management
├── checkout.ts      # Checkout sessions
├── subscriptions/   # Subscription management
├── usage.ts         # Usage tracking
├── limits.ts        # Limit checking
├── features.ts      # Feature gating
├── trials.ts        # Trial management
├── webhooks/        # Webhook handlers
└── emails/          # Email templates

components/billing/  # React components
hooks/               # React hooks
app/api/billing/     # API routes
```

## Usage Examples

### Check Feature Access

```typescript
// Server-side
import { hasFeature, requireFeature } from '@/lib/billing';

if (await hasFeature(tenantId, 'custom_domain')) {
  // Feature available
}

// Throws if not available
await requireFeature(tenantId, 'sso');
```

### Track Usage

```typescript
import { trackBuild, trackDeploy, trackAiTokens } from '@/lib/billing';

await trackBuild(tenantId, buildId);
await trackDeploy(tenantId, deployId);
await trackAiTokens(tenantId, 1500, requestId);
```

### Check Limits

```typescript
import { checkLimit } from '@/lib/billing';

const result = await checkLimit({ tenantId, metric: 'builds' });
if (!result.allowed) {
  throw new Error(`Limit reached: ${result.current}/${result.limit}`);
}
```

### React Components

```tsx
import { PricingTable, SubscriptionCard, UsageBar } from '@/components/billing';
import { useFeature, useSubscription } from '@/hooks/billing';

function BillingPage() {
  const { hasFeature } = useFeature('advanced_analytics');
  const { subscription, planTier } = useSubscription();

  return (
    <div>
      <SubscriptionCard />
      <PricingTable />
    </div>
  );
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/subscription` | Get subscription |
| POST | `/api/billing/checkout` | Create checkout |
| POST | `/api/billing/change-plan` | Change plan |
| POST | `/api/billing/cancel` | Cancel subscription |
| POST | `/api/billing/resume` | Resume subscription |
| GET | `/api/billing/usage` | Get usage |
| GET | `/api/billing/invoices` | List invoices |
| POST | `/api/billing/portal` | Stripe portal |
| GET | `/api/billing/plans` | List plans |
| GET | `/api/billing/features` | Check features |

## Plan Tiers

| Tier | Monthly | Builds | Deploys | Storage | AI Tokens |
|------|---------|--------|---------|---------|-----------|
| Free | $0 | 3 | 1 | 100MB | 10K |
| Starter | $19 | 20 | 10 | 1GB | 100K |
| Pro | $49 | 100 | 50 | 10GB | 500K |
| Business | $149 | 500 | 200 | 50GB | 2M |
| Enterprise | Custom | ∞ | ∞ | ∞ | ∞ |

## Webhook Events

Handled events:
- `customer.subscription.created/updated/deleted`
- `customer.subscription.trial_will_end`
- `invoice.created/paid/payment_failed`
- `payment_method.attached/detached`
- `checkout.session.completed`

## Dependencies

Requires from Prompt 3 (Auth):
- `createServiceRoleClient`
- `withAuth`
- `getAuthSession`
