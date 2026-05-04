import { ExecuteRequest } from "./types.js";

export type WaveType =
  | "repo_layout"
  | "api_schema"
  | "auth"
  | "builder_factory"
  | "spec_compiler"
  | "intelligence_shell"
  | "governance_security"
  | "deployment_rollback"
  | "validation_proof"
  | "fresh_clone_proof"
  | "execution_runtime"
  | "repair_replay"
  | "truth_memory"
  | "generic";

export function detectWaveType(packetId: string, goal: string): WaveType {
  const id = (packetId + " " + goal).toLowerCase();
  if (/repo[_-]?layout|scaffold|monorepo|workspace|tsconfig/.test(id)) return "repo_layout";
  if (/api[_-]?schema|data.?model|migration|prisma|database|schema/.test(id)) return "api_schema";
  if (/auth|rbac|role|permission|jwt|session|clerk|oauth/.test(id)) return "auth";
  if (/builder[_-]?factory|build.?pipeline|ci[_-]?cd|build.?system/.test(id)) return "builder_factory";
  if (/spec[_-]?compiler|spec.?engine|compiler|intake/.test(id)) return "spec_compiler";
  if (/intelligence|shell|ui.?shell|admin|frontend|dashboard/.test(id)) return "intelligence_shell";
  if (/governance|security|audit|compliance|policy/.test(id)) return "governance_security";
  if (/deploy|rollback|vercel|railway|release/.test(id)) return "deployment_rollback";
  if (/valid|test|proof|evidence|e2e|smoke/.test(id)) return "validation_proof";
  if (/fresh[_-]?clone|clone.?proof|final.?proof/.test(id)) return "fresh_clone_proof";
  if (/execution|runtime|worker|queue|job/.test(id)) return "execution_runtime";
  if (/repair|replay|fix|recover|patch/.test(id)) return "repair_replay";
  if (/memory|truth|state|store|cache/.test(id)) return "truth_memory";
  return "generic";
}

const HEALTH_ENDPOINT = `
// Health endpoint — required for smoke validation
if (req.url === "/health") {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: SERVICE_NAME }));
  return;
}`.trim();

// ── Trusted dependency manifest ───────────────────────────────────────────────
// Use ONLY these packages and versions. This prevents AI from inventing package
// names, using deprecated APIs, or picking versions with breaking changes.
const TRUSTED_DEPS = `
## APPROVED PACKAGES — use ONLY these (do not invent or use unlisted packages):

### HTTP / Framework
- express@4.19.2          — HTTP server (prefer over raw http for complex routes)
- cors@2.8.5              — CORS middleware for Express
- helmet@7.1.0            — Security headers for Express

### Auth / Security
- jsonwebtoken@9.0.2      — JWT sign/verify (import as "jsonwebtoken")
- bcryptjs@2.4.3          — Password hashing (NOT bcrypt — use bcryptjs, pure JS)
- express-rate-limit@7.3.1 — Rate limiting middleware

### Database / ORM
- @prisma/client@5.14.0   — Prisma ORM client (always use with schema.prisma)
- prisma@5.14.0           — Prisma CLI (dev dependency)

### Validation
- zod@3.23.8              — Schema validation (use for all input validation)

### Email
- resend@3.2.0            — Transactional email (preferred)
- @sendgrid/mail@8.1.3    — SendGrid alternative

### Payments
- stripe@15.7.0           — Stripe SDK (import: import Stripe from "stripe")

### File Storage
- @aws-sdk/client-s3@3.600.0      — AWS S3 v3 SDK
- @aws-sdk/s3-request-presigner@3.600.0 — Presigned URLs

### WebSockets / Real-time
- socket.io@4.7.5         — WebSocket server (with socket.io-client@4.7.5 on client)

### Utilities
- uuid@9.0.1              — UUID generation (import: import { v4 as uuidv4 } from "uuid")
- date-fns@3.6.0          — Date manipulation (NOT moment.js)
- dotenv@16.4.5           — Env var loading

### Queue / Jobs
- bullmq@5.8.4            — Job queue with Redis
- ioredis@5.3.2           — Redis client

### Testing
- vitest@1.6.0            — Test runner (preferred over jest)
- supertest@7.0.0         — HTTP testing

### Frontend (if applicable)
- next@14.2.4             — Next.js app router
- react@18.3.1 / react-dom@18.3.1
- tailwindcss@3.4.4       — Utility CSS
- @radix-ui/react-*@latest — Headless UI primitives (shadcn/ui uses these)

### Do NOT use:
- moment.js (use date-fns), lodash (use native JS), axios (use fetch),
  request (deprecated), node-fetch (use built-in fetch in Node 18+),
  mongoose (use Prisma), sequelize (use Prisma), passport (implement JWT directly)
`.trim();

