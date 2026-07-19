# Python Django Application

CI/CD pipeline for Django applications with testing, coverage, and migrations.

## Overview

This pipeline handles Django projects with:
- Dependency installation
- Code linting (flake8, black)
- Unit tests with pytest
- Coverage reporting
- Database migrations check
- Static file collection
- Artifact collection

## Use Case

- Django web applications
- Django REST Framework APIs
- Django with Celery
- Django with Channels

## Prerequisites

- Python 3.8+ project
- `requirements.txt` or `pyproject.toml`
- pytest configured

## Configuration

```yaml
# runner.yaml
image:
  name: "python"
  tag: "3.11-slim"
  pull_policy: "IfNotPresent"

on:
  push:
    - "main"
    - "develop"
  pull_request:
    - "main"

global_env:
  DJANGO_SETTINGS_MODULE: "myproject.settings.test"
  PYTHONUNBUFFERED: "1"

timeout: 1200  # 20 minutes

steps:
  setup:
    type: "pre"
    scripts:
      - python --version
      - pip --version
      - pip install --upgrade pip
      - pip install -r requirements.txt
      - pip install -r requirements-dev.txt

  lint:
    type: "exec"
    scripts:
      - |
        echo "Running flake8..."
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
      - |
        echo "Running black check..."
        black --check --diff .
      - |
        echo "Running isort check..."
        isort --check-only --diff .
    continue_on_error: false

  type_check:
    type: "exec"
    scripts:
      - |
        echo "Running mypy..."
        mypy . --ignore-missing-imports
    continue_on_error: true

  test:
    type: "exec"
    scripts:
      - |
        echo "Running tests with coverage..."
        pytest \
          --cov=myproject \
          --cov-report=html:coverage/html \
          --cov-report=xml:coverage/coverage.xml \
          --cov-report=term-missing \
          --junitxml=coverage/junit.xml \
          -v \
          --tb=short
    envs:
      DJANGO_SETTINGS_MODULE: "myproject.settings.test"
    continue_on_error: false
    timeout: 600

  migrations_check:
    type: "exec"
    scripts:
      - |
        echo "Checking for missing migrations..."
        python manage.py makemigrations --check --dry-run
      - |
        echo "Running migrations..."
        python manage.py migrate --noinput
    envs:
      DJANGO_SETTINGS_MODULE: "myproject.settings.test"
    continue_on_error: false

  static_files:
    type: "exec"
    scripts:
      - |
        echo "Collecting static files..."
        python manage.py collectstatic --noinput --clear
    envs:
      DJANGO_SETTINGS_MODULE: "myproject.settings.test"
    continue_on_error: false

  security_check:
    type: "exec"
    scripts:
      - |
        echo "Running security checks..."
        python manage.py check --deploy --fail-level WARNING
    envs:
      DJANGO_SETTINGS_MODULE: "myproject.settings.production"
    continue_on_error: true

  build_artifacts:
    type: "post"
    scripts:
      - |
        echo "Build artifacts:"
        ls -lh coverage/ || true
        ls -lh staticfiles/ || true
    when: "always"
    artifacts:
      - "coverage/**/*"
      - "staticfiles/**/*"
```

## Step-by-Step Explanation

### Step 1: Setup

```yaml
setup:
  type: "pre"
  scripts:
    - python --version
    - pip --version
    - pip install --upgrade pip
    - pip install -r requirements.txt
    - pip install -r requirements-dev.txt
```

**What it does:**
- Verifies Python installation
- Upgrades pip
- Installs production dependencies
- Installs development dependencies (pytest, flake8, etc.)

### Step 2: Lint

```yaml
lint:
  type: "exec"
  scripts:
    - |
      echo "Running flake8..."
      flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
      flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
    - |
      echo "Running black check..."
      black --check --diff .
    - |
      echo "Running isort check..."
      isort --check-only --diff .
  continue_on_error: false
```

**What it does:**
- Runs flake8 for critical errors (E9, F63, F7, F82)
- Runs flake8 for style warnings (non-blocking)
- Checks code formatting with black
- Checks import sorting with isort

### Step 3: Type Check

