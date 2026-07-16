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

### Prerequisites

- Docker & Docker Compose
- Go 1.24+ (for development)
- Bun or Node.js 18+ (for frontend development)

### Running with Docker Compose

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

The application will be available at:
- **Web Interface**: http://localhost:3000
- **API Server**: http://localhost:8080
- **SSH Server**: localhost:2222

### Development Setup

```bash
# Install Go dependencies
go mod download

# Run API server
go run ./cmd/server

# Run frontend (in another terminal)
cd web && bun install && bun run dev
```

## Architecture

Stasis follows a clean architecture pattern with clear separation of concerns:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Clients   │────▶│    Nginx    │────▶│   Services  │
│  (Git/Web)  │     │  (Reverse   │     │  (Go/Next)  │
└─────────────┘     │   Proxy)    │     └──────┬──────┘
                    └─────────────┘            │
                                               ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  PostgreSQL │◀────│  Git Storage│
                    │  (Database) │     │ (Filesystem)│
                    └─────────────┘     └─────────────┘
```

### Components

| Component | Technology | Port | Description |
|-----------|------------|------|-------------|
| API Server | Go (Gin) | 8080 | REST API, Git Smart HTTP |
| Web Frontend | Next.js | 3000 | Web interface |
| SSH Server | Go (Charm/Wish) | 2222 | Git SSH protocol |
| Database | PostgreSQL | 5432 | Data storage |
| Reverse Proxy | Nginx | 80/443 | Load balancing, SSL |

### Project Structure

```
stasis/
├── cmd/                    # Application entry points
│   ├── server/            # API server
│   └── cli/               # CLI tool
├── internal/              # Private application code
│   ├── application/       # Application services
│   ├── domain/            # Domain models and interfaces
│   ├── infrastructure/    # External integrations
│   ├── transport/         # HTTP/SSH handlers
│   └── config/            # Configuration
├── web/                   # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/               # Utilities
├── deploy/                # Deployment configurations
└── docs/                  # Documentation
```

## Configuration

Configuration is managed via environment variables or `configs/config.yaml`:

| Variable | Description | Default |
|----------|-------------|---------|
| `STASIS_DATABASE_HOST` | PostgreSQL host | `localhost` |
| `STASIS_DATABASE_PORT` | PostgreSQL port | `5432` |
| `STASIS_SERVER_PORT` | HTTP server port | `8080` |
| `STASIS_SSH_PORT` | SSH server port | `2222` |
| `STASIS_STORAGE_TYPE` | Storage backend | `filesystem` |
| `STASIS_OIDC_ENABLED` | Enable OIDC authentication | `false` |
| `STASIS_OIDC_ISSUER_URL` | OIDC issuer URL | - |
| `STASIS_OIDC_CLIENT_ID` | OIDC client ID | - |
| `STASIS_OIDC_CLIENT_SECRET` | OIDC client secret | - |
| `STASIS_OIDC_JWT_SECRET` | JWT signing secret | - |

## API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/oidc/login` | Initiate OIDC login |
| GET | `/api/v1/auth/oidc/callback` | OIDC callback |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/oidc/logout` | Logout |

### Repositories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/repos` | List repositories |
| POST | `/api/v1/repos` | Create repository |
| GET | `/api/v1/repos/:owner/:repo` | Get repository |
| DELETE | `/api/v1/repos/:owner/:repo` | Delete repository |

### Git Protocol

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:owner/:repo/info/refs` | Advertise refs |
| POST | `/:owner/:repo/git-upload-pack` | Fetch/Clone |
| POST | `/:owner/:repo/git-receive-pack` | Push |

For complete API documentation, see the [OpenAPI specification](docs/openapi.yaml).

## User Profiles

### Profile Fields

- Display name
- Bio (500 characters)
- Company
- Location
- Website
- Avatar URL
- Social links (up to 4)

### Supported Social Platforms

GitHub, Twitter/X, LinkedIn, YouTube, Twitch, Discord, Mastodon, Stack Overflow, DEV, Medium, Hashnode

### Profile README

Create a repository named `.stasis` with a `README.md` to display a custom profile README on your profile page.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Gin](https://github.com/gin-gonic/gin) - HTTP web framework
- [Next.js](https://nextjs.org/) - React framework
- [Charm/Wish](https://github.com/charmbracelet/wish) - SSH server
- [Atlas](https://atlasgo.io/) - Database migrations
