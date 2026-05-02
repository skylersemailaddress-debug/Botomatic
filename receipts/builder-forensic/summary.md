# Builder Forensic Capability Report

Generated: 2026-05-02T07:01:51.837Z
Total prompts tested: 825
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

1. API unavailable or unreachable (825)
2. No generated project path returned for local build validation (825)
3. Repair loop not executed for this case (600)
4. Follow-up edit API request failed (425)
5. Follow-up edit path not executed for this case (400)
6. Repair loop replay failed (225)

## Category Capability Matrix

| Category | Total | PASS_REAL | PASS_PARTIAL | BLOCKED_UNSUPPORTED | FAIL_BUILDER | FAIL_RUNTIME | FAIL_QUALITY | FAIL_FAKE |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| add-auth-payments-email-db-edit | 20 | 0 | 0 | 20 | 0 | 0 | 0 | 0 |
| admin-internal-ops | 25 | 0 | 0 | 25 | 0 | 0 | 0 | 0 |
| ai-writing-tool | 25 | 0 | 0 | 25 | 0 | 0 | 0 | 0 |
| analytics-reporting-app | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| api-integration-app | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| auth-heavy-app | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| booking-scheduling-app | 38 | 0 | 0 | 38 | 0 | 0 | 0 | 0 |
| chat-collab-app | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| contradictory-prompt | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| course-lms | 25 | 0 | 0 | 25 | 0 | 0 | 0 | 0 |
| crm | 28 | 0 | 0 | 28 | 0 | 0 | 0 | 0 |
| dirty-repo-repair-build-prompts | 20 | 0 | 0 | 20 | 0 | 0 | 0 | 0 |
| ecommerce-storefront | 38 | 0 | 0 | 38 | 0 | 0 | 0 | 0 |
| events-community | 25 | 0 | 0 | 25 | 0 | 0 | 0 | 0 |
| failure-recovery-prompts | 20 | 0 | 0 | 20 | 0 | 0 | 0 | 0 |
| file-upload-heavy-app | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| finance-budgeting | 25 | 0 | 0 | 25 | 0 | 0 | 0 | 0 |
| fitness-wellness | 25 | 0 | 0 | 25 | 0 | 0 | 0 | 0 |
| follow-up-edits-after-first-build | 20 | 0 | 0 | 20 | 0 | 0 | 0 | 0 |
| healthcare-intake-non-medical | 25 | 0 | 0 | 25 | 0 | 0 | 0 | 0 |
| huge-build-me-airbnb-uber-shopify | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| inventory-logistics | 25 | 0 | 0 | 25 | 0 | 0 | 0 | 0 |
| job-board | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| legal-intake-non-legal-advice | 25 | 0 | 0 | 25 | 0 | 0 | 0 | 0 |
| local-service-site | 38 | 0 | 0 | 38 | 0 | 0 | 0 | 0 |
| make-it-prettier-design-edit | 20 | 0 | 0 | 20 | 0 | 0 | 0 | 0 |
| marketplace | 28 | 0 | 0 | 28 | 0 | 0 | 0 | 0 |
| messy-typo-filled-prompt | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| mobile-first-app | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| multi-tenant-app | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| one-page-landing-page | 38 | 0 | 0 | 38 | 0 | 0 | 0 | 0 |
| payment-subscription-app | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| project-management | 26 | 0 | 0 | 26 | 0 | 0 | 0 | 0 |
| real-estate-listings | 25 | 0 | 0 | 25 | 0 | 0 | 0 | 0 |
| restaurant-order-app | 38 | 0 | 0 | 38 | 0 | 0 | 0 | 0 |
| role-based-app | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| saas-dashboard | 28 | 0 | 0 | 28 | 0 | 0 | 0 | 0 |
| social-community-app | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| support-ticketing | 25 | 0 | 0 | 25 | 0 | 0 | 0 | 0 |
| weird-vague-app | 10 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
