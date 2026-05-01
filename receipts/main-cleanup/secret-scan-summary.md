# Secret Scan Summary

Command executed:

grep -RInE "sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|github_pat_|xoxb-|xoxp-|AIza[0-9A-Za-z_-]{35}|AUTH0_CLIENT_SECRET|CLIENT_SECRET|PRIVATE_KEY|BEGIN RSA PRIVATE KEY|BEGIN PRIVATE KEY|SLACK_WEBHOOK|WEBHOOK_URL" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next || true

Result:

- Matches were found, but all reviewed hits are either:
  - environment variable names/placeholders,
  - validator/test fixtures for secret-detection logic,
  - documentation examples,
  - proof metadata naming expected secret variables.
- No confirmed live credential or private key material detected.

Notes:

- Raw grep output is intentionally not preserved in a tracked file to avoid introducing secret-like token strings into repository receipts.
