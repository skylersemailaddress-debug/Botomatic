import assert from "assert";
import {
  PREVIEW_CAVEAT,
  createUiPreviewManifest,
  createUiPreviewManifestFromBlueprint,
  summarizeUiPreviewManifest,
  validateUiPreviewManifest,
  type UiPreviewManifest,
  type UiPreviewSpec,
} from "../index";

const baseSpec: UiPreviewSpec = {
  projectName: "Acme Growth Hub",
  productType: "saas dashboard",
  description: "A SaaS dashboard for operators that need analytics and workflow controls.",
  targetUsers: ["operators", "admins"],
  requiredFeatures: ["analytics", "workflow", "alerts"],
  preferredTone: "friendly",
  brandHints: ["bold"],
  integrationsRequested: ["analyticsProvider", "crmSync"],
  dataObjects: ["accounts", "events", "alerts"],
  constraints: ["No placeholder metrics", "WCAG AA"],
};

const explicit = createUiPreviewManifestFromBlueprint("saasDashboard", baseSpec);
assert.equal(explicit.selectedBlueprintId, "saasDashboard", "explicit blueprint should be used");
assert.ok(explicit.pages.length > 0, "manifest should include pages derived from blueprint");
assert.ok(explicit.componentTree.length > 0, "manifest should include component tree");
assert.ok(explicit.componentTree[0].children && explicit.componentTree[0].children.length > 0, "page nodes should include components");
assert.ok(explicit.uxStateCoverage.empty.length > 0, "empty state coverage should be included");
assert.ok(explicit.uxStateCoverage.loading.length > 0, "loading state coverage should be included");
assert.ok(explicit.uxStateCoverage.error.length > 0, "error state coverage should be included");
assert.ok(explicit.accessibilityNotes.length > 0, "accessibility notes should be included");
assert.ok(explicit.responsiveNotes.length > 0, "responsive notes should be included");
assert.ok(explicit.noPlaceholderRules.length > 0, "no-placeholder rules should be included");
assert.equal(explicit.commercialReadinessCaveat, PREVIEW_CAVEAT, "commercial caveat should match required claim boundary text");

const inferred = createUiPreviewManifest({
  ...baseSpec,
  blueprintId: undefined,
  productType: "analytics dashboard",
  description: "An analytics dashboard for analysts and operators",
});
assert.equal(inferred.selectedBlueprintId, "analyticsDashboard", "manifest should infer blueprint from productType/description");

assert.throws(
  () => createUiPreviewManifestFromBlueprint("unknown-blueprint", baseSpec),
  /Unknown UI blueprint ID for preview/,
  "unknown blueprint IDs should fail deterministically",
);

const deterministicA = createUiPreviewManifestFromBlueprint("saasDashboard", baseSpec);
const deterministicB = createUiPreviewManifestFromBlueprint("saasDashboard", baseSpec);
const stripGeneratedAt = (manifest: UiPreviewManifest): Omit<UiPreviewManifest, "generatedAt"> => {
  const { generatedAt, ...rest } = manifest;
  return rest;
};
assert.deepEqual(
  stripGeneratedAt(deterministicA),
  stripGeneratedAt(deterministicB),
  "manifest should be deterministic for same input except generatedAt",
);

const brokenManifest = {
  ...explicit,
  projectName: "",
  pages: [],
  componentTree: [],
  uxStateCoverage: { empty: [], loading: [], error: [] },
  noPlaceholderRules: [],
  accessibilityNotes: [],
  responsiveNotes: [],
  commercialReadinessCaveat: "insufficient caveat",
};
const issues = validateUiPreviewManifest(brokenManifest);
assert.ok(issues.some((issue) => issue.path === "projectName" && issue.severity === "error"));
assert.ok(issues.some((issue) => issue.path === "pages" && issue.severity === "error"));
assert.ok(issues.some((issue) => issue.path === "componentTree" && issue.severity === "error"));
assert.ok(issues.some((issue) => issue.path === "uxStateCoverage.empty" && issue.severity === "error"));
assert.ok(issues.some((issue) => issue.path === "accessibilityNotes" && issue.severity === "warning"));
assert.ok(issues.some((issue) => issue.path === "responsiveNotes" && issue.severity === "warning"));
assert.ok(issues.some((issue) => issue.path === "noPlaceholderRules" && issue.severity === "error"));
assert.ok(issues.some((issue) => issue.path === "commercialReadinessCaveat" && issue.severity === "error"));

const summary = summarizeUiPreviewManifest(explicit);
assert.ok(summary.includes("Acme Growth Hub preview uses"), "summary should include project context");
assert.ok(summary.includes("Caveat:"), "summary should include caveat");

console.log("ui-preview-engine uiPreviewEngine.test.ts passed");
