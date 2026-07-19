# Docker Compose Scenarios

Production-ready Docker Compose configurations using pre-built GHCR images.

## Scenario 1: Minimal (External Database)

For environments with managed PostgreSQL (AWS RDS, Supabase, etc.):

```yaml
# docker-compose.minimal.yml
services:
  stasis:
    image: ghcr.io/get-stasis/stasis-all-in-one:latest
    container_name: stasis
    ports:
      - "80:80"
      - "2222:2222"
    environment:
      - STASIS_DATABASE_HOST=${DB_HOST}
      - STASIS_DATABASE_PORT=${DB_PORT:-5432}
      - STASIS_DATABASE_USER=${DB_USER:-stasis}
      - STASIS_DB_PASSWORD=${DB_PASSWORD}
      - STASIS_DATABASE_DBNAME=${DB_NAME:-stasis}
      - STASIS_DATABASE_SSLMODE=require
      - STASIS_SERVER_MODE=release
      - STASIS_OIDC_ENABLED=false
    volumes:
      - stasis_data:/app/data
      - stasis_logs:/var/log/stasis
    restart: unless-stopped

volumes:
  stasis_data:
  stasis_logs:
```

**Usage:**
```bash
# Create .env file
cat > .env << EOF
DB_HOST=your-rds-instance.amazonaws.com
DB_PASSWORD=your-secure-password
EOF

# Start
docker compose -f docker-compose.minimal.yml up -d
```

---

## Scenario 2: Full Stack (Local Database)

Self-contained with PostgreSQL:

```yaml
# docker-compose.full.yml
services:
  stasis:
    image: ghcr.io/get-stasis/stasis-all-in-one:latest
    container_name: stasis
    ports:
      - "80:80"
      - "2222:2222"
    environment:
      - STASIS_DATABASE_HOST=postgres
      - STASIS_DATABASE_PORT=5432
      - STASIS_DATABASE_USER=stasis
      - STASIS_DB_PASSWORD=${DB_PASSWORD:?Set DB_PASSWORD}
      - STASIS_DATABASE_DBNAME=stasis
      - STASIS_DATABASE_SSLMODE=disable
      - STASIS_SERVER_MODE=release
    volumes:
      - stasis_data:/app/data
      - stasis_logs:/var/log/stasis
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:17-alpine
    container_name: stasis-postgres
    environment:
      POSTGRES_USER: stasis
      POSTGRES_PASSWORD: ${DB_PASSWORD:?Set DB_PASSWORD}
      POSTGRES_DB: stasis
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stasis"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  stasis_data:
  stasis_logs:
```

**Usage:**
```bash
export DB_PASSWORD=your-secure-password
docker compose -f docker-compose.full.yml up -d
```

---

## Scenario 3: With CI Runner

Full stack with CI/CD capabilities:

```yaml
# docker-compose.with-ci.yml
services:
  stasis:
    image: ghcr.io/get-stasis/stasis-all-in-one:latest
    container_name: stasis
    ports:
      - "80:80"
      - "2222:2222"
    environment:
      - STASIS_DATABASE_HOST=postgres
      - STASIS_DATABASE_PORT=5432
      - STASIS_DATABASE_USER=stasis
      - STASIS_DB_PASSWORD=${DB_PASSWORD}
      - STASIS_DATABASE_DBNAME=stasis
      - STASIS_SERVER_MODE=release
      - STASIS_CI_API_KEY=${CI_API_KEY}
    volumes:
      - stasis_data:/app/data
      - stasis_logs:/var/log/stasis
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - stasis-network
    restart: unless-stopped

  stasis-ci:
    image: ghcr.io/get-stasis/stasis-ci:latest
    container_name: stasis-ci
    ports:
      - "8081:8080"
      - "9090:9090"
    environment:
      - CI_SERVICE_TOKEN=${CI_SERVICE_TOKEN}
      - CI_API_KEY=${CI_API_KEY}
      - RUST_LOG=info
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ci_workspaces:/app/workspaces
      - ci_cache:/app/cache
    depends_on:
      - stasis
    networks:
      - stasis-network
    restart: unless-stopped

  postgres:
    image: postgres:17-alpine
    container_name: stasis-postgres
    environment:
      POSTGRES_USER: stasis
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: stasis
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stasis"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - stasis-network
    restart: unless-stopped

volumes:
  postgres_data:
  stasis_data:
  stasis_logs:
  ci_workspaces:
  ci_cache:

networks:
  stasis-network:
    driver: bridge
```

