# OLYMPUS 2.0 - Production Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment

### Code Quality
- [ ] All tests passing (`npm run test`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No console.log statements in production code

### Security
- [ ] No secrets hardcoded in code
- [ ] All API keys in environment variables
- [ ] .env files in .gitignore
- [ ] Rate limiting configured
- [ ] CORS configured for production domain
- [ ] Security headers configured (X-Frame-Options, CSP, etc.)
- [ ] Input validation on all API endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)

### Environment Variables
- [ ] All required variables documented in .env.example
- [ ] Production Supabase URL configured
- [ ] Production Stripe keys configured (sk_live, pk_live)
- [ ] AI provider keys configured (Anthropic/OpenAI/Groq)
- [ ] Redis/Upstash URL configured
- [ ] Error tracking (Sentry) configured

## Infrastructure

### Supabase
- [ ] Production project created
- [ ] All migrations applied
- [ ] RLS (Row Level Security) enabled on all tables
- [ ] Database backups configured
- [ ] Connection pooling enabled
- [ ] Edge functions deployed (if any)

### Stripe
- [ ] Production keys configured
- [ ] Webhook endpoint registered
- [ ] Products and prices created
- [ ] Tax settings configured (if needed)
- [ ] Customer portal configured

### AI Services
- [ ] At least one AI provider configured
- [ ] API rate limits understood
- [ ] Fallback providers configured (optional)
- [ ] Cost monitoring enabled

### Caching & Databases
- [ ] Redis/Upstash configured
- [ ] Neo4j configured (for GraphRAG)
- [ ] Qdrant configured (for vectors)
- [ ] MongoDB configured (for logs)

## Deployment

### Vercel (Recommended)
- [ ] Project connected to GitHub repo
- [ ] Environment variables set in Vercel dashboard
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Cron jobs configured (vercel.json)
- [ ] Function timeouts configured

### Docker (Alternative)
- [ ] Docker image builds successfully
- [ ] docker-compose.yml configured
- [ ] Health checks passing
- [ ] Volume mounts configured
- [ ] Network configured

### Domain & SSL
- [ ] Custom domain purchased/configured
- [ ] DNS records pointing to deployment
- [ ] SSL certificate issued and active
- [ ] www redirect configured
- [ ] Email domain verified (for transactional emails)

## Monitoring

### Error Tracking
- [ ] Sentry project created
- [ ] SENTRY_DSN configured
- [ ] Source maps uploaded
- [ ] Alert rules configured

### Analytics
- [ ] Vercel Analytics enabled (or alternative)
- [ ] PostHog configured (optional)
- [ ] Key metrics identified

### Uptime Monitoring
- [ ] Health endpoint accessible (`/api/health`)
- [ ] Uptime monitoring service configured
- [ ] Alert notifications configured

### Logging
- [ ] Application logs accessible
- [ ] Log retention configured
- [ ] Error alerting configured

## Post-Deployment

### Smoke Tests
- [ ] Landing page loads
- [ ] Login/signup works
- [ ] Dashboard accessible after login
- [ ] Project creation works
- [ ] API endpoints responding
- [ ] Stripe checkout works

### Performance
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] No memory leaks detected
- [ ] CDN caching working

### Documentation
- [ ] README up to date
- [ ] API documentation current
- [ ] Deployment documentation current
- [ ] Runbook created for common issues

## Rollback Plan

In case of issues:

1. **Vercel**: Use Vercel dashboard to rollback to previous deployment
2. **Docker**: `docker-compose down && docker-compose up -d` with previous image tag
3. **Database**: Restore from backup if schema changes caused issues

## Emergency Contacts

| Role | Contact |
|------|---------|
| DevOps Lead | TBD |
| Backend Lead | TBD |
| On-Call Engineer | TBD |

---

## Quick Commands

```bash
# Run full pre-deployment check
npm run test:full

# Build production
npm run build

# Check TypeScript
npm run type-check

# Run tests with coverage
npm run test -- --coverage

# Deploy to Vercel
vercel --prod

# Deploy with Docker
docker-compose -f docker-compose.yml up -d --build
```

---

Last Updated: January 2026
