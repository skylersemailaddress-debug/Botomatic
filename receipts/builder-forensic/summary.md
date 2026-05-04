# Builder Forensic Capability Report

Generated: 2026-05-04T01:53:41.740Z
Total prompts tested: 150
Categories covered: 25
PASS_REAL rate: 100%
PASS_REAL + PASS_PARTIAL rate: 100%
Prompts reaching builder runtime: 150
Prompts generating artifacts/plans: 150
Built successfully: 150
Ran successfully: 150
Repaired successfully: 25
Fail rate: 0%
Unsupported rate: 0%
Runtime success rate: 100%
Follow-up edit success rate: 83.33%
Repair success rate: 16.67%
Fake contamination rate: 0%
Owner verdict: PASS_PRIVATE_BETA

## 99% Claim Test

No. Even with high measured pass rate, this harness forbids claiming 99% coverage without broader external/runtime/deployment proof.

## Top 10 Blockers

1. Repair loop not executed for this case (125)
2. Follow-up edit path not executed for this case (25)

## Category Capability Matrix

| Category | Total | PASS_REAL | PASS_PARTIAL | BLOCKED_UNSUPPORTED | FAIL_BUILDER | FAIL_RUNTIME | FAIL_QUALITY | FAIL_FAKE |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| add-auth-payments-email-db-edit | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| admin-internal-ops | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| ai-writing-tool | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| booking-scheduling-app | 10 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| course-lms | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| crm | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| dirty-repo-repair-build-prompts | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| ecommerce-storefront | 10 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| events-community | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| failure-recovery-prompts | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| finance-budgeting | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| fitness-wellness | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| follow-up-edits-after-first-build | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| healthcare-intake-non-medical | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| inventory-logistics | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| legal-intake-non-legal-advice | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| local-service-site | 10 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| make-it-prettier-design-edit | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| marketplace | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| one-page-landing-page | 10 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| project-management | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| real-estate-listings | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| restaurant-order-app | 10 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| saas-dashboard | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| support-ticketing | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
