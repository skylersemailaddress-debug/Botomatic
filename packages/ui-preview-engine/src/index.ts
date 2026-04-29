import {
  getUiBlueprint,
  maybeInferUiBlueprintForSpec,
  type UIComponentDefinition,
  type UIBlueprint,
} from "../../ui-blueprint-registry/src";

export type UiPreviewSpec = {
  projectName: string;
  productType?: string;
  blueprintId?: string;
  description: string;
  targetUsers: string[];
  requiredFeatures: string[];
  preferredTone?: string;
  brandHints?: string[];
  integrationsRequested?: string[];
  dataObjects?: string[];
  constraints?: string[];
};

export type UiPreviewPage = {
  id: string;
  displayName: string;
  componentIds: string[];
};

export type UiPreviewComponentNode = {
  id: string;
  kind: "page" | "component";
  displayName: string;
  purpose?: string;
  requiredProps?: string[];
  requiredData?: string[];
  uxStates?: {
    empty: string[];
    loading: string[];
    error: string[];
  };
  children?: UiPreviewComponentNode[];
};

export type UiPreviewThemeTokens = {
  tone: string;
  colorPrimary: string;
  colorSurface: string;
  colorText: string;
  radiusCard: string;
  spacingScale: string;
  typographyBody: string;
};

export type UiPreviewIntegrationSlot = {
  id: string;
  requested: boolean;
  source: "blueprint" | "requested" | "both";
};

export type UiPreviewValidationIssue = {
  severity: "error" | "warning";
  path: string;
  message: string;
};

export type UiPreviewManifest = {
  manifestVersion: string;
  generatedAt: string;
  projectName: string;
  selectedBlueprintId: string;
  selectedBlueprintDisplayName: string;
  sourceSpecSummary: string;
  pages: UiPreviewPage[];
  componentTree: UiPreviewComponentNode[];
  themeTokens: UiPreviewThemeTokens;
  integrationSlots: UiPreviewIntegrationSlot[];
  accessibilityNotes: string[];
  responsiveNotes: string[];
  uxStateCoverage: {
    empty: string[];
    loading: string[];
    error: string[];
  };
  noPlaceholderRules: string[];
  commercialReadinessCaveat: string;
};

const MANIFEST_VERSION = "1.0.0";
const PREVIEW_CAVEAT =
  "UI preview manifest is planning output only; not generated production code; not launch-readiness proof; runtime/legal/commercial validators must pass separately.";

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function resolveTone(spec: UiPreviewSpec): string {
  const tone = spec.preferredTone?.trim().toLowerCase();
  if (tone) return tone;
  return "neutral";
}

function buildThemeTokens(spec: UiPreviewSpec): UiPreviewThemeTokens {
  const tone = resolveTone(spec);
  const hasBoldHint = (spec.brandHints ?? []).some((hint) => hint.toLowerCase().includes("bold"));

  if (tone.includes("warm")) {
    return {
      tone,
      colorPrimary: "#b45309",
      colorSurface: "#fff7ed",
      colorText: "#431407",
      radiusCard: hasBoldHint ? "16px" : "12px",
      spacingScale: "1.125",
      typographyBody: "Inter, system-ui, sans-serif",
    };
  }

  if (tone.includes("playful") || tone.includes("friendly")) {
    return {
      tone,
      colorPrimary: "#7c3aed",
      colorSurface: "#f5f3ff",
      colorText: "#2e1065",
      radiusCard: hasBoldHint ? "18px" : "14px",
      spacingScale: "1.1",
      typographyBody: "Inter, system-ui, sans-serif",
    };
  }

  return {
    tone,
    colorPrimary: "#1d4ed8",
    colorSurface: "#eff6ff",
    colorText: "#172554",
    radiusCard: hasBoldHint ? "14px" : "10px",
    spacingScale: "1",
    typographyBody: "Inter, system-ui, sans-serif",
  };
}

function buildComponentNode(definition: UIComponentDefinition): UiPreviewComponentNode {
  return {
    id: definition.id,
    kind: "component",
    displayName: definition.id,
    purpose: definition.purpose,
    requiredProps: [...definition.requiredProps],
    requiredData: [...definition.requiredData],
    uxStates: {
      empty: [...definition.uxStates.empty],
      loading: [...definition.uxStates.loading],
      error: [...definition.uxStates.error],
    },
    children: [],
  };
}

