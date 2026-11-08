# CLAUDE.md

## Project Overview

Centralized reusable GitHub Actions workflows for the Tracells organization. Consumed by multiple repos (listed in `REPOS.yml`) via `workflow_call`. Also includes an AI-powered PR review system that runs three specialized reviewer agents via AWS Bedrock.

## Tech Stack

- **Workflows:** GitHub Actions reusable workflows (YAML)
- **PR Review Tool:** Node.js (ESM, `"type": "module"`), requires Node >= 18
- **LLM Backend:** AWS Bedrock with Claude Sonnet (`us.anthropic.claude-sonnet-4-5-20250929-v1:0`)
- **Dependencies:** `@aws-sdk/client-bedrock-runtime`, `@octokit/rest`, `yaml`
- **Target Infra:** AWS CDK, Lambda, CloudFormation (in consuming repos)

## Directory Structure

```
.github/workflows/       # Reusable workflow definitions (the core product)
  cdk-deploy.yml         # CDK deployment with OIDC or access key auth
  python-test.yml        # Python pytest + coverage
  pre-deploy-validation.yml  # CDK changeset dry-run + Lambda package validation
  pr-review.yml          # AI PR review orchestration
src/auto-pr-review/      # Node.js PR review tool
  index.js               # Entry point - orchestrates review pipeline
  config.js              # Loads per-repo config from .github/pr-review.yml
  github.js              # GitHub API (Octokit) - fetch PR context, post comments
  reviewers/             # Reviewer agents (architecture, reliability, security)
    index.js             # Runs all reviewers in parallel via Bedrock
    filter.js            # Post-review filter that removes pedantic findings
    cluster.js           # Clusters similar findings by Jaccard similarity
    architecture.js      # Architecture/design reviewer prompt + parser
    reliability.js       # Reliability/correctness reviewer prompt + parser
    security.js          # Security/privacy reviewer prompt + parser
examples/                # Example workflow configs for consuming repos
scripts/worktree-cleanup.sh  # Git worktree cleanup utility
REPOS.yml                # List of repos consuming these workflows
```

## Commands

- `npm install` -- install dependencies (no lockfile committed)
- `npm run pr-review` / `node src/auto-pr-review/index.js` -- run PR review locally (requires env vars: `GITHUB_TOKEN`, `PR_NUMBER`, `REPO_OWNER`, `REPO_NAME`, `BASE_SHA`, `HEAD_SHA`, `TARGET_REPO_PATH`, `AWS_REGION`)
- No test suite, no linter, no build step configured

## Key Architecture

- **Workflow inputs/secrets pattern:** Each reusable workflow declares typed inputs and optional secrets. Consuming repos pass their values through `workflow_call`. Secrets like DB credentials are threaded through as environment variables.
- **PR review pipeline:** `index.js` loads config -> fetches PR diff via Octokit + `git diff` -> runs 3 reviewer agents in parallel via Bedrock -> deduplicates findings -> clusters similar findings (Jaccard similarity >= 0.6, same reviewer + severity) -> runs a filter agent to remove pedantic suggestions -> posts/updates a single PR comment.
- **Reviewer agents** each have `buildPrompt()` and `parseResponse()` methods. All expect and return JSON arrays. Each reviewer has its own `shouldExcludeFile()` function (duplicated across files).
- **Filter agent** acts as a quality gate: keeps only bugs, security issues, perf problems, and critical arch issues. Returns JSON `{"keep": [indices]}`.
- **Comment management:** The bot updates its existing comment on re-review rather than posting duplicates. Tracks edit count and UTC timestamp.

## Conventions and Gotchas

- ESM modules throughout (`import`/`export`, `"type": "module"` in package.json). No CommonJS.
- No `package-lock.json` committed. `npm install` (not `npm ci`) for this repo; consuming workflow steps use `npm ci` for their own CDK infra dirs.
- `shouldExcludeFile()` is duplicated in each reviewer file -- if you change the glob-to-regex logic, update all three.
- The Bedrock model ID is hardcoded in `src/auto-pr-review/reviewers/index.js`. Update it there if switching models.
- Workflow files reference `Tracells/github-workflows` as the org/repo path.
- The `pre-deploy-validation` workflow creates real CloudFormation changesets (with `--no-execute`) then cleans them up. It needs valid AWS credentials even though it doesn't deploy.
- Auth supports two modes: OIDC (`use-oidc: true` + `AWS_DEPLOY_ROLE_ARN`) or access keys (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`).
- Version pinning: consumers should use `@main` or tags like `@v1`. The README documents this.
