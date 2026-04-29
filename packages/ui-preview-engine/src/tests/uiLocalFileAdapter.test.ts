import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { createUILocalFileAdapter } from "../uiLocalFileAdapter";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ui-local-adapter-"));
fs.mkdirSync(path.join(root, "src"), { recursive: true });
fs.writeFileSync(path.join(root, "src", "ok.ts"), "export const ok = 1;", "utf8");

const readOnly = createUILocalFileAdapter({ projectRoot: root, allowWrites: false, maxFileBytes: 64 });
assert.ok(readOnly.readFile("src/ok.ts").includes("ok"));
assert.throws(() => readOnly.readFile("../escape.ts"));
assert.throws(() => readOnly.exists("release-evidence/runtime/x.json"));
assert.throws(() => readOnly.exists(".env"));
assert.throws(() => readOnly.exists("secrets/api-key.json"));
assert.throws(() => readOnly.exists("node_modules/a.ts"));
assert.throws(() => readOnly.exists(".git/config"));
assert.throws(() => readOnly.exists("dist/out.ts"));
assert.throws(() => readOnly.exists("build/out.ts"));
assert.throws(() => readOnly.exists("src/file.txt"));
assert.throws(() => readOnly.writeFile("src/new.ts", "x"));

const writable = createUILocalFileAdapter({ projectRoot: root, allowWrites: true, maxFileBytes: 8 });
writable.writeFile("src/new.ts", "let a=1;");
assert.strictEqual(writable.readFile("src/new.ts"), "let a=1;");
assert.throws(() => writable.writeFile("src/new.ts", "0123456789"));
console.log("uiLocalFileAdapter tests passed");
