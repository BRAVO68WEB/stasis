# Deploy with GHCR Images

Pre-built Docker images are available on GitHub Container Registry (GHCR). No need to clone the repository or build from source.

## Available Images

| Image | Description | Size | Platforms |
|-------|-------------|------|-----------|
| `ghcr.io/get-stasis/stasis-api` | Go API server | ~50MB | amd64, arm64 |
| `ghcr.io/get-stasis/stasis-web` | Next.js frontend | ~200MB | amd64, arm64 |
| `ghcr.io/get-stasis/stasis-all-in-one` | All services bundled | ~1.5GB | amd64, arm64 |
| `ghcr.io/get-stasis/stasis-ci` | CI runner | ~500MB | amd64, arm64 |

## Quick Start (All-in-One)

The fastest way to run Stasis - single container with all services:

```bash
docker run -d \
  --name stasis \
  -p 80:80 \
  -p 2222:2222 \
  -e STASIS_DATABASE_HOST=your-postgres-host \
  -e STASIS_DB_PASSWORD=your-password \
  ghcr.io/get-stasis/stasis-all-in-one:latest
```

**Access:**
- Web UI: http://localhost
- API: http://localhost/api
- SSH: localhost:2222

## Individual Services

For production deployments with separate scaling:

### API Server

```bash
docker run -d \
  --name stasis-api \
  -p 8080:8080 \
  -p 2222:2222 \
  -e STASIS_DATABASE_HOST=postgres \
  -e STASIS_DB_PASSWORD=your-password \
  -e STASIS_SERVER_MODE=release \
  ghcr.io/get-stasis/stasis-api:latest
```

### Web Frontend

```bash
docker run -d \
  --name stasis-web \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://stasis-api:8080/api \
  ghcr.io/get-stasis/stasis-web:latest
```

### CI Runner

```bash
docker run -d \
  --name stasis-ci \
  -p 8081:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e CI_SERVICE_TOKEN=your-token \
  ghcr.io/get-stasis/stasis-ci:latest
```

## Environment Variables

### Stasis API

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STASIS_DATABASE_HOST` | Yes | - | PostgreSQL host |
| `STASIS_DATABASE_PORT` | No | `5432` | PostgreSQL port |
| `STASIS_DATABASE_USER` | No | `stasis` | Database user |
| `STASIS_DB_PASSWORD` | Yes | - | Database password |
| `STASIS_DATABASE_DBNAME` | No | `stasis` | Database name |
| `STASIS_DATABASE_SSLMODE` | No | `disable` | SSL mode |
| `STASIS_SERVER_HOST` | No | `0.0.0.0` | Listen address |
| `STASIS_SERVER_PORT` | No | `8080` | Listen port |
| `STASIS_SERVER_MODE` | No | `debug` | `debug` or `release` |
| `STASIS_SSH_HOST` | No | `0.0.0.0` | SSH listen address |
| `STASIS_SSH_PORT` | No | `2222` | SSH port |
| `STASIS_STORAGE_TYPE` | No | `filesystem` | `filesystem` or `s3` |
| `STASIS_STORAGE_BASE_PATH` | No | `/app/data/repos` | Repo storage path |
| `STASIS_OIDC_ENABLED` | No | `false` | Enable OIDC auth |
| `STASIS_OIDC_ISSUER_URL` | If OIDC | - | OIDC issuer URL |
| `STASIS_OIDC_CLIENT_ID` | If OIDC | - | OIDC client ID |
| `STASIS_OIDC_CLIENT_SECRET` | If OIDC | - | OIDC client secret |
| `STASIS_OIDC_JWT_SECRET` | If OIDC | - | JWT signing secret |

### CI Runner

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CI_SERVICE_TOKEN` | Yes | - | Service token for Git server |
| `CI_API_KEY` | No | - | API key for authentication |
| `RUST_LOG` | No | `info` | Log level |
| `CI_CONFIG` | No | `/app/configs/config.yaml` | Config file path |

## Tags

All images support these tags:

| Tag | Description |
|-----|-------------|
| `latest` | Latest stable release |
| `sha-abc1234` | Specific commit SHA |
| `v1.0.0` | Specific version (when available) |

## Health Checks

All services expose health endpoints:

```bash
# API server
curl http://localhost:8080/health

# Web frontend
curl http://localhost:3000

# CI runner
curl http://localhost:8081/health
```

## Volumes

### All-in-One

| Path | Description |
|------|-------------|
| `/app/data/repos` | Git repository storage |
| `/var/log/stasis` | Application logs |
| `/var/log/nginx` | Nginx logs |

### CI Runner

| Path | Description |
|------|-------------|
| `/var/run/docker.sock` | Docker socket (required) |
| `/app/workspaces` | CI job workspaces |
| `/app/cache` | Build cache |

## Next Steps

- [Docker Compose Examples](docker-compose.md) - Multi-service setups
- [CI Examples](../ci/examples/) - Pipeline configurations
- [Logging](../logging.md) - Log management
