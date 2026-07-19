# Go Binary Compilation

Cross-compile Go applications for multiple platforms with version injection.

## Overview

This pipeline builds Go binaries for Linux, macOS, and Windows with:
- Code quality checks (vet, fmt)
- Unit tests with coverage
- Multi-platform builds
- Version injection via ldflags
- SHA256 checksums
- Artifact collection

## Use Case

- Go CLI tools
- Go microservices
- Cross-platform utilities
- Release builds

## Prerequisites

- Go project with `go.mod`
- Optional: Makefile for build commands

## Configuration

```yaml
# runner.yaml
image:
  name: "golang"
  tag: "1.21-alpine"
  pull_policy: "IfNotPresent"

on:
  push:
    - "main"
    - "develop"
  tag:
    - "v*"

global_env:
  CGO_ENABLED: "0"
  GOOS: "linux"
  GOARCH: "amd64"

timeout: 1800  # 30 minutes

steps:
  setup:
    type: "pre"
    scripts:
      - go version
      - go env
      - go mod download
      - go mod verify

  vet:
    type: "exec"
    scripts:
      - go vet ./...
    continue_on_error: false

  fmt_check:
    type: "exec"
    scripts:
      - |
        if [ "$(gofmt -s -l . | wc -l)" -gt 0 ]; then
          echo "Code is not formatted. Run 'go fmt ./...'"
          gofmt -s -d .
          exit 1
        fi
    continue_on_error: false

  test:
    type: "exec"
    scripts:
      - go test -v -race -coverprofile=coverage.out ./...
      - go tool cover -html=coverage.out -o coverage.html
    continue_on_error: false
    timeout: 600  # 10 minutes

  build_linux_amd64:
    type: "exec"
    scripts:
      - |
        VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "dev")
        BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        
        go build -ldflags "-X main.Version=$VERSION -X main.BuildTime=$BUILD_TIME -X main.Commit=$COMMIT" \
          -o bin/app-linux-amd64 \
          ./cmd/app
    envs:
      GOOS: "linux"
      GOARCH: "amd64"
    continue_on_error: false

  build_linux_arm64:
    type: "exec"
    scripts:
      - |
        VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "dev")
        BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        
        go build -ldflags "-X main.Version=$VERSION -X main.BuildTime=$BUILD_TIME -X main.Commit=$COMMIT" \
          -o bin/app-linux-arm64 \
          ./cmd/app
    envs:
      GOOS: "linux"
      GOARCH: "arm64"
    continue_on_error: false

  build_darwin_amd64:
    type: "exec"
    scripts:
      - |
        VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "dev")
        BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        
        go build -ldflags "-X main.Version=$VERSION -X main.BuildTime=$BUILD_TIME -X main.Commit=$COMMIT" \
          -o bin/app-darwin-amd64 \
          ./cmd/app
    envs:
      GOOS: "darwin"
      GOARCH: "amd64"
    continue_on_error: false

  build_windows_amd64:
    type: "exec"
    scripts:
      - |
        VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "dev")
        BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        
        go build -ldflags "-X main.Version=$VERSION -X main.BuildTime=$BUILD_TIME -X main.Commit=$COMMIT" \
          -o bin/app-windows-amd64.exe \
          ./cmd/app
    envs:
      GOOS: "windows"
      GOARCH: "amd64"
    continue_on_error: false

  checksum:
    type: "exec"
    scripts:
      - |
        cd bin
        sha256sum app-* > checksums.txt || shasum -a 256 app-* > checksums.txt
        cat checksums.txt
    continue_on_error: false
    when: "on_success"

  upload_artifacts:
    type: "post"
    scripts:
      - |
        echo "Build artifacts:"
        ls -lh bin/
        echo ""
        echo "Checksums:"
        cat bin/checksums.txt || true
    when: "always"
```

## Step-by-Step Explanation

### Step 1: Setup

```yaml
setup:
  type: "pre"
  scripts:
    - go version
    - go env
    - go mod download
    - go mod verify
```

**What it does:**
- Verifies Go installation
- Downloads dependencies
- Validates module integrity

### Step 2: Vet

```yaml
vet:
  type: "exec"
  scripts:
    - go vet ./...
  continue_on_error: false
```

**What it does:**
- Runs Go's static analysis tool
- Catches common errors (unused variables, unreachable code)
- Fails pipeline if issues found

