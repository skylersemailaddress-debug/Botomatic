# Project Workspace Reference UI

These files define the visual target for the Botomatic project workspace UI.

## Canonical visual targets

- `vibe-mode-reference.png` — Vibe Mode visual target mock.
- `pro-mode-reference.png` — Pro Mode visual target mock.

The screenshots are visual target mocks. They define the commercial layout, spacing, density, sidebar, topbar, panel hierarchy, card rhythm, and button placement. The content inside the screenshots is allowed to be demo/filler while the app is building, but the runtime UI must not make false live-production, deployment, testing, health, or 99% success claims.

## First-start / no-project-data behavior

The first-start and no-project-data state must still render the full premium shell. Do not fall back to a sparse debug page or raw document preview.

### Vibe Mode

Required shell:

- Botomatic / NEXUS left sidebar.
- `+ New Project` action.
- Main navigation: Home, Projects, Templates, Design Studio, Brand Kit, Launch, Learn.
- Recent Projects area, empty if no real projects exist or clearly labeled examples if demo rows are used.
- Go Pro Anytime card.
- User/account strip.
- Vibe Mode header above the fold.
- Desktop / Tablet / Mobile switcher.
- Share action.
- Launch action disabled or labeled unavailable until required gates pass.
- Central chat and design preview area.
- Right rail with Build Map, Live Preview, App Health, What's Next, Recent Activity, and One-Click Launch.
- Bottom command/action bar.

Honest empty states:

- Build Map should show Not started / Waiting for first prompt unless execution state exists.
- Live Preview may show a polished example preview only if marked Example preview or Preview pending.
- App Health should show Not run yet / Waiting for build unless real checks have run.
- One-Click Launch must be disabled/unavailable until launch gates pass.
- Do not show fake production deployment success.
- Do not show fake health percentages unless labeled sample/demo.

### Pro Mode

Required shell:

- Same Botomatic / NEXUS left sidebar.
- Pro Mode header above the fold.
- Project, Branch, and Environment controls.
- Run, Launch, and Deploy actions.
- Pro subnav: Overview, Code, Database, API, Tests, Runtime, Deployments, Audit Log, Integrations, Secrets, Settings.
- Dense dashboard panels: Build Pipeline, System Health, Code Changes, Live Application, Services, Database Schema, Test Results, Terminal, AI Copilot, Recent Commits.
- Bottom status bar.

Honest empty states:

- Build Pipeline should show Waiting / Not started until a run exists.
- System Health can show API connected only when true, otherwise Not connected / Not run yet.
- Code Changes should show No code changes yet or Repository diff not connected.
- Live Application should show Derived preview / Preview unavailable unless runtime is truly connected.
- Services, Database Schema, Tests, Terminal, AI Copilot, and Recent Commits should use real data when available or polished empty states when not.
- Deploy must not imply a live deployment without credentials, approval, smoke-test plan, and rollback proof.

## Test expectations

Validators and e2e tests must fail if project routes:

- render without the left sidebar;
- render raw document/debug text as the primary Vibe visual;
- lose the Vibe right rail or Pro dense panel grid;
- regress to the old sparse scaffold;
- lose owner-launch nonfatal dev-console filtering;
- make false live production/deployment/health/99% claims in no-data state.
