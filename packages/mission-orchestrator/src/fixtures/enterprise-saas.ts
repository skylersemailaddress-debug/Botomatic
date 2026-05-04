// Non-Nexus benchmark fixture: Enterprise SaaS HR Platform
export const ENTERPRISE_SAAS_SPEC = `
ENTERPRISE HR PLATFORM — Benchmark Fixture

A full-stack multi-tenant SaaS platform for human resources management.
Manages employee records, payroll, time-off requests, performance reviews, and compliance reporting.

Architecture: full_stack_app
Product type: saas_platform

Core features:
- Employee directory with role-based access (admin, manager, employee, HR)
- Payroll processing with pay stubs and compliance reporting
- Time-off request workflow with approval chains
- Performance review cycles with 360-degree feedback
- Compliance reporting for GDPR, SOC2, and regional labor laws
- Multi-tenant: each company is an isolated workspace

Required waves:
- foundation_setup: scaffold with apps/api, apps/web, packages/core
- data_model: Employee, PayrollRun, TimeOffRequest, Review, Compliance entities with migrations
- api_layer: REST API with RBAC-protected endpoints for all core features
- auth_rbac: OIDC SSO with role-based guards (admin, manager, employee, HR)
- core_business_logic: payroll calculation engine, approval workflow state machines
- frontend_shell: React dashboard with role-specific views and admin console
- integrations: Stripe for billing, email notifications, optional HR data export
- validation_testing: unit, integration, and e2e tests with validators
- deployment: Vercel and Supabase with environment-specific config
- fresh_clone_proof: clean checkout then install then build then test then smoke

High-risk decisions:
- Auth: OIDC SSO required with internal auth fallback
- Payments: Stripe for subscription billing
- Database: PostgreSQL via Supabase
- Tenancy: strict multi-tenant isolation per workspace
- Compliance: GDPR data deletion, SOC2 audit logging
- Deployment target: Vercel for web, Supabase for database

Acceptance criteria:
- All RBAC guards enforced at API boundary
- Payroll calculation deterministic and auditable
- GDPR deletion cascade works correctly
- Time-off approval workflow state machine proven
- Fresh clone proof passes from clean checkout
`;

export const ENTERPRISE_SAAS_PROJECT_ID = "benchmark_enterprise_saas_v1";
