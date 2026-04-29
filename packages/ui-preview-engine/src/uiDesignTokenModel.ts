export const UI_DESIGN_TOKEN_DRY_RUN_CAVEAT = "Design token planning is deterministic dry-run planning and does not apply styles, write files, or prove visual/runtime correctness.";

export type UIDesignTokenCategory = "color" | "typography" | "spacing" | "radius" | "shadow" | "breakpoint" | "motion" | "zIndex";
export type UIDesignTokenRisk = "low" | "medium" | "high";
export type UIDesignTokenValue = string | number | { fontSize?: string; fontWeight?: string | number; lineHeight?: string | number; fontFamily?: string };

export type UIDesignTokenValidationIssue = { code: string; message: string; tokenId: string; severity: UIDesignTokenRisk; unsafe?: boolean };
export type UIDesignToken = { tokenId: string; name: string; category: UIDesignTokenCategory; value: UIDesignTokenValue; normalizedName: string; cssVariableName: string; source: string; issues: UIDesignTokenValidationIssue[]; riskLevel: UIDesignTokenRisk };
export type UIDesignTokenSet = { tokens: UIDesignToken[]; caveat: string };
export type UIDesignTokenNormalizationResult = { tokens: UIDesignToken[]; issues: UIDesignTokenValidationIssue[]; duplicateNormalizedNames: string[]; categoriesPresent: UIDesignTokenCategory[]; tokenCount: number; requiresManualReview: boolean; riskLevel: UIDesignTokenRisk; caveat: string };
