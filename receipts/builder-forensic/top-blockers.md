# Top Blockers To 99%

1. API unavailable or unreachable
2. Follow-up edit API request failed
3. No generated project path returned for local build validation
4. Prompt did not reach builder runtime path
5. Repair loop replay failed
6. Repair loop not executed for this case
7. Follow-up edit path not executed for this case
8. Runtime smoke failed

## Closure Work

1. API unavailable or unreachable: Add preflight server boot+health check gate and fail-fast before corpus execution if API/UI endpoints are down.
2. Follow-up edit API request failed: Harden follow-up prompts and role/auth context for operator route; add regression test asserting 2xx follow-up responses for edit corpus cases.
3. No generated project path returned for local build validation: Persist generated artifact workspace path in project status/runtime payload and consume it in forensic harness for local build/smoke probes.
4. Prompt did not reach builder runtime path: Auto-run spec analyze/build-contract approval sequence before planning and dispatch; add regression test for compile->plan->execute transition.
5. Repair loop replay failed: Enable repair replay preconditions in harness (governance approvals and repairable packet state), then add regression test for replay success path.
6. Repair loop not executed for this case: Implement targeted builder/runtime support and add regression tests for this failure class.
7. Follow-up edit path not executed for this case: Implement targeted builder/runtime support and add regression tests for this failure class.
8. Runtime smoke failed: Implement targeted builder/runtime support and add regression tests for this failure class.
