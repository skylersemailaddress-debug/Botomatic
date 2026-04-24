# OIDC Negative-Path Production Proof

Date: 2026-04-24

## Result

PASS.

This artifact closes the OIDC negative-path proof gap without overstating production readiness.

- Real production-external evidence: existing Auth0-backed admin success proof in `release-evidence/runtime/production-external/OIDC_AUTH0_PROOF_2026-04-24.md`
- Independent local negative-token evidence: locally generated RS256 tokens against a temporary JWKS issuer, exercising the same Botomatic OIDC verifier and HTTP route guards

## Evidence split

### Real Auth0 evidence already merged

- External issuer: `https://dev-7fq48efb26j44svb.us.auth0.com/`
- Audience: `https://botomatic.local/api`
- Verified in merged artifact: Auth0-issued admin token successfully called `POST /api/projects/:projectId/governance/approval` with HTTP 200
- Source artifact: `release-evidence/runtime/production-external/OIDC_AUTH0_PROOF_2026-04-24.md`

### Independent local negative-token harness used here

- Temporary issuer: `http://127.0.0.1:4011`
- Audience: `botomatic-negative-aud`
- API base URL: `http://127.0.0.1:3003`
- Runtime mode: `commercial`
- Repository mode: `durable`
- Auth implementation: `oidc`

Rationale: this environment did not expose live Auth0 client-secret material for minting fresh external negative tokens. Auth0 positive control already exists. The negative-path checks below were executed with locally generated RS256 tokens and a temporary JWKS issuer so claim-validation and role-mapping behavior could be tested honestly end-to-end over HTTP without weakening the claim.

## Command summary

1. Start temporary JWKS issuer and write ephemeral private key to `/tmp/botomatic_oidc_negative_private.pem`.

```bash
node - <<'NODE'
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });
const kid = 'botomatic-negative-kid';
const issuer = 'http://127.0.0.1:4011';
const audience = 'botomatic-negative-aud';
fs.writeFileSync('/tmp/botomatic_oidc_negative_private.pem', privateKey.export({ type: 'pkcs1', format: 'pem' }));
fs.writeFileSync('/tmp/botomatic_oidc_negative_meta.json', JSON.stringify({ issuer, audience, kid }, null, 2));
const body = JSON.stringify({ keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] });
http.createServer((req, res) => {
  if (req.url === '/.well-known/jwks.json') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(body);
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true, issuer, audience, kid }));
}).listen(4011, '127.0.0.1');
NODE
```

2. Start Botomatic API against that issuer in durable commercial mode.

```bash
PORT=3003 \
RUNTIME_MODE=commercial \
PROJECT_REPOSITORY_MODE=durable \
OIDC_ISSUER_URL=http://127.0.0.1:4011 \
OIDC_CLIENT_ID=botomatic-negative-client \
OIDC_AUDIENCE=botomatic-negative-aud \
npx tsx apps/orchestrator-api/src/bootstrap.ts
```

3. Run a Node proof harness that:

- generated valid and invalid RS256 JWTs from the ephemeral private key
- created a proof project through `POST /api/projects/intake`
- called the guarded Botomatic routes below
- captured HTTP status and JSON body for each check

## Token claim summaries

No raw tokens are included below.

| Check | Token source | Claim summary |
|---|---|---|
| invalid issuer denied | local | `iss=http://127.0.0.1:4999`, `aud=botomatic-negative-aud`, role `reviewer`, valid signature from temporary JWKS key |
| invalid audience denied | local | `iss=http://127.0.0.1:4011`, `aud=https://wrong-audience.example/api`, role `reviewer`, valid signature |
| expired token denied | local | `iss=http://127.0.0.1:4011`, `aud=botomatic-negative-aud`, role `reviewer`, `exp=now-1h`, valid signature |
| malformed role defaults safe | local | `iss=http://127.0.0.1:4011`, `aud=botomatic-negative-aud`, role claim `superadmin`, valid signature |
| operator denied dangerous route | local | `iss=http://127.0.0.1:4011`, `aud=botomatic-negative-aud`, role `operator`, valid signature |
| reviewer denied admin-only route | local | `iss=http://127.0.0.1:4011`, `aud=botomatic-negative-aud`, role `reviewer`, valid signature |
| admin allowed on admin route | real Auth0 + local control | Real Auth0 proof already merged with admin claim; local control token used `iss=http://127.0.0.1:4011`, `aud=botomatic-negative-aud`, role `admin` |

