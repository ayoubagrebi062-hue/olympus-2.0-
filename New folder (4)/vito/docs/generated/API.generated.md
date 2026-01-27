# OLYMPUS API Documentation

> Auto-generated API documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via Supabase session cookie or API key.

## Endpoints

### Ai

#### `GET` /api/ai/agents

No description available

**Source:** `.\src\app\api\ai\agents\route.ts`

---

#### `GET` /api/ai/builds

No description available

**Source:** `.\src\app\api\ai\builds\route.ts`

---

#### `POST` /api/ai/builds

No description available

**Source:** `.\src\app\api\ai\builds\route.ts`

---

#### `GET` /api/ai/builds/:buildId

No description available

**Source:** `.\src\app\api\ai\builds\[buildId]\route.ts`

---

#### `GET` /api/ai/builds/:buildId/artifacts

No description available

**Source:** `.\src\app\api\ai\builds\[buildId]\artifacts\route.ts`

---

#### `POST` /api/ai/builds/:buildId/control

No description available

**Source:** `.\src\app\api\ai\builds\[buildId]\control\route.ts`

---

#### `GET` /api/ai/builds/:buildId/iterate

No description available

**Source:** `.\src\app\api\ai\builds\[buildId]\iterate\route.ts`

---

#### `POST` /api/ai/builds/:buildId/iterate

No description available

**Source:** `.\src\app\api\ai\builds\[buildId]\iterate\route.ts`

---

#### `GET` /api/ai/builds/:buildId/stream

No description available

**Source:** `.\src\app\api\ai\builds\[buildId]\stream\route.ts`

---

#### `GET` /api/ai/memory

No description available

**Source:** `.\src\app\api\ai\memory\route.ts`

---

#### `POST` /api/ai/memory

No description available

**Source:** `.\src\app\api\ai\memory\route.ts`

---

#### `GET` /api/ai/quality

No description available

**Source:** `.\src\app\api\ai\quality\route.ts`

---

#### `POST` /api/ai/quality

No description available

**Source:** `.\src\app\api\ai\quality\route.ts`

---

### Auth

#### `POST` /api/auth/forgot-password

No description available

**Source:** `.\src\app\api\auth\forgot-password\route.ts`

---

#### `POST` /api/auth/login

No description available

**Source:** `.\src\app\api\auth\login\route.ts`

---

#### `POST` /api/auth/logout

No description available

**Source:** `.\src\app\api\auth\logout\route.ts`

---

#### `GET` /api/auth/me

* OLYMPUS 2.0 - GET/PATCH /api/auth/me

**Source:** `.\src\app\api\auth\me\route.ts`

---

#### `PATCH` /api/auth/me

* OLYMPUS 2.0 - GET/PATCH /api/auth/me

**Source:** `.\src\app\api\auth\me\route.ts`

---

#### `POST` /api/auth/refresh

No description available

**Source:** `.\src\app\api\auth\refresh\route.ts`

---

#### `POST` /api/auth/reset-password

No description available

**Source:** `.\src\app\api\auth\reset-password\route.ts`

---

#### `POST` /api/auth/signup

No description available

**Source:** `.\src\app\api\auth\signup\route.ts`

---

#### `GET` /api/auth/verify-email

* OLYMPUS 2.0 - POST /api/auth/verify-email

**Source:** `.\src\app\api\auth\verify-email\route.ts`

---

#### `POST` /api/auth/verify-email

No description available

**Source:** `.\src\app\api\auth\verify-email\route.ts`

---

### Billing

#### `POST` /api/billing/cancel

No description available

**Source:** `.\src\app\api\billing\cancel\route.ts`

---

#### `POST` /api/billing/change-plan

No description available

**Source:** `.\src\app\api\billing\change-plan\route.ts`

---

#### `POST` /api/billing/checkout

No description available

**Source:** `.\src\app\api\billing\checkout\route.ts`

---

#### `GET` /api/billing/features

No description available

**Source:** `.\src\app\api\billing\features\route.ts`

