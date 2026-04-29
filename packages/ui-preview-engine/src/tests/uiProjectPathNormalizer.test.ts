import assert from "assert";
import { detectProjectFileConflicts, normalizeProjectPath, normalizeProjectSlug, sortProjectFilePaths } from "../uiProjectPathNormalizer";

assert.strictEqual(normalizeProjectSlug("My Cool__App!!"), "my-cool-app");
assert.strictEqual(normalizeProjectSlug("My Cool__App!!"), "my-cool-app");
assert.strictEqual(normalizeProjectPath("src\\components\\App.tsx").path, "src/components/App.tsx");
assert(normalizeProjectPath("/tmp/a.ts").issues.some((i) => i.includes("absolute")));
assert(normalizeProjectPath("../secret.ts").issues.some((i) => i.includes("traversal")));
assert(normalizeProjectPath("release-evidence/runtime/proof.txt").issues.some((i) => i.includes("runtime")));
const conflicts = detectProjectFileConflicts([{ path: "src/a.ts", source: "projectSpec" }, { path: "src//a.ts", source: "projectSpec" }, { path: ".env", source: "projectSpec" }]);
assert(conflicts.some((i) => i.code === "duplicate-path"));
assert(conflicts.some((i) => i.code === "secret-path"));
assert(!detectProjectFileConflicts([{ path: ".env.example", source: "projectSpec", placeholderSafe: true }]).some((i) => i.code === "secret-path"));
assert.deepStrictEqual(sortProjectFilePaths(["b.ts","a.ts","a.ts"]), ["a.ts","b.ts"]);
console.log("uiProjectPathNormalizer.test.ts passed");
