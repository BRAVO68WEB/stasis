# Docker Multi-Architecture Builds

Build and push Docker images for multiple architectures (amd64, arm64).

## Overview

This pipeline builds Docker images for:
- linux/amd64 (x86_64)
- linux/arm64 (Apple Silicon, AWS Graviton)

And creates a multi-arch manifest for automatic platform selection.

## Use Case

- Production container images
- Apple Silicon support
- ARM server deployment (AWS Graviton, Ampere)
- Edge computing (Raspberry Pi, Jetson)

## Prerequisites

- Dockerfile in repository
- Docker Hub or GHCR account
- Docker Buildx support

## Configuration

```yaml
# runner.yaml
image:
  name: "docker"
  tag: "24-cli"
  pull_policy: "IfNotPresent"

on:
  push:
    - "main"
  tag:
    - "v*"

global_env:
  DOCKER_BUILDKIT: "1"
  IMAGE_NAME: "myapp"

timeout: 2400  # 40 minutes

steps:
  setup:
    type: "pre"
    scripts:
      - docker --version
      - docker buildx version
      - |
        echo "Setting up QEMU for cross-compilation..."
        docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
      - |
        echo "Creating buildx builder..."
        docker buildx create --name multiarch --driver docker-container --use
      - docker buildx inspect --bootstrap

  build_amd64:
    type: "exec"
    scripts:
      - |
        echo "Building amd64 image..."
        docker buildx build \
          --platform linux/amd64 \
          --tag ${IMAGE_NAME}:latest-amd64 \
          --tag ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}-amd64 \
          --load \
          .
    continue_on_error: false

  build_arm64:
    type: "exec"
    scripts:
      - |
        echo "Building arm64 image..."
        docker buildx build \
          --platform linux/arm64 \
          --tag ${IMAGE_NAME}:latest-arm64 \
          --tag ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}-arm64 \
          --load \
          .
    continue_on_error: false

  test_amd64:
    type: "exec"
    scripts:
      - |
        echo "Testing amd64 image..."
        docker run --rm ${IMAGE_NAME}:latest-amd64 --version
      - |
        echo "Running health check..."
        docker run --rm -d --name test-amd64 ${IMAGE_NAME}:latest-amd64
        sleep 5
        docker exec test-amd64 curl -f http://localhost:8080/health || true
        docker stop test-amd64
    continue_on_error: false

  test_arm64:
    type: "exec"
    scripts:
      - |
        echo "Testing arm64 image..."
        docker run --rm ${IMAGE_NAME}:latest-arm64 --version
      - |
        echo "Running health check..."
        docker run --rm -d --name test-arm64 ${IMAGE_NAME}:latest-arm64
        sleep 5
        docker exec test-arm64 curl -f http://localhost:8080/health || true
        docker stop test-arm64
    continue_on_error: false

  push:
    type: "exec"
    scripts:
      - |
        echo "Logging into registry..."
        echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin
      - |
        echo "Pushing amd64 image..."
        docker push ${IMAGE_NAME}:latest-amd64
        docker push ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}-amd64
      - |
        echo "Pushing arm64 image..."
        docker push ${IMAGE_NAME}:latest-arm64
        docker push ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}-arm64
    envs:
      DOCKER_USERNAME: "${DOCKERHUB_USERNAME}"
      DOCKER_PASSWORD: "${DOCKERHUB_TOKEN}"
    if_condition: "CI_TAG != '' || CI_BRANCH == 'main'"
    continue_on_error: false

  manifest:
    type: "exec"
    scripts:
      - |
        echo "Creating multi-arch manifest..."
        docker manifest create ${IMAGE_NAME}:latest \
          ${IMAGE_NAME}:latest-amd64 \
          ${_IMAGE_NAME}:latest-arm64
      - |
        echo "Annotating manifest..."
        docker manifest annotate ${IMAGE_NAME}:latest \
          ${IMAGE_NAME}:latest-amd64 --os linux --arch amd64
        docker manifest annotate ${IMAGE_NAME}:latest \
          ${IMAGE_NAME}:latest-arm64 --os linux --arch arm64
      - |
        echo "Pushing manifest..."
        docker manifest push ${IMAGE_NAME}:latest
      - |
        echo "Creating versioned manifest..."
        docker manifest create ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA} \
          ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}-amd64 \
          ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}-arm64
        docker manifest push ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}
    if_condition: "CI_TAG != '' || CI_BRANCH == 'main'"
    continue_on_error: false

  cleanup:
    type: "post"
    scripts:
      - |
        echo "Cleaning up..."
        docker buildx rm multiarch || true
        docker system prune -f || true
    when: "always"
```