export function buildSystemPrompt(): string {
  return `You are an expert full-stack software engineer generating production-quality Node.js/TypeScript application code. You MUST:

1. Generate REAL, WORKING code — no placeholders, no TODOs, no "// implement this"
2. Every server file MUST include a /health endpoint returning { status: "ok" }
3. Use TypeScript where appropriate, prefer .ts over .js for all logic files
4. All files must be syntactically valid and immediately runnable by Node.js 20+
5. Use built-in Node.js fetch (Node 18+) instead of axios or node-fetch
6. Keep implementations focused and complete — no skeleton stubs, no half-finished code

CRITICAL: The /health endpoint returning JSON { status: "ok" } is MANDATORY in any HTTP server file.

${TRUSTED_DEPS}`;
}

function buildCrossPacketContext(req: ExecuteRequest): string {
  const parts: string[] = [];

  // Repo structure — helps every wave understand the monorepo layout
  if (req.repoStructure) {
    parts.push(`## Repo Structure (from repo_layout wave)\n${req.repoStructure.slice(0, 800)}`);
  }

  // Data model — critical for auth, builder_factory, api_schema, intelligence_shell
  if (req.dataModelSchema) {
    parts.push(`## Data Model (from api_schema wave)\nUse these exact entity names and field types in your implementation:\n\`\`\`prisma\n${req.dataModelSchema.slice(0, 1200)}\n\`\`\``);
  }

  // API routes — helps auth, builder, and UI waves know the contract
  if (req.apiRoutes) {
    parts.push(`## API Contract (from api_schema wave)\n\`\`\`typescript\n${req.apiRoutes.slice(0, 800)}\n\`\`\``);
  }

  // Summary of all completed waves — gives broader situational awareness
  if (req.previousWaveOutputs && req.previousWaveOutputs.length > 0) {
    const summaries = req.previousWaveOutputs
      .map(w => `- [${w.waveType}] ${w.summary} → files: ${w.fileList.slice(0, 6).join(", ")}`)
      .join("\n");
    parts.push(`## Completed Waves\n${summaries}`);
  }

  return parts.length > 0 ? `\n---\n${parts.join("\n\n")}\n---\n` : "";
}

