const fs = require("fs");
const path = require("path");

const root = process.cwd();

const surfaceFiles = {
  shell: "apps/control-plane/src/components/commercial/CommercialWorkspaceShell.tsx",
  panel: "apps/control-plane/src/components/commercial/CommercialPanel.tsx",
  vibe: "apps/control-plane/src/components/commercial/CommercialVibeCockpit.tsx",
  pro: "apps/control-plane/src/components/commercial/CommercialProCockpit.tsx",
  css: "apps/control-plane/src/styles/commercial-workspace.css",
  vibeRoute: "apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx",
  proRoute: "apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx",
};

for (const [name, rel] of Object.entries(surfaceFiles)) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`${name} missing: ${rel}`);
}

const scopedText = Object.values(surfaceFiles)
  .map((rel) => fs.readFileSync(path.join(root, rel), "utf8"))
  .join("\n");

const requiredTokens = [
  "data-testid=\"commercial-shell\"",
  "data-testid=\"commercial-product-sidebar\"",
  "data-testid=\"commercial-vibe-cockpit\"",
  "data-testid=\"commercial-vibe-right-rail\"",
  "data-testid=\"commercial-vibe-command-bar\"",
  "data-testid=\"commercial-pro-cockpit\"",
  "data-testid=\"commercial-pro-grid\"",
  "No generated preview yet",
  "No generated source yet",
  "No database schema generated yet",
  "No tests have run yet",
  "No runtime logs yet",
  "No commits yet",
  "Launch unavailable",
  "commercial-shell",
  "commercial-sidebar",
  "commercial-vibe-grid",
  "commercial-pro-grid",
];

for (const token of requiredTokens) {
  if (!scopedText.includes(token)) throw new Error(`Missing commercial gate token: ${token}`);
}

const bannedTokens = [
  /Luxora/,
  /Luxury Booking Site/,
  /Your Escape Awaits/,
  /Alex Johnson/,
  /24,512/,
  /feat: add availability calendar/,
  /198 Total Tests/,
  /92% Excellent/,
  /Performance improved by 47%/,
];

for (const pattern of bannedTokens) {
  if (pattern.test(scopedText)) throw new Error(`Banned fake/demo token found in commercial surface: ${pattern}`);
}

console.log("commercial cockpit static gates passed");
