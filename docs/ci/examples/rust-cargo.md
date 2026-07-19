# Rust Cargo Publishing

CI/CD pipeline for Rust libraries with testing, linting, and publishing to crates.io.

## Overview

This pipeline handles Rust projects with:
- Dependency caching
- Code formatting (rustfmt)
- Linting (clippy)
- Unit and integration tests
- Documentation generation
- Multi-platform testing
- crates.io publishing

## Use Case

- Rust libraries
- Rust CLI tools
- Rust crates for distribution

## Prerequisites

- Rust project with `Cargo.toml`
- crates.io account and API token
- Optional: `rustfmt.toml` and `clippy.toml`

## Configuration

```yaml
# runner.yaml
image:
  name: "rust"
  tag: "1.75-slim"
  pull_policy: "IfNotPresent"

on:
  push:
    - "main"
  tag:
    - "v*"

global_env:
  CARGO_TERM_COLOR: "always"
  RUST_BACKTRACE: "1"

timeout: 1800  # 30 minutes

steps:
  setup:
    type: "pre"
    scripts:
      - rustc --version
      - cargo --version
      - rustup component add rustfmt clippy
      - cargo fetch

  fmt:
    type: "exec"
    scripts:
      - |
        echo "Checking formatting..."
        cargo fmt --all -- --check
    continue_on_error: false

  clippy:
    type: "exec"
    scripts:
      - |
        echo "Running clippy..."
        cargo clippy --all-targets --all-features -- -D warnings
    continue_on_error: false

  test:
    type: "exec"
    scripts:
      - |
        echo "Running tests..."
        cargo test --all-features --verbose
      - |
        echo "Running doc tests..."
        cargo test --doc
    continue_on_error: false
    timeout: 600

  test_nightly:
    type: "exec"
    scripts:
      - |
        echo "Installing nightly..."
        rustup install nightly
        rustup default nightly
      - |
        echo "Running tests on nightly..."
        cargo test --all-features
      - |
        echo "Switching back to stable..."
        rustup default stable
    continue_on_error: true

  build:
    type: "exec"
    scripts:
      - |
        echo "Building release..."
        cargo build --release --all-features
      - |
        echo "Binary size:"
        ls -lh target/release/ || true
    continue_on_error: false

  docs:
    type: "exec"
    scripts:
      - |
        echo "Generating documentation..."
        cargo doc --no-deps --all-features
      - |
        echo "Checking documentation..."
        cargo doc --no-deps --all-features 2>&1 | grep -i warning || true
    continue_on_error: false

  publish_dry_run:
    type: "exec"
    scripts:
      - |
        echo "Publish dry run..."
        cargo publish --dry-run --all-features
    continue_on_error: false

  publish:
    type: "exec"
    scripts:
      - |
        echo "Publishing to crates.io..."
        cargo publish --all-features
    envs:
      CARGO_REGISTRY_TOKEN: "${CRATES_IO_TOKEN}"
    if_condition: "CI_TAG != ''"
    continue_on_error: false

  artifacts:
    type: "post"
    scripts:
      - |
        echo "Build artifacts:"
        ls -lh target/release/ || true
        echo ""
        echo "Documentation:"
        ls -lh target/doc/ || true
    when: "always"
    artifacts:
      - "target/release/**/*"
      - "target/doc/**/*"
```

## Step-by-Step Explanation

### Step 1: Setup

```yaml
setup:
  type: "pre"
  scripts:
    - rustc --version
    - cargo --version
    - rustup component add rustfmt clippy
    - cargo fetch
```

**What it does:**
- Verifies Rust installation
- Installs rustfmt and clippy components
- Fetches dependencies (cached for future runs)

### Step 2: Format Check

```yaml
fmt:
  type: "exec"
  scripts:
    - |
      echo "Checking formatting..."
      cargo fmt --all -- --check
  continue_on_error: false
```

**What it does:**
- Checks if code is properly formatted
- Fails if formatting issues found
- Enforces consistent code style

### Step 3: Clippy Linting

```yaml
clippy:
  type: "exec"
  scripts:
    - |
      echo "Running clippy..."
      cargo clippy --all-targets --all-features -- -D warnings
  continue_on_error: false
```

**What it does:**
- Runs Rust's linter
- Checks for common mistakes
- Treats warnings as errors

### Step 4: Tests