```yaml
type_check:
  type: "exec"
  scripts:
    - |
      echo "Running mypy..."
      mypy . --ignore-missing-imports
  continue_on_error: true
```

**What it does:**
- Runs mypy for type checking
- Ignores missing type stubs
- Non-blocking (continues on error)

### Step 4: Test

```yaml
test:
  type: "exec"
  scripts:
    - |
      echo "Running tests with coverage..."
      pytest \
        --cov=myproject \
        --cov-report=html:coverage/html \
        --cov-report=xml:coverage/coverage.xml \
        --cov-report=term-missing \
        --junitxml=coverage/junit.xml \
        -v \
        --tb=short
  envs:
    DJANGO_SETTINGS_MODULE: "myproject.settings.test"
  continue_on_error: false
  timeout: 600
```

**What it does:**
- Runs pytest with coverage
- Generates HTML coverage report
- Generates XML coverage report (for CI tools)
- Generates JUnit XML report
- Shows missing coverage in terminal

### Step 5: Migrations Check

```yaml
migrations_check:
  type: "exec"
  scripts:
    - |
      echo "Checking for missing migrations..."
      python manage.py makemigrations --check --dry-run
    - |
      echo "Running migrations..."
      python manage.py migrate --noinput
  envs:
    DJANGO_SETTINGS_MODULE: "myproject.settings.test"
  continue_on_error: false
```

**What it does:**
- Checks if all model changes have migrations
- Fails if migrations are missing
- Runs migrations on test database

### Step 6: Static Files

```yaml
static_files:
  type: "exec"
  scripts:
    - |
      echo "Collecting static files..."
      python manage.py collectstatic --noinput --clear
  envs:
    DJANGO_SETTINGS_MODULE: "myproject.settings.test"
  continue_on_error: false
```

**What it does:**
- Collects all static files
- Clears previous static files
- Verifies static file configuration

### Step 7: Security Check

```yaml
security_check:
  type: "exec"
  scripts:
    - |
      echo "Running security checks..."
      python manage.py check --deploy --fail-level WARNING
  envs:
    DJANGO_SETTINGS_MODULE: "myproject.settings.production"
  continue_on_error: true
```

**What it does:**
- Runs Django's deployment checklist
- Checks for security issues
- Non-blocking (continues on error)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DJANGO_SETTINGS_MODULE` | Yes | Django settings module |
| `DATABASE_URL` | No | Database connection URL |
| `SECRET_KEY` | No | Django secret key |
| `DEBUG` | No | Debug mode (default: False) |

## Artifacts

| File | Description |
|------|-------------|
| `coverage/html/` | HTML coverage report |
| `coverage/coverage.xml` | XML coverage report |
| `coverage/junit.xml` | JUnit test results |
| `staticfiles/` | Collected static files |

## Customization

### Use PostgreSQL for tests

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: test_db
      POSTGRES_PASSWORD: test_pass

steps:
  test:
    type: "exec"
    scripts:
      - pytest
    envs:
      DATABASE_URL: "postgresql://postgres:test_pass@postgres:5432/test_db"
```

### Add Django Debug Toolbar check

```yaml
debug_toolbar:
  type: "exec"
  scripts:
    - |
      echo "Checking debug toolbar is disabled..."
      python -c "from django.conf import settings; assert not settings.DEBUG"
  continue_on_error: false
```

### Run specific test modules

```yaml
test_api:
  type: "exec"
  scripts:
    - pytest myproject/api/ -v
  continue_on_error: false

test_models:
  type: "exec"
  scripts:
    - pytest myproject/models/ -v
  continue_on_error: false
```

## Troubleshooting

### Database connection errors

Ensure test database settings are correct:

```python
# settings/test.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}
```

### Missing migrations

```bash
# Generate migrations
python manage.py makemigrations

# Check for errors
python manage.py check
```

### Coverage not generating

Ensure `pytest-cov` is installed:

```bash
pip install pytest-cov
```

## Related Examples

- [React SPA](react-spa.md) - Frontend testing
- [Docker Multi-Arch](docker-multiarch.md) - Containerize Django app
