import assert from "assert";
import fs from "fs";
import path from "path";

const root = process.cwd();

const forbiddenGlobalModeTogglePhrases = [
  "choose mode",
  "switch to vibe",
  "switch to pro",
  "vibe/pro mode toggle",
  "dual-mode toggle",
  "workspace mode switcher",
];

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertIncludesAll(content: string, expected: string[], context: string) {
  for (const signal of expected) {
    assert(
      content.includes(signal),
      `${context} is missing required signal: ${signal}`
    );
  }
}

function assertExcludesAllCaseInsensitive(content: string, forbidden: string[], context: string) {
  const lower = content.toLowerCase();
  for (const phrase of forbidden) {
    assert(
      !lower.includes(phrase.toLowerCase()),
      `${context} contains forbidden global mode-toggle phrase: ${phrase}`
    );
  }
}

function assertNoEmptyButtons(content: string, context: string) {
  const buttonRegex = /<button\b[^>]*>([\s\S]*?)<\/button>/g;
  const ariaRegex = /aria-label\s*=\s*["'][^"']+["']/i;
  const titleRegex = /title\s*=\s*["'][^"']+["']/i;
  let match: RegExpExecArray | null;

  while ((match = buttonRegex.exec(content))) {
    const fullTag = match[0];
    const innerText = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-zA-Z#0-9]+;/g, " ")
      .trim();

    const hasAccessibleName = innerText.length > 0 || ariaRegex.test(fullTag) || titleRegex.test(fullTag);
    assert(hasAccessibleName, `${context} has a button without accessible text/label: ${fullTag}`);
  }
}

