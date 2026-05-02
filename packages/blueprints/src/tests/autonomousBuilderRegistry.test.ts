import assert from "assert";
import { autonomousBlueprintRegistry, getAutonomousBlueprint, inferAutonomousBlueprintFromPrompt } from "../autonomousBuilderRegistry";

const REQUIRED_IDS = [
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
  "ai_tool"
];

assert.equal(autonomousBlueprintRegistry.length, REQUIRED_IDS.length, "autonomous registry must cover required blueprint IDs");

for (const id of REQUIRED_IDS) {
  const entry = getAutonomousBlueprint(id);
  assert(entry, `missing required autonomous blueprint: ${id}`);
  assert(entry!.pages.length > 0, `${id}: pages required`);
  assert(entry!.components.length > 0, `${id}: components required`);
  assert(entry!.dataModel.length > 0, `${id}: data model required`);
  assert(entry!.roles.length > 0, `${id}: roles required`);
  assert(entry!.workflows.length > 0, `${id}: workflows required`);
  assert(entry!.apiNeeds.length > 0, `${id}: api needs required`);
  assert(entry!.validationPlan.length > 0, `${id}: validation plan required`);
  assert(entry!.smokeRoutes.length > 0, `${id}: smoke routes required`);
  assert(entry!.excludedUnsupportedIntegrations.length > 0, `${id}: unsupported integration exclusions required`);
  assert(entry!.commonFollowUpEdits.length > 0, `${id}: follow-up edits required`);
}

const inferred = inferAutonomousBlueprintFromPrompt("Build a CRM with pipelines and contacts");
assert.equal(inferred.id, "crm", "prompt-based blueprint inference should select crm for crm prompts");

const inferredTypos = inferAutonomousBlueprintFromPrompt("mak an analytcs reportng app");
assert(
  autonomousBlueprintRegistry.some((entry) => entry.id === inferredTypos.id),
  "typo-heavy prompts must still map deterministically to a known blueprint",
);

console.log("autonomousBuilderRegistry.test.ts passed");
