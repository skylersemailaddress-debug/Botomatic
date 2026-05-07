import assert from "assert";
import fs from "fs";
import path from "path";

const root = process.cwd();

function read(rel: string): string {
  try {
    return fs.readFileSync(path.join(root, rel), "utf8");
  } catch {
    return "";
  }
}

const OBSOLETE_COPY = [
  "What do you want to build?",
  "Start Building",
  "SaaS dashboard with auth and billing",
  "E-commerce store with product catalog",
  "Landing page for a mobile app",
  "Portfolio site with case studies",
];

const FILES_TO_GUARD = [
  "apps/control-plane/src/app/page.tsx",
  "apps/control-plane/src/app/projects/new/page.tsx",
  "apps/control-plane/src/components/beta-hq/BetaHQ.tsx",
];

const BETA_HQ_REQUIRED_SIGNALS = [
  "Botomatic Beta HQ",
  "Invite-only builder control plane",
  "Friends",
  "family beta",
  "/api/projects/intake",
  "uploadIntakeFile",
];

function run() {
  for (const file of FILES_TO_GUARD) {
    const content = read(file);
    if (!content) continue;
    for (const phrase of OBSOLETE_COPY) {
      assert(
        !content.includes(phrase),
        `${file} must not contain obsolete intake copy: "${phrase}"`,
      );
    }
  }

  const betaHQ = read("apps/control-plane/src/components/beta-hq/BetaHQ.tsx");
  assert(betaHQ.length > 0, "BetaHQ component must exist at apps/control-plane/src/components/beta-hq/BetaHQ.tsx");

  for (const signal of BETA_HQ_REQUIRED_SIGNALS) {
    assert(betaHQ.includes(signal), `BetaHQ component is missing required signal: "${signal}"`);
  }

  const rootPage = read("apps/control-plane/src/app/page.tsx");
  assert(rootPage.includes("BetaHQ"), "Root page must render BetaHQ, not redirect to /projects/new");
  assert(!rootPage.includes('redirect("/projects/new")'), "Root page must not redirect to obsolete /projects/new");

  const newProjectPage = read("apps/control-plane/src/app/projects/new/page.tsx");
  assert(!newProjectPage.includes("What do you want"), "/projects/new must not render obsolete intake heading");
  assert(
    newProjectPage.includes('redirect("/")') || newProjectPage.includes("redirect('/')"),
    "/projects/new must redirect to /",
  );

  console.log("betaHQObsoleteCopyGuard.test.ts passed");
}

run();
