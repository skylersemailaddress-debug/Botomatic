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

function testRouteSmokeAndWiring() {
  const rootRoute = read("apps/control-plane/src/app/page.tsx");
  const projectRoute = read("apps/control-plane/src/app/projects/[projectId]/page.tsx");
  const vibeRoute = read("apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx");
  const advancedRoute = read("apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx");

  assert(rootRoute.includes("export default function"), "Root route must export a default function");
  assert(rootRoute.includes("BetaHQ"), "Root route must render the BetaHQ control plane");
  assert(projectRoute.includes("BetaHQ"), "Primary project route must render BetaHQ");
  assert(
    vibeRoute.includes("<VibeDashboard") ||
      (vibeRoute.includes("<CommercialWorkspaceShell") && vibeRoute.includes("<CommercialVibeCockpit")),
    "Vibe route must render VibeDashboard or dedicated commercial Vibe cockpit",
  );
  assert(
    advancedRoute.includes("<ProDashboard") ||
      (advancedRoute.includes("<CommercialWorkspaceShell") && advancedRoute.includes("<CommercialProCockpit")),
    "Advanced route must render ProDashboard or dedicated commercial Pro cockpit",
  );

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

  assert(projectRoute.includes("BetaHQ"), "Primary project route should render BetaHQ");

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

function run() {
  testRouteSmokeAndWiring();
  testVibeRouteSignalsAndNoGlobalToggle();
  testProRouteSignalsAndNoGlobalToggle();
  testPrimaryProjectRouteRemainsChatFirst();
  console.log("uiRouteRegression.test.ts passed");
}

run();