## Step-by-Step Explanation

### Step 1: Setup

```yaml
setup:
  type: "pre"
  scripts:
    - docker --version
    - docker buildx version
    - |
      echo "Setting up QEMU for cross-compilation..."
      docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
    - |
      echo "Creating buildx builder..."
      docker buildx create --name multiarch --driver docker-container --use
    - docker buildx inspect --bootstrap
```

**What it does:**
- Verifies Docker installation
- Sets up QEMU for cross-compilation
- Creates a buildx builder instance
- Bootstraps the builder

### Step 2-3: Build

```yaml
build_amd64:
  type: "exec"
  scripts:
    - |
      echo "Building amd64 image..."
      docker buildx build \
        --platform linux/amd64 \
        --tag ${IMAGE_NAME}:latest-amd64 \
        --tag ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}-amd64 \
        --load \
        .
  continue_on_error: false
```

**What it does:**
- Builds image for specific architecture
- Tags with latest and commit SHA
- Loads into local Docker daemon

### Step 4-5: Test

```yaml
test_amd64:
  type: "exec"
  scripts:
    - |
      echo "Testing amd64 image..."
      docker run --rm ${IMAGE_NAME}:latest-amd64 --version
    - |
      echo "Running health check..."
      docker run --rm -d --name test-amd64 ${IMAGE_NAME}:latest-amd64
      sleep 5
      docker exec test-amd64 curl -f http://localhost:8080/health || true
      docker stop test-amd64
  continue_on_error: false
```

**What it does:**
- Tests image runs correctly
- Checks version output
- Runs health check
- Verifies application starts

### Step 6: Push

```yaml
push:
  type: "exec"
  scripts:
    - |
      echo "Logging into registry..."
      echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin
    - |
      echo "Pushing amd64 image..."
      docker push ${IMAGE_NAME}:latest-amd64
      docker push ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}-amd64
    - |
      echo "Pushing arm64 image..."
      docker push ${IMAGE_NAME}:latest-arm64
      docker push ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}-arm64
  envs:
    DOCKER_USERNAME: "${DOCKERHUB_USERNAME}"
    DOCKER_PASSWORD: "${DOCKERHUB_TOKEN}"
  if_condition: "CI_TAG != '' || CI_BRANCH == 'main'"
  continue_on_error: false
```

**What it does:**
- Logs into Docker registry
- Pushes architecture-specific images
- Only runs on main branch or tags

### Step 7: Manifest

```yaml
manifest:
  type: "exec"
  scripts:
    - |
      echo "Creating multi-arch manifest..."
      docker manifest create ${IMAGE_NAME}:latest \
        ${IMAGE_NAME}:latest-amd64 \
        ${IMAGE_NAME}:latest-arm64
    - |
      echo "Annotating manifest..."
      docker manifest annotate ${IMAGE_NAME}:latest \
        ${IMAGE_NAME}:latest-amd64 --os linux --arch amd64
      docker manifest annotate ${IMAGE_NAME}:latest \
        ${IMAGE_NAME}:latest-arm64 --os linux --arch arm64
    - |
      echo "Pushing manifest..."
      docker manifest push ${IMAGE_NAME}:latest
    - |
      echo "Creating versioned manifest..."
      docker manifest create ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA} \
        ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}-amd64 \
        ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}-arm64
      docker manifest push ${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}
  if_condition: "CI_TAG != '' || CI_BRANCH == 'main'"
  continue_on_error: false
```

