import assert from "assert";
import { normalizeUIDesignTokens } from "../uiDesignTokenNormalizer";
import { createUIStyleControlPlan } from "../uiStyleControlPlanner";

const cleanTokens = normalizeUIDesignTokens([
  { tokenId: "1", name: "Primary", category: "color", value: "rgb(0,0,0)" },
  { tokenId: "2", name: "Space", category: "spacing", value: "8px" },
]);

const a = createUIStyleControlPlan({ tokenResult: cleanTokens, options: { outputMode: "cssVariables" } });
const b = createUIStyleControlPlan({ tokenResult: cleanTokens, options: { outputMode: "cssVariables" } });
assert.strictEqual(a.stylePlanId, b.stylePlanId);
assert(a.cssVariableBlock?.startsWith(":root {"));
assert(a.cssVariableBlock?.includes("--ui-color-primary"));

const t = createUIStyleControlPlan({ tokenResult: cleanTokens, options: { outputMode: "tailwindTheme" } });
assert.strictEqual(t.styleTargetFilePath, "tailwind.config.ts");

const i = createUIStyleControlPlan({ tokenResult: cleanTokens, options: { outputMode: "inlinePreview" } });
assert.strictEqual(i.styleTargetFilePath, undefined);

const c = createUIStyleControlPlan({ tokenResult: cleanTokens, options: { outputMode: "cssVariables" }, fullProjectOrderedFiles: ["src/styles/tokens.css"] });
assert(c.requiresManualReview);

const invalidTokens = normalizeUIDesignTokens([{ tokenId: "x", name: "Bad", category: "color", value: "url(javascript:1)" }]);
const withIssues = createUIStyleControlPlan({ tokenResult: invalidTokens, options: { outputMode: "cssVariables" } });
assert(withIssues.issueCount > 0);
assert.strictEqual(withIssues.riskLevel, "high");

const withPreview = createUIStyleControlPlan({ tokenResult: cleanTokens, selectedNodeId: "node-1", selectedDocumentId: "doc-1", options: { outputMode: "inlinePreview" } });
assert.strictEqual(withPreview.previewMetadata?.selectedNodeId, "node-1");
assert.strictEqual(withPreview.previewMetadata?.selectedDocumentId, "doc-1");

const unknownMode = createUIStyleControlPlan({ tokenResult: cleanTokens, options: { outputMode: "unknown" as any } });
assert(unknownMode.requiresManualReview);
assert.strictEqual(unknownMode.riskLevel, "high");

console.log("uiStyleControlPlanner.test.ts passed");
