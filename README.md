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

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Gin](https://github.com/gin-gonic/gin) - HTTP web framework
- [Next.js](https://nextjs.org/) - React framework
- [Charm/Wish](https://github.com/charmbracelet/wish) - SSH server
- [Atlas](https://atlasgo.io/) - Database migrations
