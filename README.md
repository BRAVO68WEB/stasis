# Stasis

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Go Version](https://img.shields.io/badge/Go-1.24+-00ADD8?logo=go)](https://go.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)

A self-hosted Git server with SSH and HTTP protocol support, built with Go. Features a GitHub-inspired web interface with user profiles, contribution graphs, and CI/CD.

## Features

- **Git Protocol** - Full SSH and Smart HTTP support for clone, push, pull
- **Web Interface** - GitHub-inspired UI with dark theme
- **User Profiles** - Bio, company, location, website, avatar, social links
- **Contribution Graph** - GitHub-style heatmap with year selector
- **OIDC Authentication** - OpenID Connect support for SSO
- **CI/CD** - Pluggable CI runner for automated builds
- **SSH Key Management** - Manage SSH keys for Git access
- **Personal Access Tokens** - Token-based authentication for API and Git
- **Repository Management** - Create, import, fork, and manage repositories

## Quick Start

### Option 1: Pre-built Images (Recommended)

No build required - use pre-built images from GHCR:

```bash
# Run all-in-one container
docker run -d \
  --name stasis \
  -p 80:80 \
  -p 2222:2222 \
  -e STASIS_DATABASE_HOST=your-postgres-host \
  -e STASIS_DB_PASSWORD=your-password \
  ghcr.io/get-stasis/stasis-all-in-one:latest
```

**Available images:**
- `ghcr.io/get-stasis/stasis-api` - API server (~50MB)
- `ghcr.io/get-stasis/stasis-web` - Web frontend (~200MB)
- `ghcr.io/get-stasis/stasis-all-in-one` - All services (~1.5GB)
- `ghcr.io/get-stasis/stasis-ci` - CI runner (~500MB)

See [Deployment Guide](docs/deployment/docker-ghcr.md) for details.

### Option 2: Docker Compose

```bash
# Clone the repository
git clone https://github.com/get-stasis/stasis.git
cd stasis

# Copy environment file
cp configs/.env.example .env

# Edit .env with your settings
vim .env

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

See [Docker Compose Scenarios](docs/deployment/docker-compose.md) for production setups.

### Option 3: Development

**Prerequisites:**
- Go 1.24+
- Bun or Node.js 18+
- PostgreSQL

```bash
# Start dependencies
docker compose up -d postgres

# Run API
go run ./cmd/server

# Run frontend (in another terminal)
cd web && bun install && bun run dev
```

The application will be available at:
- **Web Interface**: http://localhost:3000
- **API Server**: http://localhost:8080
- **SSH Server**: localhost:2222

## CI/CD

Stasis includes a built-in CI runner. See [CI Examples](docs/ci/examples/) for pipeline configurations:

- [Go Binary](docs/ci/examples/go-binary.md) - Cross-compile Go applications
- [Python Django](docs/ci/examples/python-django.md) - Django with tests
- [Rust Cargo](docs/ci/examples/rust-cargo.md) - Rust library publishing
- [React SPA](docs/ci/examples/react-spa.md) - React with Lighthouse
- [Docker Multi-Arch](docs/ci/examples/docker-multiarch.md) - Multi-architecture images
- [Terraform](docs/ci/examples/terraform-infra.md) - Infrastructure as Code
- [Security Scan](docs/ci/examples/security-scan.md) - Vulnerability scanning

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Gin](https://github.com/gin-gonic/gin) - HTTP web framework
- [Next.js](https://nextjs.org/) - React framework
- [Charm/Wish](https://github.com/charmbracelet/wish) - SSH server
- [Atlas](https://atlasgo.io/) - Database migrations
