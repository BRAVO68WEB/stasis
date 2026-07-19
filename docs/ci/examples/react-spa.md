# React Single-Page Application

CI/CD pipeline for React SPAs with testing, Lighthouse audits, and S3 deployment.

## Overview

This pipeline handles React applications with:
- Dependency installation
- Linting (ESLint, Prettier)
- Unit testing (Vitest)
- Production build
- Lighthouse performance audit
- S3 deployment
- CloudFront invalidation

## Use Case

- React applications
- Vite-based projects
- Next.js static exports
- Single-page applications

## Prerequisites

- React project with `package.json`
- AWS S3 bucket configured
- CloudFront distribution (optional)

## Configuration

```yaml
# runner.yaml
image:
  name: "node"
  tag: "20-slim"
  pull_policy: "IfNotPresent"

on:
  push:
    - "main"
    - "develop"
  tag:
    - "v*"

global_env:
  NODE_ENV: "production"
  CI: "true"

timeout: 1200  # 20 minutes

steps:
  setup:
    type: "pre"
    scripts:
      - node --version
      - npm --version
      - npm ci --prefer-offline --no-audit

  lint:
    type: "exec"
    scripts:
      - |
        echo "Running ESLint..."
        npm run lint -- --max-warnings 0
      - |
        echo "Checking Prettier..."
        npx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}"
    continue_on_error: false

  type_check:
    type: "exec"
    scripts:
      - |
        echo "Running TypeScript type check..."
        npx tsc --noEmit
    continue_on_error: false

  test:
    type: "exec"
    scripts:
      - |
        echo "Running tests with coverage..."
        npm run test -- --coverage --reporter=junit --outputFile=coverage/junit.xml
    continue_on_error: false
    timeout: 300

  build:
    type: "exec"
    scripts:
      - |
        echo "Building for production..."
        npm run build
      - |
        echo "Build size:"
        du -sh dist/ || du -sh build/
    envs:
      VITE_API_URL: "${API_URL}"
      VITE_APP_VERSION: "${CI_COMMIT_SHORT_SHA}"
    continue_on_error: false

  lighthouse:
    type: "exec"
    scripts:
      - |
        echo "Installing Lighthouse..."
        npm install -g @lhci/cli
      - |
        echo "Running Lighthouse audit..."
        lhci autorun --config=.lighthouserc.json || true
      - |
        echo "Lighthouse results:"
        ls -lh .lighthouseci/ || true
    continue_on_error: true
    artifacts:
      - ".lighthouseci/**/*"

  deploy_staging:
    type: "exec"
    scripts:
      - |
        echo "Deploying to staging..."
        aws s3 sync dist/ s3://${S3_BUCKET_STAGING} --delete
      - |
        echo "Invalidating CloudFront..."
        aws cloudfront create-invalidation \
          --distribution-id ${CLOUDFRONT_STAGING_ID} \
          --paths "/*"
    envs:
      AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
      AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
      AWS_DEFAULT_REGION: "us-east-1"
    if_condition: "CI_BRANCH == 'develop'"
    continue_on_error: false

  deploy_production:
    type: "exec"
    scripts:
      - |
        echo "Deploying to production..."
        aws s3 sync dist/ s3://${S3_BUCKET_PRODUCTION} --delete
      - |
        echo "Invalidating CloudFront..."
        aws cloudfront create-invalidation \
          --distribution-id ${CLOUDFRONT_PRODUCTION_ID} \
          --paths "/*"
    envs:
      AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
      AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
      AWS_DEFAULT_REGION: "us-east-1"
    if_condition: "CI_TAG != ''"
    continue_on_error: false

  artifacts:
    type: "post"
    scripts:
      - |
        echo "Build artifacts:"
        ls -lh dist/ || ls -lh build/
        echo ""
        echo "Lighthouse results:"
        ls -lh .lighthouseci/ || true
    when: "always"
    artifacts:
      - "dist/**/*"
      - ".lighthouseci/**/*"
```

## Step-by-Step Explanation

### Step 1: Setup

```yaml
setup:
  type: "pre"
  scripts:
    - node --version
    - npm --version
    - npm ci --prefer-offline --no-audit
```

**What it does:**
- Verifies Node.js installation
- Installs dependencies from lockfile
- Uses cache for faster installs

### Step 2: Lint

```yaml
lint:
  type: "exec"
  scripts:
    - |
      echo "Running ESLint..."
      npm run lint -- --max-warnings 0
    - |
      echo "Checking Prettier..."
      npx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}"
  continue_on_error: false
```

**What it does:**
- Runs ESLint with zero warnings policy
- Checks code formatting with Prettier
- Enforces consistent code style

### Step 3: Type Check

```yaml
type_check:
  type: "exec"
  scripts:
    - |
      echo "Running TypeScript type check..."
      npx tsc --noEmit
  continue_on_error: false
```

