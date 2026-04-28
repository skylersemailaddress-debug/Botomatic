import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { validateGeneratedAppNoPlaceholders } from "../validateGeneratedAppNoPlaceholders";

function withFixture(files: Record<string, string | Buffer>, run: (root: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "generated-app-noplaceholder-"));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const absolute = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      if (Buffer.isBuffer(content)) {
        fs.writeFileSync(absolute, content);
      } else {
        fs.writeFileSync(absolute, content, "utf8");
      }
    }
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

withFixture(
  {
    "app/page.tsx": "export default function Page(){ return <main>Ready</main>; }",
    "app/api/contact/route.ts": "export async function POST(){ return Response.json({ ok: true }); }",
    "README.md": "# Product Launch\nProduction launch instructions.",
  },
  (root) => {
    const result = validateGeneratedAppNoPlaceholders(root, { includeMarkdown: true, rootLabel: "clean-fixture" });
    assert.equal(result.status, "passed");
    assert.equal(result.findings.length, 0);
    assert.ok(result.scannedFiles.includes("app/page.tsx"));
    assert.ok(result.summary.includes("clean-fixture"));
  }
);

withFixture(
  {
    "app/components/Hero.tsx": "export function Hero(){ return <div>TODO placeholder lorem ipsum</div>; }",
  },
  (root) => {
    const result = validateGeneratedAppNoPlaceholders(root);
    assert.equal(result.status, "failed");
    assert.ok(result.findings.some((finding) => finding.pattern === "TODO"));
    assert.ok(result.findings.some((finding) => finding.pattern === "placeholder"));
    assert.ok(result.findings.some((finding) => finding.pattern === "lorem ipsum"));
  }
);

withFixture(
  {
    "app/api/orders/route.ts": "export async function POST(){ throw new Error(\"not implemented\"); }",
  },
  (root) => {
    const result = validateGeneratedAppNoPlaceholders(root);
    assert.equal(result.status, "failed");
    assert.ok(result.findings.some((finding) => finding.pattern.includes("not implemented")));
  }
);

withFixture(
  {
    "app/lib/payments.ts": "export const key = 'sk_test_abcdef1234'; // fake payment",
    "app/lib/auth.ts": "export const provider = 'mock auth';",
    "app/lib/notify.ts": "export const email = 'fake email';",
  },
  (root) => {
    const result = validateGeneratedAppNoPlaceholders(root);
    assert.equal(result.status, "failed");
    assert.ok(result.findings.some((finding) => finding.pattern === "sk_test_"));
    assert.ok(result.findings.some((finding) => finding.pattern === "fake payment"));
    assert.ok(result.findings.some((finding) => finding.pattern === "mock auth"));
    assert.ok(result.findings.some((finding) => finding.pattern === "fake email"));
  }
);

withFixture(
  {
    "tests/generated.test.ts": "// TODO in test file should be skipped by default",
    "app/page.tsx": "export default function Page(){return <div>ok</div>;}",
  },
  (root) => {
    const result = validateGeneratedAppNoPlaceholders(root);
    assert.equal(result.status, "passed");
    assert.ok(result.skippedFiles.some((file) => file.filePath === "tests/generated.test.ts"));
  }
);

withFixture(
  {
    "tests/generated.test.ts": "// TODO in test file should fail when scanTests=true",
  },
  (root) => {
    const result = validateGeneratedAppNoPlaceholders(root, { scanTests: true });
    assert.equal(result.status, "failed");
    assert.ok(result.scannedFiles.includes("tests/generated.test.ts"));
  }
);

withFixture(
  {
    "app/page.tsx": "export default function Page(){ return <main>replace me</main>; }",
    "app/keep.tsx": "export const Keep = () => <div>Stable</div>;",
  },
  (root) => {
    const result = validateGeneratedAppNoPlaceholders(root, { allowlistPaths: ["app/page.tsx"] });
    assert.equal(result.status, "passed");
    assert.ok(result.skippedFiles.some((entry) => entry.filePath === "app/page.tsx" && entry.reason === "allowlisted"));
  }
);

withFixture(
  {
    "dist/main.js": "TODO ignored in build output",
    "assets/logo.png": Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    "app/big.json": "x".repeat(2048),
    "app/page.tsx": "export default function Page(){return <div>ok</div>;}",
  },
  (root) => {
    const result = validateGeneratedAppNoPlaceholders(root, { maxFileSizeBytes: 1024 });
    assert.equal(result.status, "passed");
    assert.ok(result.skippedFiles.some((entry) => entry.filePath === "dist/main.js"));
    assert.ok(result.skippedFiles.some((entry) => entry.filePath === "assets/logo.png"));
    assert.ok(result.skippedFiles.some((entry) => entry.filePath === "app/big.json" && entry.reason === "max-size-exceeded"));
  }
);

withFixture(
  {
    "app/page.tsx": "export default function Page(){ return <main>TODO</main>; }",
  },
  (root) => {
    const result = validateGeneratedAppNoPlaceholders(root, { rootLabel: "summary-fixture" });
    assert.ok(Array.isArray(result.scannedFiles));
    assert.ok(Array.isArray(result.skippedFiles));
    assert.ok(Array.isArray(result.findings));
    assert.ok(result.summary.includes("summary-fixture"));
    assert.ok(result.findings.length > 0);
  }
);

console.log("generatedAppNoPlaceholders.test.ts passed");
