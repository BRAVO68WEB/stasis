# Security Scanning

CI/CD pipeline for comprehensive security scanning with multiple tools.

## Overview

This pipeline scans for:
- Container vulnerabilities (Trivy)
- Dependency vulnerabilities (Snyk)
- Secret detection (Gitleaks)
- SAST (Static Application Security Testing)
- SBOM (Software Bill of Materials) generation

## Use Case

- Pre-deployment security checks
- Compliance requirements
- Vulnerability management
- Supply chain security

## Prerequisites

- Docker images or source code
- Snyk account and API token
- Optional: Gitleaks license

## Configuration

```yaml
# runner.yaml
image:
  name: "aquasec/trivy"
  tag: "latest"
  pull_policy: "Always"

on:
  push:
    - "main"
    - "develop"
  schedule:
    - "0 2 * * 1"  # Weekly on Monday at 2am

global_env:
  TRIVY_NO_PROGRESS: "true"
  TRIVY_FORMAT: "json"

timeout: 1800  # 30 minutes

steps:
  setup:
    type: "pre"
    scripts:
      - trivy --version
      - |
        echo "Installing additional tools..."
        apk add --no-cache curl git

  container_scan:
    type: "exec"
    scripts:
      - |
        echo "Scanning container image..."
        trivy image \
          --severity HIGH,CRITICAL \
          --format table \
          --output container-report.txt \
          ${IMAGE_NAME}:latest
      - |
        echo "Generating JSON report..."
        trivy image \
          --severity HIGH,CRITICAL \
          --format json \
          --output container-report.json \
          ${IMAGE_NAME}:latest
      - |
        echo "Container scan results:"
        cat container-report.txt
    envs:
      IMAGE_NAME: "${CI_REGISTRY_IMAGE}"
    continue_on_error: false
    artifacts:
      - "container-report.txt"
      - "container-report.json"

  filesystem_scan:
    type: "exec"
    scripts:
      - |
        echo "Scanning filesystem..."
        trivy fs \
          --severity HIGH,CRITICAL \
          --format table \
          --output fs-report.txt \
          .
      - |
        echo "Generating JSON report..."
        trivy fs \
          --severity HIGH,CRITICAL \
          --format json \
          --output fs-report.json \
          .
      - |
        echo "Filesystem scan results:"
        cat fs-report.txt
    continue_on_error: false
    artifacts:
      - "fs-report.txt"
      - "fs-report.json"

  config_scan:
    type: "exec"
    scripts:
      - |
        echo "Scanning configuration files..."
        trivy config \
          --severity HIGH,CRITICAL \
          --format table \
          --output config-report.txt \
          .
      - |
        echo "Generating JSON report..."
        trivy config \
          --severity HIGH,CRITICAL \
          --format json \
          --output config-report.json \
          .
      - |
        echo "Configuration scan results:"
        cat config-report.txt
    continue_on_error: false
    artifacts:
      - "config-report.txt"
      - "config-report.json"

  secret_scan:
    type: "exec"
    scripts:
      - |
        echo "Installing Gitleaks..."
        curl -sSfL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_8.18.1_linux_amd64.tar.gz | tar xz
        mv gitleaks /usr/local/bin/
      - |
        echo "Scanning for secrets..."
        gitleaks detect \
          --source . \
          --report-path secrets-report.json \
          --report-format json \
          --verbose || true
      - |
        echo "Secret scan results:"
        cat secrets-report.json | head -100 || true
    continue_on_error: true
    artifacts:
      - "secrets-report.json"

  sbom_generation:
    type: "exec"
    scripts:
      - |
        echo "Generating SBOM..."
        trivy image \
          --format cyclonedx \
          --output sbom.cdx.json \
          ${IMAGE_NAME}:latest
      - |
        echo "Generating SPDX SBOM..."
        trivy image \
          --format spdx-json \
          --output sbom.spdx.json \
          ${IMAGE_NAME}:latest
      - |
        echo "SBOM files generated:"
        ls -lh sbom.*.json
    envs:
      IMAGE_NAME: "${CI_REGISTRY_IMAGE}"
    continue_on_error: true
    artifacts:
      - "sbom.cdx.json"
      - "sbom.spdx.json"

  license_scan:
    type: "exec"
    scripts:
      - |
        echo "Scanning licenses..."
        trivy image \
          --scanners license \
          --severity HIGH,CRITICAL \
          --format table \
          --output license-report.txt \
          ${IMAGE_NAME}:latest
      - |
        echo "License scan results:"
        cat license-report.txt
    envs:
      IMAGE_NAME: "${CI_REGISTRY_IMAGE}"
    continue_on_error: true
    artifacts:
      - "license-report.txt"

  snyk_test:
    type: "exec"
    scripts:
      - |
        echo "Installing Snyk..."
        curl -sSfL https://static.snyk.io/cli/latest/snyk-linux -o /usr/local/bin/snyk
        chmod +x /usr/local/bin/snyk
      - |
        echo "Running Snyk test..."
        snyk test \
          --severity-threshold=high \
          --json-file-output=snyk-report.json \
          --all-projects || true
      - |
        echo "Snyk results:"
        cat snyk-report.json | head -100 || true
    envs:
      SNYK_TOKEN: "${SNYK_TOKEN}"
    continue_on_error: true
    artifacts:
      - "snyk-report.json"

  iac_scan:
    type: "exec"
    scripts:
      - |
        echo "Scanning IaC files..."
        trivy config \
          --severity HIGH,CRITICAL \
          --format table \
          --output iac-report.txt \
          --misconfig-scanners terraform,kubernetes,dockerfile,cloudformation \
          .
      - |
        echo "IaC scan results:"
        cat iac-report.txt
    continue_on_error: true
    artifacts:
      - "iac-report.txt"

  aggregate_results:
    type: "post"
    scripts:
      - |
        echo "Aggregating security results..."
        echo "=== Security Scan Summary ===" > security-summary.txt
        echo "" >> security-summary.txt
        
        echo "Container Scan:" >> security-summary.txt
        if [ -f container-report.txt ]; then
          grep -c "HIGH\|CRITICAL" container-report.txt || echo "0 vulnerabilities" >> security-summary.txt
        fi
        echo "" >> security-summary.txt
        
        echo "Filesystem Scan:" >> security-summary.txt
        if [ -f fs-report.txt ]; then
          grep -c "HIGH\|CRITICAL" fs-report.txt || echo "0 vulnerabilities" >> security-summary.txt
        fi
        echo "" >> security-summary.txt
        
        echo "Secret Scan:" >> security-summary.txt
        if [ -f secrets-report.json ]; then
          python3 -c "import json; print(len(json.load(open('secrets-report.json'))))" 2>/dev/null || echo "0 secrets found" >> security-summary.txt
        fi
        echo "" >> security-summary.txt
        
        echo "=== Summary ===" >> security-summary.txt
        cat security-summary.txt
    when: "always"
    artifacts:
      - "security-summary.txt"
```

