# Migration Guide: Centralizing GitHub Actions Workflows

## Overview

This guide walks through migrating your repositories to use centralized, reusable workflows.

## Step 1: Create the Central Repository on GitHub

1. Go to GitHub and create a new repository (e.g., `Tracells/github-workflows`)
2. Make it **public** (required for reusable workflows) or ensure all consuming repos have access
3. Push this code:

```bash
cd /Users/danielb/repos/github-workflows
git remote add origin git@github.com:Tracells/github-workflows.git
git branch -M main
git commit -m "Add reusable Python test workflow"
git push -u origin main
```

## Step 2: Update Each Repository

For each repository, replace the existing test.yml with the reusable workflow version.

### Email Processing

**Replace:** `/Users/danielb/repos/email-processing/.github/workflows/test.yml`

```yaml
name: Run Tests

on:
  push:
    branches:
      - '**'
      - '!main'

jobs:
  test:
    uses: Tracells/github-workflows/.github/workflows/python-test.yml@main
    with:
      python-version: '3.11'
      coverage-package: 'email_parser'
      concurrency-enabled: true
```

**Before/After:**
- Before: 44 lines
- After: 13 lines
- **Savings: 70% reduction**

---

### RedCAP

**Replace:** `/Users/danielb/repos/redcap/.github/workflows/test.yml`

```yaml
name: Run Tests

on:
  push:
    branches:
      - '**'
  pull_request:
    branches:
      - main

jobs:
  test:
    uses: Tracells/github-workflows/.github/workflows/python-test.yml@main
    with:
      python-version: '3.11'
      coverage-package: 'redcap'
      skip-tracells-db: true
```

**Before/After:**
- Before: 48 lines
- After: 17 lines
- **Savings: 65% reduction**

---

### Tracells DB

**Replace:** `/Users/danielb/repos/tracells-db/.github/workflows/test.yml`

```yaml
name: Run Tests

on:
  push:
    branches:
      - '**'

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

**Before/After:**
- Before: 48 lines
- After: 17 lines
- **Savings: 65% reduction**

---

## Step 3: Test the Migration

For each repository:

1. Create a test branch: `git checkout -b test/centralized-workflows`
2. Replace the test.yml file with the new version
3. Commit: `git add .github/workflows/test.yml && git commit -m "Migrate to centralized workflow"`
4. Push and open a PR to verify the workflow runs correctly
5. Merge once verified

## Step 4: Benefits Achieved

After migration:

✅ **Single source of truth** - Update workflow logic once, affects all repos
✅ **Consistency** - All repos use identical testing patterns
✅ **Reduced duplication** - ~70% reduction in workflow file size
✅ **Easier maintenance** - Bug fixes and improvements apply everywhere
✅ **Version control** - Can pin to stable versions with tags

## Step 5: Making Changes Going Forward

When you need to update the test workflow:

1. Edit `.github/workflows/python-test.yml` in the central repo
2. Test in one consuming repo first
3. Push to main (or create a tagged release)
4. All repos automatically use the updated workflow

### Using Tags for Stability

For production stability, create tags:

```bash
cd /Users/danielb/repos/github-workflows
git tag -a v1.0.0 -m "Initial release of Python test workflow"
git push origin v1.0.0
```

Then pin repositories to the tag:

```yaml
uses: Tracells/github-workflows/.github/workflows/python-test.yml@v1.0.0
```

## Current Workflow Status

### Already Centralized ✓
- **PR Review** - Already using `Tracells/pr-review-agents/.github/workflows/review.yml@main`
  - email-processing
  - redcap
  - tracells-db

### Ready to Centralize
- **Python Tests** - Can now use centralized workflow
  - email-processing
  - redcap
  - tracells-db

### Unique Workflows (Keep as-is)
- **pr-review-agents/test.yml** - Node.js specific validation (keep local)
- **tasks_board/deploy-netlify.yml** - Deploy specific (keep local)
- **email-processing/deploy.yml** - Deploy specific (keep local)
- **tracells-db/deploy.yml** - Deploy specific (keep local)
- **tracells-db/migrations.yml** - Database specific (keep local)

## Troubleshooting

### Workflow not found
- Ensure the central repository is public or accessible
- Verify the repository path is correct (`Tracells/github-workflows`)
- Check that the workflow file exists at `.github/workflows/python-test.yml`

### Permissions errors
- Ensure the central repo is public, or grant access to all consuming repos

### Secrets not passed correctly
- Remember: secrets must be explicitly passed from caller to reusable workflow
- Use `secrets: inherit` to pass all secrets, or pass individually

## Questions?

Check the README.md in this repository for full documentation on all inputs and usage patterns.
