import crypto from "crypto";
import { UI_STYLE_CONTROL_DRY_RUN_CAVEAT, type UIStyleControlPlan, type UIStyleControlPlannerInput } from "./uiStyleControlPlan";

export function createUIStyleControlPlan(input: UIStyleControlPlannerInput): UIStyleControlPlan {
  const orderedTokens = [...input.tokenResult.tokens].sort((a,b)=>a.category.localeCompare(b.category)||a.normalizedName.localeCompare(b.normalizedName));
  const outputMode = input.options.outputMode;
  const targetFilePath = input.options.targetFilePath ?? (outputMode === "cssVariables" ? "src/styles/tokens.css" : outputMode === "tailwindTheme" ? "tailwind.config.ts" : undefined);
  const conflict = Boolean(targetFilePath && (input.fullProjectOrderedFiles ?? []).includes(targetFilePath));
  const cssVariableNames = orderedTokens.map((t) => t.cssVariableName).slice(0, 10);
  const cssVariableBlock = outputMode === "cssVariables" ? `:root {\n${orderedTokens.map((t)=>`  ${t.cssVariableName}: ${String(t.value)};`).join("\n")}\n}` : undefined;
  const requiresManualReview = input.tokenResult.requiresManualReview || conflict || !["cssVariables","tailwindTheme","inlinePreview"].includes(outputMode);
  const riskLevel = requiresManualReview ? "high" : input.tokenResult.riskLevel;
  const stylePlanId = `style-plan-${crypto.createHash("sha256").update(JSON.stringify({outputMode,targetFilePath,orderedTokens:orderedTokens.map(t=>[t.category,t.normalizedName,t.value]),selectedNodeId:input.selectedNodeId??"",selectedDocumentId:input.selectedDocumentId??""})).digest("hex").slice(0,16)}`;
  return { stylePlanId, outputMode, tokenCount: orderedTokens.length, categoriesPresent: input.tokenResult.categoriesPresent, styleTargetFilePath: outputMode === "inlinePreview" ? undefined : targetFilePath ?? (outputMode === "cssVariables" ? "app/globals.css" : undefined), riskLevel, requiresManualReview, issueCount: input.tokenResult.issues.length + (conflict ? 1 : 0), cssVariableNames, cssVariableBlock, previewMetadata: input.selectedNodeId || input.selectedDocumentId ? { selectedNodeId: input.selectedNodeId, selectedDocumentId: input.selectedDocumentId, sampleVariables: cssVariableNames } : undefined, caveat: UI_STYLE_CONTROL_DRY_RUN_CAVEAT };
}