```yaml
test:
  type: "exec"
  scripts:
    - |
      echo "Running tests..."
      cargo test --all-features --verbose
    - |
      echo "Running doc tests..."
      cargo test --doc
  continue_on_error: false
  timeout: 600
```

**What it does:**
- Runs all unit and integration tests
- Runs documentation tests
- Verifies code correctness

### Step 5: Nightly Tests

```yaml
test_nightly:
  type: "exec"
  scripts:
    - |
      echo "Installing nightly..."
      rustup install nightly
      rustup default nightly
    - |
      echo "Running tests on nightly..."
      cargo test --all-features
    - |
      echo "Switching back to stable..."
      rustup default stable
  continue_on_error: true
```

**What it does:**
- Tests on Rust nightly
- Catches future compatibility issues
- Non-blocking (continues on error)

### Step 6: Build

```yaml
build:
  type: "exec"
  scripts:
    - |
      echo "Building release..."
      cargo build --release --all-features
    - |
      echo "Binary size:"
      ls -lh target/release/ || true
  continue_on_error: false
```

**What it does:**
- Builds optimized release binary
- Shows binary size
- Verifies build succeeds

### Step 7: Documentation

```yaml
docs:
  type: "exec"
  scripts:
    - |
      echo "Generating documentation..."
      cargo doc --no-deps --all-features
    - |
      echo "Checking documentation..."
      cargo doc --no-deps --all-features 2>&1 | grep -i warning || true
  continue_on_error: false
```

**What it does:**
- Generates Rust documentation
- Checks for documentation warnings
- Verifies documentation builds

### Step 8: Publish Dry Run

```yaml
publish_dry_run:
  type: "exec"
  scripts:
    - |
      echo "Publish dry run..."
      cargo publish --dry-run --all-features
  continue_on_error: false
```

**What it does:**
- Simulates publishing
- Catches issues before actual publish
- Verifies package is ready

### Step 9: Publish

```yaml
publish:
  type: "exec"
  scripts:
    - |
      echo "Publishing to crates.io..."
      cargo publish --all-features
  envs:
    CARGO_REGISTRY_TOKEN: "${CRATES_IO_TOKEN}"
  if_condition: "CI_TAG != ''"
  continue_on_error: false
```

**What it does:**
- Publishes to crates.io
- Only runs on tag push
- Uses API token for authentication

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRATES_IO_TOKEN` | For publishing | crates.io API token |
| `CARGO_TERM_COLOR` | No | Terminal color output |
| `RUST_BACKTRACE` | No | Show backtraces on panic |

## Artifacts

| File | Description |
|------|-------------|
| `target/release/` | Release binaries |
| `target/doc/` | Generated documentation |
| `target/package/` | Publishable package |

## Customization

### Add feature matrix testing

```yaml
test_features:
  type: "exec"
  scripts:
    - cargo test --no-default-features
    - cargo test --features "feature1"
    - cargo test --features "feature2"
    - cargo test --all-features
  continue_on_error: false
```

### Add benchmarks

```yaml
bench:
  type: "exec"
  scripts:
    - cargo bench --all-features
  continue_on_error: true
```

### Add code coverage

```yaml
coverage:
  type: "exec"
  scripts:
    - cargo install cargo-tarpaulin
    - cargo tarpaulin --all-features --out Xml --out Html
  continue_on_error: true
  artifacts:
    - "tarpaulin-report.html"
    - "cobertura.xml"
```

### Publish to private registry

```yaml
publish:
  type: "exec"
  scripts:
    - cargo publish --registry my-registry
  envs:
    CARGO_REGISTRIES_MY_REGISTRY_TOKEN: "${PRIVATE_REGISTRY_TOKEN}"
```

## Troubleshooting

### Clippy warnings

```bash
# Run clippy locally
cargo clippy --all-targets --all-features -- -D warnings

# Fix auto-fixable warnings
cargo clippy --fix --all-targets --all-features
```

### Documentation warnings

```bash
# Run doc locally
RUSTDOCFLAGS="-D warnings" cargo doc --no-deps --all-features
```

### Publish fails

```bash
# Check package locally
cargo package --list
cargo publish --dry-run

# Verify token
cargo login ${CRATES_IO_TOKEN}
```

## Related Examples

- [Go Binary](go-binary.md) - Similar cross-compilation for Go
- [Docker Multi-Arch](docker-multiarch.md) - Containerize Rust application