### Step 3: Format Check

```yaml
fmt_check:
  type: "exec"
  scripts:
    - |
      if [ "$(gofmt -s -l . | wc -l)" -gt 0 ]; then
        echo "Code is not formatted. Run 'go fmt ./...'"
        gofmt -s -d .
        exit 1
      fi
  continue_on_error: false
```

**What it does:**
- Checks if code is properly formatted
- Shows diff if formatting issues found
- Enforces consistent code style

### Step 4: Test

```yaml
test:
  type: "exec"
  scripts:
    - go test -v -race -coverprofile=coverage.out ./...
    - go tool cover -html=coverage.out -o coverage.html
  continue_on_error: false
  timeout: 600
```

**What it does:**
- Runs all tests with verbose output
- Enables race condition detection
- Generates coverage report
- Creates HTML coverage visualization

### Step 5-8: Build

```yaml
build_linux_amd64:
  type: "exec"
  scripts:
    - |
      VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "dev")
      BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
      COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
      
      go build -ldflags "-X main.Version=$VERSION -X main.BuildTime=$BUILD_TIME -X main.Commit=$COMMIT" \
        -o bin/app-linux-amd64 \
        ./cmd/app
  envs:
    GOOS: "linux"
    GOARCH: "amd64"
```

**What it does:**
- Extracts version from git tags
- Injects build metadata via ldflags
- Cross-compiles for target platform
- Names binary with platform suffix

**Version injection:**
Your Go code should have these variables:

```go
package main

var (
    Version   = "dev"
    BuildTime = "unknown"
    Commit    = "unknown"
)

func main() {
    // Use Version, BuildTime, Commit as needed
}
```

### Step 9: Checksum

```yaml
checksum:
  type: "exec"
  scripts:
    - |
      cd bin
      sha256sum app-* > checksums.txt || shasum -a 256 app-* > checksums.txt
      cat checksums.txt
  when: "on_success"
```

**What it does:**
- Generates SHA256 checksums for all binaries
- Supports both Linux (`sha256sum`) and macOS (`shasum`)
- Creates checksums file for verification

### Step 10: Artifacts

```yaml
upload_artifacts:
  type: "post"
  scripts:
    - |
      echo "Build artifacts:"
      ls -lh bin/
      echo ""
      echo "Checksums:"
      cat bin/checksums.txt || true
  when: "always"
```

**What it does:**
- Lists all build artifacts
- Shows file sizes
- Displays checksums
- Runs even if previous steps failed

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CGO_ENABLED` | Enable CGO | `0` |
| `GOOS` | Target OS | `linux` |
| `GOARCH` | Target architecture | `amd64` |

## Artifacts

| File | Description |
|------|-------------|
| `bin/app-linux-amd64` | Linux AMD64 binary |
| `bin/app-linux-arm64` | Linux ARM64 binary |
| `bin/app-darwin-amd64` | macOS AMD64 binary |
| `bin/app-windows-amd64.exe` | Windows AMD64 binary |
| `bin/checksums.txt` | SHA256 checksums |
| `coverage.html` | Test coverage report |

## Customization

### Add more platforms

```yaml
build_freebsd_amd64:
  type: "exec"
  scripts:
    - |
      go build -ldflags "..." -o bin/app-freebsd-amd64 ./cmd/app
  envs:
    GOOS: "freebsd"
    GOARCH: "amd64"
```

### Skip tests on tag push

```yaml
test:
  type: "exec"
  scripts:
    - go test -v ./...
  if_condition: "CI_TAG == ''"
```

### Add code linting

```yaml
lint:
  type: "exec"
  scripts:
    - go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
    - golangci-lint run
  continue_on_error: false
```

## Troubleshooting

### CGO errors

If you need CGO (e.g., for SQLite):

```yaml
global_env:
  CGO_ENABLED: "1"

steps:
  setup:
    type: "pre"
    scripts:
      - apt-get update && apt-get install -y gcc musl-dev
```

### Version injection not working

Ensure your Go code has the variables:

```go
var Version = "dev"
```

And use them in your code:

```go
fmt.Printf("Version: %s\n", Version)
```

## Related Examples

- [Rust Cargo](rust-cargo.md) - Similar cross-compilation for Rust
- [Docker Multi-Arch](docker-multiarch.md) - Build Docker images for multiple architectures
