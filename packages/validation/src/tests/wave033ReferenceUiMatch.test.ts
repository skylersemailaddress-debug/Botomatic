import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const files = [
  "apps/control-plane/src/components/commercial/CommercialWorkspaceShell.tsx",
  "apps/control-plane/src/components/commercial/CommercialVibeCockpit.tsx",
  "apps/control-plane/src/components/commercial/CommercialProCockpit.tsx",
  "apps/control-plane/src/components/commercial/CommercialPanel.tsx",
  "apps/control-plane/src/styles/commercial-workspace.css",
  "apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx",
  "apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx",
];

for (const file of files) {
  assert(existsSync(join(root, file)), `missing commercial reference file: ${file}`);
}

const source = files.map((file) => readFileSync(join(root, file), "utf8")).join("\n");

const requiredSignals = [
  "commercial-shell",
  "commercial-product-sidebar",
  "commercial-vibe-cockpit",
  "commercial-vibe-right-rail",
  "commercial-vibe-command-bar",
  "commercial-pro-cockpit",
  "commercial-pro-grid",
  "CommercialWorkspaceShell",
  "CommercialVibeCockpit",
  "CommercialProCockpit",
  "No generated preview yet",
  "No generated source yet",
  "No database schema generated yet",
  "No tests have run yet",
  "No runtime logs yet",
  "No commits yet",
  "Launch unavailable",
];

for (const signal of requiredSignals) {
  assert(source.includes(signal), `missing layout signal: ${signal}`);
}

const bannedSignals = [
  "Luxora",
  "Luxury Booking Site",
  "Your Escape Awaits",
  "Alex Johnson",
  "24,512",
  "198 Total Tests",
];

for (const signal of bannedSignals) {
  assert(!source.includes(signal), `banned demo signal present: ${signal}`);
}

console.log("WAVE-033 commercial reference UI match checks passed.");
