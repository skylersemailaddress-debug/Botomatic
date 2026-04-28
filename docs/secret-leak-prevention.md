# DEPLOY-001 Secret Leak Prevention

## Scope
- Enforce metadata-only secret reference handling (`secret://`), never plaintext values in committed artifacts.
- Validate runtime evidence does not contain secret-like values.
- Keep deployment preflight secret readiness checks fail-closed.

## Non-goals
- No expansion into unrelated deployment orchestration scope.
- No changes to generated app corpus or dirty-repo evidence contract.
- No REPO-001 behavior changes.

## Policy
- Secrets must be represented by references and redacted metadata only.
- `.env` patterns must remain gitignored with explicit `.env.example` exception.