function assertLinksHaveHref(content: string, context: string) {
  const linkTagRegex = /<Link\b[^>]*>/g;
  const anchorTagRegex = /<a\b[^>]*>/g;

  for (const regex of [linkTagRegex, anchorTagRegex]) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content))) {
      const tag = match[0];
      assert(/\shref\s*=\s*[{"']/.test(tag), `${context} contains link-like tag without href: ${tag}`);
    }
  }
}

function assertRouteUsesSharedShell(rel: string, expectedMode?: string) {
  const route = read(rel);
  assert(route.includes("ProjectWorkspaceShell") || route.includes("VibeDashboard") || route.includes("ProDashboard"), `${rel} must render the shared project workspace UI`);
  if (expectedMode) {
    assert(route.includes(`mode=\"${expectedMode}\"`), `${rel} must wire ProjectWorkspaceShell with mode=${expectedMode}`);
  }
}

function assertValidPng(rel: string, context: string) {
  const full = path.join(root, rel);
  assert(fs.existsSync(full), `${rel} must exist`);
  const stat = fs.statSync(full);
  assert(stat.size > 0, `${rel} must be a non-empty PNG asset`);
  const signature = fs.readFileSync(full).subarray(0, 8);
  const expected = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(signature.equals(expected), `${context} must have a valid PNG signature`);
}

function testRouteSmokeAndWiring() {
  const rootRoute = read("apps/control-plane/src/app/page.tsx");
  const projectRoute = read("apps/control-plane/src/app/projects/[projectId]/page.tsx");
  const vibeRoute = read("apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx");
  const advancedRoute = read("apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx");

  assert(rootRoute.includes("export default function Page()"), "Root route must export default Page");
  assert(rootRoute.includes("Initializing Launch Project"), "Root route should show launch bootstrap signal");
  assert(projectRoute.includes("<VibeBuilderSkeleton"), "Primary project route must stay chat-first via VibeBuilderSkeleton");
  assert(vibeRoute.includes("<VibeDashboard"), "Vibe route must render VibeDashboard");
  assert(advancedRoute.includes("<ProDashboard"), "Advanced route must render ProDashboard");

  assertRouteUsesSharedShell("apps/control-plane/src/app/projects/[projectId]/settings/page.tsx", "settings");
  assertRouteUsesSharedShell("apps/control-plane/src/app/projects/[projectId]/deployment/page.tsx", "deployment");
  assertRouteUsesSharedShell("apps/control-plane/src/app/projects/[projectId]/evidence/page.tsx", "evidence");
  assertRouteUsesSharedShell("apps/control-plane/src/app/projects/[projectId]/logs/page.tsx", "logs");
  assertRouteUsesSharedShell("apps/control-plane/src/app/projects/[projectId]/vault/page.tsx", "vault");
  assertRouteUsesSharedShell("apps/control-plane/src/app/projects/[projectId]/onboarding/page.tsx", "onboarding");
  assertRouteUsesSharedShell("apps/control-plane/src/app/projects/[projectId]/validators/page.tsx", "validators");
}

function testVibeRouteSignalsAndNoGlobalToggle() {
  const vibeDashboard = read("apps/control-plane/src/components/vibe/VibeDashboard.tsx");
  const shell = read("apps/control-plane/src/components/project/ProjectWorkspaceShell.tsx");

  assertIncludesAll(
    vibeDashboard,
    ["Vibe Mode", "Build Map", "One-Click Launch", "Improve Design", "Launch App"],
    "Vibe dashboard"
  );

  assertIncludesAll(
    shell + vibeDashboard,
    ["project-workspace-shell", "project-workspace-sidebar", "vibe-dashboard-main", "vibe-dashboard-layout", "vibe-right-rail"],
    "Vibe dashboard layout zones"
  );

  assertExcludesAllCaseInsensitive(vibeDashboard, forbiddenGlobalModeTogglePhrases, "Vibe dashboard");
  assertNoEmptyButtons(vibeDashboard, "Vibe dashboard");
  assertLinksHaveHref(vibeDashboard, "Vibe dashboard");
}

function testProRouteSignalsAndNoGlobalToggle() {
  const proDashboard = read("apps/control-plane/src/components/pro/ProDashboard.tsx");
  const shell = read("apps/control-plane/src/components/project/ProjectWorkspaceShell.tsx");
  const subnav = read("apps/control-plane/src/components/pro/ProDashboardSubnav.tsx");

  assertIncludesAll(
    proDashboard,
    [
      "Pro Mode",
      "Build Pipeline",
      "Code Changes",
      "Live Application",
      "System Health",
      "Services",
      "Database Schema",
      "Test Results",
      "Terminal",
      "AI Copilot",
      "Deploy",
    ],
    "Pro dashboard"
  );

  assertIncludesAll(
    shell + proDashboard + subnav,
    ["project-workspace-shell", "project-workspace-sidebar", "pro-dashboard-main", "pro-grid", "pro-panel", "pro-subnav"],
    "Pro dashboard layout zones"
  );

  assertExcludesAllCaseInsensitive(proDashboard, forbiddenGlobalModeTogglePhrases, "Pro dashboard");
  assertNoEmptyButtons(proDashboard, "Pro dashboard");
  assertLinksHaveHref(subnav, "Pro dashboard subnav");
  assertLinksHaveHref(proDashboard, "Pro dashboard");
}

function testPrimaryProjectRouteRemainsChatFirst() {
  const builderShell = read("apps/control-plane/src/components/builder/NorthStarBuilderShell.tsx");
  const projectRoute = read("apps/control-plane/src/app/projects/[projectId]/page.tsx");

  assert(projectRoute.includes("VibeBuilderSkeleton"), "Primary project route should use VibeBuilderSkeleton");

  assertIncludesAll(
    builderShell,
    [
      "vibe-chat-panel",
      "vibe-message-list",
      "vibe-action-chips",
      "Ask anything",
      "Static preview chat transcript",
    ],
    "Chat-first builder shell"
  );

  assertExcludesAllCaseInsensitive(builderShell, forbiddenGlobalModeTogglePhrases, "Builder shell");
}

function testReferenceAssetsExist() {
  const readme = path.join(root, "docs", "reference-ui", "README.md");

  assertValidPng("docs/reference-ui/vibe-mode-reference.png", "Vibe reference image");
  assertValidPng("docs/reference-ui/pro-mode-reference.png", "Pro reference image");
  assert(fs.existsSync(readme), "docs/reference-ui/README.md must exist");

  const readmeContent = fs.readFileSync(readme, "utf8");
  assert(readmeContent.length > 100, "docs/reference-ui/README.md must contain commercial consistency rules");
}

function testVibeCommandBarAndRightRail() {
  const vibeDashboard = read("apps/control-plane/src/components/vibe/VibeDashboard.tsx");
  const previewSurface = read("apps/control-plane/src/components/vibe/LiveUIBuilderPreviewSurface.tsx");

  assertIncludesAll(
    vibeDashboard,
    [
      "vibe-input-shell",
      "vibe-right-rail",
      "vibe-chat-timeline",
      "vibe-preview-canvas",
    ],
    "Vibe dashboard structural zones"
  );

  // Command bar must be present
  assert(
    vibeDashboard.includes("data-testid=\"vibe-input-shell\""),
    "Vibe dashboard must include command bar (data-testid=vibe-input-shell)"
  );

  // Right rail must be present
  assert(
    vibeDashboard.includes("data-testid=\"vibe-right-rail\""),
    "Vibe dashboard must include right rail (data-testid=vibe-right-rail)"
  );

  assert(
    vibeDashboard.includes("data-testid=\"vibe-preview-canvas\""),
    "Vibe dashboard must include preview canvas (data-testid=vibe-preview-canvas)"
  );

  assert(
    !previewSurface.includes("<pre>{JSON.stringify("),
    "Vibe preview surface must not render raw JSON debug blocks in runtime UI"
  );
}

function testProDenseGrid() {
  const proDashboard = read("apps/control-plane/src/components/pro/ProDashboard.tsx");

  assert(
    proDashboard.includes("data-testid=\"pro-grid\""),
    "Pro dashboard must include dense panel grid (data-testid=pro-grid)"
  );

  assert(
    proDashboard.includes("data-testid=\"pro-panel\""),
    "Pro dashboard must include panel cells (data-testid=pro-panel)"
  );

  assert(
    proDashboard.includes("data-testid=\"pro-status-bar\""),
    "Pro dashboard must include bottom status bar (data-testid=pro-status-bar)"
  );
}

function testNoRawDebugInVibePrimaryView() {
  const vibeDashboard = read("apps/control-plane/src/components/vibe/VibeDashboard.tsx");
  const previewSurface = read("apps/control-plane/src/components/vibe/LiveUIBuilderPreviewSurface.tsx");

  // Prohibit raw JSON debug dump in user-facing primary view
  assert(
    !vibeDashboard.includes("JSON.stringify(latestReviewPayload"),
    "Vibe dashboard must not expose raw JSON debug dump (latestReviewPayload) in primary view"
  );

  // Prohibit debug-only destructive sample button
  assert(
    !vibeDashboard.includes("Apply destructive sample"),
    "Vibe dashboard must not expose debug 'Apply destructive sample' button in primary view"
  );

  assert(
    !previewSurface.includes("<pre>"),
    "Vibe preview surface must not expose raw <pre> debug blocks in runtime UI"
  );
}

function testOwnerLaunchConsoleFilterNonRegression() {
  const e2eSpec = read("tests/e2e/beta-owner-launch.spec.ts");

  assert(
    e2eSpec.includes("isAllowedConsoleError") || e2eSpec.includes("KNOWN_CONSOLE_ERROR_ALLOWLIST"),
    "beta-owner-launch.spec.ts must include console error allowlist filtering (cannot regress)"
  );

  assert(
    e2eSpec.includes("expect(consoleErrors.filter((message) => !isAllowedConsoleError(message))).toEqual([])"),
    "beta-owner-launch.spec.ts must use filtered console assertions"
  );
}

function testGlobalCssImportFromRootLayout() {
  const layout = read("apps/control-plane/src/app/layout.tsx");
  assert(
    layout.includes("../styles/globals.css"),
    "App root layout must import global CSS (../styles/globals.css)"
  );
}

function testShellSidebarCommercialMarkup() {
  const shell = read("apps/control-plane/src/components/project/ProjectWorkspaceShell.tsx");
  assertIncludesAll(
    shell,
    [
      "data-testid=\"project-workspace-sidebar\"",
      "Botomatic",
      "NEXUS",
      "+ New Project",
      "data-testid=\"project-workspace-recent-projects\"",
      "data-testid=\"project-workspace-go-pro\"",
      "data-testid=\"project-workspace-account-strip\"",
    ],
    "Project workspace shell sidebar"
  );
}

function testSubpagesUseSharedShell() {
  for (const subpage of ["settings", "deployment", "evidence", "logs", "vault", "onboarding", "validators"]) {
    const rel = `apps/control-plane/src/app/projects/[projectId]/${subpage}/page.tsx`;
    const content = read(rel);
    assert(
      content.includes("ProjectWorkspaceShell"),
      `${rel} must use the shared commercial ProjectWorkspaceShell`
    );
  }
}

function run() {
  testReferenceAssetsExist();
  testGlobalCssImportFromRootLayout();
  testRouteSmokeAndWiring();
  testShellSidebarCommercialMarkup();
  testVibeRouteSignalsAndNoGlobalToggle();
  testVibeCommandBarAndRightRail();
  testProRouteSignalsAndNoGlobalToggle();
  testProDenseGrid();
  testPrimaryProjectRouteRemainsChatFirst();
  testNoRawDebugInVibePrimaryView();
  testOwnerLaunchConsoleFilterNonRegression();
  testSubpagesUseSharedShell();
  console.log("uiRouteRegression.test.ts passed");
}

run();
