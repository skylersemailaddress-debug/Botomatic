# Builder Forensic Capability Report

Generated: 2026-05-02T06:55:40.430Z
Total prompts tested: 475
Categories covered: 40
PASS_REAL rate: 0%
PASS_REAL + PASS_PARTIAL rate: 0%
Fail rate: 0%
Unsupported rate: 100%
Runtime success rate: 0%
Follow-up edit success rate: 0%
Repair success rate: 0%
Fake contamination rate: 0%
Owner verdict: FAIL_PRIVATE_BETA

## 99% Claim Test

No. Measured PASS_REAL rate is 0% and PASS_REAL+PASS_PARTIAL is 0%, below a defensible 99% claim.

## Top 10 Blockers

1. API unavailable or unreachable (475)
2. No generated project path returned for local build validation (475)
3. Repair loop not executed for this case (475)
4. Follow-up edit path not executed for this case (375)
5. Follow-up edit API request failed (100)

## Category Capability Matrix

| Category | Total | PASS_REAL | PASS_PARTIAL | BLOCKED_UNSUPPORTED | FAIL_BUILDER | FAIL_RUNTIME | FAIL_QUALITY | FAIL_FAKE |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| add-auth-payments-email-db-edit | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| admin-internal-ops | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| ai-writing-tool | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| analytics-reporting-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| api-integration-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| auth-heavy-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| booking-scheduling-app | 23 | 0 | 0 | 23 | 0 | 0 | 0 | 0 |
| chat-collab-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| contradictory-prompt | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| course-lms | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| crm | 18 | 0 | 0 | 18 | 0 | 0 | 0 | 0 |
| dirty-repo-repair-build-prompts | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| ecommerce-storefront | 23 | 0 | 0 | 23 | 0 | 0 | 0 | 0 |
| events-community | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| failure-recovery-prompts | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| file-upload-heavy-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| finance-budgeting | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| fitness-wellness | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| follow-up-edits-after-first-build | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| healthcare-intake-non-medical | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| huge-build-me-airbnb-uber-shopify | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| inventory-logistics | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| job-board | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| legal-intake-non-legal-advice | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| local-service-site | 23 | 0 | 0 | 23 | 0 | 0 | 0 | 0 |
| make-it-prettier-design-edit | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| marketplace | 18 | 0 | 0 | 18 | 0 | 0 | 0 | 0 |
| messy-typo-filled-prompt | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| mobile-first-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| multi-tenant-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| one-page-landing-page | 23 | 0 | 0 | 23 | 0 | 0 | 0 | 0 |
| payment-subscription-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| project-management | 16 | 0 | 0 | 16 | 0 | 0 | 0 | 0 |
| real-estate-listings | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| restaurant-order-app | 23 | 0 | 0 | 23 | 0 | 0 | 0 | 0 |
| role-based-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| saas-dashboard | 18 | 0 | 0 | 18 | 0 | 0 | 0 | 0 |
| social-community-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| support-ticketing | 15 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| weird-vague-app | 5 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
