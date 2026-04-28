import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";

import { validateGeneratedAppCommercialReadiness } from "../validateGeneratedAppCommercialReadiness";

function withFixture(files: Record<string, string>, run: (root: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "generated-app-commercial-readiness-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const filePath = path.join(root, rel);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf8");
    }
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const candidateReadme = `
# Candidate app
This app is not launch-ready and cannot be presented as launch-ready.
legal claim boundary: no launch claim without legal review evidence.
deploy plan: deploy using npm run build and npm test, then deploy and smoke test.
security notes: authentication and security boundaries are documented.
auth boundary: auth boundary for role-based access.
integration boundary: integration boundary for external providers.
responsive notes: responsive UI behavior documented.
accessibility notes: accessibility checklist documented.
error empty loading states: error and empty and loading states are documented.
data model: data model and storage plan are documented.
`;

withFixture(
  {
    "package.json": JSON.stringify({ name: "candidate", scripts: { build: "vite build", test: "vitest run" } }, null, 2),
    "src/main.tsx": "console.log('ready')",
    "app/page.tsx": "export default function Page(){return <main>ok</main>;}",
    "README.md": candidateReadme,
  },
  (root) => {
    const result = validateGeneratedAppCommercialReadiness(root);
    assert.equal(result.status, "candidate_ready");
    assert.equal(result.gates.no_placeholder_scan.passed, true);
    assert.equal(result.gates.legal_claim_boundary.passed, true);
  }
);

withFixture(
  {
    "package.json": JSON.stringify({ name: "blocked", scripts: { build: "next build", test: "vitest" } }, null, 2),
    "app/page.tsx": "export default function Page(){ return <div>TODO fake payment</div>; }",
    "README.md": candidateReadme,
  },
  (root) => {
    const result = validateGeneratedAppCommercialReadiness(root);
    assert.equal(result.status, "blocked");
    assert.equal(result.gates.no_placeholder_scan.passed, false);
  }
);

withFixture(
  {
    "package.json": JSON.stringify({ name: "preview" }, null, 2),
    "src/index.ts": "console.log('preview')",
    "README.md": "This app is not launch-ready and includes legal caveat.",
  },
  (root) => {
    const result = validateGeneratedAppCommercialReadiness(root);
    assert.equal(result.status, "preview_ready");
    assert.equal(result.gates.file_structure.passed, true);
    assert.equal(result.gates.no_placeholder_scan.passed, true);
  }
);

{
  const result = validateGeneratedAppCommercialReadiness(path.join(os.tmpdir(), "does-not-exist"));
  assert.equal(result.status, "blocked");
  assert.equal(result.gates.file_structure.passed, false);
}

withFixture(
  {
    "package.json": JSON.stringify({ name: "critical", scripts: { build: "build", test: "test" } }, null, 2),
    "app/page.tsx": "throw new Error('not implemented')",
    "README.md": candidateReadme,
  },
  (root) => {
    const result = validateGeneratedAppCommercialReadiness(root);
    assert.equal(result.gates.no_placeholder_scan.passed, false);
    assert.equal(result.status, "blocked");
  }
);

withFixture(
  {
    "package.json": JSON.stringify({ name: "status-check", scripts: { build: "build", test: "test" } }, null, 2),
    "app/page.tsx": "export default function Page(){return <main>done</main>;}",
    "README.md": candidateReadme,
  },
  (root) => {
    const result = validateGeneratedAppCommercialReadiness(root);
    assert.notEqual(result.status, "launch_ready");
    assert.notEqual(result.status, "production_ready");
  }
);

withFixture(
  {
    "package.json": JSON.stringify({ name: "caveats", scripts: { build: "build", test: "test" } }, null, 2),
    "src/main.ts": "console.log('ok')",
    "README.md": candidateReadme,
  },
  (root) => {
    const result = validateGeneratedAppCommercialReadiness(root);
    assert.ok(result.caveats.some((c) => c.toLowerCase().includes("not launch-readiness proof")));
    assert.ok(result.caveats.some((c) => c.toLowerCase().includes("runtime validation")));
    assert.ok(result.caveats.some((c) => c.toLowerCase().includes("deployment smoke")));
    assert.ok(result.caveats.some((c) => c.toLowerCase().includes("legal claim boundary")));
  }
);

console.log("generatedAppCommercialReadiness.test.ts passed");
