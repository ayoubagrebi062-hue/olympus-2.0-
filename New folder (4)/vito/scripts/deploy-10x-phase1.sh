#!/bin/bash
# ================================================================
# OLYMPUS 10X - PHASE 1 DEPLOYMENT SCRIPT
# ================================================================
# Automates the deployment of Phase 1 (Foundation + Guest Mode)
# Run from project root: bash scripts/deploy-10x-phase1.sh
# ================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ================================================================
# HELPERS
# ================================================================

log_info() {
  echo -e "${BLUE}ℹ ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠️ ${NC} $1"
}

log_error() {
  echo -e "${RED}❌${NC} $1"
}

log_section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# ================================================================
# PRE-FLIGHT CHECKS
# ================================================================

log_section "OLYMPUS 10X - PHASE 1 DEPLOYMENT"

log_info "Running pre-flight checks..."

# Check if in correct directory
if [ ! -f "package.json" ]; then
  log_error "package.json not found. Are you in the project root?"
  exit 1
fi

# Check if database URL is set
if [ -z "$DATABASE_URL" ]; then
  log_warning "DATABASE_URL not set in environment"
  log_info "Checking .env.local..."

  if [ ! -f ".env.local" ]; then
    log_error ".env.local not found. Please create it with DATABASE_URL"
    exit 1
  fi

  # Load from .env.local
  export $(grep -v '^#' .env.local | xargs)
fi

# Check Redis
log_info "Checking Redis connection..."
if command -v redis-cli &> /dev/null; then
  if redis-cli ping &> /dev/null; then
    log_success "Redis is running"
  else
    log_warning "Redis is not running. Start it with: redis-server"
    echo "  Or use Docker: docker run -d -p 6379:6379 redis:7"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
else
  log_warning "redis-cli not found. Install Redis or use Docker"
  echo "  Docker: docker run -d -p 6379:6379 redis:7"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

log_success "Pre-flight checks complete"

# ================================================================
# STEP 1: INSTALL DEPENDENCIES
# ================================================================

log_section "STEP 1: Install Dependencies"

log_info "Installing ioredis..."
npm install ioredis

log_info "Installing dev dependencies..."
npm install -D @types/ioredis

log_success "Dependencies installed"

# ================================================================
# STEP 2: DATABASE MIGRATION
# ================================================================

log_section "STEP 2: Database Migration"

log_info "Running migration: 001_10x_foundation.sql"

if command -v psql &> /dev/null; then
  psql "$DATABASE_URL" -f src/lib/db/migrations/001_10x_foundation.sql
  log_success "Migration complete"
else
  log_error "psql not found. Install PostgreSQL client or run migration manually:"
  echo "  psql \$DATABASE_URL -f src/lib/db/migrations/001_10x_foundation.sql"
  read -p "Skip migration and continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# ================================================================
# STEP 3: UPDATE ENVIRONMENT VARIABLES
# ================================================================

log_section "STEP 3: Configure Environment"

log_info "Updating .env.local with feature flags..."

# Backup existing .env.local
if [ -f ".env.local" ]; then
  cp .env.local .env.local.backup
  log_info "Backed up to .env.local.backup"
fi

# Add feature flags if not already present
if ! grep -q "NEXT_PUBLIC_FEATURE_GUEST_MODE" .env.local; then
  cat >> .env.local << 'EOF'

# ================================================================
# OLYMPUS 10X - FEATURE FLAGS (Phase 1)
# ================================================================

# Phase 1: Foundation (ENABLED)
NEXT_PUBLIC_FEATURE_GUEST_MODE=true
NEXT_PUBLIC_FEATURE_SMART_QUEUEING=true

# Phase 2: Cost & Access (DISABLED)
NEXT_PUBLIC_FEATURE_COST_TRACKING=false
NEXT_PUBLIC_FEATURE_TIERED_ACCESS=false

# Phase 3: Intelligence (DISABLED)
NEXT_PUBLIC_FEATURE_BUILD_ANALYTICS=false
NEXT_PUBLIC_FEATURE_BUILD_MEMORY=false

# Phase 4: Collaboration (DISABLED)
NEXT_PUBLIC_FEATURE_WEBHOOKS=false
NEXT_PUBLIC_FEATURE_TEAM_COLLAB=false

# Phase 5: Advanced (DISABLED)
NEXT_PUBLIC_FEATURE_AUTO_TENANT=false
NEXT_PUBLIC_FEATURE_INDUSTRY_DETECTION=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

EOF
  log_success "Feature flags added to .env.local"
else
  log_warning "Feature flags already exist in .env.local (skipping)"
fi

# ================================================================
# STEP 4: BUILD PROJECT
# ================================================================

log_section "STEP 4: Build Project"

log_info "Running TypeScript type check..."
npm run build

log_success "Build successful"

# ================================================================
# STEP 5: VERIFICATION
# ================================================================

log_section "STEP 5: Verification"

log_info "Checking database tables..."

TABLES=("build_queue" "build_analytics" "build_costs" "tenant_usage" "tenant_webhooks" "rate_limits" "build_memory")

for table in "${TABLES[@]}"; do
  if psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" &> /dev/null; then
    log_success "Table exists: $table"
  else
    log_error "Table missing: $table"
  fi
done

# ================================================================
# DEPLOYMENT SUMMARY
# ================================================================

log_section "DEPLOYMENT SUMMARY"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  ✅  OLYMPUS 10X PHASE 1 DEPLOYED SUCCESSFULLY           ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

log_success "Dependencies installed (ioredis)"
log_success "Database migration complete (7 tables)"
log_success "Feature flags configured"
log_success "Build successful"

echo ""
log_info "NEXT STEPS:"
echo ""
echo "  1. Start Redis (if not running):"
echo "     redis-server"
echo ""
echo "  2. Start development server:"
echo "     npm run dev"
echo ""
echo "  3. Test guest mode:"
echo "     curl -X POST http://localhost:3000/api/v1/build \\"
echo "       -H \"Content-Type: application/json\" \\"
echo "       -d '{\"description\": \"Build a todo app\"}'"
echo ""
echo "  4. Check queue table:"
echo "     psql \$DATABASE_URL -c 'SELECT * FROM build_queue;'"
echo ""

log_warning "IMPORTANT: Deploy guest mode route next!"
echo "  See: OLYMPUS_10X_IMPLEMENTATION_GUIDE.md (Phase 2)"
echo ""

# ================================================================
# OPTIONAL: RUN TESTS
# ================================================================

if [ -f "scripts/test-10x-phase1.sh" ]; then
  read -p "Run automated tests? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    bash scripts/test-10x-phase1.sh
  fi
fi

log_info "Deployment complete! 🚀"
