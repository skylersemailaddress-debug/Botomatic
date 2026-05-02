#!/usr/bin/env bash
set +e

OUT_JSON="receipts/forensic-readiness/gate11-results.json"
OUT_MD="receipts/forensic-readiness/gate11-results.md"
TS="$(date -Iseconds)"

mkdir -p receipts/forensic-readiness/gates

commands=(
  "npm run validate:all"
  "npm run -s test:universal"
  "npm run test:commercial-cockpit"
  "npm run build"
  "VISUAL_DIFF_THRESHOLD=0.01 npm run test:visual-commercial"
  "npm run audit:routes-commercial"
  "npm run audit:ui-actions"
  "npm run test:api-live-beta"
  "npm run test:e2e:live-beta"
  "npm run test:e2e:live-beta:100"
  "npm run audit:forensic-private-beta"
)

printf '{\n  "capturedAt": "%s",\n  "results": [\n' "$TS" > "$OUT_JSON"
printf '# Phase 11 Gate Results\n\n- Captured at: %s\n\n## Commands\n' "$TS" > "$OUT_MD"

fail_count=0
for i in "${!commands[@]}"; do
  cmd="${commands[$i]}"
  log="receipts/forensic-readiness/gates/gate11-$(printf '%02d' "$((i+1))").log"

  bash -lc "$cmd" > "$log" 2>&1
  code=$?

  if [[ $code -ne 0 ]]; then
    fail_count=$((fail_count+1))
  fi

  esc_cmd=$(printf '%s' "$cmd" | sed 's/"/\\"/g')
  comma=","
  if [[ $i -eq $((${#commands[@]} - 1)) ]]; then
    comma=""
  fi

  printf '    {"index": %d, "command": "%s", "exitCode": %d, "log": "%s"}%s\n' "$((i+1))" "$esc_cmd" "$code" "$log" "$comma" >> "$OUT_JSON"

  status="PASS"
  if [[ $code -ne 0 ]]; then
    status="FAIL"
  fi

  printf -- '- %s `%s` (exit=%d, log=%s)\n' "$status" "$cmd" "$code" "$log" >> "$OUT_MD"
  echo "[$((i+1))/${#commands[@]}] $status :: $cmd"
done

printf '  ],\n  "failedCount": %d\n}\n' "$fail_count" >> "$OUT_JSON"
