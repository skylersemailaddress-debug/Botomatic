# Phase 11 Gate Results

- Captured at: 2026-05-02T05:41:20+00:00

## Commands
- PASS `npm run validate:all` (exit=0, log=receipts/forensic-readiness/gates/gate11-01.log)
- PASS `npm run -s test:universal` (exit=0, log=receipts/forensic-readiness/gates/gate11-02.log)
- PASS `npm run test:commercial-cockpit` (exit=0, log=receipts/forensic-readiness/gates/gate11-03.log)
- PASS `npm run build` (exit=0, log=receipts/forensic-readiness/gates/gate11-04.log)
- FAIL `VISUAL_DIFF_THRESHOLD=0.01 npm run test:visual-commercial` (exit=1, log=receipts/forensic-readiness/gates/gate11-05.log)
- FAIL `npm run audit:routes-commercial` (exit=1, log=receipts/forensic-readiness/gates/gate11-06.log)
- FAIL `npm run audit:ui-actions` (exit=1, log=receipts/forensic-readiness/gates/gate11-07.log)
- PASS `npm run test:api-live-beta` (exit=0, log=receipts/forensic-readiness/gates/gate11-08.log)
- FAIL `npm run test:e2e:live-beta` (exit=1, log=receipts/forensic-readiness/gates/gate11-09.log)
- FAIL `npm run test:e2e:live-beta:100` (exit=1, log=receipts/forensic-readiness/gates/gate11-10.log)
- FAIL `npm run audit:forensic-private-beta` (exit=1, log=receipts/forensic-readiness/gates/gate11-11.log)
