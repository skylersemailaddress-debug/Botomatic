import { UI_DESIGN_TOKEN_DRY_RUN_CAVEAT, type UIDesignTokenNormalizationResult, type UIDesignTokenRisk } from "./uiDesignTokenModel";

export type UIStyleOutputMode = "cssVariables" | "tailwindTheme" | "inlinePreview";
export type UIStyleControlPlan = {
  stylePlanId: string;
  outputMode: UIStyleOutputMode | "unknown";
  tokenCount: number;
  categoriesPresent: string[];
  styleTargetFilePath?: string;
  riskLevel: UIDesignTokenRisk;
  requiresManualReview: boolean;
  issueCount: number;
  cssVariableNames: string[];
  cssVariableBlock?: string;
  previewMetadata?: { selectedNodeId?: string; selectedDocumentId?: string; sampleVariables: string[] };
  caveat: string;
};

export type UIStyleControlPlannerInput = { tokenResult: UIDesignTokenNormalizationResult; selectedNodeId?: string; selectedDocumentId?: string; fullProjectOrderedFiles?: string[]; options: { outputMode: UIStyleOutputMode; targetFilePath?: string; overwritePolicy?: "fail" | "merge" } };
export const UI_STYLE_CONTROL_DRY_RUN_CAVEAT = UI_DESIGN_TOKEN_DRY_RUN_CAVEAT;
