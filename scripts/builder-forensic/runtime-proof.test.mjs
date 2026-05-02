import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { runGeneratedAppBuildRunSmoke, scoreCase } from "./run.mjs";

function makeTempGeneratedApp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "botomatic-generated-app-"));
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(root, "src"), { recursive: true });

  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: "generated-app-fixture",
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: {
          build: "node scripts/build.mjs",
          start: "node server.mjs",
          test: "node -e \"console.log('ok')\"",
        },
      },
      null,
      2
    ),
    "utf8"
  );

  fs.writeFileSync(
    path.join(root, "scripts", "build.mjs"),
    [
      "import fs from 'fs';",
      "import path from 'path';",
      "const root = process.cwd();",
      "const dist = path.join(root, 'dist');",
      "fs.mkdirSync(dist, { recursive: true });",
      "fs.copyFileSync(path.join(root, 'src', 'index.html'), path.join(dist, 'index.html'));",
      "console.log('build_complete');",
      "",
    ].join("\n"),
    "utf8"
  );

  fs.writeFileSync(
    path.join(root, "server.mjs"),
    [
      "import http from 'http';",
      "import fs from 'fs';",
      "import path from 'path';",
      "const port = Number(process.env.PORT || 4173);",
      "const html = fs.readFileSync(path.join(process.cwd(), 'dist', 'index.html'), 'utf8');",
      "const server = http.createServer((_req, res) => {",
      "  res.statusCode = 200;",
      "  res.setHeader('content-type', 'text/html; charset=utf-8');",
      "  res.end(html);",
      "});",
      "server.listen(port, '127.0.0.1');",
      "",
    ].join("\n"),
    "utf8"
  );

  fs.writeFileSync(
    path.join(root, "src", "index.html"),
    "<!doctype html><html><body><h1>fixture</h1></body></html>",
    "utf8"
  );

  return root;
}

function classify(input) {
  return scoreCase({
    intake: { ok: true, status: 200 },
    operator: { ok: true, status: 200, body: { operatorMessage: "ok" } },
    operatorHistory: [{ ok: true, body: { route: "plan" } }],
    status: { body: { plan: { packets: [] } } },
    execution: { body: {} },
    followup: null,
    repair: null,
    ...input,
  }).classification;
}

async function main() {
  {
    const result = classify({
      generatedProjectPath: null,
      localBuild: null,
      runtimeSmoke: null,
    });
    assert.equal(result, "FAIL_BUILDER");
  }

  {
    const result = classify({
      generatedProjectPath: "/tmp/example",
      localBuild: { ok: false },
      runtimeSmoke: { ok: false },
    });
    assert.equal(result, "FAIL_RUNTIME");
  }

  {
    const fixture = makeTempGeneratedApp();
    try {
      const proof = await runGeneratedAppBuildRunSmoke(fixture);
      assert.equal(proof.installResult.ok, true);
      assert.equal(proof.buildResult.ok, true);
      assert.equal(proof.smokeResult.ok, true);
      const result = classify({
        generatedProjectPath: fixture,
        localBuild: { ok: proof.buildResult.ok },
        runtimeSmoke: { ok: proof.smokeResult.ok },
      });
      assert.equal(result, "PASS_REAL");
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  }

  console.log("runtime-proof.test.mjs passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
