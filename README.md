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

Runs AI-powered PR review using AWS Bedrock with multiple specialized senior engineer agents:
- **Architecture Reviewer** - System design, module boundaries, API design, maintainability
- **Reliability Reviewer** - Correctness, edge cases, error handling, observability
- **Security Reviewer** - Auth/authz, secrets, input validation, data leakage

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

**Configuration (Optional):**

Create `.github/pr-review.yml` in your repository to customize:

```yaml
# Enable/disable specific reviewers
reviewers:
  architecture: true
  reliability: true
  security: true

# Minimum severity to report (low, medium, high)
min_severity: medium

# File patterns to exclude
exclude_patterns:
  - "**/*.test.js"
  - "**/*.spec.ts"
  - "**/fixtures/**"

# Maximum PR size (files changed) before skipping review
max_pr_size: 50
```

**Secrets:**

- `AWS_ROLE_ARN` (required): AWS IAM role ARN for Bedrock access
- `AWS_REGION` (optional, default: `us-east-1`): AWS region

### CDK Deploy Workflow

**File:** `.github/workflows/cdk-deploy.yml`

Deploys AWS CDK infrastructure with support for both OIDC and access key authentication.

**Usage (OIDC authentication):**

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  test:
    name: Run Tests
    uses: Tracells/github-workflows/.github/workflows/python-test.yml@v1.0.0
    with:
      python-version: '3.11'
      coverage-package: 'your_package'

  deploy:
    needs: test
    uses: Tracells/github-workflows/.github/workflows/cdk-deploy.yml@v1
    with:
      use-oidc: true
      aws-region: 'us-east-2'
      infra-path: 'infra'
    secrets:
      AWS_DEPLOY_ROLE_ARN: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
```

**Usage (Access keys with environment variables):**

```yaml
deploy:
  needs: test
  uses: Tracells/github-workflows/.github/workflows/cdk-deploy.yml@v1
  with:
    use-oidc: false
    stack-name: 'MyStackName'
    install-global-cdk: true
  secrets:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    DB_HOST: ${{ secrets.DB_HOST }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

**Inputs:**

- `node-version` (optional, default: `'20'`): Node.js version
- `python-version` (optional, default: `'3.11'`): Python version
- `aws-region` (optional, default: `'us-east-2'`): AWS region
- `infra-path` (optional, default: `'infra'`): Path to CDK infrastructure directory
- `stack-name` (optional): CDK stack name (leave empty to deploy all stacks)
- `use-oidc` (optional, default: `false`): Use OIDC authentication vs access keys
- `install-global-cdk` (optional, default: `false`): Install AWS CDK CLI globally

**Secrets:**

- `AWS_ACCESS_KEY_ID` (required if `use-oidc: false`)
- `AWS_SECRET_ACCESS_KEY` (required if `use-oidc: false`)
- `AWS_DEPLOY_ROLE_ARN` (required if `use-oidc: true`)
- Environment secrets: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REPORT_RECIPIENTS`, `SES_FROM_EMAIL` (all optional)

## Using Test Workflow in Deployment Pipelines

You can call the Python test workflow as a job within your deployment workflow to avoid duplicating test code:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  test:
    name: Run Tests
    uses: Tracells/github-workflows/.github/workflows/python-test.yml@v1.0.0
    with:
      python-version: '3.11'
      coverage-package: 'your_package'

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      # Your deployment steps here
      - name: Deploy
        run: echo "Deploy after tests pass"
```

This pattern:
- Eliminates test code duplication between test.yml and deploy.yml
- Ensures consistent testing across workflows
- Updates automatically when the centralized workflow is updated

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
