# Reusable GitHub Actions Workflows

This repository contains centralized, reusable GitHub Actions workflows used across multiple repositories.

## Available Workflows

### Python Test Workflow

**File:** `.github/workflows/python-test.yml`

Runs Python tests with pytest and coverage reporting.

**Usage:**

```yaml
name: Run Tests

on:
  push:
    branches: ['**']
  pull_request:

jobs:
  test:
    uses: <your-org>/github-workflows/.github/workflows/python-test.yml@main
    with:
      python-version: '3.11'
      coverage-package: 'your_package_name'
      install-editable: false
      skip-tracells-db: false
      concurrency-enabled: true
```

**Inputs:**

- `python-version` (optional, default: `3.11`): Python version to use
- `test-path` (optional, default: `tests/`): Path to tests directory
- `coverage-package` (required): Package name for coverage reporting
- `install-editable` (optional, default: `false`): Install package in editable mode
- `skip-tracells-db` (optional, default: `false`): Skip tracells-db dependency
- `extra-install-commands` (optional): Extra commands to run during installation
- `concurrency-enabled` (optional, default: `true`): Enable concurrency cancellation

**Secrets:**

- `TRACELLS_SKIP_DB_INIT` (optional): Skip database initialization for tests

### PR Review Workflow

**File:** `.github/workflows/pr-review.yml`

Runs AI-powered PR review using AWS Bedrock and the pr-review-agents repository.

**Usage:**

```yaml
name: AI PR Review

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: write
  id-token: write

jobs:
  review:
    if: github.event.pull_request.head.repo.full_name == github.repository && !github.event.pull_request.draft
    uses: Tracells/github-workflows/.github/workflows/pr-review.yml@v1
    secrets:
      AWS_ROLE_ARN: ${{ secrets.AWS_PR_REVIEW_ROLE_ARN }}
      AWS_REGION: ${{ secrets.AWS_REGION }}
```

**Secrets:**

- `AWS_ROLE_ARN` (optional): AWS IAM role ARN for Bedrock access
- `AWS_REGION` (optional, default: `us-east-1`): AWS region

## Setup Instructions

1. **Create this repository** on GitHub (e.g., `Tracells/github-workflows` or `your-org/github-workflows`)
2. **Push this code** to the repository
3. **Update consuming repositories** to reference these workflows (see examples below)

## Example Conversions

### Email Processing

```yaml
# .github/workflows/test.yml
name: Run Tests

on:
  push:
    branches: ['**', '!main']

jobs:
  test:
    uses: Tracells/github-workflows/.github/workflows/python-test.yml@main
    with:
      python-version: '3.11'
      coverage-package: 'email_parser'
      concurrency-enabled: true
```

### RedCAP

```yaml
# .github/workflows/test.yml
name: Run Tests

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  test:
    uses: Tracells/github-workflows/.github/workflows/python-test.yml@main
    with:
      python-version: '3.11'
      coverage-package: 'redcap'
      skip-tracells-db: true
```

### Tracells DB

```yaml
# .github/workflows/test.yml
name: Run Tests

on:
  push:
    branches: ['**']

jobs:
  test:
    uses: Tracells/github-workflows/.github/workflows/python-test.yml@main
    with:
      python-version: '3.11'
      coverage-package: 'src.db'
      install-editable: true
      concurrency-enabled: true
    secrets:
      TRACELLS_SKIP_DB_INIT: '1'
```

## Versioning

- Use `@main` for the latest version
- Create tags (e.g., `@v1`, `@v1.2.3`) for stable versions
- Pin to specific tags in production workflows for stability

## Contributing

When updating workflows:

1. Test changes in a consuming repository first
2. Consider backward compatibility
3. Document breaking changes in commit messages
4. Tag releases appropriately
