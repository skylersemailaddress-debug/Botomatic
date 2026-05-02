import assert from "assert";
import {
  autonomousBlueprintRegistry,
  getAutonomousBlueprint,
  inferAutonomousBlueprintFromPrompt,
} from "../../../blueprints/src/autonomousBuilderRegistry";

const requiredBlueprintIds = [
  "landing_page",
  "local_service",
  "restaurant_ordering",
  "booking",
  "ecommerce",
  "marketplace",
  "saas_dashboard",
  "crm",
  "support_portal",
  "lms_course",
  "finance_budgeting",
  "internal_admin",
  "inventory_logistics",
  "job_board",
  "directory",
  "analytics_reporting",
  "ai_tool",
];

assert.equal(
  autonomousBlueprintRegistry.length,
  requiredBlueprintIds.length,
  "Phase 2 autonomous registry must include required blueprint set",
);

for (const id of requiredBlueprintIds) {
  const blueprint = getAutonomousBlueprint(id);
  assert(blueprint, `missing autonomous blueprint ${id}`);
  assert(blueprint!.pages.length > 0, `${id}: pages required`);
  assert(blueprint!.components.length > 0, `${id}: components required`);
  assert(blueprint!.dataModel.length > 0, `${id}: data model required`);
  assert(blueprint!.roles.length > 0, `${id}: roles required`);
  assert(blueprint!.workflows.length > 0, `${id}: workflows required`);
  assert(blueprint!.apiNeeds.length > 0, `${id}: api needs required`);
  assert(blueprint!.validationPlan.length > 0, `${id}: validation plan required`);
  assert(blueprint!.smokeRoutes.length > 0, `${id}: smoke routes required`);
  assert(
    blueprint!.excludedUnsupportedIntegrations.some((entry) => entry.toLowerCase().includes("credentials") || entry.toLowerCase().includes("live")),
    `${id}: unsupported integrations must be explicitly excluded`,
  );
  assert(blueprint!.commonFollowUpEdits.length > 0, `${id}: follow-up edit guidance required`);
}

const matches = [
  { prompt: "build a crm app for pipeline and contacts", expected: "crm" },
  { prompt: "make an ecommerce checkout storefront", expected: "ecommerce" },
  { prompt: "ai tool for writing and summarization", expected: "ai_tool" },
];

for (const entry of matches) {
  const inferred = inferAutonomousBlueprintFromPrompt(entry.prompt);
  assert.equal(inferred.id, entry.expected, `prompt should infer ${entry.expected}`);
}

console.log("blueprintCoveragePhase2.test.ts passed");
