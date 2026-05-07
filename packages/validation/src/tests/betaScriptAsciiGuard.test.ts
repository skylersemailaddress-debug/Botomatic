import assert from "assert";
import fs from "fs";
import path from "path";

const root = process.cwd();

const SCRIPTS = [
  "scripts/launchBetaFull.ps1",
  "scripts/launchBetaLocal.ps1",
];

function run() {
  for (const rel of SCRIPTS) {
    const fullPath = path.join(root, rel);
    assert(fs.existsSync(fullPath), `${rel} must exist`);

    const buf = fs.readFileSync(fullPath);
    const badBytes: number[] = [];
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] > 127) badBytes.push(i);
    }
    assert(
      badBytes.length === 0,
      `${rel} contains ${badBytes.length} non-ASCII byte(s) at positions: ${badBytes.slice(0, 5).join(", ")}${badBytes.length > 5 ? " ..." : ""}. Rewrite as pure ASCII (replace em dashes with -, box-drawing with -)`,
    );

    const lines = buf.toString("ascii").split("\n");
    const requiresLines = lines
      .map((l, i) => ({ line: i + 1, text: l }))
      .filter(({ text }) => text.trimStart().startsWith("#Requires"));
    assert(
      requiresLines.length <= 1,
      `${rel} has ${requiresLines.length} '#Requires' lines (must have exactly 1): lines ${requiresLines.map((l) => l.line).join(", ")}`,
    );
  }

  console.log("betaScriptAsciiGuard.test.ts passed");
}

run();
