# Contributing to Stasis

Thank you for your interest in contributing to Stasis! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- **Go 1.24+** - Backend development
- **Bun or Node.js 18+** - Frontend development
- **Docker & Docker Compose** - Running services
- **PostgreSQL 15+** - Database (or use Docker)
- **Git** - Version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/stasis.git
   cd stasis
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/get-stasis/stasis.git
   ```

## Development Setup

### Backend (Go)

```bash
# Install dependencies
go mod download

# Copy environment file
cp configs/.env.example .env
# Edit .env with your database credentials

# Run database migrations
make migrate

# Start the API server
go run ./cmd/server
```

### Frontend (Next.js)

```bash
# Navigate to web directory
cd web

# Install dependencies
bun install

# Start development server
bun run dev
```

### Using Docker Compose

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Available Make Commands

| Command | Description |
|---------|-------------|
| `make dev` | Run frontend & backend in development mode |
| `make web` | Run only the web development server |
| `make build-server` | Build the server binary |
| `make build-cli` | Build the CLI binary |
| `make tidy` | Format code and tidy Go modules |
| `make gen-migrations name=<name>` | Generate new database migration |
| `make help` | Show all available commands |

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-repo-forking` - New features
- `fix/ssh-key-validation` - Bug fixes
- `docs/update-api-reference` - Documentation
- `refactor/auth-service` - Code refactoring

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(repo): add repository forking support

fix(auth): resolve session timeout redirect loop

docs(api): update OpenAPI specification
```

## Pull Request Process

1. **Update your fork:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make your changes** and commit with clear messages

4. **Push to your fork:**
   ```bash
   git push origin feature/your-feature
   ```

5. **Create a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what changed and why
   - Reference any related issues (e.g., `Fixes #123`)

6. **Wait for review** - maintainers will review your PR

### PR Checklist

- [ ] Code follows the project's coding standards
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventional commits
- [ ] No merge conflicts

## Coding Standards

### Go

- Follow [Effective Go](https://go.dev/doc/effective_go) guidelines
- Use `gofmt` for formatting
- Run `go vet` to check for issues
- Write tests for new functionality
- Keep functions focused and small

### TypeScript/React

- Use TypeScript for all new code
- Follow existing component patterns
- Use functional components with hooks
- Keep components small and focused

### Database

- Use Atlas for migrations
- Always create a migration for schema changes
- Test migrations against a development database

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Description** - Clear description of the issue
2. **Steps to Reproduce** - How to trigger the bug
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment** - OS, Go version, Node.js version
6. **Logs** - Any relevant error messages

### Feature Requests

For feature requests, please describe:

1. **Problem** - What problem does this solve?
2. **Solution** - How should it work?
3. **Alternatives** - Any alternative solutions considered?

## Getting Help

- **Issues** - Use GitHub Issues for bugs and feature requests
- **Discussions** - Use GitHub Discussions for questions and ideas

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