## HTTP results

Bootstrap project for route checks:

- Route: `POST /api/projects/intake`
- HTTP: `200`
- Project id: `proj_1777057186757`

### 1. Invalid issuer token is denied

- Route: `GET /api/ops/metrics`
- HTTP: `401`
- Response:

```json
{
  "error": "OIDC issuer mismatch",
  "authImplementation": "oidc"
}
```

- Result: PASS

### 2. Invalid audience token is denied

- Route: `GET /api/ops/metrics`
- HTTP: `401`
- Response:

```json
{
  "error": "OIDC audience mismatch",
  "authImplementation": "oidc"
}
```

- Result: PASS

### 3. Expired token is denied

- Route: `GET /api/ops/metrics`
- HTTP: `401`
- Response:

```json
{
  "error": "OIDC token expired",
  "authImplementation": "oidc"
}
```

- Result: PASS

### 4. Malformed role token does not escalate and defaults safe

- Route: `POST /api/projects/proj_1777057186757/governance/approval`
- HTTP: `403`
- Response:

```json
{
  "error": "Forbidden",
  "requiredRole": "admin",
  "actualRole": "operator"
}
```

- Result: PASS

### 5. Operator token is denied from dangerous/admin route

- Route: `POST /api/projects/proj_1777057186757/repair/replay`
- HTTP: `403`
- Response:

```json
{
  "error": "Forbidden",
  "requiredRole": "admin",
  "actualRole": "operator"
}
```

- Result: PASS

### 6. Reviewer token is denied from admin-only route

- Route: `POST /api/projects/proj_1777057186757/governance/approval`
- HTTP: `403`
- Response:

```json
{
  "error": "Forbidden",
  "requiredRole": "admin",
  "actualRole": "reviewer"
}
```

- Result: PASS

### 7. Admin token is allowed on admin route

Real external Auth0 evidence already merged:

- Source artifact: `release-evidence/runtime/production-external/OIDC_AUTH0_PROOF_2026-04-24.md`
- Route: `POST /api/projects/proj_1777001215179/governance/approval`
- HTTP: `200`
- Response summary: `success=true`, `approvalStatus=approved`, `runtimeProofStatus=captured`

Supplemental local control executed in this run:

- Route: `POST /api/projects/proj_1777057186757/governance/approval`
- HTTP: `200`
- Response:

```json
{
  "success": true,
  "governanceApproval": {
    "updatedAt": "2026-04-24T18:59:47.071Z",
    "updatedBy": "admin-user",
    "modelVersion": "gate4-minimal-v1",
    "approvalStatus": "approved",
    "runtimeProofStatus": "captured",
    "runtimeProofRequired": true
  },
  "actorId": "admin-user"
}
```

- Result: PASS

## Summary table

| Check | Evidence type | Result |
|---|---|---|
| invalid issuer token is denied | local independent negative token | PASS |
| invalid audience token is denied | local independent negative token | PASS |
| expired token is denied | local independent negative token | PASS |
| malformed role token defaults safe | local independent negative token | PASS |
| operator denied from dangerous/admin route | local independent negative token | PASS |
| reviewer denied from admin-only route | local independent negative token | PASS |
| admin token allowed on admin route | real Auth0 merged proof, plus local control | PASS |

Overall: 7/7 PASS.

## Caveats

- This artifact does not claim full enterprise production proof.
- `manifest.json` and `proof_profile.json` were intentionally left unchanged.
- No P0 blockers were removed here.
- The positive admin success path is real external Auth0 evidence from the merged artifact noted above.
- Fresh external Auth0 negative tokens were not minted in this environment because live Auth0 secret material was not present in shell environment. The negative cases were instead executed with a local JWKS-backed issuer so issuer, audience, expiry, role mapping, and route authorization behavior could be tested honestly through Botomatic's real HTTP stack.
- This artifact proves OIDC negative-path behavior, but does not by itself justify setting `enterpriseReady=true`.