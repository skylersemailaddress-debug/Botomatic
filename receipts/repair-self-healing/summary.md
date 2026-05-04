# Repair Self-Healing Summary

Generated: 2026-05-04T00:53:17.259Z

| Metric | Value |
|---|---|
| Fixtures tested | 5 |
| Failures injected | 5 |
| Failures detected | 5 |
| Repair attempts | 5 |
| Repair successes | 5 |
| Repair failures | 0 |
| Repair success rate | 100% |
| Fake success count | 0 |

## Case Results

| Fixture | Failure Type | Pre-Build | Pre-Run | Pre-Smoke | Post-Build | Post-Run | Post-Smoke | Repaired |
|---|---|---|---|---|---|---|---|---|
| fixture-01 | build_compile | fail | fail | fail | ok | ok | ok | YES |
| fixture-02 | dependency | ok | fail | fail | ok | ok | ok | YES |
| fixture-03 | smoke_route | ok | ok | fail | ok | ok | ok | YES |
| fixture-04 | runtime_start | ok | fail | fail | ok | ok | ok | YES |
| fixture-05 | smoke_route | ok | ok | fail | ok | ok | ok | YES |

## Fake Success Check

Repair success requires ALL of:
1. Original failure existed before repair
2. Patch was applied to workspace files
3. Post-repair build passed (node --check app.js)
4. Post-repair run passed (server started and responded)
5. Post-repair smoke passed (all expected routes returned correct status)
6. Fixture was restored to broken state after test (rollback confirmed)

Fake success count: 0