---

#### `GET` /api/billing/invoices

No description available

**Source:** `.\src\app\api\billing\invoices\route.ts`

---

#### `GET` /api/billing/overview

No description available

**Source:** `.\src\app\api\billing\overview\route.ts`

---

#### `GET` /api/billing/plans

No description available

**Source:** `.\src\app\api\billing\plans\route.ts`

---

#### `POST` /api/billing/portal

No description available

**Source:** `.\src\app\api\billing\portal\route.ts`

---

#### `POST` /api/billing/resume

No description available

**Source:** `.\src\app\api\billing\resume\route.ts`

---

#### `GET` /api/billing/subscription

No description available

**Source:** `.\src\app\api\billing\subscription\route.ts`

---

#### `GET` /api/billing/usage

No description available

**Source:** `.\src\app\api\billing\usage\route.ts`

---

#### `GET` /api/billing/usage/limit

No description available

**Source:** `.\src\app\api\billing\usage\limit\route.ts`

---

#### `POST` /api/billing/webhooks/stripe

No description available

**Source:** `.\src\app\api\billing\webhooks\stripe\route.ts`

---

### Builds

#### `GET` /api/builds

No description available

**Source:** `.\src\app\api\builds\route.ts`

---

#### `POST` /api/builds

No description available

**Source:** `.\src\app\api\builds\route.ts`

---

#### `GET` /api/builds/:buildId

No description available

**Source:** `.\src\app\api\builds\[buildId]\route.ts`

---

#### `POST` /api/builds/:buildId/cancel

No description available

**Source:** `.\src\app\api\builds\[buildId]\cancel\route.ts`

---

#### `POST` /api/builds/:buildId/iterate

No description available

**Source:** `.\src\app\api\builds\[buildId]\iterate\route.ts`

---

#### `GET` /api/builds/:buildId/logs

No description available

**Source:** `.\src\app\api\builds\[buildId]\logs\route.ts`

---

#### `GET` /api/builds/:buildId/outputs

No description available

**Source:** `.\src\app\api\builds\[buildId]\outputs\route.ts`

---

#### `POST` /api/builds/:buildId/retry

No description available

**Source:** `.\src\app\api\builds\[buildId]\retry\route.ts`

---

### Deployments

#### `GET` /api/deployments

No description available

**Source:** `.\src\app\api\deployments\route.ts`

---

#### `POST` /api/deployments

No description available

**Source:** `.\src\app\api\deployments\route.ts`

---

#### `GET` /api/deployments/:deployId

No description available

**Source:** `.\src\app\api\deployments\[deployId]\route.ts`

---

#### `DELETE` /api/deployments/:deployId

No description available

**Source:** `.\src\app\api\deployments\[deployId]\route.ts`

---

#### `GET` /api/deployments/:deployId/domains

No description available

**Source:** `.\src\app\api\deployments\[deployId]\domains\route.ts`

---

#### `POST` /api/deployments/:deployId/domains

No description available

**Source:** `.\src\app\api\deployments\[deployId]\domains\route.ts`

---

#### `DELETE` /api/deployments/:deployId/domains

No description available

**Source:** `.\src\app\api\deployments\[deployId]\domains\route.ts`

---

#### `GET` /api/deployments/:deployId/logs

No description available

**Source:** `.\src\app\api\deployments\[deployId]\logs\route.ts`

---

#### `POST` /api/deployments/:deployId/promote

No description available

**Source:** `.\src\app\api\deployments\[deployId]\promote\route.ts`

---

#### `POST` /api/deployments/:deployId/redeploy

No description available

**Source:** `.\src\app\api\deployments\[deployId]\redeploy\route.ts`

---

#### `POST` /api/deployments/:deployId/rollback

No description available

**Source:** `.\src\app\api\deployments\[deployId]\rollback\route.ts`

---

### Health

#### `GET` /api/health

* OLYMPUS 2.0 - GET /api/health

**Source:** `.\src\app\api\health\route.ts`

