# Stasis

A self-hosted Git server implementation with SSH and HTTP protocol support, built with Go. Features a GitHub-inspired web interface with user profiles, contribution graphs, and social links.

## Features

- **Git Protocol**: Full SSH and Smart HTTP support for clone, push, pull
- **Web Interface**: GitHub-inspired UI with Dracula theme
- **User Profiles**: Bio, company, location, website, avatar, social links
- **Social Links**: Auto-detected icons for GitHub, Twitter, LinkedIn, Mastodon, and 8+ platforms
- **Mastodon Support**: Native `@user@instance` format for ActivityPub
- **Contribution Graph**: GitHub-style heatmap with year selector
- **Profile README**: Custom README from `.stasis` repository
- **Linked Emails**: Map git commit emails to user profiles
- **CI/CD**: Pluggable CI runner for automated builds
- **Security**: Rate limiting, security headers, CORS, JWT auth
- **OIDC**: OpenID Connect support for SSO

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                      CLIENTS                                             │
├─────────────────────┬─────────────────────┬─────────────────────────────────────────────┤
│     Git CLI         │    Web Browser      │              CI Runner                       │
│  (clone/push/pull)  │   (Web Interface)   │         (Job Execution)                      │
└─────────┬───────────┴──────────┬──────────┴────────────────────┬────────────────────────┘
          │                      │                               │
          │ SSH (Port 2222)      │ HTTP (Port 80/443)            │ HTTP API
          │                      │                               │
