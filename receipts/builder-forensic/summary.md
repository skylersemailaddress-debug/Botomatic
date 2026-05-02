# Builder Forensic Capability Report

Generated: 2026-05-02T16:52:09.625Z
Runtime window ID: window-20260502T163900Z-b25ed564008734055fdf20b98e2de96cdf010e2f
Git SHA: b25ed564008734055fdf20b98e2de96cdf010e2f
API PID: 3599
Window started: 2026-05-02T16:39:00Z
Window finished: 2026-05-02T16:51:11.866Z
Modes included: 100, 200, extreme, repair, smoke
Total prompts tested: 375
Prompts reached runtime: 375
Generated artifacts: 0
Artifacts with workspace paths: 0
Build successes: 0
Run successes: 0
Smoke successes: 0
Repair successes: 0
Categories covered: 40
PASS_REAL rate: 0%
PASS_PARTIAL rate: 0%
FAIL_BUILDER rate: 0%
FAIL_RUNTIME rate: 0%
BLOCKED_UNSUPPORTED rate: 0%
PASS_REAL + PASS_PARTIAL rate: 0%
Prompts reaching builder runtime: 375
Prompts generating artifacts/plans: 0
Built successfully: 0
Ran successfully: 0
Repaired successfully: 0
Fail rate: 100%
Unsupported rate: 0%
Runtime success rate: 0%
Follow-up edit success rate: 86.67%
Repair success rate: 0%
Fake contamination rate: 0%
Owner verdict: FAIL_PRIVATE_BETA

## 99% Claim Test

No. Measured PASS_REAL rate is 0% and PASS_REAL+PASS_PARTIAL is 0%, below a defensible 99% claim.

## Top 10 Blockers

1. Builder did not progress to artifact/plan generation (375)
2. No generated project path returned for local build validation (375)
3. Repair loop replay failed (225)
4. Repair loop not executed for this case (150)
5. Follow-up edit path not executed for this case (50)

## Category Pass Rates

| Category | PASS_REAL % | PASS_PARTIAL % | FAIL_BUILDER % | FAIL_RUNTIME % | BLOCKED_UNSUPPORTED % |
|---|---:|---:|---:|---:|---:|
| add-auth-payments-email-db-edit | 0% | 0% | 0% | 0% | 0% |
| admin-internal-ops | 0% | 0% | 0% | 0% | 0% |
| ai-writing-tool | 0% | 0% | 0% | 0% | 0% |
| analytics-reporting-app | 0% | 0% | 0% | 0% | 0% |
| api-integration-app | 0% | 0% | 0% | 0% | 0% |
| auth-heavy-app | 0% | 0% | 0% | 0% | 0% |
| booking-scheduling-app | 0% | 0% | 0% | 0% | 0% |
| chat-collab-app | 0% | 0% | 0% | 0% | 0% |
| contradictory-prompt | 0% | 0% | 0% | 0% | 0% |
| course-lms | 0% | 0% | 0% | 0% | 0% |
| crm | 0% | 0% | 0% | 0% | 0% |
| dirty-repo-repair-build-prompts | 0% | 0% | 0% | 0% | 0% |
| ecommerce-storefront | 0% | 0% | 0% | 0% | 0% |
| events-community | 0% | 0% | 0% | 0% | 0% |
| failure-recovery-prompts | 0% | 0% | 0% | 0% | 0% |
| file-upload-heavy-app | 0% | 0% | 0% | 0% | 0% |
| finance-budgeting | 0% | 0% | 0% | 0% | 0% |
| fitness-wellness | 0% | 0% | 0% | 0% | 0% |
| follow-up-edits-after-first-build | 0% | 0% | 0% | 0% | 0% |
| healthcare-intake-non-medical | 0% | 0% | 0% | 0% | 0% |
| huge-build-me-airbnb-uber-shopify | 0% | 0% | 0% | 0% | 0% |
| inventory-logistics | 0% | 0% | 0% | 0% | 0% |
| job-board | 0% | 0% | 0% | 0% | 0% |
| legal-intake-non-legal-advice | 0% | 0% | 0% | 0% | 0% |
| local-service-site | 0% | 0% | 0% | 0% | 0% |
| make-it-prettier-design-edit | 0% | 0% | 0% | 0% | 0% |
| marketplace | 0% | 0% | 0% | 0% | 0% |
| messy-typo-filled-prompt | 0% | 0% | 0% | 0% | 0% |
| mobile-first-app | 0% | 0% | 0% | 0% | 0% |
| multi-tenant-app | 0% | 0% | 0% | 0% | 0% |
| one-page-landing-page | 0% | 0% | 0% | 0% | 0% |
| payment-subscription-app | 0% | 0% | 0% | 0% | 0% |
| project-management | 0% | 0% | 0% | 0% | 0% |
| real-estate-listings | 0% | 0% | 0% | 0% | 0% |
| restaurant-order-app | 0% | 0% | 0% | 0% | 0% |
| role-based-app | 0% | 0% | 0% | 0% | 0% |
| saas-dashboard | 0% | 0% | 0% | 0% | 0% |
| social-community-app | 0% | 0% | 0% | 0% | 0% |
| support-ticketing | 0% | 0% | 0% | 0% | 0% |
| weird-vague-app | 0% | 0% | 0% | 0% | 0% |

## Category Capability Matrix

| Category | Total | PASS_REAL | PASS_PARTIAL | BLOCKED_UNSUPPORTED | FAIL_BUILDER | FAIL_RUNTIME | FAIL_QUALITY | FAIL_FAKE |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| add-auth-payments-email-db-edit | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| admin-internal-ops | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| ai-writing-tool | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| analytics-reporting-app | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| api-integration-app | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| auth-heavy-app | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| booking-scheduling-app | 18 | 0 | 0 | 0 | 0 | 0 | 18 | 0 |
| chat-collab-app | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| contradictory-prompt | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| course-lms | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| crm | 13 | 0 | 0 | 0 | 0 | 0 | 13 | 0 |
| dirty-repo-repair-build-prompts | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| ecommerce-storefront | 18 | 0 | 0 | 0 | 0 | 0 | 18 | 0 |
| events-community | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| failure-recovery-prompts | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| file-upload-heavy-app | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| finance-budgeting | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| fitness-wellness | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| follow-up-edits-after-first-build | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| healthcare-intake-non-medical | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| huge-build-me-airbnb-uber-shopify | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| inventory-logistics | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| job-board | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| legal-intake-non-legal-advice | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| local-service-site | 18 | 0 | 0 | 0 | 0 | 0 | 18 | 0 |
| make-it-prettier-design-edit | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| marketplace | 13 | 0 | 0 | 0 | 0 | 0 | 13 | 0 |
| messy-typo-filled-prompt | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| mobile-first-app | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| multi-tenant-app | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| one-page-landing-page | 18 | 0 | 0 | 0 | 0 | 0 | 18 | 0 |
| payment-subscription-app | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| project-management | 11 | 0 | 0 | 0 | 0 | 0 | 11 | 0 |
| real-estate-listings | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| restaurant-order-app | 18 | 0 | 0 | 0 | 0 | 0 | 18 | 0 |
| role-based-app | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| saas-dashboard | 13 | 0 | 0 | 0 | 0 | 0 | 13 | 0 |
| social-community-app | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| support-ticketing | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| weird-vague-app | 5 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
