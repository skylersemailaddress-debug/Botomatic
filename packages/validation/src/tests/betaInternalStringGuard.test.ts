import assert from "assert";
import fs from "fs";
import path from "path";

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// Raw internal strings that must never reach beta users as rendered text.
const BLOCKED_INTERNAL_STRINGS = [
  "pageRoot",
  "component ·",
  "componentRender",
  "Awaiting edit command",
  "dry-run only",
  "adapter unavailable",
  "blocked-until-real-project",
];

const BETA_VISIBLE_ROUTE_FILES = [
  "apps/control-plane/src/app/page.tsx",
  "apps/control-plane/src/app/projects/[projectId]/page.tsx",
  "apps/control-plane/src/app/projects/new/page.tsx",
  "apps/control-plane/src/app/projects/page.tsx",
  "apps/control-plane/src/components/beta-hq/BetaHQ.tsx",
];

function run() {
  // 1. Project page must render BetaHQ, not AppShell or VibeDashboard directly.
  const projectPage = read("apps/control-plane/src/app/projects/[projectId]/page.tsx");
  assert(
    projectPage.includes("BetaHQ"),
    "/projects/[projectId]/page.tsx must render BetaHQ",
  );
  assert(
    !projectPage.includes("AppShell"),
    "/projects/[projectId]/page.tsx must not import or render AppShell",
  );
  assert(
    !projectPage.includes("VibeDashboard"),
    "/projects/[projectId]/page.tsx must not import or render VibeDashboard",
  );

  // 2. BetaHQ must define sanitization for blocked internal strings.
  const betaHQ = read("apps/control-plane/src/components/beta-hq/BetaHQ.tsx");
  assert(
    betaHQ.includes("BLOCKED_INTERNAL_STRINGS"),
    "BetaHQ must define BLOCKED_INTERNAL_STRINGS to guard against raw internal output",
  );
  assert(
    betaHQ.includes("sanitize"),
    "BetaHQ must define a sanitize() function to strip internal strings before display",
  );
  for (const blocked of BLOCKED_INTERNAL_STRINGS) {
    assert(
      betaHQ.includes(`"${blocked}"`),
      `BetaHQ.BLOCKED_INTERNAL_STRINGS must include "${blocked}"`,
    );
  }

  // 3. BetaHQ must handle clarifying project status explicitly.
  assert(
    betaHQ.includes("clarifying"),
    'BetaHQ must handle "clarifying" project status so users can continue in the chat',
  );
  assert(
    betaHQ.includes("Botomatic needs more detail"),
    'BetaHQ must show "Botomatic needs more detail" when project status is clarifying',
  );

  // 4. No beta-visible route file may contain blocked internal strings as literal
  //    hardcoded rendered text (as a JSX string child — not inside a const array).
  //    We check that none appear outside of the BLOCKED_INTERNAL_STRINGS definition context.
  for (const rel of BETA_VISIBLE_ROUTE_FILES) {
    const content = read(rel);
    for (const blocked of BLOCKED_INTERNAL_STRINGS) {
      // Allow the string to appear in the blocked-list definition (array literal).
      // Disallow it as a rendered JSX string (plain text child or interpolation outside the array).
      const withoutBlockedArray = content.replace(/BLOCKED_INTERNAL_STRINGS\s*=\s*\[[\s\S]*?\]/g, "");
      assert(
        !withoutBlockedArray.includes(`>${blocked}<`) &&
        !withoutBlockedArray.includes(`{${blocked}}`),
        `${rel} must not render "${blocked}" as a JSX text node`,
      );
    }
  }

  // 5. BetaHQ must show the "Follow-up command endpoint is not wired yet" message
  //    rather than directing clarifying users to the old dashboard.
  assert(
    betaHQ.includes("Follow-up command endpoint is not wired yet"),
    'BetaHQ must show "Follow-up command endpoint is not wired yet" when 404 operator endpoint',
  );

  console.log("betaInternalStringGuard.test.ts passed");
}

run();
