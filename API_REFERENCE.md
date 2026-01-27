# OLYMPUS 3.0 - API Reference

**Version:** 3.0.0
**Base URL:** `https://api.olympus.dev` (Production) | `http://localhost:3000` (Development)
**Authentication:** Bearer JWT tokens via Supabase Auth

---

## Table of Contents

1. [Authentication](#authentication)
2. [Health & Monitoring](#health--monitoring)
3. [Projects](#projects)
4. [Builds](#builds)
5. [Deployments](#deployments)
6. [Tenants](#tenants)
7. [Billing](#billing)
8. [Storage](#storage)
9. [AI Features](#ai-features)
10. [Error Handling](#error-handling)

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### POST /api/auth/signup

Create a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com" },
    "session": { "access_token": "...", "refresh_token": "..." }
  }
}
```

### POST /api/auth/login

Authenticate and receive tokens.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com", "role": "user" },
    "session": { "access_token": "...", "refresh_token": "...", "expires_at": 1234567890 }
  }
}
```

### POST /api/auth/logout

Invalidate current session.

**Response:** `200 OK`

### POST /api/auth/refresh

Refresh access token.

**Request:**

```json
{
  "refresh_token": "..."
}
```

### GET /api/auth/me

Get current user profile.

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": "https://...",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

### POST /api/auth/forgot-password

Request password reset email.

### POST /api/auth/reset-password

Reset password with token.

### POST /api/auth/verify-email

Verify email address.

### POST /api/auth/password

Change password (authenticated).

---

## Health & Monitoring

### GET /api/health

System health check.

**Query Parameters:**

- `detailed` (boolean) - Include component health details

**Response:** `200 OK`

```json
{
  "status": "healthy",
  "timestamp": "2026-01-22T12:00:00Z",
  "version": "3.0.0",
  "components": {
    "database": "healthy",
    "redis": "healthy",
    "ai": "healthy"
  }
}
```

### GET /api/monitoring/health

Detailed health check for monitoring systems.

### GET /api/monitoring/metrics

Prometheus-compatible metrics endpoint.

### GET /api/monitoring/errors

Recent error logs (admin only).

---

## Projects

### GET /api/projects

List all projects for the current tenant.

**Query Parameters:**

- `page` (int, default: 1)
- `pageSize` (int, default: 20, max: 100)
- `status` (string) - Filter by status
- `search` (string) - Search by name

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Project",
      "description": "Project description",
      "status": "active",
      "visibility": "private",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-15T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 45,
    "totalPages": 3,
    "hasMore": true
  }
}
```

### POST /api/projects

Create a new project.

**Request:**

```json
{
  "name": "My New Project",
  "description": "Optional description",
  "visibility": "private"
}
```

**Response:** `201 Created`

### GET /api/projects/{projectId}

Get project details.

### PUT /api/projects/{projectId}

Update project.

### DELETE /api/projects/{projectId}

Delete project.

### GET /api/projects/{projectId}/files

List project files.

### GET /api/projects/{projectId}/files/{...path}

Get specific file content.

### GET /api/projects/{projectId}/versions

List project versions/history.

### GET /api/projects/{projectId}/collaborators

List project collaborators.

### POST /api/projects/{projectId}/collaborators

Add collaborator.

### GET /api/projects/{projectId}/env

Get project environment variables.

### PUT /api/projects/{projectId}/env

Update environment variables.

---

## Builds

### GET /api/builds

List builds for tenant.

**Query Parameters:**

- `projectId` (uuid) - Filter by project
- `status` (string) - Filter by status: `queued`, `running`, `completed`, `failed`
- `page` (int)
- `pageSize` (int)

### POST /api/builds

Create and start a new build.

**Request:**

```json
{
  "projectId": "uuid",
  "tier": "professional",
  "description": "Build a SaaS dashboard with user management",
  "targetUsers": "Small business owners",
  "techConstraints": "Must use React and TypeScript",
  "businessRequirements": "Support multi-tenancy",
  "designPreferences": "Modern, minimal design",
  "integrations": ["stripe", "slack"]
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "buildId": "uuid",
    "status": "running",
    "plan": {
      "totalAgents": 35,
      "estimatedTokens": 500000,
      "estimatedCost": 2.5,
      "phases": [
        "discovery",
        "design",
        "architecture",
        "frontend",
        "backend",
        "testing",
        "deployment"
      ]
    }
  }
}
```

### GET /api/builds/{buildId}

Get build details and status.

### DELETE /api/builds/{buildId}

Cancel/delete build.

### POST /api/builds/{buildId}/cancel

Cancel running build.

### POST /api/builds/{buildId}/retry

Retry failed build.

### POST /api/builds/{buildId}/iterate

Iterate on completed build with feedback.

### GET /api/builds/{buildId}/logs

Get build logs.

### GET /api/builds/{buildId}/outputs

Get build outputs/artifacts.

### GET /api/builds/{buildId}/stream

**SSE** - Stream build progress in real-time.

**Response:** Server-Sent Events

```
event: progress
data: {"phase":"discovery","progress":15,"agent":"oracle","message":"Analyzing requirements"}

event: agent_completed
data: {"agentId":"oracle","artifacts":3,"tokensUsed":1500}

event: phase_completed
data: {"phase":"discovery","status":"completed","duration":45000}

event: build_completed
data: {"success":true,"totalTokens":485000,"totalCost":2.35}
```

### POST /api/builds/orchestrate

Start full 35-agent orchestration with SSE streaming.

---

## AI Builds (Enhanced)

### POST /api/ai/builds

Create AI-powered build with security checks.

**Request:**

```json
{
  "projectId": "uuid",
  "tier": "professional",
  "description": "Build description",
  "autoStart": true
}
```

### GET /api/ai/builds/{buildId}

Get AI build details.

### GET /api/ai/builds/{buildId}/stream

Stream AI build progress.

### GET /api/ai/builds/{buildId}/artifacts

Get generated artifacts.

### POST /api/ai/builds/{buildId}/iterate

Iterate with AI feedback.

### POST /api/ai/builds/{buildId}/control

Control build execution (pause/resume/cancel).

### GET /api/ai/agents

List available AI agents and their status.

### POST /api/ai/quality

Run quality checks on generated code.

### POST /api/ai/memory

Query/update AI memory for context.

---

## Deployments

### GET /api/deployments

List deployments.

**Query Parameters:**

- `projectId` (uuid)
- `environment` (string): `preview`, `staging`, `production`
- `status` (string)

### POST /api/deployments

Create new deployment.

### GET /api/deployments/{deployId}

Get deployment details.

### DELETE /api/deployments/{deployId}

Delete deployment.

### POST /api/deployments/{deployId}/redeploy

Trigger redeployment.

### POST /api/deployments/{deployId}/promote

Promote to production.

### POST /api/deployments/{deployId}/rollback

Rollback to previous version.

### GET /api/deployments/{deployId}/logs

Get deployment logs.

### GET /api/deployments/{deployId}/domains

List custom domains.

### POST /api/deployments/{deployId}/domains

Add custom domain.

### DELETE /api/deployments/{deployId}/domains/{domainId}

Remove custom domain.

---

## Tenants

### GET /api/tenants

List user's tenants.

### POST /api/tenants

Create new tenant/organization.

### GET /api/tenants/{tenantId}

Get tenant details.

### PUT /api/tenants/{tenantId}

Update tenant.

### DELETE /api/tenants/{tenantId}

Delete tenant.

### GET /api/tenants/{tenantId}/settings

Get tenant settings.

### PUT /api/tenants/{tenantId}/settings

Update tenant settings.

### GET /api/tenants/{tenantId}/members

List tenant members.

### POST /api/tenants/{tenantId}/members

Invite new member.

### PUT /api/tenants/{tenantId}/members/{memberId}

Update member role.

### DELETE /api/tenants/{tenantId}/members/{memberId}

Remove member.

### GET /api/tenants/{tenantId}/invitations

List pending invitations.

### GET /api/tenants/{tenantId}/domains

List tenant domains.

### POST /api/tenants/{tenantId}/domains

Add custom domain.

---

## Billing

### GET /api/billing/overview

Get billing overview for tenant.

**Response:**

```json
{
  "success": true,
  "data": {
    "plan": "professional",
    "status": "active",
    "currentPeriodStart": "2026-01-01",
    "currentPeriodEnd": "2026-02-01",
    "usage": {
      "builds": 45,
      "buildsLimit": 100,
      "tokens": 2500000,
      "tokensLimit": 5000000
    }
  }
}
```

### GET /api/billing/subscription

Get subscription details.

### GET /api/billing/plans

List available plans.

### POST /api/billing/checkout

Create Stripe checkout session.

**Request:**

```json
{
  "priceId": "price_xxx",
  "successUrl": "https://app.olympus.dev/billing/success",
  "cancelUrl": "https://app.olympus.dev/billing"
}
```

### POST /api/billing/change-plan

Change subscription plan.

### POST /api/billing/cancel

Cancel subscription.

### POST /api/billing/resume

Resume cancelled subscription.

### GET /api/billing/portal

Get Stripe customer portal URL.

### GET /api/billing/invoices

List invoices.

### GET /api/billing/usage

Get detailed usage metrics.

### PUT /api/billing/usage/limit

Set usage limits/alerts.

### GET /api/billing/features

Get feature flags for current plan.

### POST /api/billing/webhooks/stripe

Stripe webhook endpoint (internal).

---

## Storage

### GET /api/storage/files

List stored files.

### POST /api/storage/upload

Upload file directly.

### GET /api/storage/upload-url

Get presigned upload URL.

### GET /api/storage/files/{fileId}

Get file metadata.

### DELETE /api/storage/files/{fileId}

Delete file.

### GET /api/storage/files/{fileId}/variants/{variant}

Get file variant (thumbnail, etc.).

### POST /api/storage/resumable

Start resumable upload session.

### PUT /api/storage/resumable/{sessionId}/chunk

Upload chunk.

### POST /api/storage/resumable/{sessionId}/complete

Complete resumable upload.

### POST /api/storage/image

Process/transform image.

### GET /api/storage/usage

Get storage usage stats.

---

## AI Features (50X)

### POST /api/ai/50x/scan

Scan code for quality issues.

### POST /api/ai/50x/generate

Generate code with 50X quality system.

### GET /api/ai/50x/stats

Get 50X system statistics.

### POST /api/guest/50x

Guest access to 50X features (limited).

---

## User

### GET /api/user/notifications

Get user notifications.

### PUT /api/user/notifications

Mark notifications as read.

---

## API Keys

### GET /api/api-keys

List API keys.

### POST /api/api-keys

Create new API key.

### DELETE /api/api-keys/{keyId}

Revoke API key.

---

## Invitations

### GET /api/invitations/{token}

Get invitation details.

### POST /api/invitations/{token}

Accept invitation.

---

## Analytics

### POST /api/analytics/events

Track analytics event.

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERR_CODE",
    "message": "Human readable message",
    "requestId": "req_xxx"
  }
}
```

### Common Error Codes

| Code        | HTTP Status | Description                       |
| ----------- | ----------- | --------------------------------- |
| `AUTH_001`  | 401         | Invalid or expired token          |
| `AUTH_002`  | 403         | Insufficient permissions          |
| `VAL_001`   | 422         | Validation error                  |
| `RATE_001`  | 429         | Rate limit exceeded               |
| `NOT_FOUND` | 404         | Resource not found                |
| `COST_001`  | 403         | Build limit exceeded              |
| `SEC_001`   | 403         | Security block (prompt injection) |
| `DB_001`    | 500         | Database error                    |

### Rate Limits

| Endpoint      | Limit       |
| ------------- | ----------- |
| `/api/auth/*` | 10 req/min  |
| `/api/builds` | 3 req/min   |
| `/api/ai/*`   | 10 req/min  |
| General       | 100 req/min |

---

## OpenAPI Specification

Get the full OpenAPI 3.1 spec:

```bash
# Requires authentication
curl -H "Authorization: Bearer $TOKEN" \
  https://api.olympus.dev/api/openapi

# YAML format
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.olympus.dev/api/openapi?format=yaml"
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@olympus/sdk';

const olympus = createClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.olympus.dev',
});

// Create a build
const build = await olympus.builds.create({
  projectId: 'uuid',
  tier: 'professional',
  description: 'Build a dashboard',
});

// Stream progress
for await (const event of olympus.builds.stream(build.buildId)) {
  console.log(event.type, event.progress);
}
```

### cURL

```bash
# Login
curl -X POST https://api.olympus.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"xxx"}'

# Create project
curl -X POST https://api.olympus.dev/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project"}'

# Start build
curl -X POST https://api.olympus.dev/api/builds \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"uuid","tier":"professional","description":"Build a SaaS app"}'
```

---

_Last updated: 2026-01-22_
