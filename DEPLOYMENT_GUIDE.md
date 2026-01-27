# OLYMPUS 3.0 - Deployment Guide

This guide covers deploying OLYMPUS to production using Vercel, Docker, or Kubernetes.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Vercel Deployment](#vercel-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Database Setup](#database-setup)
7. [Post-Deployment](#post-deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

| Service      | Purpose                          | Required          |
| ------------ | -------------------------------- | ----------------- |
| **Supabase** | Auth & PostgreSQL database       | Yes               |
| **Redis**    | Caching, rate limiting, sessions | Yes               |
| **Stripe**   | Billing & subscriptions          | Yes (for billing) |

### Optional Services

| Service     | Purpose                        | When Needed           |
| ----------- | ------------------------------ | --------------------- |
| **Neo4j**   | Graph relationships (GraphRAG) | For GraphRAG feature  |
| **Qdrant**  | Vector embeddings              | For GraphRAG feature  |
| **MongoDB** | Build history & logs           | For detailed logging  |
| **Ollama**  | Local AI inference             | For cost optimization |
| **Sentry**  | Error tracking                 | Recommended           |
| **PostHog** | Product analytics              | Optional              |

### AI Provider Keys

At minimum one of:

- `GROQ_API_KEY` - Fast, cheap cloud inference (recommended)
- `OPENAI_API_KEY` - Fallback provider
- `ANTHROPIC_API_KEY` - For Claude models

---

## Environment Configuration

### 1. Copy Example File

```bash
cp .env.example .env.production
```

### 2. Required Variables

```bash
# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Redis (Required)
REDIS_URL=redis://your-redis:6379
# OR for Upstash
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=xxx

# AI Provider (At least one required)
GROQ_API_KEY=gsk_xxx
OPENAI_API_KEY=sk-xxx

# Stripe (Required for billing)
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Security
JWT_SECRET=your-32-character-minimum-secret
```

### 3. Optional Variables

```bash
# GraphRAG Stack
NEO4J_URI=bolt://your-neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=xxx
QDRANT_URL=http://your-qdrant:6333
MONGODB_URI=mongodb://your-mongo:27017/olympus

# Local AI (Cost Optimization)
OLLAMA_BASE_URL=http://your-ollama:11434

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx

# Feature Flags
ENABLE_GRAPHRAG=true
ENABLE_AI_BUILDS=true
ENABLE_QUALITY_GATES=true
```

---

## Vercel Deployment

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/olympus)

### Manual Setup

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Link Project

```bash
vercel link
```

#### 3. Add Environment Variables

```bash
# Add each variable
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... repeat for all variables

# Or import from file
vercel env pull .env.production
```

#### 4. Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### Vercel Configuration

The `vercel.json` file configures:

```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/**/*.ts": { "maxDuration": 30 },
    "src/app/api/ai/**/*.ts": { "maxDuration": 60 },
    "src/app/api/builds/**/*.ts": { "maxDuration": 120 }
  },
  "crons": [
    { "path": "/api/jobs/scheduled/cleanup", "schedule": "0 3 * * *" },
    { "path": "/api/jobs/scheduled/usage-sync", "schedule": "0 */6 * * *" }
  ]
}
```

### Vercel Function Limits

| Tier       | Duration | Memory |
| ---------- | -------- | ------ |
| Hobby      | 10s      | 1024MB |
| Pro        | 60s      | 3008MB |
| Enterprise | 900s     | 3008MB |

> **Note:** Build orchestration requires Pro tier for 60s+ function duration.

---

## Docker Deployment

### Single Container

#### 1. Build Image

```bash
docker build -t olympus:latest .
```

#### 2. Run Container

```bash
docker run -d \
  --name olympus \
  -p 3000:3000 \
  --env-file .env.production \
  olympus:latest
```

### Full Stack (Docker Compose)

#### 1. Create Production Environment

```bash
cp .env.example .env.production
# Edit .env.production with your values
```

#### 2. Start All Services

```bash
# With GPU support for Ollama
docker compose --profile gpu up -d

# Without GPU (CPU-only Ollama)
docker compose --profile cpu up -d

# Without local AI
docker compose up -d
```

#### 3. Services Started

| Service           | Port       | Purpose             |
| ----------------- | ---------- | ------------------- |
| `olympus-app`     | 3000       | Main application    |
| `olympus-redis`   | 6379       | Cache & sessions    |
| `olympus-neo4j`   | 7474, 7687 | Graph database      |
| `olympus-qdrant`  | 6333, 6334 | Vector database     |
| `olympus-mongodb` | 27017      | Document database   |
| `olympus-ollama`  | 11434      | Local AI (optional) |

#### 4. Verify Health

```bash
# Check all services
docker compose ps

# Check app health
curl http://localhost:3000/api/health

# View logs
docker compose logs -f app
```

### Production Docker Compose

For production, add:

```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.olympus.rule=Host(`olympus.dev`)'
      - 'traefik.http.routers.olympus.tls=true'
```

Run with:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (EKS, GKE, AKS, or self-managed)
- kubectl configured
- Helm 3.x installed

### 1. Create Namespace

```bash
kubectl create namespace olympus
```

### 2. Create Secrets

```bash
kubectl create secret generic olympus-secrets \
  --namespace olympus \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY=xxx \
  --from-literal=STRIPE_SECRET_KEY=xxx \
  --from-literal=GROQ_API_KEY=xxx \
  --from-literal=JWT_SECRET=xxx
```

### 3. Create ConfigMap

```bash
kubectl create configmap olympus-config \
  --namespace olympus \
  --from-literal=NEXT_PUBLIC_APP_URL=https://olympus.dev \
  --from-literal=NODE_ENV=production \
  --from-literal=REDIS_URL=redis://redis:6379
```

### 4. Deploy Application

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: olympus
  namespace: olympus
spec:
  replicas: 3
  selector:
    matchLabels:
      app: olympus
  template:
    metadata:
      labels:
        app: olympus
    spec:
      containers:
        - name: olympus
          image: olympus:latest
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: olympus-config
            - secretRef:
                name: olympus-secrets
          resources:
            requests:
              memory: '512Mi'
              cpu: '250m'
            limits:
              memory: '2Gi'
              cpu: '1000m'
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: olympus
  namespace: olympus
spec:
  selector:
    app: olympus
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: olympus
  namespace: olympus
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - olympus.dev
      secretName: olympus-tls
  rules:
    - host: olympus.dev
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: olympus
                port:
                  number: 80
```

Apply:

```bash
kubectl apply -f k8s/
```

### 5. Deploy Redis (Helm)

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami

helm install redis bitnami/redis \
  --namespace olympus \
  --set auth.enabled=false \
  --set master.persistence.size=8Gi
```

### 6. Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: olympus
  namespace: olympus
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: olympus
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## Database Setup

### Supabase Setup

1. Create project at [supabase.com](https://supabase.com)

2. Run migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Link project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

3. Enable Row Level Security (RLS) policies

4. Configure Auth providers (Email, OAuth)

### Redis Setup

**Option A: Upstash (Serverless)**

1. Create database at [upstash.com](https://upstash.com)
2. Copy REST URL and token to environment

**Option B: Self-hosted**

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine \
  redis-server --appendonly yes
```

### Stripe Setup

1. Create account at [stripe.com](https://stripe.com)

2. Create products and prices in Dashboard

3. Set up webhook endpoint:
   - URL: `https://your-domain.com/api/billing/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

4. Copy API keys and webhook secret

---

## Post-Deployment

### 1. Verify Health

```bash
curl https://your-domain.com/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-22T12:00:00Z",
  "version": "3.0.0"
}
```

### 2. Create Admin User

```bash
# Via Supabase Dashboard or API
```

### 3. Configure DNS

| Record | Type  | Value               |
| ------ | ----- | ------------------- |
| `@`    | A     | Vercel IP           |
| `www`  | CNAME | your-app.vercel.app |
| `api`  | CNAME | your-app.vercel.app |

### 4. Enable SSL

- **Vercel**: Automatic
- **Docker**: Use Traefik or nginx with Let's Encrypt
- **Kubernetes**: Use cert-manager

### 5. Test Critical Paths

```bash
# Auth flow
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"xxx"}'

# Create project (authenticated)
curl -X POST https://your-domain.com/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project"}'
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Application health
GET /api/health

# Detailed health (authenticated)
GET /api/monitoring/health
```

### Logs

**Vercel:**

```bash
vercel logs your-project --follow
```

**Docker:**

```bash
docker compose logs -f app
```

**Kubernetes:**

```bash
kubectl logs -f deployment/olympus -n olympus
```

### Metrics

- Enable Prometheus endpoint at `/api/monitoring/metrics`
- Configure Grafana dashboards
- Set up alerts for:
  - Error rate > 1%
  - Response time p95 > 2s
  - CPU usage > 80%
  - Memory usage > 85%

### Backups

**Database (Supabase):**

- Enable Point-in-Time Recovery
- Configure daily backups

**Redis:**

- Enable AOF persistence
- Regular RDB snapshots

### Updates

```bash
# Vercel (automatic with git push)
git push origin main

# Docker
docker compose pull
docker compose up -d

# Kubernetes
kubectl set image deployment/olympus olympus=olympus:new-tag -n olympus
```

---

## Troubleshooting

### Build Failures

**Issue:** Next.js build fails

```bash
# Check for TypeScript errors
npm run type-check

# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Connection Issues

**Issue:** Cannot connect to database

```bash
# Test Supabase connection
curl https://xxx.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key"

# Test Redis connection
redis-cli -h your-redis ping
```

### Performance Issues

**Issue:** Slow response times

1. Check Redis connection (caching)
2. Enable database query logging
3. Check AI provider latency
4. Review function timeout limits

### Memory Issues

**Issue:** Out of memory errors

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096"

# Check for memory leaks
# Enable heap snapshots in development
```

### SSL Issues

**Issue:** Certificate errors

```bash
# Verify certificate
openssl s_client -connect your-domain.com:443

# Check expiration
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Security Checklist

- [ ] All secrets in environment variables (not committed)
- [ ] HTTPS enabled with valid certificate
- [ ] Rate limiting configured
- [ ] CORS origins restricted
- [ ] Stripe webhook signature verification enabled
- [ ] Supabase RLS policies active
- [ ] JWT secret is 32+ characters
- [ ] Admin endpoints protected
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't include PII

---

## Support

- **Documentation:** [docs.olympus.dev](https://docs.olympus.dev)
- **GitHub Issues:** [github.com/your-org/olympus/issues](https://github.com/your-org/olympus/issues)
- **Email:** support@olympus.dev

---

_Last updated: 2026-01-22_
