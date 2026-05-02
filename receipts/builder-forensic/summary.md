# Builder Forensic Capability Report

Generated: 2026-05-02T07:22:59.017Z
Total prompts tested: 375
Categories covered: 40
PASS_REAL rate: 0%
PASS_REAL + PASS_PARTIAL rate: 100%
Prompts reaching builder runtime: 375
Prompts generating artifacts/plans: 375
Built successfully: 0
Ran successfully: 0
Repaired successfully: 0
Fail rate: 0%
Unsupported rate: 0%
Runtime success rate: 0%
Follow-up edit success rate: 86.67%
Repair success rate: 0%
Fake contamination rate: 0%
Owner verdict: PARTIAL_PRIVATE_BETA

## 99% Claim Test

No. Measured PASS_REAL rate is 0% and PASS_REAL+PASS_PARTIAL is 100%, below a defensible 99% claim.

## Top 10 Blockers

1. No generated project path returned for local build validation (375)
2. Repair loop replay failed (225)
3. Repair loop not executed for this case (150)
4. Follow-up edit path not executed for this case (50)

## Category Capability Matrix

| Category | Total | PASS_REAL | PASS_PARTIAL | BLOCKED_UNSUPPORTED | FAIL_BUILDER | FAIL_RUNTIME | FAIL_QUALITY | FAIL_FAKE |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| add-auth-payments-email-db-edit | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| admin-internal-ops | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| ai-writing-tool | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| analytics-reporting-app | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| api-integration-app | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| auth-heavy-app | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| booking-scheduling-app | 18 | 0 | 18 | 0 | 0 | 0 | 0 | 0 |
| chat-collab-app | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| contradictory-prompt | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| course-lms | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| crm | 13 | 0 | 13 | 0 | 0 | 0 | 0 | 0 |
| dirty-repo-repair-build-prompts | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| ecommerce-storefront | 18 | 0 | 18 | 0 | 0 | 0 | 0 | 0 |
| events-community | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| failure-recovery-prompts | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| file-upload-heavy-app | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| finance-budgeting | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| fitness-wellness | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| follow-up-edits-after-first-build | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| healthcare-intake-non-medical | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| huge-build-me-airbnb-uber-shopify | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| inventory-logistics | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| job-board | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| legal-intake-non-legal-advice | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| local-service-site | 18 | 0 | 18 | 0 | 0 | 0 | 0 | 0 |
| make-it-prettier-design-edit | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| marketplace | 13 | 0 | 13 | 0 | 0 | 0 | 0 | 0 |
| messy-typo-filled-prompt | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| mobile-first-app | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| multi-tenant-app | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| one-page-landing-page | 18 | 0 | 18 | 0 | 0 | 0 | 0 | 0 |
| payment-subscription-app | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| project-management | 11 | 0 | 11 | 0 | 0 | 0 | 0 | 0 |
| real-estate-listings | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| restaurant-order-app | 18 | 0 | 18 | 0 | 0 | 0 | 0 | 0 |
| role-based-app | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| saas-dashboard | 13 | 0 | 13 | 0 | 0 | 0 | 0 | 0 |
| social-community-app | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| support-ticketing | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| weird-vague-app | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
