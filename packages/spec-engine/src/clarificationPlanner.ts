import { ClarificationItem, MasterSpec } from "./specModel";
import { isHighRiskField, shouldAutoDecide } from "./autonomyPolicy";

function item(
  field: string,
  question: string,
  importance: number,
  risk: "low" | "medium" | "high",
  userDelegated: boolean,
  hint?: string
): ClarificationItem {
  const mustAsk = importance >= 8 || isHighRiskField(field);
  return {
    id: `q_${field.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
    field,
    question,
    importance,
    risk,
    mustAsk,
    requiresApproval: mustAsk || (importance >= 7 && risk !== "low"),
    suggestedDefault: shouldAutoDecide({ field, importance, risk, userDelegated })
      ? "Use enterprise-safe default."
      : hint,
  };
}

export function planClarifications(spec: MasterSpec, userDelegated: boolean): ClarificationItem[] {
  const qs: ClarificationItem[] = [];

  // ── CATEGORY 1: App Identity ──────────────────────────────────────────────
  if (!spec.coreProblem || spec.coreProblem.length < 80) {
    qs.push(item(
      "core_problem",
      "Describe the core problem this app solves and who specifically experiences it. Be concrete — not 'helps teams', but 'helps 5-person marketing teams track campaign spend against budget in real time'.",
      10, "high", userDelegated
    ));
  }

  if (!spec.coreOutcome || spec.coreOutcome.length < 40) {
    qs.push(item(
      "core_outcome",
      "What is the single most important action a user must successfully complete for this app to deliver value? Walk through it end to end (e.g., 'A customer searches inventory → adds items to cart → checks out → receives confirmation email').",
      9, "high", userDelegated
    ));
  }

  // ── CATEGORY 2: Users & Roles ─────────────────────────────────────────────
  if (spec.roles.length < 2) {
    qs.push(item(
      "user_roles",
      "List every user type and what each can do. Be exhaustive. Example: Admin (full control + billing), Manager (approve requests + view reports), Employee (submit requests + view own data), Guest (read-only public content).",
      10, "high", userDelegated
    ));
  }

  if (spec.targetUsers.length < 2 || spec.targetUsers.includes("end_user")) {
    qs.push(item(
      "target_users",
      "Who are the end users — what is their technical level, industry, and company size? (e.g., 'non-technical HR managers at 50-500 person companies' vs 'senior DevOps engineers at startups'). This shapes every UI decision.",
      8, "medium", userDelegated
    ));
  }

  // ── CATEGORY 3: Core Workflows ────────────────────────────────────────────
  if (spec.workflows.length < 3) {
    qs.push(item(
      "primary_workflows",
      "Walk through the top 3 workflows step by step. For each, describe every screen, action, and decision point. Example: 'New Order: user selects items → configures options → reviews total → enters payment → confirmation email → order enters Pending → admin reviews → marks Fulfilled → customer gets shipped notification'.",
      10, "high", userDelegated
    ));
  }

  if (spec.stateMachines.length < 2) {
    qs.push(item(
      "status_flows",
      "Do any entities go through status progressions? List every valid transition. Example: 'Invoice: Draft → Sent → Paid | Draft → Cancelled'. Include who triggers each transition and what happens automatically (emails, webhooks, etc.).",
      8, "medium", userDelegated
    ));
  }

  // ── CATEGORY 4: Data Model ────────────────────────────────────────────────
  if (spec.dataEntities.length < 3) {
    qs.push(item(
      "data_entities",
      "List every main data entity with key fields and relationships. Example: 'User (id, email, role, createdAt) → has many Projects → each Project has many Tasks (title, status, dueDate, assigneeId) → Tasks belong to one User'. Include every entity that needs its own database table.",
      10, "high", userDelegated
    ));
  }

  qs.push(item(
    "data_retention",
    "Which data must never be hard-deleted? What is the retention/archival policy? (e.g., 'Orders: soft-delete only, keep 7 years for compliance. Accounts: hard-delete on GDPR request after 30-day anonymization window'). Any data regularly exported or reported on?",
    7, "medium", userDelegated,
    "Soft-delete all entities. No hard deletes except on explicit GDPR request."
  ));

  // ── CATEGORY 5: Authentication ────────────────────────────────────────────
  if (!spec.authModel || spec.authModel === "") {
    qs.push(item(
      "auth_method",
      "How do users log in? Choose all that apply: email+password, Google OAuth, GitHub OAuth, Microsoft/Azure SSO, SAML enterprise SSO, magic link (passwordless email), phone/SMS OTP. Is MFA required? Is there a password strength policy? Any IP allowlisting?",
      10, "high", userDelegated
    ));
  }

  if (!spec.tenancyModel || spec.tenancyModel === "") {
    qs.push(item(
      "tenancy_model",
      "Does each organization get isolated data (multi-tenant), or is all data shared (single-tenant)? If multi-tenant: does an org admin invite their team? Can users belong to multiple orgs? How is org switching handled in the UI?",
      10, "high", userDelegated
    ));
  }

  // ── CATEGORY 6: Payments & Billing ────────────────────────────────────────
  if (spec.payments.length > 0 && (!spec.pricingModel || spec.pricingModel === "")) {
    qs.push(item(
      "payment_details",
      "Full payment requirements: Which provider (Stripe strongly recommended)? One-time purchase, recurring subscription, or usage-based billing? What are the pricing tiers and prices? Do customers get invoices/receipts by email? Free trial period? What happens on payment failure — immediate lockout or grace period?",
      10, "high", userDelegated
    ));
  } else if (!/(payment|billing|checkout|subscription)/i.test(spec.coreProblem + " " + spec.appType)) {
    qs.push(item(
      "monetization",
      "Does this app handle any money — subscriptions, one-time purchases, marketplace fees, or billing? If yes: which provider, what pricing structure, and do users need billing history/invoices?",
      7, "medium", userDelegated,
      "No payments in V1."
    ));
  }

  // ── CATEGORY 7: Notifications ─────────────────────────────────────────────
  if (spec.notifications.length <= 1) {
    qs.push(item(
      "notifications",
      "What notifications does this app send, through which channels, and when? For each: what triggers it, who receives it, what does it say? Channels: transactional email, in-app notification bell, SMS/WhatsApp, push notification, Slack/Teams webhook. Example: 'Order placed → email confirmation to customer + Slack alert to ops team'.",
      8, "medium", userDelegated,
      "Transactional email only via Resend. No SMS or push in V1."
    ));
  }

  // ── CATEGORY 8: File Uploads & Media ─────────────────────────────────────
  if (!spec.filesAndMedia || spec.filesAndMedia.length === 0 || spec.filesAndMedia.includes("uploads")) {
    qs.push(item(
      "file_uploads",
      "Does the app handle file or image uploads? If yes: what file types and max sizes? Where stored (AWS S3, Cloudinary, Supabase Storage)? Access control (owner-only or public)? Are images resized or processed on upload?",
      7, "medium", userDelegated,
      "No file uploads in V1."
    ));
  }

  // ── CATEGORY 9: Third-Party Integrations ─────────────────────────────────
  if (spec.integrations.length === 0) {
    qs.push(item(
      "third_party_integrations",
      "List every third-party service this app must connect to at launch. For each: what data flows in/out, and is it sync or async? Common ones: Stripe, Twilio (SMS), SendGrid/Resend (email), Slack (alerts), Salesforce (CRM), Zapier, Google Analytics, Segment, Intercom, HubSpot, AWS S3, Cloudinary.",
      8, "medium", userDelegated,
      "No third-party integrations beyond email in V1."
    ));
  }

  // ── CATEGORY 10: Email Provider ───────────────────────────────────────────
  qs.push(item(
    "email_provider",
    "Which email provider for transactional emails (welcome, password reset, notifications, invoices)? Options: Resend (recommended), SendGrid, AWS SES, Postmark, Mailgun. Existing API key? Custom sending domain (e.g., noreply@yourcompany.com)?",
    7, "medium", userDelegated,
    "Resend with placeholder API key — configure before launch."
  ));

  // ── CATEGORY 11: Real-Time Features ──────────────────────────────────────
  qs.push(item(
    "realtime_requirements",
    "Does the app need live updates without page refresh? Examples: live chat, collaborative editing (Google Docs-style), live counters, instant status updates, typing indicators, presence awareness (who's online). If yes, describe exactly what data must update live and for whom.",
    7, "medium", userDelegated,
    "No real-time features in V1 — polling acceptable if needed."
  ));

  // ── CATEGORY 12: Background Jobs & Scheduling ─────────────────────────────
  qs.push(item(
    "background_jobs",
    "Are there tasks that run in the background or on a schedule? Examples: 'Send weekly digest every Monday 9am', 'Archive orders older than 2 years every Sunday night', 'Sync from Salesforce every 15 minutes', 'Generate monthly invoices on the 1st'. List each with trigger and action.",
    7, "medium", userDelegated,
    "No background jobs in V1."
  ));

  // ── CATEGORY 13: Compliance & Legal ──────────────────────────────────────
  if (spec.complianceRequirements.length === 0) {
    qs.push(item(
      "compliance",
      "Any regulatory requirements? Select all that apply: GDPR (EU — must support data export + deletion + consent), HIPAA (US health data — requires BAA + encrypted PHI), SOC2 (security audit — access logs + encryption at rest), PCI-DSS (card data — never store raw card numbers), CCPA (California privacy). Industry-specific regulations?",
      9, "high", userDelegated
    ));
  }

  qs.push(item(
    "audit_trail",
    "Do you need a full audit log of every action (who did what, when, on which record)? Internal debugging only, compliance requirement, or both? Can users view their own history? Can admins export logs?",
    7, "medium", userDelegated,
    "Full audit trail for admin use only. Not user-visible."
  ));

  // ── CATEGORY 14: Scale & Performance ─────────────────────────────────────
  qs.push(item(
    "scale_expectations",
    "Scale targets: At launch — concurrent users, requests/minute on busiest endpoint, total DB records. At 12 months — same numbers. Any operations that process large volumes (bulk imports, reports over millions of rows, video/image processing)?",
    7, "medium", userDelegated,
    "Under 100 concurrent users and 10k records at launch. Optimize after product-market fit."
  ));

  // ── CATEGORY 15: Database ─────────────────────────────────────────────────
  qs.push(item(
    "database_choice",
    "Which database? PostgreSQL (recommended — best for relational data, Supabase/Railway compatible), MySQL, MongoDB (document store for unstructured data), SQLite (single-file, dev/small-scale only). Preferred host: Supabase, PlanetScale, Neon, Railway Postgres, AWS RDS?",
    8, "medium", userDelegated,
    "PostgreSQL via Supabase."
  ));

  // ── CATEGORY 16: Deployment & Infrastructure ──────────────────────────────
  if (!spec.deploymentTarget || spec.deploymentTarget === "vercel") {
    qs.push(item(
      "deployment_target",
      "Where does this deploy? Frontend: Vercel (recommended for Next.js), Netlify, or static host. Backend/API: Railway (recommended — simple Git-deploy), Render, Fly.io, AWS/GCP/Azure. Who manages secrets in production? Staging environment required?",
      8, "medium", userDelegated,
      "Frontend: Vercel. Backend: Railway. No staging environment in V1."
    ));
  }

  qs.push(item(
    "infrastructure_extras",
    "Does the app need: Redis (for sessions, rate limiting, caching)? CDN for static assets? Message queue (RabbitMQ, AWS SQS) for async processing? Search engine (Typesense, Algolia, Elasticsearch) for full-text search?",
    6, "low", userDelegated,
    "None in V1 — add as performance bottlenecks appear."
  ));

  // ── CATEGORY 17: UI/UX ────────────────────────────────────────────────────
  qs.push(item(
    "ui_style",
    "UI style — choose closest: (1) B2B SaaS dashboard (dense data tables, charts, sidebar nav), (2) Consumer app (clean, mobile-first, card layouts), (3) Marketplace/directory (search + filters + listing pages), (4) Admin panel (full CRUD tables, bulk actions), (5) Landing page + authenticated app. Reference apps or design system preference (Tailwind/shadcn/MUI/custom)?",
    8, "medium", userDelegated,
    "B2B SaaS dashboard using Tailwind + shadcn/ui."
  ));

  qs.push(item(
    "mobile_requirements",
    "Mobile importance: (1) Desktop-only is fine, (2) Must work on mobile browsers (responsive web), (3) Needs a native mobile app via React Native/Expo, (4) Mobile is the primary platform. If mobile: iOS and/or Android? Is offline support needed?",
    7, "medium", userDelegated,
    "Responsive web — desktop primary, mobile must work but not optimized."
  ));

  // ── CATEGORY 18: V1 Scope Lock ────────────────────────────────────────────
  qs.push(item(
    "v1_exclusions",
    "What is explicitly OUT of scope for V1? This is as important as what IS in scope — it prevents scope creep. Examples: 'No mobile app', 'No Salesforce integration', 'No multi-language/i18n', 'No dark mode', 'No public API for third parties', 'No advanced analytics'. Be specific.",
    9, "high", userDelegated
  ));

  // ── CATEGORY 19: API Exposure ─────────────────────────────────────────────
  qs.push(item(
    "external_api",
    "Does this app expose a public API for third parties to call, or receive webhooks from external services (e.g., Stripe payment events, GitHub push events, Twilio SMS callbacks)? If yes: which endpoints, what auth method (API key, OAuth 2.0), rate limiting?",
    7, "medium", userDelegated,
    "No public API in V1 — internal use only."
  ));

  // ── CATEGORY 20: Performance-Critical Paths ───────────────────────────────
  qs.push(item(
    "performance_critical",
    "Are there pages or operations where speed is business-critical? (e.g., 'Search results under 200ms', 'Dashboard loads in under 2s', 'CSV export of 100k rows under 30s', 'Checkout completes in under 3s'). Knowing this upfront changes database indexing and architecture choices.",
    6, "low", userDelegated,
    "Standard performance targets — optimize for correctness first."
  ));

  return qs
    .sort((a, b) => b.importance - a.importance)
    .filter((q, idx, arr) => arr.findIndex(x => x.id === q.id) === idx); // deduplicate
}
