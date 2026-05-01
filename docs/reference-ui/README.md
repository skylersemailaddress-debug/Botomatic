# Reference UI Assets

## Commercial Consistency Rules

These rules override all other instructions for project page layout and design.

### Canonical Reference Images

- **vibe-mode-reference.png** — Pixel-perfect target for `/projects/:id` and `/projects/:id/vibe`
- **pro-mode-reference.png** — Pixel-perfect target for `/projects/:id/advanced`

All other project pages must use the same commercial shell and design system as the reference images, adapted for their page-specific content.

### Layout Requirements

#### Vibe Mode (`/projects/:id`, `/projects/:id/vibe`)
- **Left rail**: Sidebar with project navigation (always visible)
- **Topbar**: Project name, device switcher, Share and Launch CTAs
- **Main area**: Chat timeline (left) + live preview (center)
- **Right rail**: Build Map, Project State, Live Preview, App Health, What's Next, App Structure
- **Command bar**: Chat input and action chips at bottom of main area

#### Pro Mode (`/projects/:id/advanced`)
- **Left rail**: Sidebar with project navigation (always visible)
- **Topbar**: Pro Mode title and toolbar
- **Subnav**: Secondary navigation for pro sub-sections
- **Dense grid panels**: Build Pipeline, System Health, Code Changes, Live Application, Services, Database Schema, Test Results, Terminal, AI Copilot, Recent Commits
- **Bottom status bar**: Deployment and status information

#### All Project Subpages (settings, deployment, evidence, logs, vault, onboarding, validators)
- Must use the shared `ProjectWorkspaceShell` commercial shell
- Must include the left sidebar navigation
- Must use the same topbar pattern
- Must render page-specific content panels

### Prohibited Claims

No page may fake, simulate, or claim any of the following without real live data:
- Live production deployment status
- Real-time deployment health metrics
- Passing test counts or coverage percentages
- Launch readiness scores (e.g., "99% ready")
- Live infrastructure health

Any panel showing these must use a clearly labelled "not connected" or "no data yet" fallback state.

### Prohibited UI Elements

- Raw document/debug text in the primary Vibe UI (e.g., `<pre>` JSON dumps in user-facing areas)
- Global mode-toggle phrases ("choose mode", "switch to vibe", "switch to pro")
- Debug-only buttons in production UI ("Apply destructive sample")
- Empty or unlabelled buttons without accessible text or aria-label
