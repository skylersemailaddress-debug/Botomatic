# Auth0 OIDC Production-Like Proof

Date: 2026-04-24

## Result

PASS.

This proof used an external Auth0 issuer, real JWKS-backed RS256 token verification, Botomatic OIDC mode, and a real Auth0-issued access token with the Botomatic admin role claim.

## Environment

- OIDC issuer: https://dev-7fq48efb26j44svb.us.auth0.com/
- OIDC audience: https://botomatic.local/api
- Repository mode: durable
- Auth implementation: oidc

## Verified claims

Decoded Auth0 access token payload included:

- iss: https://dev-7fq48efb26j44svb.us.auth0.com/
- aud: https://botomatic.local/api
- https://botomatic.dev/role: admin
- gty: client-credentials

## Botomatic health proof

Botomatic /api/health returned:

- HTTP 200
- repositoryMode: durable
- repositoryImplementation: DurableProjectRepository
- durableEnvPresent: true
- authEnabled: true
- authImplementation: oidc
- role: admin
- issuer: https://dev-7fq48efb26j44svb.us.auth0.com/
- requestId present

## Protected admin route proof

Request:

POST /api/projects/proj_1777001215179/governance/approval

Result:

- HTTP 200
- success: true
- approvalStatus: approved
- runtimeProofStatus: captured
- actorId from Auth0 client identity

## Caveat

This proof covers a real external Auth0 issuer and admin-role protected route success. Remaining OIDC proof still needs negative-path token cases:

- invalid issuer denied
- invalid audience denied
- expired token denied
- malformed role defaults safe
- operator denied dangerous route
- reviewer denied admin route
