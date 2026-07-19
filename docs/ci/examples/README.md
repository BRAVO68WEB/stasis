# CI Runner Examples

Real-world CI/CD pipeline configurations for Stasis CI Runner.

## Quick Start

1. Copy an example to your repository as `runner.yaml`
2. Customize environment variables and steps
3. Push to trigger the pipeline

## Available Examples

### Language-Specific Builds

| Example | Description | Key Features |
|---------|-------------|--------------|
| [Go Binary](go-binary.md) | Cross-compile Go applications | Multi-platform, version injection, checksums |
| [Python Django](python-django.md) | Django app with tests | pytest, coverage, migrations |
| [Rust Cargo](rust-cargo.md) | Rust library publishing | clippy, tests, cargo publish |
| [React SPA](react-spa.md) | React single-page app | Vite build, Lighthouse, S3 deploy |

### Infrastructure & DevOps

| Example | Description | Key Features |
|---------|-------------|--------------|
| [Docker Multi-Arch](docker-multiarch.md) | Multi-architecture images | buildx, QEMU, manifest |
| [Terraform](terraform-infra.md) | Infrastructure as Code | plan, apply, destroy |
| [Security Scan](security-scan.md) | Security scanning | Trivy, Snyk, SBOM |

### Package Publishing

| Example | Description | Key Features |
|---------|-------------|--------------|
| [NPM Publish](npm-publish.md) | NPM package publishing | Version check, tags, verification |
| [Flutter APK](flutter-apk.md) | Android APK builds | Signing, artifacts |

### Legacy Examples

| Example | Description |
|---------|-------------|
| [Java Docker](java-docker.md) | Spring Boot Docker builds |

## Configuration Reference

### Basic Structure

```yaml
image:
  name: "base-image"
  tag: "version"
  pull_policy: "IfNotPresent"

on:
  push:
    - "main"
    - "develop"
  tag:
    - "v*"

global_env:
  KEY: "value"

timeout: 3600  # seconds

steps:
  step_name:
    type: "pre" | "exec" | "post"
    scripts:
      - "command1"
      - "command2"
    envs:
      ENV_VAR: "value"
    continue_on_error: false
    timeout: 600
    when: "on_success" | "on_failure" | "always"
    retry:
      max_attempts: 3
      backoff_multiplier: 2.0
      initial_delay_secs: 5
```

### Step Types

| Type | Purpose | When to Use |
|------|---------|-------------|
| `pre` | Setup, dependencies | Before main execution |
| `exec` | Build, test, lint | Main pipeline steps |
| `post` | Cleanup, artifacts | After execution, always runs |

### Conditional Execution

```yaml
# Run only on specific branch
if_condition: "CI_BRANCH == 'main'"

# Run on success or failure
when: "on_failure"

# Continue even if step fails
continue_on_error: true
```

### Retry Policies

```yaml
retry:
  max_attempts: 3
  backoff_multiplier: 2.0  # Exponential backoff
  initial_delay_secs: 5     # Wait 5s, 10s, 20s
```

## Environment Variables

These variables are available in all pipelines:

| Variable | Description |
|----------|-------------|
| `CI_JOB_ID` | Unique job identifier |
| `CI_BRANCH` | Git branch name |
| `CI_COMMIT_SHA` | Full commit SHA |
| `CI_COMMIT_SHORT_SHA` | Short commit SHA (7 chars) |
| `CI_TAG` | Git tag (if triggered by tag) |
| `CI_REPO_URL` | Repository URL |
| `CI_WORKSPACE` | Workspace directory path |

## Artifacts

Artifacts are automatically collected after job completion:

```yaml
steps:
  build:
    type: "exec"
    scripts:
      - "make build"
    artifacts:
      - "dist/**/*"
      - "build/*.tar.gz"
      - "coverage/*.html"
```

## Best Practices

1. **Use specific image tags** - Avoid `latest` in production
2. **Set timeouts** - Prevent runaway jobs
3. **Use retries** - For flaky network operations
4. **Collect artifacts** - Store build outputs
5. **Use conditions** - Skip unnecessary steps
6. **Cache dependencies** - Speed up builds

## Contributing

Have a useful example? Submit a PR with:
- Clear comments
- Environment variable documentation
- Prerequisites
- Usage instructions
