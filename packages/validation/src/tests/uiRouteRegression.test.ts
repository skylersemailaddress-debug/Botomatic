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
}

function testVibeRouteSignalsAndNoGlobalToggle() {
  const vibeDashboard = read("apps/control-plane/src/components/vibe/VibeDashboard.tsx");

  assertIncludesAll(
    vibeDashboard,
    ["Vibe Mode", "Build Map", "One-Click Launch", "Improve Design", "Launch App"],
    "Vibe dashboard"
  );

  assertIncludesAll(
    vibeDashboard,
    ["vibe-dashboard-sidebar", "vibe-dashboard-main", "vibe-dashboard-layout", "vibe-right-rail"],
    "Vibe dashboard layout zones"
  );

  assertExcludesAllCaseInsensitive(vibeDashboard, forbiddenGlobalModeTogglePhrases, "Vibe dashboard");
  assertNoEmptyButtons(vibeDashboard, "Vibe dashboard");
  assertLinksHaveHref(vibeDashboard, "Vibe dashboard");
}

function testProRouteSignalsAndNoGlobalToggle() {
  const proDashboard = read("apps/control-plane/src/components/pro/ProDashboard.tsx");

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
    proDashboard,
    ["pro-dashboard-sidebar", "pro-dashboard-main", "pro-grid", "pro-panel"],
    "Pro dashboard layout zones"
  );

  assertExcludesAllCaseInsensitive(proDashboard, forbiddenGlobalModeTogglePhrases, "Pro dashboard");
  assertNoEmptyButtons(proDashboard, "Pro dashboard");
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

function run() {
  testRouteSmokeAndWiring();
  testVibeRouteSignalsAndNoGlobalToggle();
  testProRouteSignalsAndNoGlobalToggle();
  testPrimaryProjectRouteRemainsChatFirst();
  console.log("uiRouteRegression.test.ts passed");
}

run();