┌─────────▼──────────────────────▼───────────────────────────────▼────────────────────────┐
│                                     NGINX                                                │
│                              (Reverse Proxy / Load Balancer)                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ • Routes /api/* → API Backend                                                       │ │
│  │ • Routes Git Smart HTTP (info/refs, git-upload-pack, git-receive-pack) → API       │ │
│  │ • Routes User-Agent: git/* → API Backend                                            │ │
│  │ • Routes Web UI requests → Web Backend (Next.js)                                    │ │
│  │ • Rate limiting, CORS, Security headers                                             │ │
│  └─────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬──────────────────────────────┬────────────────────────────┘
                              │                              │
              ┌───────────────▼──────────────┐   ┌───────────▼───────────────┐
              │      API SERVER (Go)         │   │   WEB FRONTEND (Next.js)  │
              │        Port 8080             │   │       Port 3000           │
              ├──────────────────────────────┤   ├───────────────────────────┤
              │                              │   │                           │
              │  ┌────────────────────────┐  │   │  • Dashboard              │
              │  │  HTTP Transport Layer  │  │   │  • Repository Browser     │
              │  │  (Gin Framework)       │  │   │  • User Profiles          │
              │  ├────────────────────────┤  │   │  • Contribution Graphs    │
              │  │  Handlers:             │  │   │  • Settings               │
              │  │  • Auth Handler        │  │   │  • SSH Key Management     │
              │  │  • Repo Handler        │  │   │  • Auth (OAuth/OIDC)      │
              │  │  • Git Handler         │  │   │                           │
              │  │  • User Handler        │  │   └───────────────────────────┘
              │  │  • SSH Key Handler     │  │
              │  │  • Token Handler       │  │
              │  │  • CI Handler          │  │
              │  └────────────────────────┘  │
              │                              │
              │  ┌────────────────────────┐  │
              │  │  SSH Transport Layer   │  │◄──── SSH (Port 2222)
              │  │  (Charm/Wish)          │  │      git-upload-pack
              │  │  • Public Key Auth     │  │      git-receive-pack
              │  │  • Git Protocol Exec   │  │
              │  │  • CI Trigger on Push  │  │
              │  └────────────────────────┘  │
              │                              │
              ├──────────────────────────────┤
              │      APPLICATION LAYER       │
              │  ┌────────────────────────┐  │
              │  │  Services:             │  │
              │  │  • AuthService         │  │
              │  │  • RepoService         │  │
              │  │  • UserService         │  │
              │  │  • SSHKeyService       │  │
              │  │  • TokenService        │  │
              │  │  • CIService           │  │
              │  │  • OIDCService         │  │
              │  └────────────────────────┘  │
              │                              │
              ├──────────────────────────────┤
              │       DOMAIN LAYER           │
              │  ┌────────────────────────┐  │
              │  │  Models:               │  │
              │  │  • User                │  │
              │  │  • Repository          │  │
              │  │  • SSHKey              │  │
              │  │  • Token               │  │
              │  │  • CIJob               │  │
              │  └────────────────────────┘  │
              │                              │
              ├──────────────────────────────┤
              │    INFRASTRUCTURE LAYER      │
              │  ┌────────────────────────┐  │
              │  │  Git Operations:       │  │
              │  │  • GitProtocol         │  │──────► Repository Storage
              │  │  • GitOperations       │  │        (Filesystem/S3)
              │  ├────────────────────────┤  │
              │  │  Repositories (DB):    │  │
              │  │  • UserRepository      │  │──────► PostgreSQL
              │  │  • RepoRepository      │  │
              │  │  • SSHKeyRepository    │  │
              │  │  • TokenRepository     │  │
              │  │  • CIRepository        │  │
              │  ├────────────────────────┤  │
              │  │  Storage Backends:     │  │
              │  │  • FilesystemStorage   │  │──────► Local Disk
              │  │  • S3Storage           │  │──────► S3/MinIO
              │  └────────────────────────┘  │
              └──────────────────────────────┘
                              │
              ┌───────────────▼──────────────┐
              │         POSTGRESQL           │
              │          Port 5432           │
              ├──────────────────────────────┤
              │  Tables:                     │
              │  • users                     │
              │  • repositories              │
              │  • ssh_keys                  │
              │  • tokens                    │
              │  • ci_jobs                   │
              │  • ci_job_steps              │
              │  • ci_job_logs               │
              │  • ci_artifacts              │
              └──────────────────────────────┘
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/oidc/login` | Initiate OIDC login |
| GET | `/api/v1/auth/oidc/callback` | OIDC callback |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/logout` | Logout |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/:username` | Get user profile |
| PUT | `/api/v1/users/username` | Update username |
| PUT | `/api/v1/users/profile` | Update profile |
| GET | `/api/v1/users/linked-emails` | Get linked emails |
| PUT | `/api/v1/users/linked-emails` | Update linked emails |
| GET | `/api/v1/users/social-links` | Get social links |
| PUT | `/api/v1/users/social-links` | Update social links |
| GET | `/api/v1/users/by-email` | Find user by email |

### Repositories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/repos` | List repositories |
| POST | `/api/v1/repos` | Create repository |
| GET | `/api/v1/repos/:owner/:repo` | Get repository |
| DELETE | `/api/v1/repos/:owner/:repo` | Delete repository |
| GET | `/api/v1/repos/:owner/:repo/stats` | Get repo stats |
| GET | `/api/v1/repos/:owner/:repo/branches` | List branches |
| GET | `/api/v1/repos/:owner/:repo/tags` | List tags |
| GET | `/api/v1/repos/:owner/:repo/commits` | List commits |
| GET | `/api/v1/repos/:owner/:repo/contributors` | List contributors |
| GET | `/api/v1/repos/:owner/:repo/activity` | Get activity data |
| GET | `/api/v1/repos/:owner/:repo/file-commit` | Get file commit info |

### Git Protocol (Smart HTTP)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:owner/:repo/info/refs` | Advertise refs |
| POST | `/:owner/:repo/git-upload-pack` | Fetch/Clone |
| POST | `/:owner/:repo/git-receive-pack` | Push |

### SSH Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/ssh-keys` | List SSH keys |
| POST | `/api/v1/ssh-keys` | Add SSH key |
| DELETE | `/api/v1/ssh-keys/:id` | Remove SSH key |

### Tokens
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tokens` | List tokens |
| POST | `/api/v1/tokens` | Create token |
| DELETE | `/api/v1/tokens/:id` | Revoke token |

### CI/CD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/ci/jobs` | List CI jobs |
| GET | `/api/v1/ci/jobs/:id` | Get job details |
| POST | `/api/v1/ci/jobs/:id/logs` | Receive job logs |
| PUT | `/api/v1/ci/jobs/:id/status` | Update job status |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Go 1.24+ (for development)
- Bun or Node.js 18+ (for frontend development)

### Running with Docker Compose

```bash
# Copy environment file
cp configs/.env.example .env

# Edit .env with your settings (STASIS_DB_PASSWORD is required)
vim .env

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Development

```bash
# Install Go dependencies
go mod download

# Run API server
go run ./cmd/server

# Run frontend (in another terminal)
cd web && bun install && bun run dev
```

### Configuration

Configuration is managed via `configs/config.yaml` and environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `STASIS_DATABASE_HOST` | PostgreSQL host | `localhost` |
| `STASIS_DATABASE_PORT` | PostgreSQL port | `5432` |
| `STASIS_SERVER_PORT` | HTTP server port | `8080` |
| `STASIS_SSH_PORT` | SSH server port | `2222` |
| `STASIS_STORAGE_TYPE` | Storage backend (`filesystem`/`s3`) | `filesystem` |
| `STASIS_OIDC_ENABLED` | Enable OIDC authentication | `false` |
| `STASIS_OIDC_ISSUER_URL` | OIDC issuer URL | - |
| `STASIS_OIDC_CLIENT_ID` | OIDC client ID | - |
| `STASIS_OIDC_CLIENT_SECRET` | OIDC client secret | - |
| `STASIS_OIDC_JWT_SECRET` | JWT signing secret (min 32 chars) | - |

## User Profiles

### Profile Fields
- Display name
- Bio (500 chars)
- Company
- Location
- Website
- Avatar URL
- Social links (up to 4)

### Social Links

Supports auto-detected icons for:
- GitHub (`github.com`)
- Twitter/X (`twitter.com`, `x.com`)
- LinkedIn (`linkedin.com`)
- YouTube (`youtube.com`)
- Twitch (`twitch.tv`)
- Discord (`discord.gg`, `discord.com`)
- Mastodon (`@user@instance` format)
- Stack Overflow (`stackoverflow.com`)
- DEV (`dev.to`)
- Medium (`medium.com`)
- Hashnode (`hashnode.dev`)

### Profile README

Create a repository named `.stasis` with a `README.md` to display a custom profile README on your profile page.

### Linked Emails

Link git commit email addresses to your profile. When a contributor's email matches, their profile is automatically linked in commit views.

## License

MIT License
