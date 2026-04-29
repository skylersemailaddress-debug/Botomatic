import { UI_DESIGN_TOKEN_DRY_RUN_CAVEAT, type UIDesignToken, type UIDesignTokenCategory, type UIDesignTokenNormalizationResult, type UIDesignTokenRisk, type UIDesignTokenValidationIssue, type UIDesignTokenValue } from "./uiDesignTokenModel";

type InputToken = { tokenId: string; name: string; category: UIDesignTokenCategory; value: UIDesignTokenValue; source?: string };
const categories: UIDesignTokenCategory[] = ["color", "typography", "spacing", "radius", "shadow", "breakpoint", "motion", "zIndex"];
const unsafePattern = /(url\s*\(\s*javascript:|expression\s*\(|\bimport\b|javascript:|<script|;\s*\w+\s*:)/i;

export function normalizeUIDesignTokens(input: InputToken[], options: { allowNegativeSpacing?: boolean } = {}): UIDesignTokenNormalizationResult {
  const issues: UIDesignTokenValidationIssue[] = [];
  const out: UIDesignToken[] = [];
  const dedupe = new Map<string, string>();
  const sorted = [...input].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name) || a.tokenId.localeCompare(b.tokenId));
  for (const raw of sorted) {
    const normalizedName = raw.name.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const cssVariableName = `--ui-${raw.category}-${normalizedName || "invalid"}`;
    const tokenIssues: UIDesignTokenValidationIssue[] = [];
    if (!normalizedName) tokenIssues.push({ code: "empty-name", message: "token name normalized to empty", tokenId: raw.tokenId, severity: "high", unsafe: true });
    validateValue(raw.category, raw.value, tokenIssues, raw.tokenId, options.allowNegativeSpacing ?? false);
    const key = `${raw.category}:${normalizedName}`;
    if (normalizedName && dedupe.has(key)) tokenIssues.push({ code: "duplicate-normalized-name", message: `duplicate token ${key}`, tokenId: raw.tokenId, severity: "high" });
    dedupe.set(key, raw.tokenId);
    const riskLevel: UIDesignTokenRisk = tokenIssues.some((i) => i.severity === "high") ? "high" : tokenIssues.length ? "medium" : "low";
    issues.push(...tokenIssues);
    out.push({ tokenId: raw.tokenId, name: raw.name, category: raw.category, value: raw.value, normalizedName, cssVariableName, source: raw.source ?? "input", issues: tokenIssues, riskLevel });
  }
  const categoriesPresent = categories.filter((c) => out.some((t) => t.category === c));
  const duplicateNormalizedNames = [...new Set(issues.filter((i) => i.code === "duplicate-normalized-name").map((i) => i.message.split(" ").pop() ?? ""))].sort();
  const requiresManualReview = issues.length > 0;
  const riskLevel: UIDesignTokenRisk = issues.some((i) => i.severity === "high") ? "high" : issues.length ? "medium" : "low";
  return { tokens: out.sort((a, b) => a.category.localeCompare(b.category) || a.normalizedName.localeCompare(b.normalizedName) || a.tokenId.localeCompare(b.tokenId)), issues, duplicateNormalizedNames, categoriesPresent, tokenCount: out.length, requiresManualReview, riskLevel, caveat: UI_DESIGN_TOKEN_DRY_RUN_CAVEAT };
}

function validateValue(category: UIDesignTokenCategory, value: UIDesignTokenValue, issues: UIDesignTokenValidationIssue[], tokenId: string, allowNegativeSpacing: boolean): void {
  const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : JSON.stringify(value);
  if (unsafePattern.test(text)) issues.push({ code: "unsafe-value", message: "unsafe token value", tokenId, severity: "high", unsafe: true });
  if (category === "color") {
    if (!/^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|rgba?\([^)]*\)|hsla?\([^)]*\)|transparent|currentColor|black|white)$/.test(text)) issues.push({ code: "invalid-color", message: "invalid color format", tokenId, severity: "high" });
  }
  if (category === "spacing" || category === "radius") {
    if (!/^(0|[-+]?\d*\.?\d+(px|rem|em|%))$/.test(text)) issues.push({ code: "invalid-length", message: "invalid spacing/radius unit", tokenId, severity: "high" });
    if (category === "spacing" && /^-/.test(text) && !allowNegativeSpacing) issues.push({ code: "negative-spacing", message: "negative spacing rejected", tokenId, severity: "high" });
  }
  if (category === "typography") {
    if (typeof value === "object") {
      const v = value as any;
      if (v.fontSize && !/^(0|\d*\.?\d+(px|rem|em|%))$/.test(String(v.fontSize))) issues.push({ code: "invalid-font-size", message: "invalid fontSize", tokenId, severity: "high" });
    }
  }
  if (category === "shadow" && !/^none$|^-?\d/.test(text)) issues.push({ code: "invalid-shadow", message: "invalid shadow format", tokenId, severity: "high" });
  if (category === "motion" && !/^(\d+(ms|s)|[a-z-]+(\s+[\d.]+s)?|cubic-bezier\([^)]*\))$/i.test(text)) issues.push({ code: "invalid-motion", message: "invalid motion value", tokenId, severity: "high" });
  if (category === "zIndex" && !/^-?\d+$/.test(text)) issues.push({ code: "invalid-zindex", message: "zIndex integer required", tokenId, severity: "high" });
  if (category === "zIndex") { const n = Number(text); if (n < -1 || n > 9999) issues.push({ code: "zindex-out-of-range", message: "zIndex out of range", tokenId, severity: "high" }); }
}