// ── Domain blueprint constraints ─────────────────────────────────────────────
// Injected per wave to enforce proven patterns that AI consistently gets wrong.
const DOMAIN_CONSTRAINTS: Partial<Record<WaveType, string>> = {
  auth: `
## AUTH IMPLEMENTATION RULES (non-negotiable):
- JWT: use jsonwebtoken@9.0.2. Sign with process.env.JWT_SECRET. Expiry: 15m access token, 7d refresh token in httpOnly cookie.
- Password: ALWAYS use bcryptjs.hash(password, 12) — NEVER store plaintext or use bcrypt (use bcryptjs).
- Middleware: extract Bearer token from Authorization header, verify, attach decoded user to req.user.
- RBAC: canDo(user, action, resource) helper that checks role permissions map.
- Routes: POST /auth/register, POST /auth/login (returns {accessToken}), POST /auth/refresh, POST /auth/logout, GET /auth/me.
- Logout: clear the refresh token cookie AND invalidate token (add to blocklist or use short TTL).
- NEVER hardcode secrets. ALWAYS read from process.env. Throw clear error if JWT_SECRET missing at startup.`,

  api_schema: `
## PRISMA SCHEMA RULES (non-negotiable):
- ALWAYS include: id String @id @default(cuid()), createdAt DateTime @default(now()), updatedAt DateTime @updatedAt on every model.
- ALWAYS add @@index on foreign key fields (e.g., @@index([userId])).
- Soft-delete: add deletedAt DateTime? to any entity that should be soft-deleted; filter WHERE deletedAt IS NULL in all queries.
- Enums: use Prisma enums (not string fields) for status fields.
- Relations: always define both sides of the relation explicitly.
- Generate working Prisma schema that passes \`prisma validate\`.`,

  governance_security: `
## SECURITY RULES (non-negotiable):
- Rate limiting: apply express-rate-limit to all auth endpoints (max 10 req/15min).
- Input validation: use zod schemas for ALL incoming request bodies — never trust raw req.body.
- SQL injection: use Prisma parameterized queries ONLY — never string-concatenate into queries.
- XSS: sanitize any user content before storing or returning as HTML.
- Secrets: scanner must flag any string matching /[a-z0-9]{32,}/i that appears in source code literals.
- Audit: every mutating action must write to audit_log with {timestamp, actorId, action, resourceType, resourceId, before, after}.`,

  deployment_rollback: `
## DEPLOYMENT RULES (non-negotiable):
- vercel.json: set framework to null for API-only, or "nextjs" for Next.js. Include rewrites if needed.
- Health probe: poll GET /health until 200 or timeout 120s with 2s interval.
- Rollback: use git tags for checkpoints (git tag before deploy, git checkout tag on rollback).
- Dockerfile: multi-stage — build stage (node:20-alpine + npm ci + npm run build), runtime stage (node:20-alpine + only production files).
- Environment: NEVER hardcode values — all secrets via process.env, verified at startup.`,

  validation_proof: `
## TESTING RULES (non-negotiable):
- Use vitest (NOT jest). Import: import { describe, it, expect, beforeAll, afterAll } from "vitest".
- Smoke test: start the actual server on a random port, hit GET /health, assert status 200 and body.status === "ok".
- Integration tests: test the actual HTTP endpoints with supertest — not mocked behavior.
- Coverage: test happy path AND the most important error case (400 bad input, 401 unauthorized) for each endpoint.
- Each test file must be independently runnable: no shared mutable state between describe blocks.`,

  intelligence_shell: `
## FRONTEND RULES (non-negotiable):
- Use Next.js 14 App Router (not Pages Router). Server components by default, client components only where needed.
- Auth guard: create middleware.ts at root that checks for auth cookie/token and redirects to /login if missing.
- API client (lib/api.ts): typed fetch wrapper that reads NEXT_PUBLIC_API_BASE_URL from env, includes credentials: "include".
- Error states: every data-fetching component must handle loading, error, and empty states.
- Tailwind: use shadcn/ui patterns — cn() utility, className merging, consistent spacing scale.`,

  execution_runtime: `
## QUEUE/WORKER RULES (non-negotiable):
- In-memory queue: use a Map<string, Job> with status: "queued"|"running"|"succeeded"|"failed".
- Worker: process one job at a time, mark running before starting, always mark succeeded/failed in finally block.
- Timeouts: wrap job execution in Promise.race with a 60s timeout — failed jobs must not block the queue.
- Retry: support max 3 retries with exponential backoff (1s, 2s, 4s). Track retryCount on each job.
- /queue/status endpoint: return {queued, running, succeeded, failed, total} counts.`,
};

export function buildUserPrompt(req: ExecuteRequest, waveType: WaveType): string {
  const { goal, requirements, constraints, packetId } = req;

  const reqLines = requirements.length > 0
    ? `\nRequirements:\n${requirements.map(r => `- ${r}`).join("\n")}`
    : "";
  const conLines = constraints.length > 0
    ? `\nConstraints:\n${constraints.map(c => `- ${c}`).join("\n")}`
    : "";

  const waveContext = WAVE_CONTEXT[waveType] ?? WAVE_CONTEXT.generic;
  const crossPacketCtx = buildCrossPacketContext(req);
  const domainConstraints = DOMAIN_CONSTRAINTS[waveType] ?? "";

  return `${waveContext.preamble}

Packet ID: ${packetId}
Goal: ${goal}${reqLines}${conLines}
${crossPacketCtx}
${waveContext.instructions}
${domainConstraints}

Generate all necessary files using the write_files tool. Each file must be complete and functional.
${waveContext.fileHints}`;
}

