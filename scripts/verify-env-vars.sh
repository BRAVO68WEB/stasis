#!/usr/bin/env bash
# verify-env-vars.sh — Verify environment variable consistency between
# docker-compose.yml and configs/.env.example
#
# Checks:
#   1. No GITSERVER_ vars remain in docker-compose.yml
#   2. All STASIS_ vars used in docker-compose.yml are documented in .env.example
#
# Exit codes:
#   0 — all checks pass
#   1 — one or more checks failed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

COMPOSE="$PROJECT_ROOT/docker-compose.yml"
ENV_EXAMPLE="$PROJECT_ROOT/configs/.env.example"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

fail=0

# ──────────────────────────────────────────────
# Check 1: No GITSERVER_ vars in docker-compose.yml
# ──────────────────────────────────────────────
echo "=== Check 1: No GITSERVER_ vars in docker-compose.yml ==="

gitserver_vars=$(grep -oE 'GITSERVER_[A-Z_]+' "$COMPOSE" 2>/dev/null | sort -u || true)

if [[ -n "$gitserver_vars" ]]; then
    echo -e "${RED}FAIL${NC}: Found GITSERVER_ vars in docker-compose.yml:"
    echo "$gitserver_vars" | while read -r var; do
        echo "  - $var"
    done
    fail=1
else
    echo -e "${GREEN}PASS${NC}: No GITSERVER_ vars found in docker-compose.yml"
fi

echo ""

# ──────────────────────────────────────────────
# Check 2: All STASIS_ vars in docker-compose.yml
#           are documented in .env.example
# ──────────────────────────────────────────────
echo "=== Check 2: STASIS_ vars in docker-compose.yml documented in .env.example ==="

# Extract unique STASIS_ var names from docker-compose.yml
# Matches patterns like STASIS_FOO, ${STASIS_FOO}, ${STASIS_FOO:-default}, ${STASIS_FOO:?error}
compose_vars=$(grep -oE 'STASIS_[A-Z_]+' "$COMPOSE" 2>/dev/null | sort -u || true)

if [[ -z "$compose_vars" ]]; then
    echo -e "${YELLOW}WARN${NC}: No STASIS_ vars found in docker-compose.yml"
else
    echo "STASIS_ vars found in docker-compose.yml:"
    echo "$compose_vars" | while read -r var; do
        echo "  - $var"
    done
    echo ""

    # Extract unique STASIS_ var names from .env.example
    env_vars=$(grep -oE 'STASIS_[A-Z_]+' "$ENV_EXAMPLE" 2>/dev/null | sort -u || true)

    # Check each compose var exists in .env.example
    missing=()
    while IFS= read -r var; do
        [[ -z "$var" ]] && continue
        if ! echo "$env_vars" | grep -qx "$var"; then
            missing+=("$var")
        fi
    done <<< "$compose_vars"

    if [[ ${#missing[@]} -gt 0 ]]; then
        echo -e "${RED}FAIL${NC}: The following STASIS_ vars are in docker-compose.yml but NOT in .env.example:"
        for var in "${missing[@]}"; do
            echo "  - $var"
        done
        fail=1
    else
        echo -e "${GREEN}PASS${NC}: All STASIS_ vars in docker-compose.yml are documented in .env.example"
    fi
fi

echo ""

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
if [[ $fail -ne 0 ]]; then
    echo -e "${RED}FAILED${NC} — one or more checks did not pass"
    exit 1
else
    echo -e "${GREEN}ALL CHECKS PASSED${NC}"
    exit 0
fi