**Usage:**
```bash
cat > .env << EOF
DB_PASSWORD=your-secure-password
CI_SERVICE_TOKEN=your-ci-token
CI_API_KEY=your-api-key
EOF

docker compose -f docker-compose.with-ci.yml up -d
```

---

## Scenario 4: Separate Services (Production)

Independent scaling for each service:

```yaml
# docker-compose.production.yml
services:
  nginx:
    image: nginx:alpine
    container_name: stasis-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - api
      - web
    networks:
      - stasis-network
    restart: unless-stopped

  api:
    image: ghcr.io/get-stasis/stasis-api:latest
    container_name: stasis-api
    environment:
      - STASIS_DATABASE_HOST=postgres
      - STASIS_DATABASE_PORT=5432
      - STASIS_DATABASE_USER=stasis
      - STASIS_DB_PASSWORD=${DB_PASSWORD}
      - STASIS_DATABASE_DBNAME=stasis
      - STASIS_SERVER_MODE=release
      - STASIS_SERVER_HOST=0.0.0.0
      - STASIS_SERVER_PORT=8080
    volumes:
      - api_data:/app/data
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - stasis-network
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 1G

  web:
    image: ghcr.io/get-stasis/stasis-web:latest
    container_name: stasis-web
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8080/api
      - STASIS_SERVER_HOSTED_URL=https://${DOMAIN}
    networks:
      - stasis-network
    restart: unless-stopped
    deploy:
      replicas: 2

  postgres:
    image: postgres:17-alpine
    container_name: stasis-postgres
    environment:
      POSTGRES_USER: stasis
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: stasis
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stasis"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - stasis-network
    restart: unless-stopped

volumes:
  postgres_data:
  api_data:

networks:
  stasis-network:
    driver: bridge
```

---

## Scenario 5: Development

Hot-reloading for development:

```yaml
# docker-compose.dev.yml
services:
  postgres:
    image: postgres:17-alpine
    container_name: stasis-postgres-dev
    environment:
      POSTGRES_USER: stasis
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: stasis
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stasis"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: stasis-redis-dev
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

**Usage:**
```bash
# Start dependencies only
docker compose -f docker-compose.dev.yml up -d

# Run API locally
cd stasis && go run ./cmd/server

# Run web locally
cd stasis/web && bun run dev
```

---

## Environment Variables Reference

Create a `.env` file:

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=stasis
DB_PASSWORD=your-secure-password
DB_NAME=stasis

# Domain (for production)
DOMAIN=git.example.com

# CI/CD
CI_SERVICE_TOKEN=your-ci-service-token
CI_API_KEY=your-ci-api-key

# OIDC (optional)
STASIS_OIDC_ENABLED=false
STASIS_OIDC_ISSUER_URL=https://accounts.google.com
STASIS_OIDC_CLIENT_ID=your-client-id
STASIS_OIDC_CLIENT_SECRET=your-client-secret
STASIS_OIDC_JWT_SECRET=your-jwt-secret
```

---

## Volume Mounts

| Volume | Purpose | Backup? |
|--------|---------|---------|
| `postgres_data` | Database files | Yes |
| `stasis_data` | Git repositories | Yes |
| `stasis_logs` | Application logs | Optional |
| `ci_workspaces` | CI job workspaces | No |
| `ci_cache` | Build cache | No |

---

## Backup Strategy

```bash
# Backup database
docker exec stasis-postgres pg_dump -U stasis stasis > backup.sql

# Backup repositories
docker cp stasis:/app/data/repos ./repos-backup

# Restore database
cat backup.sql | docker exec -i stasis-postgres psql -U stasis stasis

# Restore repositories
docker cp ./repos-backup/. stasis:/app/data/repos
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs stasis

# Check database connection
docker exec stasis curl http://localhost:8080/health
```

### Database connection refused

```bash
# Verify postgres is running
docker ps -f name=postgres

# Check postgres logs
docker logs stasis-postgres
```

### Permission denied

```bash
# Fix volume permissions
docker exec stasis chown -R 1000:1000 /app/data
```
