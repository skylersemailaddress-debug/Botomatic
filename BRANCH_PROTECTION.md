# Branch Protection Baseline for `main`

This repository uses required pull request checks before merge. Configure the `main` branch in GitHub branch protection / rulesets with the following baseline.

## GitHub-enforceable branch/ruleset settings

1. **Require a pull request before merging**
   - Disallow direct pushes to `main`.
2. **Require status checks to pass before merging**
   - **Required now (only):** `Botomatic PR Gates / Required PR Gate`.
   - `Botomatic PR Gates / Baseline required checks` and `Botomatic PR Gates / Strict readiness audit` remain visible workflow jobs, but should **not** be directly required by the ruleset.
   - This single stable required context prevents stale duplicate Expected/Successful required-check entries when internal workflow job wiring changes.
3. **Require branches to be up to date before merging**
   - Enable strict status checks so PRs must rebase or merge latest `main` before merge.
4. **Block force pushes**
   - Force pushes must be disabled for `main`.
5. **Block branch deletion**
   - Prevent deletion of `main`.
6. **Require conversation resolution before merging**
   - All review conversations must be resolved.
7. **Require at least 1 approving review**
   - Enforce one approving review before merge.
8. **Optional: Require CODEOWNERS review (if added later)**
   - Enable CODEOWNERS-required review when a CODEOWNERS file/policy is introduced.

## Process/PR-template requirements

- **No auto-merge for high-risk PRs without explicit maintainer approval**
  - High-risk categories (release claims, validator behavior, deployment policy, compliance changes) require explicit maintainer approval before auto-merge.
- **UI PRs require screenshot proof**
  - PR description must include screenshot evidence for user-visible changes.
- **Generated-app PRs require generated-output proof**
  - PR description must include generated output artifacts/logs.
- **Self-upgrade PRs require drift/regression proof**
  - PR description must include drift/regression evidence.
- **Human review policy**
  - Bot reviews can assist, but maintainer approval is the acceptance standard. If strict bot-exclusion is required later, add a dedicated status check or CODEOWNERS/ruleset policy.

## PR gate workflow commands

### Baseline required checks (workflow job, not directly required by ruleset)

- `npm ci`
- `npm run -s build`
- `npm run -s test:universal`
- `npm run -s doctor`

### Strict readiness audit (workflow job, not directly required by ruleset)

- `npm ci`
- `npm run -s validate:all`

### Required PR Gate (only required ruleset status check)

- `echo "All required Botomatic PR gates passed."`

## Migration rule: stable required gate aggregation
`Botomatic PR Gates / Required PR Gate` is the only required ruleset check. It depends on Baseline required checks and Strict readiness audit so both must pass, while avoiding duplicate stale required contexts in GitHub rulesets.

## Optional proof commands (not required on every PR)

Proof suites can be expensive and are intentionally **not** required on every pull request. Run them for release readiness or scoped risk reviews:

- `npm run -s proof:fast`
- `npm run -s proof:all`
- `npm run -s proof:self-upgrade` (for self-upgrade changes)

Keep these optional to avoid excessive CI time while preserving truthful release evidence workflows.
