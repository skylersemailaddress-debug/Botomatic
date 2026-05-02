# Forensic Readiness Baseline

- Captured at: 2026-05-02T05:07:45+00:00
- Branch at capture: `main`
- Commit: `43c8588be9cb910040c17c84295596984ef6ea8a`
- Main clean before visual run: yes

## Command

`VISUAL_DIFF_THRESHOLD=0.01 npm run test:visual-commercial`

## Result

- Overall: pass
- Playwright tests: 2 passed, 0 failed
- vibe-desktop diff: 13211 / 2795520 = 0.473% (<= 1.000%)
- pro-desktop diff: 14905 / 2795520 = 0.533% (<= 1.000%)

## Hygiene

- Removed generated visual artifacts after capture:
  - `tests/visual/current/`
  - `tests/visual/diff/`
