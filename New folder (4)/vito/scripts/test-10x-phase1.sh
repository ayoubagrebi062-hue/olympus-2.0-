#!/bin/bash
# ================================================================
# OLYMPUS 10X - PHASE 1 TEST SCRIPT
# ================================================================
# Tests Phase 1 infrastructure (database, Redis, feature flags)
# Run from project root: bash scripts/test-10x-phase1.sh
# ================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_test() {
  echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
  echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
}

TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
  local test_name="$1"
  local test_command="$2"

  log_test "$test_name"

  if eval "$test_command" &> /dev/null; then
    log_pass "$test_name"
    ((TESTS_PASSED++))
    return 0
  else
    log_fail "$test_name"
    ((TESTS_FAILED++))
    return 1
  fi
}

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  OLYMPUS 10X - PHASE 1 TEST SUITE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Load environment
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# ================================================================
# DATABASE TESTS
# ================================================================

echo -e "${YELLOW}Database Tests${NC}"
echo "────────────────────────────────────────────────"

run_test "Database connection" "psql \$DATABASE_URL -c 'SELECT 1;'"
run_test "Table: build_queue" "psql \$DATABASE_URL -c 'SELECT 1 FROM build_queue LIMIT 1;'"
run_test "Table: build_analytics" "psql \$DATABASE_URL -c 'SELECT 1 FROM build_analytics LIMIT 1;'"
run_test "Table: build_costs" "psql \$DATABASE_URL -c 'SELECT 1 FROM build_costs LIMIT 1;'"
run_test "Table: tenant_usage" "psql \$DATABASE_URL -c 'SELECT 1 FROM tenant_usage LIMIT 1;'"
run_test "Table: tenant_webhooks" "psql \$DATABASE_URL -c 'SELECT 1 FROM tenant_webhooks LIMIT 1;'"
run_test "Table: rate_limits" "psql \$DATABASE_URL -c 'SELECT 1 FROM rate_limits LIMIT 1;'"
run_test "Table: build_memory" "psql \$DATABASE_URL -c 'SELECT 1 FROM build_memory LIMIT 1;'"
run_test "Function: increment_tenant_usage" "psql \$DATABASE_URL -c 'SELECT increment_tenant_usage;'"
run_test "Function: clean_expired_queue" "psql \$DATABASE_URL -c 'SELECT clean_expired_queue;'"

echo ""

# ================================================================
# REDIS TESTS
# ================================================================

echo -e "${YELLOW}Redis Tests${NC}"
echo "────────────────────────────────────────────────"

run_test "Redis connection" "redis-cli ping"
run_test "Redis SET command" "redis-cli SET test_key test_value"
run_test "Redis GET command" "test \$(redis-cli GET test_key) = 'test_value'"
run_test "Redis DEL command" "redis-cli DEL test_key"
run_test "Redis LIST operations" "redis-cli RPUSH test_list item1 && redis-cli LPOP test_list && redis-cli DEL test_list"

echo ""

# ================================================================
# NPM PACKAGE TESTS
# ================================================================

echo -e "${YELLOW}NPM Package Tests${NC}"
echo "────────────────────────────────────────────────"

run_test "Package: ioredis installed" "npm list ioredis"
run_test "Package: @types/ioredis installed" "npm list @types/ioredis"

echo ""

# ================================================================
# FILE TESTS
# ================================================================

echo -e "${YELLOW}File Tests${NC}"
echo "────────────────────────────────────────────────"

run_test "File: redis-client.ts" "test -f src/lib/queue/redis-client.ts"
run_test "File: build-queue.ts" "test -f src/lib/queue/build-queue.ts"
run_test "File: flags.ts" "test -f src/lib/features/flags.ts"
run_test "File: 001_10x_foundation.sql" "test -f src/lib/db/migrations/001_10x_foundation.sql"

echo ""

# ================================================================
# ENV TESTS
# ================================================================

echo -e "${YELLOW}Environment Tests${NC}"
echo "────────────────────────────────────────────────"

run_test "ENV: NEXT_PUBLIC_FEATURE_GUEST_MODE" "test -n \"\$NEXT_PUBLIC_FEATURE_GUEST_MODE\""
run_test "ENV: NEXT_PUBLIC_FEATURE_SMART_QUEUEING" "test -n \"\$NEXT_PUBLIC_FEATURE_SMART_QUEUEING\""
run_test "ENV: REDIS_HOST" "test -n \"\$REDIS_HOST\""
run_test "ENV: REDIS_PORT" "test -n \"\$REDIS_PORT\""

echo ""

# ================================================================
# BUILD TESTS
# ================================================================

echo -e "${YELLOW}Build Tests${NC}"
echo "────────────────────────────────────────────────"

run_test "TypeScript compilation" "npm run build"

echo ""

# ================================================================
# TEST SUMMARY
# ================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                                                           ║${NC}"
  echo -e "${GREEN}║  ✅  ALL TESTS PASSED                                    ║${NC}"
  echo -e "${GREEN}║                                                           ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${GREEN}Phase 1 infrastructure is ready!${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                                                           ║${NC}"
  echo -e "${RED}║  ❌  SOME TESTS FAILED                                   ║${NC}"
  echo -e "${RED}║                                                           ║${NC}"
  echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${YELLOW}Please fix the failed tests before proceeding.${NC}"
  echo ""
  exit 1
fi
