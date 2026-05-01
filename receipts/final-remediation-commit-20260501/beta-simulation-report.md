# Beta Simulation Report

Generated: 2026-05-01T15:34:22.611Z
Base URL: http://127.0.0.1:3000
API Base URL: http://127.0.0.1:3001
Users simulated: 100
Requests: 2170
Overall success rate: 92.4%
Workflow success rate: 100%
Critical workflow success rate: 100%
p95 latency: 313.53 ms
Critical failures: 0

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
| contract_approval | 100 | 100 | 0 | 0 |
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
| ui_surface_/projects/proj_1777649648249_cmxsj4/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649648249_cmxsj4/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649648249_cmxsj4/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649648249_cmxsj4/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649648249_cmxsj4/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649648249_cmxsj4/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649648491_bjgvh6/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649648491_bjgvh6/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649648491_bjgvh6/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649648491_bjgvh6/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649648491_bjgvh6/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649648491_bjgvh6/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650145_jg9qrb/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650145_jg9qrb/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650145_jg9qrb/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650145_jg9qrb/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650145_jg9qrb/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650145_jg9qrb/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650317_nb3mof/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650317_nb3mof/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650317_nb3mof/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650317_nb3mof/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650317_nb3mof/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650317_nb3mof/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650387_6sgtkl/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650387_6sgtkl/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650387_6sgtkl/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650387_6sgtkl/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650387_6sgtkl/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650387_6sgtkl/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650523_09qdor/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650523_09qdor/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650523_09qdor/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650523_09qdor/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650523_09qdor/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650523_09qdor/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650575_6vkh51/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650575_6vkh51/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650575_6vkh51/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650575_6vkh51/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650575_6vkh51/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649650575_6vkh51/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649651112_wwnw6a/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649651112_wwnw6a/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649651112_wwnw6a/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649651112_wwnw6a/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649651112_wwnw6a/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649651112_wwnw6a/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654235_l36v7e/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654235_l36v7e/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654235_l36v7e/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654235_l36v7e/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654235_l36v7e/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654235_l36v7e/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654624_jkzso1/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654624_jkzso1/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654624_jkzso1/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654624_jkzso1/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654624_jkzso1/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649654624_jkzso1/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649657916_n9uxp9/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649657916_n9uxp9/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649657916_n9uxp9/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649657916_n9uxp9/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649657916_n9uxp9/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649657916_n9uxp9/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658493_r05iah/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658493_r05iah/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658493_r05iah/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658493_r05iah/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658493_r05iah/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658493_r05iah/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658583_tsvz63/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658583_tsvz63/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658583_tsvz63/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658583_tsvz63/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658583_tsvz63/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658583_tsvz63/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658852_87d026/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658852_87d026/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658852_87d026/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658852_87d026/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658852_87d026/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649658852_87d026/vibe | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649659178_ebaldc/advanced | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649659178_ebaldc/deployment | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649659178_ebaldc/evidence | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649659178_ebaldc/logs | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649659178_ebaldc/settings | 1 | 1 | 0 | 0 |
| ui_surface_/projects/proj_1777649659178_ebaldc/vibe | 1 | 1 | 0 | 0 |
| unauthorized_approval_rejected | 25 | 25 | 0 | 0 |
| unauthorized_rejected | 25 | 25 | 0 | 0 |

## NOT_PROVEN

- NOT_PROVEN: no dedicated live HTTP deploy dry-run or rollback dry-run route exists; deployment readiness is validated via proof artifacts, not owner-facing API dry-run endpoints.
- NOT_PROVEN: reviewer cannot do admin-only action requires BOTOMATIC_REVIEWER_TOKEN or OIDC reviewer credentials.
