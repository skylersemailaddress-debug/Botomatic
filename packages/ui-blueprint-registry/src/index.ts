export type UIUXState = {
  empty: string[];
  loading: string[];
  error: string[];
};

export type UIPage = {
  id: string;
  displayName: string;
  components: string[];
};

export type UIComponentDefinition = {
  id: string;
  purpose: string;
  requiredProps: string[];
  requiredData: string[];
  uxStates: UIUXState;
};

export type UIBlueprint = {
  id: string;
  displayName: string;
  description: string;
  appCategory: string;
  targetUsers: string[];
  pages: UIPage[];
  components: UIComponentDefinition[];
  layoutZones: string[];
  dataRequirements: string[];
  emptyStates: string[];
  loadingStates: string[];
  errorStates: string[];
  responsiveBehavior: string[];
  accessibilityRequirements: string[];
  integrationSlots: string[];
  noPlaceholderRules: string[];
  recommendedThemeTokens: string[];
  commercialReadinessChecks: string[];
};

export const REQUIRED_UI_BLUEPRINT_IDS = [
  "marketingWebsite",
  "landingPage",
  "saasDashboard",
  "bookingApp",
  "ecommerceStore",
  "marketplace",
  "crm",
  "customerPortal",
  "adminTool",
  "workflowSystem",
  "analyticsDashboard",
  "aiAgentConsole",
  "gameLandingPage",
  "mobileAppShell",
  "botControlPanel",
  "repoRescueCockpit",
  "intelligenceCockpit",
] as const;

export type RequiredUIBlueprintId = (typeof REQUIRED_UI_BLUEPRINT_IDS)[number];

const baseNoPlaceholderRules = [
  "Disallow lorem ipsum, placeholder copy, and TODO text in user-facing content.",
  "Disallow fake production metrics, fake customer logos, and fabricated testimonials.",
  "Disallow fake integrations, fake deployment statuses, and fake operational alerts.",
];

const baseCommercialReadinessChecks = [
  "Require linked evidence artifacts for domain assumptions and launch constraints.",
  "Require validator evidence for no-placeholder and legal claim boundaries.",
  "Blueprint selection alone is not proof of launch readiness; runtime and legal gates must pass separately.",
];

function buildBlueprint(id: RequiredUIBlueprintId, displayName: string, appCategory: string, primaryUsers: string): UIBlueprint {
  const pagePrefix = id.replace(/([A-Z])/g, "-$1").toLowerCase();
  const components: UIComponentDefinition[] = [
    {
      id: `${pagePrefix}-hero-or-header`,
      purpose: `Establish ${displayName} context and key actions for ${primaryUsers}.`,
      requiredProps: ["title", "primaryActionLabel"],
      requiredData: ["workspaceSummary", "userRole"],
      uxStates: {
        empty: ["Show guided onboarding CTA when no records exist."],
        loading: ["Show non-blocking skeletons for summary cards and navigation."],
        error: ["Show recoverable error banner with retry and support link."],
      },
    },
    {
      id: `${pagePrefix}-primary-grid`,
      purpose: `Render core ${appCategory} objects and workflows without placeholder data.`,
      requiredProps: ["columns", "rowActions"],
      requiredData: ["records", "filters", "sortState"],
      uxStates: {
        empty: ["Present explicit empty state with next-step action."],
        loading: ["Use progressive row skeletons and keep filters interactive."],
        error: ["Show scoped error with failed query details and retry."],
      },
    },
    {
      id: `${pagePrefix}-detail-panel`,
      purpose: "Display selected entity context, status, and integration metadata.",
      requiredProps: ["entityId", "tabs"],
      requiredData: ["entity", "auditTrail", "integrationHealth"],
      uxStates: {
        empty: ["Prompt selection when no entity is selected."],
        loading: ["Show panel-level skeletons preserving layout stability."],
        error: ["Show panel fallback with diagnostic identifier."],
      },
    },
  ];

  return {
    id,
    displayName,
    description: `${displayName} blueprint for ${appCategory} teams with explicit UX states and commercial safety constraints.`,
    appCategory,
    targetUsers: [primaryUsers, "operators", "admins"],
    pages: [
      { id: `${id}.home`, displayName: "Home", components: [components[0].id, components[1].id] },
      { id: `${id}.workspace`, displayName: "Workspace", components: [components[1].id, components[2].id] },
    ],
    components,
    layoutZones: ["topNav", "sideNav", "mainContent", "contextPanel", "utilityRail"],
    dataRequirements: [
      "Authenticated user context",
      "Domain entities with stable identifiers",
      "Audit-friendly timestamps and source metadata",
    ],
    emptyStates: [
      "No records state with explicit next action",
      "No search results state with clear filter reset",
    ],
    loadingStates: [
      "Initial app shell loading skeleton",
      "Section-level progressive loading indicators",
    ],
    errorStates: [
      "Recoverable query failure state",
      "Global fallback state with trace ID",
    ],
    responsiveBehavior: [
      "Desktop: split layout with persistent navigation",
      "Tablet: collapsible side navigation with stacked detail panel",
      "Mobile: single-column flow with bottom action rail",
    ],
    accessibilityRequirements: [
      "Keyboard navigable primary interactions",
      "Color contrast meeting WCAG AA for text and controls",
      "Visible focus indicators and semantic landmarks",
      "Announced async updates for loading and error regions",
    ],
    integrationSlots: [
      "authProvider",
      "billingProvider",
      "analyticsProvider",
      "notificationProvider",
      "dataSyncProvider",
    ],
    noPlaceholderRules: baseNoPlaceholderRules,
    recommendedThemeTokens: ["color.surface", "color.primary", "spacing.scale", "radius.card", "typography.body"],
    commercialReadinessChecks: baseCommercialReadinessChecks,
  };
}

