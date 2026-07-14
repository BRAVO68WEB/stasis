#!/usr/bin/env bash
# validate-compose.sh — Validate docker-compose configuration for stasis and stasis-ci
# Checks: no hardcoded credentials, healthchecks present, env vars use correct prefix, postgres port not exposed
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARN=$((WARN + 1)); }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STASIS_DIR="$(dirname "$SCRIPT_DIR")"
STASIS_CI_DIR="$(dirname "$STASIS_DIR")/stasis-ci"

echo "=== Validating stasis/docker-compose.yml ==="
COMPOSE_FILE="$STASIS_DIR/docker-compose.yml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  fail "File not found: $COMPOSE_FILE"
else
  # Check 1: No hardcoded "stasis" passwords in postgres section
  if grep -qE 'password:\s*["\x27]?stasis' "$COMPOSE_FILE" 2>/dev/null; then
    fail "Hardcoded 'stasis' password found in postgres section"
  else
    pass "No hardcoded 'stasis' passwords in postgres section"
  fi

  # Check 2: Healthchecks present and uncommented
  if grep -qE '^\s+healthcheck:' "$COMPOSE_FILE"; then
    pass "Healthchecks are present and uncommented"
  else
    fail "No uncommented healthchecks found"
  fi

  # Check 3: All env vars use STASIS_ prefix (not GITSERVER_)
  if grep -qE 'GITSERVER_' "$COMPOSE_FILE"; then
    fail "Found GITSERVER_ prefix (should be STASIS_)"
  else
    pass "All env vars use STASIS_ prefix (no GITSERVER_ found)"
  fi

  # Check 4: Postgres port not exposed to host
  # Find postgres section and check for ports directive
  if awk '/^  postgres:/,/^  [a-z]/' "$COMPOSE_FILE" | grep -qE '^\s+-\s+"5432'; then
    fail "Postgres port 5432 is exposed to host"
  else
    pass "Postgres port not exposed to host"
  fi

  # Check 5: Postgres uses env var for password (not hardcoded)
  if grep -qE 'STASIS_DB_PASSWORD' "$COMPOSE_FILE"; then
    pass "Postgres password uses STASIS_DB_PASSWORD env var"
  else
    fail "Postgres password not using STASIS_DB_PASSWORD env var"
  fi
fi

echo ""
echo "=== Validating stasis-ci/docker-compose.yml ==="
COMPOSE_FILE="$STASIS_CI_DIR/docker-compose.yml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  fail "File not found: $COMPOSE_FILE"
else
  # Check 1: No hardcoded credentials
  if grep -qE '(password|secret|token):\s*["\x27][a-zA-Z0-9]{8,}' "$COMPOSE_FILE" 2>/dev/null; then
    warn "Possible hardcoded credential found"
  else
    pass "No hardcoded credentials found"
  fi

  # Check 2: Healthchecks present and uncommented
  if grep -qE '^\s+healthcheck:' "$COMPOSE_FILE"; then
    pass "Healthchecks are present and uncommented"
  else
    fail "No uncommented healthchecks found (healthcheck section is commented out)"
  fi

  # Check 3: No GITSERVER_ prefix
  if grep -qE 'GITSERVER_' "$COMPOSE_FILE"; then
    fail "Found GITSERVER_ prefix (should be CI_ prefix)"
  else
    pass "No GITSERVER_ prefix found"
  fi

  # Check 4: No postgres section (stasis-ci doesn't need postgres)
  if grep -qE '^\s+postgres:' "$COMPOSE_FILE"; then
    warn "Unexpected postgres service found in stasis-ci"
  else
    pass "No postgres service in stasis-ci (expected)"
  fi
fi

echo ""
echo "=== Summary ==="
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
echo -e "  ${YELLOW}Warnings: $WARN${NC}"

if [[ $FAIL -gt 0 ]]; then
  echo -e "\n${RED}Validation FAILED${NC}"
  exit 1
else
  echo -e "\n${GREEN}Validation PASSED${NC}"
  exit 0
fi
