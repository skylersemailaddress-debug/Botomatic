export type AutonomousBlueprintSpec = {
  id: string;
  pages: string[];
  components: string[];
  dataModel: string[];
  roles: string[];
  workflows: string[];
  apiNeeds: string[];
  validationPlan: string[];
  smokeRoutes: string[];
  excludedUnsupportedIntegrations: string[];
  commonFollowUpEdits: string[];
};

function baseBlueprint(id: string): AutonomousBlueprintSpec {
  return {
    id,
    pages: ["/", "/settings"],
    components: ["Header", "MainContent", "PrimaryForm"],
    dataModel: ["users", "core_records"],
    roles: ["owner", "operator"],
    workflows: ["create", "update", "list"],
    apiNeeds: ["CRUD endpoints", "health endpoint"],
    validationPlan: ["build", "runtime smoke", "placeholder audit"],
    smokeRoutes: ["/"],
    excludedUnsupportedIntegrations: [
      "live payment provider activation without real credentials",
      "live email provider delivery without configured SMTP/API keys",
      "live auth provider federation without tenant credentials",
      "live third-party deployment claims from local smoke only"
    ],
    commonFollowUpEdits: ["Add Page", "Add Feature", "Improve Design", "Fix Broken Build"]
  };
}

export const autonomousBlueprintRegistry: AutonomousBlueprintSpec[] = [
  baseBlueprint("landing_page"),
  baseBlueprint("local_service"),
  baseBlueprint("restaurant_ordering"),
  baseBlueprint("booking"),
  baseBlueprint("ecommerce"),
  baseBlueprint("marketplace"),
  baseBlueprint("saas_dashboard"),
  baseBlueprint("crm"),
  baseBlueprint("support_portal"),
  baseBlueprint("lms_course"),
  baseBlueprint("finance_budgeting"),
  baseBlueprint("internal_admin"),
  baseBlueprint("inventory_logistics"),
  baseBlueprint("job_board"),
  baseBlueprint("directory"),
  baseBlueprint("analytics_reporting"),
  baseBlueprint("ai_tool")
];

export function getAutonomousBlueprint(id: string): AutonomousBlueprintSpec | undefined {
  return autonomousBlueprintRegistry.find((entry) => entry.id === id);
}

export function inferAutonomousBlueprintFromPrompt(prompt: string): AutonomousBlueprintSpec {
  const lower = prompt.toLowerCase();
  const scored = autonomousBlueprintRegistry.map((entry) => {
    const terms = entry.id.split("_");
    const score = terms.reduce((acc, term) => acc + (lower.includes(term) ? 1 : 0), 0);
    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  return scored[0]?.entry ?? autonomousBlueprintRegistry[0];
}
