# Terraform Infrastructure

CI/CD pipeline for Terraform infrastructure with plan, apply, and destroy.

## Overview

This pipeline handles Terraform projects with:
- Terraform initialization
- Format checking
- Validation
- Plan generation
- Plan review
- Apply execution
- Destroy (manual)
- State management

## Use Case

- AWS infrastructure
- GCP infrastructure
- Azure infrastructure
- Multi-cloud deployments

## Prerequisites

- Terraform project
- Cloud provider credentials
- Remote state backend (S3, GCS, etc.)

## Configuration

```yaml
# runner.yaml
image:
  name: "hashicorp/terraform"
  tag: "1.7"
  pull_policy: "IfNotPresent"

on:
  push:
    - "main"
  pull_request:
    - "main"

global_env:
  TF_IN_AUTOMATION: "true"
  TF_INPUT: "false"
  TF_LOG: "WARN"

timeout: 1800  # 30 minutes

steps:
  setup:
    type: "pre"
    scripts:
      - terraform version
      - terraform init -backend=false

  fmt:
    type: "exec"
    scripts:
      - |
        echo "Checking formatting..."
        terraform fmt -check -recursive -diff
    continue_on_error: false

  validate:
    type: "exec"
    scripts:
      - |
        echo "Validating configuration..."
        terraform validate
    continue_on_error: false

  plan:
    type: "exec"
    scripts:
      - |
        echo "Generating plan..."
        terraform plan -out=tfplan -input=false
      - |
        echo "Plan summary:"
        terraform show -no-color tfplan | head -100
      - |
        echo "Saving plan as artifact..."
        terraform show -json tfplan > tfplan.json
    envs:
      AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
      AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
      AWS_DEFAULT_REGION: "us-east-1"
    continue_on_error: false
    artifacts:
      - "tfplan"
      - "tfplan.json"

  cost_estimate:
    type: "exec"
    scripts:
      - |
        echo "Installing infracost..."
        curl -fsSL https://raw.githubusercontent.com/infracost/infracost/master/scripts/install.sh | sh
      - |
        echo "Generating cost estimate..."
        infracost breakdown --path tfplan.json --format table --out-file cost-estimate.txt || true
      - |
        echo "Cost estimate:"
        cat cost-estimate.txt || true
    continue_on_error: true
    artifacts:
      - "cost-estimate.txt"

  security_scan:
    type: "exec"
    scripts:
      - |
        echo "Installing tfsec..."
        curl -s https://raw.githubusercontent.com/aquasecurity/tfsec/master/scripts/install_linux.sh | sh
      - |
        echo "Running security scan..."
        tfsec . --format json --out tfsec-report.json || true
      - |
        echo "Security findings:"
        tfsec . --format table || true
    continue_on_error: true
    artifacts:
      - "tfsec-report.json"

  apply:
    type: "exec"
    scripts:
      - |
        echo "Applying infrastructure changes..."
        terraform apply -auto-approve -input=false tfplan
      - |
        echo "Outputs:"
        terraform output -json
    envs:
      AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
      AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
      AWS_DEFAULT_REGION: "us-east-1"
    if_condition: "CI_BRANCH == 'main' && CI_EVENT == 'push'"
    continue_on_error: false

  smoke_test:
    type: "exec"
    scripts:
      - |
        echo "Running smoke tests..."
        # Example: Check if load balancer is responding
        LB_URL=$(terraform output -raw load_balancer_url)
        curl -f ${LB_URL}/health || exit 1
      - |
        echo "Smoke tests passed!"
    if_condition: "CI_BRANCH == 'main' && CI_EVENT == 'push'"
    continue_on_error: false

  destroy:
    type: "exec"
    scripts:
      - |
        echo "WARNING: This will destroy all infrastructure!"
        echo "Destroying infrastructure..."
        terraform destroy -auto-approve -input=false
    envs:
      AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
      AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
      AWS_DEFAULT_REGION: "us-east-1"
    if_condition: "CI_TAG == 'destroy'"
    continue_on_error: false

  artifacts:
    type: "post"
    scripts:
      - |
        echo "Terraform state:"
        terraform show -no-color | head -50 || true
        echo ""
        echo "Plan artifacts:"
        ls -lh tfplan tfplan.json || true
    when: "always"
    artifacts:
      - "tfplan"
      - "tfplan.json"
      - "cost-estimate.txt"
      - "tfsec-report.json"
```

## Step-by-Step Explanation

### Step 1: Setup

```yaml
setup:
  type: "pre"
  scripts:
    - terraform version
    - terraform init -backend=false
```

**What it does:**
- Verifies Terraform installation
- Initializes without backend (for validation)

### Step 2: Format Check

```yaml
fmt:
  type: "exec"
  scripts:
    - |
      echo "Checking formatting..."
      terraform fmt -check -recursive -diff
  continue_on_error: false
```

**What it does:**
- Checks HCL formatting
- Shows diff if formatting issues found
- Enforces consistent style

### Step 3: Validate

```yaml
validate:
  type: "exec"
  scripts:
    - |
      echo "Validating configuration..."
      terraform validate
  continue_on_error: false
```

**What it does:**
- Validates HCL syntax
- Checks for configuration errors
- Catches issues early

### Step 4: Plan

```yaml
plan:
  type: "exec"
  scripts:
    - |
      echo "Generating plan..."
      terraform plan -out=tfplan -input=false
    - |
      echo "Plan summary:"
      terraform show -no-color tfplan | head -100
    - |
      echo "Saving plan as artifact..."
      terraform show -json tfplan > tfplan.json
  envs:
    AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
    AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
    AWS_DEFAULT_REGION: "us-east-1"
  continue_on_error: false
  artifacts:
    - "tfplan"
    - "tfplan.json"
```

