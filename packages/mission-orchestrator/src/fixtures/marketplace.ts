// Non-Nexus benchmark fixture: Vendor Marketplace Platform
export const MARKETPLACE_SPEC = `
VENDOR MARKETPLACE PLATFORM — Benchmark Fixture

A multi-sided marketplace connecting buyers and vendors.
Supports product listings, order management, payments, reviews, and vendor onboarding.

Architecture: full_stack_app
Product type: marketplace

Core features:
- Vendor onboarding with profile, catalog, and verification workflow
- Product listings with search, filtering, and category taxonomy
- Shopping cart and checkout with Stripe Connect payments and platform fee split
- Order lifecycle: placed then confirmed then shipped then delivered then reviewed
- Buyer and vendor dashboards with real-time notifications
- Review and rating system with basic fraud detection
- Admin console for marketplace oversight and vendor approval

Required waves:
- foundation_setup: scaffold with apps/api, apps/web, packages/core
- data_model: Vendor, Product, Order, Review, Payment, Notification entities with migrations
- api_layer: REST endpoints for listings, orders, payments, reviews with RBAC
- auth_rbac: JWT with social auth, roles for buyer, vendor, and admin
- core_business_logic: order state machine, payment split logic, review aggregation
- frontend_shell: buyer storefront, vendor dashboard, admin console
- integrations: Stripe Connect for payments, email and SMS notifications, search indexing
- validation_testing: order flow e2e tests, payment edge cases, fraud detection tests
- deployment: Vercel and Supabase with Stripe Connect live credentials
- fresh_clone_proof: clean checkout then install then build then test then smoke

High-risk decisions:
- Auth: JWT with social OAuth, role-based access for buyer, vendor, admin
- Payments: Stripe Connect with platform fee percentage split
- Database: PostgreSQL via Supabase
- Tenancy: single-tenant marketplace with vendor isolation
- Compliance: PCI-DSS via Stripe, GDPR for EU buyers
- Deployment target: Vercel for web, Supabase for database

Acceptance criteria:
- Order lifecycle state machine is deterministic
- Stripe Connect platform fee split is correct
- Vendor and buyer data is isolated
- Product search returns relevant results
- Fresh clone proof passes from clean checkout
`;

export const MARKETPLACE_PROJECT_ID = "benchmark_marketplace_v1";
