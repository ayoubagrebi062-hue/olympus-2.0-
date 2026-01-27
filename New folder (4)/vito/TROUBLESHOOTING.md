# OLYMPUS 3.0 - Troubleshooting Guide

Common issues and solutions for OLYMPUS deployment and development.

---

## Table of Contents

1. [Build Issues](#build-issues)
2. [Database Issues](#database-issues)
3. [Authentication Issues](#authentication-issues)
4. [AI/LLM Issues](#aillm-issues)
5. [Deployment Issues](#deployment-issues)
6. [Performance Issues](#performance-issues)
7. [Common Error Codes](#common-error-codes)

---

## Build Issues

### Build fails with TypeScript errors

**Symptoms:**
```
error TS2322: Type 'X' is not assignable to type 'Y'
```

**Solutions:**
1. Run type check to identify all errors:
   ```bash
   npm run type-check
   ```

2. Clear TypeScript cache:
   ```bash
   rm -rf .next node_modules/.cache
   npm run build
   ```

3. Regenerate Supabase types:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT > src/types/database.types.ts
   ```

### Build hangs or runs out of memory

**Symptoms:**
- Build process freezes
- `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`

**Solutions:**
1. Increase Node.js memory:
   ```bash
   NODE_OPTIONS="--max-old-space-size=8192" npm run build
   ```

2. Clear build cache:
   ```bash
   rm -rf .next
   npm run build
   ```

3. Check for circular dependencies:
   ```bash
   npx madge --circular src/
   ```

### Missing environment variables during build

**Symptoms:**
```
Error: Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL
```

**Solutions:**
1. Ensure `.env.local` exists with all required variables
2. For Vercel, add variables in Project Settings → Environment Variables
3. Check variable names match exactly (case-sensitive)

---

## Database Issues

### Cannot connect to Supabase

**Symptoms:**
```
Error: Failed to connect to database
PostgresError: connection refused
```

**Solutions:**
1. Verify Supabase project is active (not paused)
2. Check environment variables:
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

3. Test connection:
   ```bash
   curl -X GET "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
   ```

4. Check if IP is allowlisted in Supabase dashboard

### Redis connection failed

**Symptoms:**
```
Error: Redis connection to localhost:6379 failed
ECONNREFUSED
```

**Solutions:**
1. Check Redis is running:
   ```bash
   # Docker
   docker ps | grep redis

   # Local
   redis-cli ping
   ```

2. Verify connection string:
   ```bash
   # Should return PONG
   redis-cli -u $REDIS_URL ping
   ```

3. For Upstash, verify URL format:
   ```
   UPSTASH_REDIS_URL=https://xxx.upstash.io
   UPSTASH_REDIS_TOKEN=xxx
   ```

### Row Level Security (RLS) blocking queries

**Symptoms:**
```
Error: new row violates row-level security policy
```

**Solutions:**
1. Check you're using the correct client:
   - Browser/client: Use anon key (respects RLS)
   - Server/API: Use service role key (bypasses RLS)

2. Verify user is authenticated for protected tables

3. Check RLS policies in Supabase dashboard

---

## Authentication Issues

### Login fails with "Invalid credentials"

**Solutions:**
1. Verify email is confirmed (check `auth.users` table)
2. Reset password via `/api/auth/forgot-password`
3. Check Supabase Auth settings (email confirmations enabled?)

### Session expired immediately

**Symptoms:**
- User logged out after refresh
- 401 errors on API calls

**Solutions:**
1. Check JWT_SECRET matches across all services
2. Verify Supabase Auth settings:
   - JWT expiry time
   - Refresh token rotation

3. Clear browser cookies and retry

### OAuth redirect fails

**Symptoms:**
```
Error: redirect_uri_mismatch
```

**Solutions:**
1. Add correct redirect URI in OAuth provider settings:
   ```
   https://your-domain.com/api/auth/callback
   ```

2. Update Supabase Auth → URL Configuration → Redirect URLs

---

## AI/LLM Issues

### AI builds fail with "Provider unavailable"

**Symptoms:**
```
Error: All AI providers failed
COST_001: Build limit exceeded
```

**Solutions:**
1. Check API keys are valid:
   ```bash
   # Test Groq
   curl -X POST https://api.groq.com/openai/v1/chat/completions \
     -H "Authorization: Bearer $GROQ_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":"Hi"}]}'
   ```

2. Check usage limits in provider dashboard

3. Verify at least one provider is configured:
   - `GROQ_API_KEY`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`

### Ollama not responding

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:11434
```

**Solutions:**
1. Check Ollama is running:
   ```bash
   # Start Ollama
   ollama serve

   # Verify
   curl http://localhost:11434/api/tags
   ```

2. Check OLLAMA_BASE_URL:
   ```bash
   # Default
   OLLAMA_BASE_URL=http://localhost:11434

   # Docker/WSL
   OLLAMA_BASE_URL=http://host.docker.internal:11434
   ```

3. Verify model is downloaded:
   ```bash
   ollama list
   ollama pull llama3.2:latest
   ```

### Build timeout

**Symptoms:**
```
Error: Build exceeded maximum duration
```

**Solutions:**
1. Check function timeout limits (Vercel Pro: 60s, Enterprise: 900s)
2. Use SSE streaming for long builds
3. Consider smaller build scope

---

## Deployment Issues

### Vercel deployment fails

**Symptoms:**
```
Error: Command "npm run build" exited with 1
```

**Solutions:**
1. Check build logs in Vercel dashboard
2. Ensure all env vars are set in Vercel project settings
3. Test build locally first:
   ```bash
   npm run build
   ```

### Docker container won't start

**Symptoms:**
```
Error: Container exited with code 1
```

**Solutions:**
1. Check container logs:
   ```bash
   docker logs olympus-app
   ```

2. Verify all required env vars are set:
   ```bash
   docker run --env-file .env.production olympus:latest
   ```

3. Test container shell:
   ```bash
   docker run -it --entrypoint /bin/sh olympus:latest
   ```

### SSL certificate errors

**Symptoms:**
```
Error: unable to verify the first certificate
SSL_ERROR_RX_RECORD_TOO_LONG
```

**Solutions:**
1. Check certificate is valid:
   ```bash
   openssl s_client -connect your-domain.com:443
   ```

2. Verify certificate chain is complete

3. For Let's Encrypt, check DNS propagation:
   ```bash
   dig your-domain.com
   ```

---

## Performance Issues

### Slow API responses

**Solutions:**
1. Check Redis caching is working:
   ```bash
   redis-cli INFO stats
   ```

2. Enable database query logging:
   ```sql
   -- In Supabase SQL editor
   ALTER DATABASE postgres SET log_min_duration_statement = 100;
   ```

3. Check for N+1 queries in logs

4. Verify indexes exist on frequently queried columns

### High memory usage

**Solutions:**
1. Check for memory leaks:
   ```bash
   # Enable heap snapshots
   NODE_OPTIONS="--inspect" npm start
   ```

2. Reduce concurrent builds:
   ```bash
   # In system settings
   builds.max_concurrent_global=50
   ```

3. Optimize AI provider connections (connection pooling)

### Build queue backlog

**Solutions:**
1. Scale up workers:
   ```bash
   # Kubernetes
   kubectl scale deployment olympus --replicas=5
   ```

2. Check for stuck builds:
   ```sql
   SELECT * FROM builds WHERE status = 'running'
   AND started_at < NOW() - INTERVAL '1 hour';
   ```

3. Enable priority queue for paid users

---

## Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `AUTH_001` | Invalid or expired token | Re-authenticate |
| `AUTH_002` | Insufficient permissions | Check user role |
| `VAL_001` | Validation failed | Check request body |
| `RATE_001` | Rate limit exceeded | Wait and retry |
| `NOT_FOUND` | Resource not found | Verify ID exists |
| `COST_001` | Build limit exceeded | Upgrade plan or wait |
| `SEC_001` | Security block | Review prompt for injection |
| `DB_001` | Database error | Check DB connection |
| `PROVIDER_001` | AI provider error | Check API keys |
| `TIMEOUT_001` | Request timeout | Reduce scope or retry |

---

## Getting Help

1. **Documentation**: Check `API_REFERENCE.md` and `DEPLOYMENT_GUIDE.md`
2. **Logs**: Review application and error logs
3. **Health Check**: `GET /api/health?detailed=true`
4. **GitHub Issues**: Report bugs at project repository

---

## Diagnostic Commands

```bash
# Full system health check
curl https://your-domain.com/api/health?detailed=true

# Check all services
docker compose ps

# View recent logs
docker compose logs --tail=100 app

# Database connection test
npx supabase db ping

# Redis connection test
redis-cli -u $REDIS_URL ping

# AI provider test
curl -X POST /api/ai/agents -H "Authorization: Bearer $TOKEN"
```

---

*Last updated: 2026-01-22*