---

### Invitations

#### `GET` /api/invitations/:token

No description available

**Source:** `.\src\app\api\invitations\[token]\route.ts`

---

#### `POST` /api/invitations/:token

No description available

**Source:** `.\src\app\api\invitations\[token]\route.ts`

---

### Jobs

#### `GET` /api/jobs

No description available

**Source:** `.\src\app\api\jobs\route.ts`

---

#### `POST` /api/jobs

No description available

**Source:** `.\src\app\api\jobs\route.ts`

---

#### `GET` /api/jobs/:id

No description available

**Source:** `.\src\app\api\jobs\[id]\route.ts`

---

#### `POST` /api/jobs/:id

No description available

**Source:** `.\src\app\api\jobs\[id]\route.ts`

---

#### `POST` /api/jobs/process

No description available

**Source:** `.\src\app\api\jobs\process\route.ts`

---

#### `POST` /api/jobs/scheduled/:name

No description available

**Source:** `.\src\app\api\jobs\scheduled\[name]\route.ts`

---

### Notifications

#### `GET` /api/notifications

No description available

**Source:** `.\src\app\api\notifications\route.ts`

---

#### `POST` /api/notifications

No description available

**Source:** `.\src\app\api\notifications\route.ts`

---

#### `PATCH` /api/notifications

No description available

**Source:** `.\src\app\api\notifications\route.ts`

---

#### `GET` /api/notifications/stream

No description available

**Source:** `.\src\app\api\notifications\stream\route.ts`

---

### Openapi

#### `GET` /api/openapi

No description available

**Source:** `.\src\app\api\openapi\route.ts`

---

### Projects

#### `GET` /api/projects

No description available

**Source:** `.\src\app\api\projects\route.ts`

---

#### `POST` /api/projects

No description available

**Source:** `.\src\app\api\projects\route.ts`

---

#### `GET` /api/projects/:projectId

No description available

**Source:** `.\src\app\api\projects\[projectId]\route.ts`

---

#### `PATCH` /api/projects/:projectId

No description available

**Source:** `.\src\app\api\projects\[projectId]\route.ts`

---

#### `DELETE` /api/projects/:projectId

No description available

**Source:** `.\src\app\api\projects\[projectId]\route.ts`

---

#### `GET` /api/projects/:projectId/collaborators

No description available

**Source:** `.\src\app\api\projects\[projectId]\collaborators\route.ts`

---

#### `POST` /api/projects/:projectId/collaborators

No description available

**Source:** `.\src\app\api\projects\[projectId]\collaborators\route.ts`

---

#### `DELETE` /api/projects/:projectId/collaborators

No description available

**Source:** `.\src\app\api\projects\[projectId]\collaborators\route.ts`

---

#### `GET` /api/projects/:projectId/env

No description available

**Source:** `.\src\app\api\projects\[projectId]\env\route.ts`

---

#### `POST` /api/projects/:projectId/env

No description available

**Source:** `.\src\app\api\projects\[projectId]\env\route.ts`

---

#### `DELETE` /api/projects/:projectId/env

No description available

**Source:** `.\src\app\api\projects\[projectId]\env\route.ts`

---

#### `GET` /api/projects/:projectId/files

No description available

**Source:** `.\src\app\api\projects\[projectId]\files\route.ts`

---

#### `POST` /api/projects/:projectId/files

No description available

**Source:** `.\src\app\api\projects\[projectId]\files\route.ts`

---

#### `GET` /api/projects/:projectId/files/:...path

No description available

**Source:** `.\src\app\api\projects\[projectId]\files\[...path]\route.ts`

---

#### `PATCH` /api/projects/:projectId/files/:...path

No description available

**Source:** `.\src\app\api\projects\[projectId]\files\[...path]\route.ts`

---

#### `DELETE` /api/projects/:projectId/files/:...path

No description available

**Source:** `.\src\app\api\projects\[projectId]\files\[...path]\route.ts`

---