const BLUEPRINT_TEMPLATES: ReadonlyArray<UIBlueprint> = [
  buildBlueprint("marketingWebsite", "Marketing Website", "marketing", "marketing teams"),
  buildBlueprint("landingPage", "Landing Page", "marketing", "growth teams"),
  buildBlueprint("saasDashboard", "SaaS Dashboard", "saas", "product operators"),
  buildBlueprint("bookingApp", "Booking App", "scheduling", "service coordinators"),
  buildBlueprint("ecommerceStore", "E-commerce Store", "commerce", "merchandising teams"),
  buildBlueprint("marketplace", "Marketplace", "commerce", "marketplace managers"),
  buildBlueprint("crm", "CRM", "sales", "revenue teams"),
  buildBlueprint("customerPortal", "Customer Portal", "customer-success", "customers"),
  buildBlueprint("adminTool", "Admin Tool", "operations", "operations teams"),
  buildBlueprint("workflowSystem", "Workflow System", "automation", "process owners"),
  buildBlueprint("analyticsDashboard", "Analytics Dashboard", "analytics", "analysts"),
  buildBlueprint("aiAgentConsole", "AI Agent Console", "ai-operations", "AI operators"),
  buildBlueprint("gameLandingPage", "Game Landing Page", "gaming", "game studios"),
  buildBlueprint("mobileAppShell", "Mobile App Shell", "mobile", "mobile teams"),
  buildBlueprint("botControlPanel", "Bot Control Panel", "automation", "bot supervisors"),
  buildBlueprint("repoRescueCockpit", "Repo Rescue Cockpit", "developer-tools", "repo maintainers"),
  buildBlueprint("intelligenceCockpit", "Intelligence Cockpit", "intelligence", "intel analysts"),
];

const UI_BLUEPRINTS_BY_ID = new Map(BLUEPRINT_TEMPLATES.map((blueprint) => [blueprint.id, blueprint]));

export function getUiBlueprint(id: string): UIBlueprint | undefined {
  return UI_BLUEPRINTS_BY_ID.get(id);
}

export function listUiBlueprints(): UIBlueprint[] {
  return [...BLUEPRINT_TEMPLATES].sort((a, b) => a.id.localeCompare(b.id));
}

export function getUiBlueprintIds(): string[] {
  return listUiBlueprints().map((blueprint) => blueprint.id);
}

export function maybeInferUiBlueprintForSpec(specLikeInput: string): UIBlueprint | undefined {
  const normalized = specLikeInput.toLowerCase();
  return listUiBlueprints().find((blueprint) => {
    const terms = [blueprint.id, blueprint.displayName, blueprint.appCategory]
      .join(" ")
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length >= 4);
    return terms.some((term) => normalized.includes(term));
  });
}

export function assertValidUiBlueprintRegistry(): void {
  const ids = BLUEPRINT_TEMPLATES.map((blueprint) => blueprint.id);

  if (ids.length !== new Set(ids).size) {
    throw new Error("UI blueprint registry contains duplicate blueprint IDs");
  }

  for (const requiredId of REQUIRED_UI_BLUEPRINT_IDS) {
    if (!UI_BLUEPRINTS_BY_ID.has(requiredId)) {
      throw new Error(`UI blueprint registry missing required blueprint ID: ${requiredId}`);
    }
  }

  for (const blueprint of BLUEPRINT_TEMPLATES) {
    if (!blueprint.pages.length) throw new Error(`Blueprint ${blueprint.id} must include at least one page`);
    if (!blueprint.components.length) throw new Error(`Blueprint ${blueprint.id} must include components`);
    if (!blueprint.layoutZones.length) throw new Error(`Blueprint ${blueprint.id} must include layout zones`);
    if (!blueprint.emptyStates.length) throw new Error(`Blueprint ${blueprint.id} must include empty states`);
    if (!blueprint.loadingStates.length) throw new Error(`Blueprint ${blueprint.id} must include loading states`);
    if (!blueprint.errorStates.length) throw new Error(`Blueprint ${blueprint.id} must include error states`);
    if (!blueprint.responsiveBehavior.length) throw new Error(`Blueprint ${blueprint.id} must include responsive behavior`);
    if (!blueprint.accessibilityRequirements.length) throw new Error(`Blueprint ${blueprint.id} must include accessibility requirements`);
    if (!blueprint.noPlaceholderRules.length) throw new Error(`Blueprint ${blueprint.id} must include no-placeholder rules`);
  }
}


// Backward-compatible exports for existing runtime callers.
export function getUIBlueprintsForDomain(domain: string): UIBlueprint[] {
  return listUiBlueprints().filter((blueprint) => blueprint.appCategory === domain);
}

export function listAllUIBlueprints(): UIBlueprint[] {
  return listUiBlueprints();
}
