# Beta Simulation Report

Generated: 2026-05-01T14:25:12.365Z
Base URL: http://127.0.0.1:3000
API Base URL: http://127.0.0.1:3001
Users simulated: 100
Requests: 2145
Overall success rate: 88.81%
Critical workflow success rate: 95.24%
p95 latency: 357.09 ms
Critical failures: 100

## Workflow Summary

| Workflow | Total | Passed | Failed | Not Proven |
| --- | ---: | ---: | ---: | ---: |
| approval_gate_creation | 100 | 100 | 0 | 0 |
| assumption_accept | 100 | 100 | 0 | 0 |
| audit_check | 20 | 20 | 0 | 0 |
| bad_token_rejected | 25 | 25 | 0 | 0 |
| build_contract_creation | 100 | 100 | 0 | 0 |
| chat_admin | 45 | 45 | 0 | 0 |
| chat_file | 45 | 45 | 0 | 0 |
| chat_general | 45 | 45 | 0 | 0 |
| chat_project | 45 | 45 | 0 | 0 |
| compile | 100 | 100 | 0 | 0 |
| contract_approval | 100 | 0 | 100 | 0 |
| dashboard_load | 100 | 100 | 0 | 0 |
| deploy_guard | 25 | 25 | 0 | 0 |
| error_handling | 20 | 20 | 0 | 0 |
| execute_next | 100 | 100 | 0 | 0 |
| file_ingestion_brief.md | 20 | 20 | 0 | 0 |
| file_ingestion_config.json | 20 | 20 | 0 | 0 |
| file_ingestion_data.csv | 20 | 20 | 0 | 0 |
| file_ingestion_invalid | 20 | 20 | 0 | 0 |
| file_ingestion_notes.txt | 20 | 20 | 0 | 0 |
| gate_status | 25 | 25 | 0 | 0 |
| generated_preview_status | 100 | 100 | 0 | 0 |
| generated_status_check | 100 | 100 | 0 | 0 |
| intake_submission | 100 | 100 | 0 | 0 |
| landing_load | 100 | 100 | 0 | 0 |
| owner_approval | 25 | 25 | 0 | 0 |
| plan_generation | 100 | 100 | 0 | 0 |
| reviewer_admin_denied | 25 | 0 | 0 | 25 |
| rollback_guard | 25 | 25 | 0 | 0 |
| security_center | 20 | 20 | 0 | 0 |
| spec_analysis | 100 | 100 | 0 | 0 |
| state_persistence | 20 | 20 | 0 | 0 |
| ui_surface_/projects/proj_1777645500011/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645500011/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645500011/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645500011/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645500011/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645500011/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645500216/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645500216/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645500216/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645500216/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645500216/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645500216/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645501247/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645501247/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645501247/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645501247/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645501247/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645501247/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502274/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502274/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502274/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502274/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502274/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502274/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502303/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502303/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502303/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502303/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502303/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502303/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502457/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502457/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502457/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502457/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502457/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502457/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502788/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502788/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502788/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502788/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502788/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502788/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502985/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502985/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502985/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502985/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502985/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645502985/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505611/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505611/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505611/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505611/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505611/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505611/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505747/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505747/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505747/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505747/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505747/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645505747/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508229/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508229/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508229/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508229/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508229/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508229/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508233/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508233/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508233/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508233/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508233/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645508233/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509042/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509042/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509042/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509042/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509042/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509042/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509043/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509043/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509043/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509043/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509043/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509043/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509472/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509472/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509472/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509472/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509472/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777645509472/vibe | 1 | 1 | 0 | 0 |
| unauthorized_rejected | 25 | 25 | 0 | 0 |

## NOT_PROVEN

- NOT_PROVEN: no dedicated live HTTP deploy dry-run or rollback dry-run route exists; deployment readiness is validated via proof artifacts, not owner-facing API dry-run endpoints.
- NOT_PROVEN: reviewer cannot do admin-only action requires BOTOMATIC_REVIEWER_TOKEN or OIDC reviewer credentials.