#### `GET` /api/projects/:projectId/versions

No description available

**Source:** `.\src\app\api\projects\[projectId]\versions\route.ts`

---

#### `POST` /api/projects/:projectId/versions

No description available

**Source:** `.\src\app\api\projects\[projectId]\versions\route.ts`

---

### Storage

#### `GET` /api/storage/files

No description available

**Source:** `.\src\app\api\storage\files\route.ts`

---

#### `GET` /api/storage/files/:fileId

No description available

**Source:** `.\src\app\api\storage\files\[fileId]\route.ts`

---

#### `PATCH` /api/storage/files/:fileId

No description available

**Source:** `.\src\app\api\storage\files\[fileId]\route.ts`

---

#### `DELETE` /api/storage/files/:fileId

No description available

**Source:** `.\src\app\api\storage\files\[fileId]\route.ts`

---

#### `GET` /api/storage/files/:fileId/variants/:variant

No description available

**Source:** `.\src\app\api\storage\files\[fileId]\variants\[variant]\route.ts`

---

#### `GET` /api/storage/image

No description available

**Source:** `.\src\app\api\storage\image\route.ts`

---

#### `POST` /api/storage/resumable

No description available

**Source:** `.\src\app\api\storage\resumable\route.ts`

---

#### `POST` /api/storage/resumable/:sessionId/chunk

No description available

**Source:** `.\src\app\api\storage\resumable\[sessionId]\chunk\route.ts`

---

#### `POST` /api/storage/resumable/:sessionId/complete

No description available

**Source:** `.\src\app\api\storage\resumable\[sessionId]\complete\route.ts`

---

#### `DELETE` /api/storage/resumable/:sessionId/complete

No description available

**Source:** `.\src\app\api\storage\resumable\[sessionId]\complete\route.ts`

---

#### `POST` /api/storage/upload

No description available

**Source:** `.\src\app\api\storage\upload\route.ts`

---

#### `POST` /api/storage/upload-url

No description available

**Source:** `.\src\app\api\storage\upload-url\route.ts`

---

#### `GET` /api/storage/usage

No description available

**Source:** `.\src\app\api\storage\usage\route.ts`

---

### Tenants

#### `GET` /api/tenants

No description available

**Source:** `.\src\app\api\tenants\route.ts`

---

#### `POST` /api/tenants

No description available

**Source:** `.\src\app\api\tenants\route.ts`

---

#### `GET` /api/tenants/:tenantId

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\route.ts`

---

#### `PATCH` /api/tenants/:tenantId

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\route.ts`

---

#### `DELETE` /api/tenants/:tenantId

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\route.ts`

---

#### `GET` /api/tenants/:tenantId/domains

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\domains\route.ts`

---

#### `POST` /api/tenants/:tenantId/domains

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\domains\route.ts`

---

#### `DELETE` /api/tenants/:tenantId/domains

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\domains\route.ts`

---

#### `GET` /api/tenants/:tenantId/invitations

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\invitations\route.ts`

---

#### `DELETE` /api/tenants/:tenantId/invitations

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\invitations\route.ts`

---

#### `GET` /api/tenants/:tenantId/members

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\members\route.ts`

---

#### `POST` /api/tenants/:tenantId/members

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\members\route.ts`

---

#### `PATCH` /api/tenants/:tenantId/members/:memberId

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\members\[memberId]\route.ts`

---

#### `DELETE` /api/tenants/:tenantId/members/:memberId

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\members\[memberId]\route.ts`

---

#### `GET` /api/tenants/:tenantId/settings

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\settings\route.ts`

---

#### `PATCH` /api/tenants/:tenantId/settings

No description available

**Source:** `.\src\app\api\tenants\[tenantId]\settings\route.ts`

---


## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Rate Limiting

API requests are rate limited based on user tier:

| Tier | Requests/minute |
|------|-----------------|
| Free | 20 |
| Pro | 100 |
| Enterprise | Unlimited |

---

*Generated on 2026-01-12*