**What it does:**
- Runs TypeScript compiler
- Checks for type errors
- Doesn't emit output files

### Step 4: Test

```yaml
test:
  type: "exec"
  scripts:
    - |
      echo "Running tests with coverage..."
      npm run test -- --coverage --reporter=junit --outputFile=coverage/junit.xml
  continue_on_error: false
  timeout: 300
```

**What it does:**
- Runs unit tests
- Generates coverage report
- Generates JUnit XML report

### Step 5: Build

```yaml
build:
  type: "exec"
  scripts:
    - |
      echo "Building for production..."
      npm run build
    - |
      echo "Build size:"
      du -sh dist/ || du -sh build/
  envs:
    VITE_API_URL: "${API_URL}"
    VITE_APP_VERSION: "${CI_COMMIT_SHORT_SHA}"
  continue_on_error: false
```

**What it does:**
- Builds production bundle
- Injects environment variables
- Shows build size

### Step 6: Lighthouse

```yaml
lighthouse:
  type: "exec"
  scripts:
    - |
      echo "Installing Lighthouse..."
      npm install -g @lhci/cli
    - |
      echo "Running Lighthouse audit..."
      lhci autorun --config=.lighthouserc.json || true
    - |
      echo "Lighthouse results:"
      ls -lh .lighthouseci/ || true
  continue_on_error: true
  artifacts:
    - ".lighthouseci/**/*"
```

**What it does:**
- Installs Lighthouse CI
- Runs performance audit
- Generates reports
- Non-blocking (continues on error)

### Step 7-8: Deploy

```yaml
deploy_staging:
  type: "exec"
  scripts:
    - |
      echo "Deploying to staging..."
      aws s3 sync dist/ s3://${S3_BUCKET_STAGING} --delete
    - |
      echo "Invalidating CloudFront..."
      aws cloudfront create-invalidation \
        --distribution-id ${CLOUDFRONT_STAGING_ID} \
        --paths "/*"
  envs:
    AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
    AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
    AWS_DEFAULT_REGION: "us-east-1"
  if_condition: "CI_BRANCH == 'develop'"
  continue_on_error: false
```

**What it does:**
- Syncs build output to S3
- Deletes old files
- Invalidates CloudFront cache
- Only deploys on develop branch

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes | Backend API URL |
| `AWS_ACCESS_KEY_ID` | For deploy | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | For deploy | AWS secret key |
| `S3_BUCKET_STAGING` | For staging | Staging S3 bucket |
| `S3_BUCKET_PRODUCTION` | For production | Production S3 bucket |
| `CLOUDFRONT_STAGING_ID` | For staging | CloudFront distribution ID |
| `CLOUDFRONT_PRODUCTION_ID` | For production | CloudFront distribution ID |

## Artifacts

| File | Description |
|------|-------------|
| `dist/` or `build/` | Production build |
| `.lighthouseci/` | Lighthouse reports |
| `coverage/` | Test coverage |

## Lighthouse Configuration

Create `.lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "first-contentful-paint": ["warn", {"maxNumericValue": 2000}],
        "interactive": ["warn", {"maxNumericValue": 5000}],
        "categories:performance": ["warn", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

## Customization

### Add Cypress E2E tests

```yaml
e2e:
  type: "exec"
  scripts:
    - npm install -g cypress
    - |
      npx cypress run \
        --browser chrome \
        --reporter junit \
        --reporter-options mochaFile=coverage/e2e-results.xml
  continue_on_error: false
  artifacts:
    - "cypress/videos/**/*"
    - "cypress/screenshots/**/*"
```

### Add bundle analysis

```yaml
analyze:
  type: "exec"
  scripts:
    - npm install -g webpack-bundle-analyzer
    - npx vite-bundle-visualizer
  continue_on_error: true
  artifacts:
    - "stats.html"
```

### Deploy to Vercel

```yaml
deploy_vercel:
  type: "exec"
  scripts:
    - npm install -g vercel
    - vercel --prod --token ${VERCEL_TOKEN}
  envs:
    VERCEL_TOKEN: "${VERCEL_TOKEN}"
    VERCEL_ORG_ID: "${VERCEL_ORG_ID}"
    VERCEL_PROJECT_ID: "${VERCEL_PROJECT_ID}"
  if_condition: "CI_TAG != ''"
```

## Troubleshooting

### Build fails with memory error

```yaml
build:
  type: "exec"
  scripts:
    - |
      NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Lighthouse fails

```bash
# Run locally
npx lhci autorun --config=.lighthouserc.json

# Check server is running
npx serve dist -l 8080
```

### S3 sync fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check bucket permissions
aws s3 ls s3://your-bucket
```

## Related Examples

- [Docker Multi-Arch](docker-multiarch.md) - Containerize React app
- [Security Scan](security-scan.md) - Scan dependencies
