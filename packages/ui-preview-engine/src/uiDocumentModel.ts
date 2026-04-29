import { type UIBlueprint, type UIPage, type UIComponentDefinition } from "../../ui-blueprint-registry/src";

export type EditableUINodeId = string;
export type EditableUINodeKind = "pageRoot" | "component" | "container" | "text" | "form" | "action";
export type EditableUINodeProps = Record<string, unknown>;
export type EditableUIStyle = Record<string, string | number | boolean | null>;
export type EditableUILayout = Record<string, string | number | boolean | null>;
export type EditableUIBinding = { key: string; source: string; expression?: string };
export type EditableUIActionBinding = { trigger: string; action: string; target?: string };
export type EditableUIFormBinding = { formId: string; field: string; source: string };

export type EditableUINodeIdentity = {
  nodeId: EditableUINodeId;
  semanticRole: string;
  semanticLabel: string;
  sourceBlueprintComponentId?: string;
  sourcePageId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  identityVersion: string;
};

export type EditableUINode = {
  id: EditableUINodeId;
  kind: EditableUINodeKind;
  identity: EditableUINodeIdentity;
  parentId?: EditableUINodeId;
  childIds: EditableUINodeId[];
  props: EditableUINodeProps;
  style: EditableUIStyle;
  layout: EditableUILayout;
  bindings: EditableUIBinding[];
  actionBindings: EditableUIActionBinding[];
  formBindings: EditableUIFormBinding[];
  provenance: { blueprintId: string; sourceType: "blueprint" };
  safety: { editable: boolean; guardrails: string[] };
};

export type EditableUIPage = {
  id: string;
  route: string;
  name: string;
  title: string;
  rootNodeIds: EditableUINodeId[];
  nodes: Record<EditableUINodeId, EditableUINode>;
};

export type EditableUIDocumentMetadata = {
  generatedAt: string;
  generatedBy: string;
  identityVersion: string;
  claimBoundary: string;
};

export type EditableUIDocument = {
  id: string;
  version: string;
  sourceBlueprintId: string;
  pages: EditableUIPage[];
  theme: Record<string, unknown>;
  metadata: EditableUIDocumentMetadata;
};

export type EditableUIDocumentValidationResult = { valid: boolean; issues: string[] };

export const EDITABLE_UI_DOCUMENT_CAVEAT =
  "Foundational editable UI document and identity contract only. This does not implement command parsing, live preview mutation, source-file sync, or full live visual UI builder completion/readiness.";