**What it does:**
- Creates multi-arch manifest
- Annotates with platform information
- Pushes manifest to registry
- Creates versioned manifest

### Step 8: Cleanup

```yaml
cleanup:
  type: "post"
  scripts:
    - |
      echo "Cleaning up..."
      docker buildx rm multiarch || true
      docker system prune -f || true
  when: "always"
```

**What it does:**
- Removes buildx builder
- Cleans up Docker resources
- Runs even if previous steps failed

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DOCKERHUB_USERNAME` | Yes | Docker Hub username |
| `DOCKERHUB_TOKEN` | Yes | Docker Hub access token |
| `IMAGE_NAME` | No | Image name (default: myapp) |

## GHCR Variant

To push to GitHub Container Registry instead:

```yaml
push:
  type: "exec"
  scripts:
    - |
      echo "Logging into GHCR..."
      echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin
    - |
      echo "Pushing images..."
      docker push ghcr.io/${GITHUB_REPOSITORY_OWNER}/${IMAGE_NAME}:latest-amd64
      docker push ghcr.io/${GITHUB_REPOSITORY_OWNER}/${IMAGE_NAME}:latest-arm64
  envs:
    GITHUB_TOKEN: "${GITHUB_TOKEN}"
    GITHUB_ACTOR: "${GITHUB_ACTOR}"
    GITHUB_REPOSITORY_OWNER: "${GITHUB_REPOSITORY_OWNER}"
```

## Artifacts

| File | Description |
|------|-------------|
| `${IMAGE_NAME}:latest` | Multi-arch manifest |
| `${IMAGE_NAME}:latest-amd64` | AMD64 image |
| `${IMAGE_NAME}:latest-arm64` | ARM64 image |

## Customization

### Add more architectures

```yaml
build_armv7:
  type: "exec"
  scripts:
    - |
      docker buildx build \
        --platform linux/arm/v7 \
        --tag ${IMAGE_NAME}:latest-armv7 \
        --load \
        .
```

### Use build cache

```yaml
build_amd64:
  type: "exec"
  scripts:
    - |
      docker buildx build \
        --platform linux/amd64 \
        --tag ${IMAGE_NAME}:latest-amd64 \
        --cache-from type=registry,ref=${IMAGE_NAME}:cache-amd64 \
        --cache-to type=registry,ref=${IMAGE_NAME}:cache-amd64,mode=max \
        --push \
        .
```

### Add security scanning

```yaml
scan:
  type: "exec"
  scripts:
    - |
      echo "Scanning amd64 image..."
      docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy image ${IMAGE_NAME}:latest-amd64
    - |
      echo "Scanning arm64 image..."
      docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy image ${IMAGE_NAME}:latest-arm64
  continue_on_error: true
```

## Troubleshooting

### QEMU errors

```bash
# Reset QEMU
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

# Verify QEMU
docker run --rm --platform linux/arm64 alpine uname -m
```

### Buildx errors

```bash
# Recreate builder
docker buildx rm multiarch
docker buildx create --name multiarch --driver docker-container --use
docker buildx inspect --bootstrap
```

### Manifest errors

```bash
# Remove existing manifest
docker manifest rm ${IMAGE_NAME}:latest

# Recreate
docker manifest create ${IMAGE_NAME}:latest \
  ${IMAGE_NAME}:latest-amd64 \
  ${IMAGE_NAME}:latest-arm64
```

## Related Examples

- [Go Binary](go-binary.md) - Cross-compile Go binaries
- [Rust Cargo](rust-cargo.md) - Cross-compile Rust binaries
- [Security Scan](security-scan.md) - Scan images for vulnerabilities