function buildManifestFromBlueprint(blueprint: UIBlueprint, spec: UiPreviewSpec): UiPreviewManifest {
  const componentById = new Map(blueprint.components.map((component) => [component.id, component]));

  const pages: UiPreviewPage[] = blueprint.pages.map((page) => ({
    id: page.id,
    displayName: page.displayName,
    componentIds: [...page.components],
  }));

  const componentTree: UiPreviewComponentNode[] = blueprint.pages.map((page) => ({
    id: page.id,
    kind: "page",
    displayName: page.displayName,
    children: page.components
      .map((componentId) => componentById.get(componentId))
      .filter((component): component is UIComponentDefinition => Boolean(component))
      .map((component) => buildComponentNode(component)),
  }));

  const requestedIntegrations = uniqueSorted(spec.integrationsRequested ?? []);
  const blueprintSlots = uniqueSorted(blueprint.integrationSlots);
  const mergedIntegrationSlots = uniqueSorted([...blueprintSlots, ...requestedIntegrations]).map((id) => {
    const inBlueprint = blueprintSlots.includes(id);
    const inRequested = requestedIntegrations.includes(id);
    return {
      id,
      requested: inRequested,
      source: inBlueprint && inRequested ? "both" : inBlueprint ? "blueprint" : "requested",
    } satisfies UiPreviewIntegrationSlot;
  });

  const sourceSpecSummary = [
    `project=${spec.projectName}`,
    `productType=${spec.productType ?? "unspecified"}`,
    `targetUsers=${spec.targetUsers.join(", ") || "unspecified"}`,
    `requiredFeatures=${spec.requiredFeatures.join(", ") || "none"}`,
    `description=${spec.description.trim()}`,
  ].join(" | ");

  return {
    manifestVersion: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    projectName: spec.projectName,
    selectedBlueprintId: blueprint.id,
    selectedBlueprintDisplayName: blueprint.displayName,
    sourceSpecSummary,
    pages,
    componentTree,
    themeTokens: buildThemeTokens(spec),
    integrationSlots: mergedIntegrationSlots,
    accessibilityNotes: [...blueprint.accessibilityRequirements],
    responsiveNotes: [...blueprint.responsiveBehavior],
    uxStateCoverage: {
      empty: uniqueSorted([...blueprint.emptyStates, ...blueprint.components.flatMap((component) => component.uxStates.empty)]),
      loading: uniqueSorted([...blueprint.loadingStates, ...blueprint.components.flatMap((component) => component.uxStates.loading)]),
      error: uniqueSorted([...blueprint.errorStates, ...blueprint.components.flatMap((component) => component.uxStates.error)]),
    },
    noPlaceholderRules: [...blueprint.noPlaceholderRules],
    commercialReadinessCaveat: PREVIEW_CAVEAT,
  };
}

export function maybeInferUiBlueprintForPreview(spec: UiPreviewSpec): UIBlueprint | undefined {
  if (spec.blueprintId) {
    return getUiBlueprint(spec.blueprintId);
  }

  const inferenceInput = [spec.productType ?? "", spec.description ?? "", spec.requiredFeatures.join(" ")].join(" ");
  return maybeInferUiBlueprintForSpec(inferenceInput);
}

export function createUiPreviewManifestFromBlueprint(blueprintId: string, spec: UiPreviewSpec): UiPreviewManifest {
  const blueprint = getUiBlueprint(blueprintId);
  if (!blueprint) {
    throw new Error(`Unknown UI blueprint ID for preview: ${blueprintId}`);
  }

  return buildManifestFromBlueprint(blueprint, { ...spec, blueprintId });
}

export function createUiPreviewManifest(spec: UiPreviewSpec): UiPreviewManifest {
  const selected = maybeInferUiBlueprintForPreview(spec);
  if (!selected) {
    throw new Error("Unable to infer UI blueprint for preview manifest");
  }
  return buildManifestFromBlueprint(selected, spec);
}

export function validateUiPreviewManifest(manifest: UiPreviewManifest): UiPreviewValidationIssue[] {
  const issues: UiPreviewValidationIssue[] = [];

  const requiredStrings: Array<keyof UiPreviewManifest> = [
    "manifestVersion",
    "generatedAt",
    "projectName",
    "selectedBlueprintId",
    "selectedBlueprintDisplayName",
    "sourceSpecSummary",
    "commercialReadinessCaveat",
  ];

  for (const field of requiredStrings) {
    const value = manifest[field];
    if (typeof value !== "string" || !value.trim()) {
      issues.push({ severity: "error", path: field, message: `${field} is required` });
    }
  }

  if (!manifest.pages?.length) {
    issues.push({ severity: "error", path: "pages", message: "Manifest must include at least one page" });
  }

  if (!manifest.componentTree?.length) {
    issues.push({ severity: "error", path: "componentTree", message: "Manifest must include a component tree" });
  }

  for (const state of ["empty", "loading", "error"] as const) {
    if (!manifest.uxStateCoverage?.[state]?.length) {
      issues.push({ severity: "error", path: `uxStateCoverage.${state}`, message: `Missing ${state} UX state coverage` });
    }
  }

  if (!manifest.accessibilityNotes?.length) {
    issues.push({ severity: "warning", path: "accessibilityNotes", message: "Accessibility notes should be included" });
  }

  if (!manifest.responsiveNotes?.length) {
    issues.push({ severity: "warning", path: "responsiveNotes", message: "Responsive notes should be included" });
  }

  if (!manifest.noPlaceholderRules?.length) {
    issues.push({ severity: "error", path: "noPlaceholderRules", message: "No-placeholder rules are required" });
  }

  const caveat = manifest.commercialReadinessCaveat.toLowerCase();
  const requiredCaveatTerms = [
    "planning output only",
    "not generated production code",
    "not launch-readiness proof",
    "runtime/legal/commercial validators must pass separately",
  ];

  for (const term of requiredCaveatTerms) {
    if (!caveat.includes(term)) {
      issues.push({ severity: "error", path: "commercialReadinessCaveat", message: `Caveat missing required phrase: ${term}` });
    }
  }

  return issues;
}

export function summarizeUiPreviewManifest(manifest: UiPreviewManifest): string {
  return [
    `${manifest.projectName} preview uses ${manifest.selectedBlueprintDisplayName} (${manifest.selectedBlueprintId}).`,
    `Pages: ${manifest.pages.length}; root component nodes: ${manifest.componentTree.length}.`,
    `Integration slots: ${manifest.integrationSlots.map((slot) => slot.id).join(", ") || "none"}.`,
    `Caveat: ${manifest.commercialReadinessCaveat}`,
  ].join(" ");
}

export { PREVIEW_CAVEAT };

export * from "./uiDocumentModel";