## Step-by-Step Explanation

### Step 1: Container Scan

```yaml
container_scan:
  type: "exec"
  scripts:
    - |
      echo "Scanning container image..."
      trivy image \
        --severity HIGH,CRITICAL \
        --format table \
        --output container-report.txt \
        ${IMAGE_NAME}:latest
  continue_on_error: false
```

**What it does:**
- Scans container image for vulnerabilities
- Focuses on HIGH and CRITICAL severity
- Generates human-readable and JSON reports

### Step 2: Filesystem Scan

```yaml
filesystem_scan:
  type: "exec"
  scripts:
    - |
      echo "Scanning filesystem..."
      trivy fs \
        --severity HIGH,CRITICAL \
        --format table \
        --output fs-report.txt \
        .
  continue_on_error: false
```

**What it does:**
- Scans source code and dependencies
- Detects vulnerable packages
- Works with multiple package managers

### Step 3: Configuration Scan

```yaml
config_scan:
  type: "exec"
  scripts:
    - |
      echo "Scanning configuration files..."
      trivy config \
        --severity HIGH,CRITICAL \
        --format table \
        --output config-report.txt \
        .
  continue_on_error: false
```

**What it does:**
- Scans Dockerfiles, Kubernetes manifests, Terraform
- Detects misconfigurations
- Checks against security best practices

### Step 4: Secret Scan

```yaml
secret_scan:
  type: "exec"
  scripts:
    - |
      echo "Installing Gitleaks..."
      curl -sSfL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_8.18.1_linux_amd64.tar.gz | tar xz
      mv gitleaks /usr/local/bin/
    - |
      echo "Scanning for secrets..."
      gitleaks detect \
        --source . \
        --report-path secrets-report.json \
        --report-format json \
        --verbose || true
  continue_on_error: true
```

**What it does:**
- Detects hardcoded secrets
- Scans git history
- Identifies API keys, passwords, tokens

### Step 5: SBOM Generation

```yaml
sbom_generation:
  type: "exec"
  scripts:
    - |
      echo "Generating SBOM..."
      trivy image \
        --format cyclonedx \
        --output sbom.cdx.json \
        ${IMAGE_NAME}:latest
    - |
      echo "Generating SPDX SBOM..."
      trivy image \
        --format spdx-json \
        --output sbom.spdx.json \
        ${IMAGE_NAME}:latest
  continue_on_error: true
```

