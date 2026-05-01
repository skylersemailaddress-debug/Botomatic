# Project Workspace Reference UI

These files define the visual target for the Botomatic project workspace UI.

## Canonical visual targets

- `vibe-mode-reference.png` — Vibe Mode visual target mock.
- `pro-mode-reference.png` — Pro Mode visual target mock.

The screenshots are visual target mocks. They define the commercial layout, spacing, density, sidebar, topbar, panel hierarchy, card rhythm, and button placement. The content inside the screenshots is allowed to be demo/filler while the app is building, but the runtime UI must not make false live-production, deployment, testing, health, or 99% success claims.

## Global commercial consistency contract

All `/projects/[projectId]/*` pages must feel like one product, not separate prototypes. Commercial consistency means:

- The same Botomatic / NEXUS left sidebar is visible above the fold on every project page.
- The sidebar width, logo block, `+ New Project` action, nav item styling, active state, recent-project block, upgrade card, and account strip are uniform across Vibe, Pro, Settings, Deployment, Evidence, Logs, Vault, Onboarding, and Validators.
- Every page uses the same workspace background, max-width behavior, card radius, border color, shadow depth, typography scale, button styling, input styling, status pill styling, and spacing rhythm.
- Every project page has a clear page header with title, subtitle, route-aware actions, and honest state labels.
- Each page has a dense commercial layout: no raw debug text, no unstyled lists, no isolated default HTML controls, no giant sparse blank areas, and no scaffold-looking temporary layout.
- Empty states are polished cards with a clear title, short explanation, next action, and disabled/available action state.
- Primary actions must be visually consistent and wired to real handlers/routes. Disabled actions must explain the missing gate.
- All project pages must preserve the same navigation model: base project/Vibe, Advanced/Pro, Settings, Deployment, Evidence, Logs, Vault, Onboarding, and Validators.
- Demo content is allowed only as visual/example content and must be labeled as example, preview pending, or not run yet when it is not real data.
- Real data must replace demo content as soon as it exists. Do not hard-code fake success when a real API/state value is available.
- No page may claim live production deployment, completed tests, production health, credentialed provider execution, 99% success, or launch readiness unless the corresponding proof gates and runtime data exist.

## Page-level consistency requirements

### Base project and Vibe pages

`/projects/[projectId]` and `/projects/[projectId]/vibe` must use the Vibe visual target as the primary above-the-fold workspace. The base project route should not show a weaker shell than the Vibe route.

### Advanced / Pro page

`/projects/[projectId]/advanced` must use the Pro visual target as the primary above-the-fold workspace.

### Settings

Settings must use the same left sidebar and workspace shell. It should present configuration as commercial cards with sections for project identity, environment, tokens/limits, integrations, roles/access, and dangerous actions. Missing configuration must show honest setup-needed states, not raw JSON or debug fields.

### Deployment

Deployment must use the same shell. It should show deployment targets, gate status, credential requirements, smoke-test plan, rollback plan, recent deployment attempts, and launch approval state. Live deployment buttons must be disabled or approval-gated until credentials and explicit approval exist.

### Evidence

Evidence must use the same shell. It should show validation receipts, proof artifacts, audit trail, build/test status, launch caveats, and claim boundaries as cards/tables. It must distinguish PASS, FAIL, BLOCKED, and NOT_PROVEN clearly.

### Logs

Logs must use the same shell. It should show runtime logs, build logs, deploy logs, filters, severity, timestamps, and copy/download controls. No logs should render as raw unstyled text dumps.

### Vault

Vault must use the same shell. It should show secret/credential readiness, provider requirements, connection status, rotation guidance, and access policies. It must never display secret values.

### Onboarding

Onboarding must use the same shell. It should guide the user through first-run setup, project intake, brand/profile inputs, integrations, validation, and first launch proof with checklist cards and clear next actions.

### Validators

Validators must use the same shell. It should show validator groups, latest status, required commands, failure details, rerun actions, and proof links. It must not be a raw test-output dump as the primary UI.

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
- make false live production/deployment/health/99% claims in no-data state;
- use inconsistent sidebar/nav/card/button styling across project subpages;
- render settings, deployment, evidence, logs, vault, onboarding, or validators as raw/debug pages instead of commercial shell pages.
