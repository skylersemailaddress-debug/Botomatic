# API Live Beta Audit

- Captured at: 2026-05-02T05:43:39.087Z
- UI base URL: http://127.0.0.1:3000
- API base URL: http://127.0.0.1:3001
- Checks: 7
- Failed: 0

## Results
- PASS api_health_direct (GET http://127.0.0.1:3001/api/health) status=200
- PASS api_health_via_ui_proxy (GET http://127.0.0.1:3000/api/health) status=200
- PASS cors_preflight_http://localhost:3000 (OPTIONS http://127.0.0.1:3001/api/health) status=204
- PASS cors_preflight_http://127.0.0.1:3000 (OPTIONS http://127.0.0.1:3001/api/health) status=204
- PASS cors_preflight_https://glorious-guacamole-v69rq49vpxqx26x64-3000.app.github.dev (OPTIONS http://127.0.0.1:3001/api/health) status=204
- PASS projects_intake_direct (POST http://127.0.0.1:3001/api/projects/intake) status=200
- PASS operator_send_direct (POST http://127.0.0.1:3001/api/projects/proj_1777700618859_qpintk/operator/send) status=200
