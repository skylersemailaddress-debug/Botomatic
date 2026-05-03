# Builder Forensic Capability Report

Generated: 2026-05-03T01:39:06.922Z
Total prompts tested: 325
Categories covered: 40
PASS_REAL rate: 38.15%
PASS_REAL + PASS_PARTIAL rate: 38.15%
Prompts reaching builder runtime: 125
Prompts generating artifacts/plans: 125
Built successfully: 125
Ran successfully: 124
Repaired successfully: 0
Fail rate: 0.31%
Unsupported rate: 61.54%
Runtime success rate: 38.46%
Follow-up edit success rate: 30.77%
Repair success rate: 0%
Fake contamination rate: 0%
Owner verdict: FAIL_PRIVATE_BETA

## 99% Claim Test

No. Measured PASS_REAL rate is 38.15% and PASS_REAL+PASS_PARTIAL is 38.15%, below a defensible 99% claim.

## Top 10 Blockers

1. API unavailable or unreachable (200)
2. Follow-up edit API request failed (200)
3. No generated project path returned for local build validation (200)
4. Prompt did not reach builder runtime path (200)
5. Repair loop replay failed (200)
6. Repair loop not executed for this case (125)
7. Follow-up edit path not executed for this case (25)
8. Runtime smoke failed (1)

## Category Capability Matrix

| Category | Total | PASS_REAL | PASS_PARTIAL | BLOCKED_UNSUPPORTED | FAIL_BUILDER | FAIL_RUNTIME | FAIL_QUALITY | FAIL_FAKE |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| add-auth-payments-email-db-edit | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| admin-internal-ops | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| ai-writing-tool | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| analytics-reporting-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| api-integration-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| auth-heavy-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| booking-scheduling-app | 15 | 10 | 0 | 5 | 0 | 0 | 0 | 0 |
| chat-collab-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| contradictory-prompt | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| course-lms | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| crm | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| dirty-repo-repair-build-prompts | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| ecommerce-storefront | 15 | 10 | 0 | 5 | 0 | 0 | 0 | 0 |
| events-community | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| failure-recovery-prompts | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| file-upload-heavy-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| finance-budgeting | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| fitness-wellness | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| follow-up-edits-after-first-build | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| healthcare-intake-non-medical | 10 | 4 | 0 | 5 | 0 | 1 | 0 | 0 |
| huge-build-me-airbnb-uber-shopify | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| inventory-logistics | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| job-board | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| legal-intake-non-legal-advice | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| local-service-site | 15 | 10 | 0 | 5 | 0 | 0 | 0 | 0 |
| make-it-prettier-design-edit | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| marketplace | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| messy-typo-filled-prompt | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| mobile-first-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| multi-tenant-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| one-page-landing-page | 15 | 10 | 0 | 5 | 0 | 0 | 0 | 0 |
| payment-subscription-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| project-management | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| real-estate-listings | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| restaurant-order-app | 15 | 10 | 0 | 5 | 0 | 0 | 0 | 0 |
| role-based-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| saas-dashboard | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| social-community-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| support-ticketing | 10 | 5 | 0 | 5 | 0 | 0 | 0 | 0 |
| weird-vague-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