export function createStableNodeId(parts: Array<string | undefined>): EditableUINodeId {
  return parts.filter(Boolean).map((p) => p!.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")).join("::");
}

export function flattenEditableNodes(document: EditableUIDocument): EditableUINode[] {
  return document.pages.flatMap((page) => Object.values(page.nodes));
}

export function findNodeById(document: EditableUIDocument, nodeId: EditableUINodeId): EditableUINode | undefined {
  return flattenEditableNodes(document).find((node) => node.id === nodeId);
}

export function assertNodeIdentityStableBeforeAfter(before: EditableUINode, after: EditableUINode): void {
  const fields: Array<keyof EditableUINodeIdentity> = ["nodeId", "semanticRole", "semanticLabel", "sourceBlueprintComponentId", "sourcePageId", "createdBy", "createdAt", "identityVersion"];
  for (const field of fields) {
    if (before.identity[field] !== after.identity[field]) {
      throw new Error(`Node identity changed unexpectedly: ${field}`);
    }
  }
}

function toNode(page: UIPage, component: UIComponentDefinition, now: string, blueprintId: string): EditableUINode {
  const id = createStableNodeId([blueprintId, page.id, component.id]);
  return {
    id,
    kind: "component",
    identity: {
      nodeId: id,
      semanticRole: "component",
      semanticLabel: component.purpose,
      sourceBlueprintComponentId: component.id,
      sourcePageId: page.id,
      createdBy: "ui-blueprint-factory",
      createdAt: now,
      updatedAt: now,
      identityVersion: "1.0.0",
    },
    parentId: createStableNodeId([blueprintId, page.id, "root"]),
    childIds: [],
    props: { requiredProps: [...component.requiredProps], requiredData: [...component.requiredData] },
    style: {},
    layout: {},
    bindings: [],
    actionBindings: [],
    formBindings: [],
    provenance: { blueprintId, sourceType: "blueprint" },
    safety: { editable: true, guardrails: ["no-placeholder", "accessibility", "responsive"] },
  };
}

export function createEditableUIDocumentFromBlueprint(blueprint: UIBlueprint, options?: { now?: string; generatedBy?: string }): EditableUIDocument {
  const now = options?.now ?? new Date().toISOString();
  const pages: EditableUIPage[] = blueprint.pages.map((page) => {
    const rootId = createStableNodeId([blueprint.id, page.id, "root"]);
    const nodes: Record<string, EditableUINode> = {};
    const childIds = page.components.map((componentId) => createStableNodeId([blueprint.id, page.id, componentId]));
    nodes[rootId] = {
      id: rootId,
      kind: "pageRoot",
      identity: {
        nodeId: rootId,
        semanticRole: "page-root",
        semanticLabel: page.displayName,
        sourcePageId: page.id,
        createdBy: "ui-blueprint-factory",
        createdAt: now,
        updatedAt: now,
        identityVersion: "1.0.0",
      },
      childIds,
      props: { title: page.displayName },
      style: {},
      layout: {},
      bindings: [],
      actionBindings: [],
      formBindings: [],
      provenance: { blueprintId: blueprint.id, sourceType: "blueprint" },
      safety: { editable: true, guardrails: ["no-placeholder", "accessibility", "responsive"] },
    };

    for (const componentId of page.components) {
      const component = blueprint.components.find((c) => c.id === componentId);
      if (!component) continue;
      const node = toNode(page, component, now, blueprint.id);
      nodes[node.id] = node;
    }

    return { id: page.id, route: `/${page.id.split(".").pop()}`, name: page.displayName, title: page.displayName, rootNodeIds: [rootId], nodes };
  });

  const document: EditableUIDocument = {
    id: `editable:${blueprint.id}`,
    version: "1.0.0",
    sourceBlueprintId: blueprint.id,
    pages,
    theme: { recommendedThemeTokens: [...blueprint.recommendedThemeTokens] },
    metadata: {
      generatedAt: now,
      generatedBy: options?.generatedBy ?? "ui-preview-engine",
      identityVersion: "1.0.0",
      claimBoundary: EDITABLE_UI_DOCUMENT_CAVEAT,
    },
  };

  const validation = validateEditableUIDocument(document);
  if (!validation.valid) throw new Error(`Editable UI document validation failed: ${validation.issues.join("; ")}`);
  return document;
}

export function validateEditableUIDocument(document: EditableUIDocument): EditableUIDocumentValidationResult {
  const issues: string[] = [];
  if (!document.id) issues.push("document.id missing");
  if (!document.version) issues.push("document.version missing");
  if (!document.metadata?.claimBoundary?.includes("Foundational editable UI document")) issues.push("claim boundary/caveat missing");
  for (const page of document.pages ?? []) {
    for (const node of Object.values(page.nodes ?? {})) {
      if (!node.identity?.nodeId || !node.identity.semanticRole || !node.identity.semanticLabel || !node.identity.createdBy || !node.identity.createdAt || !node.identity.updatedAt || !node.identity.identityVersion) {
        issues.push(`node identity invalid: ${node.id}`);
      }
    }
  }
  return { valid: issues.length === 0, issues };
}

export function serializeEditableUIDocument(document: EditableUIDocument): string {
  const validation = validateEditableUIDocument(document);
  if (!validation.valid) throw new Error(`Cannot serialize invalid document: ${validation.issues.join("; ")}`);
  return JSON.stringify(document, null, 2);
}

export function parseEditableUIDocument(json: string): EditableUIDocument {
  const parsed = JSON.parse(json) as EditableUIDocument;
  const validation = validateEditableUIDocument(parsed);
  if (!validation.valid) throw new Error(`Invalid editable UI document: ${validation.issues.join("; ")}`);
  return parsed;
}

export function cloneEditableUIDocument(document: EditableUIDocument): EditableUIDocument {
  return parseEditableUIDocument(serializeEditableUIDocument(document));
}
