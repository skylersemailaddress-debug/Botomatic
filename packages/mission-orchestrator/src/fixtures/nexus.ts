// Nexus benchmark fixture — used ONLY for testing the generic mission compiler.
// Nexus is one benchmark input; the compiler must work for any large product spec.
export const NEXUS_BENCHMARK_SPEC = `
NEXUS CANONICAL MASTER BUILD SPEC — Benchmark Fixture

Nexus is a unified synthetic-intelligence operating system and autonomous software factory.
It is an enterprise monorepo with full subsystem separation.

Architecture: enterprise_monorepo
Product type: ai_platform

Required subsystems:
- Repo layout: monorepo with apps/, packages/, contracts/, validators/, evidence/
- API contracts: data schema, database entities, migrations, REST and RPC contracts
- Spec compiler: deterministic app spec (DAS), immutable build contract (IBC), spec analysis
- Execution runtime: job queue, packet DAG, worker pool, execution orchestrator
- Builder factory: blueprint registry, code synthesis, workspace materializer, domain builders
- Repair engine: dirty-repo detection, failure classification, patch engine, rollback
- Truth/memory engine: truth objects, 9 memory classes, contradiction detection, continuity
- Intelligence shell: command spine with NL/slash input, operational focus pane, deep surfaces
- Governance/security: RBAC with role hierarchy, tenant isolation, secrets management, autonomy tiers
- Deployment/rollback: export bundle, dry-run gate, live deployment pipeline, rollback checkpoint
- Validation system: proof ladder, claim boundary, evidence artifacts, 78+ validators
- Fresh clone proof: npm ci then build then test then validate:all then smoke from clean checkout

Key high-risk decisions:
- Auth: OIDC with role-based guards, multi-tenant isolation
- Payments: none in core; extensible via adapter pattern
- Database: Supabase (PostgreSQL), all mutations in code
- Deployment: Vercel (web), Trigger.dev (workers), Supabase (db)
- Compliance: SOC2-adjacent audit logging, secrets never logged
- Tenancy: multi-tenant with workspace isolation

Acceptance criteria:
- All 78+ validators pass deterministically
- Generated apps build, run, and pass /health smoke
- No validator passes on mock output
- Claim boundary enforced at every level
- Fresh clone proof: install then build then test then smoke from clean state
`;

export const NEXUS_BENCHMARK_PROJECT_ID = "benchmark_nexus_v1";