**What it does:**
- Generates Software Bill of Materials
- CycloneDX format (industry standard)
- SPDX format (Linux Foundation)
- Tracks all dependencies

### Step 6: License Scan

```yaml
license_scan:
  type: "exec"
  scripts:
    - |
      echo "Scanning licenses..."
      trivy image \
        --scanners license \
        --severity HIGH,CRITICAL \
        --format table \
        --output license-report.txt \
        ${IMAGE_NAME}:latest
  continue_on_error: true
```

**What it does:**
- Scans dependency licenses
- Flags copyleft licenses (GPL, AGPL)
- Ensures license compliance

### Step 7: Snyk Test

```yaml
snyk_test:
  type: "exec"
  scripts:
    - |
      echo "Installing Snyk..."
      curl -sSfL https://static.snyk.io/cli/latest/snyk-linux -o /usr/local/bin/snyk
      chmod +x /usr/local/bin/snyk
    - |
      echo "Running Snyk test..."
      snyk test \
        --severity-threshold=high \
        --json-file-output=snyk-report.json \
        --all-projects || true
  envs:
    SNYK_TOKEN: "${SNYK_TOKEN}"
  continue_on_error: true
```

**What it does:**
- Runs Snyk vulnerability scan
- Scans all projects
- Generates detailed report
- Requires Snyk API token

### Step 8: IaC Scan

```yaml
iac_scan:
  type: "exec"
  scripts:
    - |
      echo "Scanning IaC files..."
      trivy config \
        --severity HIGH,CRITICAL \
        --format table \
        --output iac-report.txt \
        --misconfig-scanners terraform,kubernetes,dockerfile,cloudformation \
        .
  continue_on_error: true
```

**What it does:**
- Scans Infrastructure as Code
- Supports multiple IaC frameworks
- Detects security misconfigurations

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SNYK_TOKEN` | For Snyk | Snyk API token |
| `CI_REGISTRY_IMAGE` | For container scan | Container image name |

## Artifacts

| File | Description |
|------|-------------|
| `container-report.txt` | Container vulnerability report |
| `container-report.json` | Container vulnerability JSON |
| `fs-report.txt` | Filesystem vulnerability report |
| `config-report.txt` | Configuration scan report |
| `secrets-report.json` | Secret detection report |
| `sbom.cdx.json` | CycloneDX SBOM |
| `sbom.spdx.json` | SPDX SBOM |
| `license-report.txt` | License compliance report |
| `snyk-report.json` | Snyk vulnerability report |
| `security-summary.txt` | Aggregated summary |

## Customization

### Add compliance checks

```yaml
compliance_check:
  type: "exec"
  scripts:
    - |
      echo "Checking compliance..."
      trivy image \
        --compliance docker-cis \
        --format table \
        --output compliance-report.txt \
        ${IMAGE_NAME}:latest
  continue_on_error: true
```

### Add vulnerability exceptions

```yaml
container_scan:
  type: "exec"
  scripts:
    - |
      trivy image \
        --severity HIGH,CRITICAL \
        --ignorefile .trivyignore \
        --format table \
        ${IMAGE_NAME}:latest
```

Create `.trivyignore`:
```
# Ignore specific vulnerabilities
CVE-2023-12345
CVE-2023-67890

# Ignore by package
# openssl@1.1.1
```

### Add SARIF output for GitHub

```yaml
container_scan:
  type: "exec"
  scripts:
    - |
      trivy image \
        --severity HIGH,CRITICAL \
        --format sarif \
        --output trivy-results.sarif \
        ${IMAGE_NAME}:latest
```

### Add Docker Scout

```yaml
docker_scout:
  type: "exec"
  scripts:
    - |
      echo "Running Docker Scout..."
      docker scout cves ${IMAGE_NAME}:latest \
        --format json \
        --output scout-report.json || true
  continue_on_error: true
```

## Troubleshooting

### Trivy database errors

```bash
# Update Trivy database
trivy --download-db-only

# Use specific DB version
trivy image --db-repository ghcr.io/aquasecurity/trivy-db
```

### Snyk authentication errors

```bash
# Verify token
snyk auth ${SNYK_TOKEN}

# Check API connectivity
snyk test --dry-run
```

### False positives

```bash
# Create ignore file
cat > .trivyignore << EOF
# False positive - not exploitable
CVE-2023-12345
EOF

# Re-run scan
trivy image --ignorefile .trivyignore ${IMAGE_NAME}:latest
```

## Related Examples

- [Docker Multi-Arch](docker-multiarch.md) - Build images to scan
- [Terraform](terraform-infra.md) - IaC security scanning