**What it does:**
- Generates execution plan
- Shows plan summary
- Saves plan as artifact
- Generates JSON for cost estimation

### Step 5: Cost Estimate

```yaml
cost_estimate:
  type: "exec"
  scripts:
    - |
      echo "Installing infracost..."
      curl -fsSL https://raw.githubusercontent.com/infracost/infracost/master/scripts/install.sh | sh
    - |
      echo "Generating cost estimate..."
      infracost breakdown --path tfplan.json --format table --out-file cost-estimate.txt || true
    - |
      echo "Cost estimate:"
      cat cost-estimate.txt || true
  continue_on_error: true
  artifacts:
    - "cost-estimate.txt"
```

**What it does:**
- Installs infracost
- Generates cost estimate
- Shows cost breakdown
- Non-blocking (continues on error)

### Step 6: Security Scan

```yaml
security_scan:
  type: "exec"
  scripts:
    - |
      echo "Installing tfsec..."
      curl -s https://raw.githubusercontent.com/aquasecurity/tfsec/master/scripts/install_linux.sh | sh
    - |
      echo "Running security scan..."
      tfsec . --format json --out tfsec-report.json || true
    - |
      echo "Security findings:"
      tfsec . --format table || true
  continue_on_error: true
  artifacts:
    - "tfsec-report.json"
```

**What it does:**
- Installs tfsec
- Scans for security issues
- Generates JSON report
- Non-blocking (continues on error)

### Step 7: Apply

```yaml
apply:
  type: "exec"
  scripts:
    - |
      echo "Applying infrastructure changes..."
      terraform apply -auto-approve -input=false tfplan
    - |
      echo "Outputs:"
      terraform output -json
  envs:
    AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
    AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
    AWS_DEFAULT_REGION: "us-east-1"
  if_condition: "CI_BRANCH == 'main' && CI_EVENT == 'push'"
  continue_on_error: false
```

**What it does:**
- Applies infrastructure changes
- Auto-approves (no manual confirmation)
- Shows outputs
- Only applies on main branch

### Step 8: Smoke Test

```yaml
smoke_test:
  type: "exec"
  scripts:
    - |
      echo "Running smoke tests..."
      # Example: Check if load balancer is responding
      LB_URL=$(terraform output -raw load_balancer_url)
      curl -f ${LB_URL}/health || exit 1
    - |
      echo "Smoke tests passed!"
  if_condition: "CI_BRANCH == 'main' && CI_EVENT == 'push'"
  continue_on_error: false
```

**What it does:**
- Tests deployed infrastructure
- Checks health endpoints
- Verifies deployment success

### Step 9: Destroy

```yaml
destroy:
  type: "exec"
  scripts:
    - |
      echo "WARNING: This will destroy all infrastructure!"
      echo "Destroying infrastructure..."
      terraform destroy -auto-approve -input=false
  envs:
    AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
    AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
    AWS_DEFAULT_REGION: "us-east-1"
  if_condition: "CI_TAG == 'destroy'"
  continue_on_error: false
```

**What it does:**
- Destroys all infrastructure
- Only runs on `destroy` tag
- Auto-approves destruction

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key |
| `AWS_DEFAULT_REGION` | No | AWS region (default: us-east-1) |

## Artifacts

| File | Description |
|------|-------------|
| `tfplan` | Binary plan file |
| `tfplan.json` | JSON plan for cost estimation |
| `cost-estimate.txt` | Cost estimate report |
| `tfsec-report.json` | Security scan results |

## Customization

### Add workspace support

```yaml
steps:
  select_workspace:
    type: "pre"
    scripts:
      - |
        echo "Selecting workspace..."
        terraform workspace select ${CI_BRANCH} || terraform workspace new ${CI_BRANCH}
```

### Add state locking

```yaml
steps:
  plan:
    type: "exec"
    scripts:
      - |
        terraform plan \
          -out=tfplan \
          -input=false \
          -lock=true \
          -lock-timeout=300s
```

### Add drift detection

```yaml
drift_detection:
  type: "exec"
  scripts:
    - |
      echo "Checking for drift..."
      terraform plan -detailed-exitcode -out=drift-plan
      EXIT_CODE=$?
      if [ $EXIT_CODE -eq 2 ]; then
        echo "Drift detected!"
        exit 1
      fi
  if_condition: "CI_BRANCH == 'main' && CI_EVENT == 'schedule'"
  continue_on_error: false
```

### Add multiple environments

```yaml
deploy_staging:
  type: "exec"
  scripts:
    - |
      terraform workspace select staging
      terraform apply -auto-approve
  if_condition: "CI_BRANCH == 'develop'"

deploy_production:
  type: "exec"
  scripts:
    - |
      terraform workspace select production
      terraform apply -auto-approve
  if_condition: "CI_TAG != ''"
```

## Troubleshooting

### State lock errors

```bash
# Force unlock (use with caution)
terraform force-unlock LOCK_ID
```

### Plan shows no changes

```bash
# Refresh state
terraform refresh

# Check if resources exist
terraform state list
```

### Apply fails

```bash
# Check logs
export TF_LOG=DEBUG
terraform apply

# Check IAM permissions
aws sts get-caller-identity
```

## Related Examples

- [Security Scan](security-scan.md) - Additional security scanning
- [Docker Multi-Arch](docker-multiarch.md) - Deploy containers