const WAVE_CONTEXT: Record<WaveType, { preamble: string; instructions: string; fileHints: string }> = {
  repo_layout: {
    preamble: "Generate a production monorepo scaffold.",
    instructions: `Create the core workspace structure including:
- Root package.json with workspaces, build, test, lint scripts
- tsconfig.json with strict settings
- Shared types package (packages/core-contracts/src/index.ts)
- A working HTTP entrypoint (apps/api/src/server.ts) with /health endpoint
- .gitignore, .npmrc for the monorepo`,
    fileHints: `Required files: package.json, tsconfig.json, packages/core-contracts/src/index.ts, apps/api/src/server.ts, .gitignore`,
  },

  api_schema: {
    preamble: "Generate API contracts, data model, and database schema.",
    instructions: `Create:
- Prisma schema (schema.prisma) with all entities from the spec, proper relations, and indexes
- SQL migration file (migrations/001_initial.sql) equivalent
- TypeScript type definitions (src/types/models.ts) for all entities
- API route contracts (src/types/api.ts) with request/response types for all endpoints
- A working Express API server (src/server.ts) with CRUD routes and /health`,
    fileHints: `Required files: prisma/schema.prisma, migrations/001_initial.sql, src/types/models.ts, src/types/api.ts, src/server.ts`,
  },

  auth: {
    preamble: "Generate authentication and authorization implementation.",
    instructions: `Create:
- JWT auth middleware (src/middleware/auth.ts) — sign/verify tokens, extract user from header
- RBAC policy (src/auth/rbacPolicy.ts) — role definitions, permission checks, canDo() helpers
- Auth routes (src/routes/auth.ts) — POST /auth/login, POST /auth/logout, GET /auth/me
- Session types (src/types/auth.ts) — User, Role, Session, JWTPayload interfaces
- A working server (src/server.ts) wiring auth middleware and routes, with /health`,
    fileHints: `Required files: src/middleware/auth.ts, src/auth/rbacPolicy.ts, src/routes/auth.ts, src/types/auth.ts, src/server.ts`,
  },

  builder_factory: {
    preamble: "Generate build pipeline and factory configuration.",
    instructions: `Create:
- Build orchestrator (src/builder.ts) — runs build steps, collects results, reports status
- Pipeline config (src/pipeline.ts) — defines stages: lint, typecheck, test, bundle
- Build scripts (scripts/build.mjs) — executable build entry point
- CI config (.github/workflows/ci.yml) — lint, test, build on push
- Health server (src/server.ts) — exposes /health and /status for build state`,
    fileHints: `Required files: src/builder.ts, src/pipeline.ts, scripts/build.mjs, .github/workflows/ci.yml, src/server.ts`,
  },

  spec_compiler: {
    preamble: "Generate spec compilation and analysis engine.",
    instructions: `Create:
- Spec parser (src/specParser.ts) — parses text spec into structured CompilerInput
- Wave compiler (src/waveCompiler.ts) — compiles spec into ordered waves with acceptance criteria
- Hash engine (src/hashEngine.ts) — deterministic SHA-256 hashing for spec/wave IDs
- Compiler CLI (src/cli.ts) — reads spec file, outputs compiled mission JSON
- Health server (src/server.ts) — /health + /compile endpoint accepting spec text`,
    fileHints: `Required files: src/specParser.ts, src/waveCompiler.ts, src/hashEngine.ts, src/cli.ts, src/server.ts`,
  },

  intelligence_shell: {
    preamble: "Generate UI shell and admin frontend.",
    instructions: `Create:
- Next.js page layout (app/layout.tsx) — root layout with navigation sidebar
- Dashboard page (app/dashboard/page.tsx) — status cards, mission progress, wave list
- App shell component (components/AppShell.tsx) — nav, auth guard, theme
- API client (lib/api.ts) — typed fetch wrappers for all backend routes
- Health check (app/api/health/route.ts) — Next.js route returning { status: "ok" }`,
    fileHints: `Required files: app/layout.tsx, app/dashboard/page.tsx, components/AppShell.tsx, lib/api.ts, app/api/health/route.ts`,
  },

  governance_security: {
    preamble: "Generate governance, security, and compliance layer.",
    instructions: `Create:
- Security policy (src/security/policy.ts) — defines allowed operations, risk levels, approval gates
- Audit logger (src/audit/log.ts) — structured audit trail with timestamp, actor, action, outcome
- Compliance checker (src/compliance/checker.ts) — validates operations against policy, blocks violations
- Secret validator (src/secrets/validator.ts) — scans for hardcoded credentials, enforces env-only secrets
- Health server (src/server.ts) — /health + /audit/recent endpoint`,
    fileHints: `Required files: src/security/policy.ts, src/audit/log.ts, src/compliance/checker.ts, src/secrets/validator.ts, src/server.ts`,
  },

  deployment_rollback: {
    preamble: "Generate deployment configuration and rollback procedures.",
    instructions: `Create:
- Vercel config (vercel.json) — production deployment with env var references
- Deployment script (scripts/deploy.mjs) — pre-flight checks, deploy, smoke, rollback on failure
- Rollback handler (src/rollback.ts) — checkpoint save before deploy, restore on failure
- Health probe (scripts/health-probe.mjs) — polls /health until ready or timeout
- Docker config (Dockerfile) — multi-stage Node.js production build`,
    fileHints: `Required files: vercel.json, scripts/deploy.mjs, src/rollback.ts, scripts/health-probe.mjs, Dockerfile`,
  },

  validation_proof: {
    preamble: "Generate validation and test suite.",
    instructions: `Create:
- Integration test suite (tests/integration.test.ts) — tests all API endpoints with real HTTP calls
- Unit tests (tests/unit.test.ts) — tests core business logic functions
- Smoke test (tests/smoke.test.ts) — starts server, hits /health, validates response
- Test runner (scripts/run-tests.mjs) — orchestrates unit + integration + smoke, reports results
- Health server stub (src/server.ts) — minimal server for smoke tests to target`,
    fileHints: `Required files: tests/integration.test.ts, tests/unit.test.ts, tests/smoke.test.ts, scripts/run-tests.mjs, src/server.ts`,
  },

  fresh_clone_proof: {
    preamble: "Generate fresh clone verification scripts.",
    instructions: `Create:
- Clone verifier (scripts/verify-fresh-clone.mjs) — clones repo, runs npm ci, npm run build, npm test, reports all results
- Preflight checker (scripts/preflight.mjs) — validates all required env vars, ports, dependencies present
- Smoke harness (scripts/smoke-harness.mjs) — starts server, runs 10 health checks, measures latency
- Verification report (scripts/report.mjs) — aggregates all check results into pass/fail JSON
- Health server (src/server.ts) — production-ready server with /health for harness`,
    fileHints: `Required files: scripts/verify-fresh-clone.mjs, scripts/preflight.mjs, scripts/smoke-harness.mjs, scripts/report.mjs, src/server.ts`,
  },

  execution_runtime: {
    preamble: "Generate execution runtime and worker infrastructure.",
    instructions: `Create:
- Job queue (src/queue/jobQueue.ts) — in-memory queue with enqueue, dequeue, status tracking
- Worker (src/worker/worker.ts) — processes jobs from queue, handles retries, reports results
- Execution engine (src/engine/executor.ts) — runs job payloads, captures stdout/stderr, enforces timeout
- Job types (src/types/jobs.ts) — Job, JobResult, JobStatus, WorkerConfig interfaces
- Health server (src/server.ts) — /health + /queue/status endpoint`,
    fileHints: `Required files: src/queue/jobQueue.ts, src/worker/worker.ts, src/engine/executor.ts, src/types/jobs.ts, src/server.ts`,
  },

  repair_replay: {
    preamble: "Generate repair and replay engine.",
    instructions: `Create:
- Failure detector (src/repair/detector.ts) — identifies failure type from error message/exit code
- Repair strategy (src/repair/strategy.ts) — maps failure types to repair actions
- Replay engine (src/repair/replay.ts) — re-runs failed operations with repair applied
- Repair log (src/repair/log.ts) — records repair attempts, outcomes, final status
- Health server (src/server.ts) — /health + /repair/status endpoint`,
    fileHints: `Required files: src/repair/detector.ts, src/repair/strategy.ts, src/repair/replay.ts, src/repair/log.ts, src/server.ts`,
  },

  truth_memory: {
    preamble: "Generate state memory and truth store.",
    instructions: `Create:
- Memory store (src/memory/store.ts) — key-value store with namespacing, TTL, persistence to disk
- Truth compiler (src/truth/compiler.ts) — reduces conversation/state into canonical MasterTruth object
- Snapshot manager (src/memory/snapshots.ts) — save/load/diff memory snapshots
- Query engine (src/truth/query.ts) — structured queries against truth store
- Health server (src/server.ts) — /health + /memory/snapshot endpoint`,
    fileHints: `Required files: src/memory/store.ts, src/truth/compiler.ts, src/memory/snapshots.ts, src/truth/query.ts, src/server.ts`,
  },

  generic: {
    preamble: "Generate the requested application component.",
    instructions: `Create a complete, working implementation based on the goal and requirements. Include:
- Core business logic module (src/index.ts or appropriate entry point)
- Type definitions (src/types.ts)
- Any required utility modules
- A working HTTP server (src/server.ts) with /health endpoint returning { status: "ok" }`,
    fileHints: `Required files: src/index.ts, src/types.ts, src/server.ts`,
  },
};
