# OLYMPUS COCKPIT VIEWER — MONETIZATION ARCHITECTURE

## CRITICAL CONSTRAINT

```
┌─────────────────────────────────────────────────────────────┐
│  THIS LAYER IS EXTERNAL TO OLYMPUS                          │
│  NO WRITES TO OLYMPUS CORE                                  │
│  READ-ONLY ACCESS TO SEALED ARTIFACTS                       │
└─────────────────────────────────────────────────────────────┘
```

## SEPARATION BOUNDARY

```
OLYMPUS CORE (SEALED)              MONETIZATION LAYER (EXTERNAL)
├── src/lib/cockpit/               ├── monetization/src/
├── src/app/cockpit/               ├── monetization/api/
├── docs/GOVERNANCE_MODE.json      └── monetization/docs/
├── docs/CANONICAL_COCKPIT_*.json
└── [ALL FILES chmod 0444]         [SEPARATE CODEBASE]
                │
                │ READ-ONLY
                ▼
        ┌───────────────┐
        │  SaaS Wrapper │
        │  (This Layer) │
        └───────────────┘
```

## BUSINESS MODEL

### Tier 1: FREE
- View governance status (TERMINATED/ARCHIVED)
- View mode constraints (FORBIDDEN states)
- Rate limited: 10 requests/hour

### Tier 2: PRO ($29/month)
- Full cockpit dashboard access
- AWAP campaign details
- Invariant grid inspection
- Witness proof verification
- Rate limited: 1000 requests/hour

### Tier 3: ENTERPRISE ($199/month)
- Everything in PRO
- API access for CI/CD integration
- Hash verification endpoints
- Counterfeit detection API
- Unlimited requests
- Webhook notifications

## API ENDPOINTS (READ-ONLY)

```
GET /api/v1/governance/status
GET /api/v1/governance/mode
GET /api/v1/cockpit/panels
GET /api/v1/cockpit/witness
GET /api/v1/verify/hash/:hash
GET /api/v1/awap/campaigns
GET /api/v1/invariants
```

## AUTHENTICATION

- Stripe for payments
- JWT tokens for API access
- Rate limiting per tier

## DATA FLOW

```
1. User authenticates → JWT issued
2. Request hits SaaS API
3. SaaS reads SEALED Olympus artifacts (READ-ONLY)
4. Response formatted and returned
5. NO WRITES to Olympus core EVER
```

## TECH STACK

- Next.js API routes (separate deployment)
- Stripe for billing
- Redis for rate limiting
- Vercel for hosting (separate project)

## HASH VERIFICATION

The monetization layer can VERIFY but NEVER MODIFY:

```typescript
// ALLOWED: Reading sealed hashes
const governanceHash = readGovernanceHash() // READ-ONLY

// ALLOWED: Comparing hashes
const isValid = computedHash === governanceHash // READ-ONLY

// FORBIDDEN: Any write operation
writeGovernanceHash() // HARD_STOP
```

## DEPLOYMENT

Monetization layer deploys to SEPARATE infrastructure:
- Separate Vercel project
- Separate domain (e.g., cockpit.olympus.io)
- Olympus core remains static, sealed, immutable

## REVENUE PROJECTION

| Tier | Price | Target Users | MRR |
|------|-------|--------------|-----|
| FREE | $0 | 1000 | $0 |
| PRO | $29 | 100 | $2,900 |
| ENTERPRISE | $199 | 20 | $3,980 |
| **TOTAL** | | | **$6,880** |

## LEGAL

- Olympus core is MIT licensed
- Monetization layer is proprietary
- SaaS terms of service required
- No liability for governance state
