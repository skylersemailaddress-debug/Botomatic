export type UIPlatformTarget = "ios"|"android"|"mobile-web"|"desktop-web"|"roblox"|"steam"|"web-game"|"unknown";
export type UIPlatformBuilderKind = "react-native"|"expo"|"capacitor"|"pwa"|"unity"|"godot"|"roblox-studio"|"steamworks"|"web-canvas"|"unknown";
export type UIPlatformFramework = "next"|"vite-react"|"react-native"|"expo"|"unity"|"godot"|"roblox-ts"|"lua"|"node-api"|"unknown";
export type UIPlatformBuilderRisk = "low"|"medium"|"high";
export type UIPlatformCapability = { key: string; detail: string };
export type UIPlatformAssetRequirement = { kind: string; required: boolean; reason: string };
export type UIPlatformManifestRequirement = { field: string; required: boolean; reason: string };
export type UIPlatformCompatibilityGate = { gate: string; passed: boolean; reason: string };
export type UIPlatformBuilderIssue = { code: string; message: string; severity: "warning"|"error"; path?: string };

export type UIPlatformBuilderPlan = {
  platformBuilderPlanId: string; targetPlatform: UIPlatformTarget; builderKind: UIPlatformBuilderKind; framework: UIPlatformFramework;
  projectName: string; normalizedProjectSlug: string; requiredAssets: UIPlatformAssetRequirement[]; missingAssets: string[];
  manifestRequirements: UIPlatformManifestRequirement[]; platformCapabilities: UIPlatformCapability[]; compatibilityGates: UIPlatformCompatibilityGate[];
  exportDeployPlanId?: string; sourceFileCount: number; sourceTotalBytes: number; affectedFilePaths: string[]; blockedReasons: string[];
  publishBlocked: true; buildExecutionBlocked: true; requiresManualReview: boolean; riskLevel: UIPlatformBuilderRisk; caveat: typeof UI_PLATFORM_BUILDER_CAVEAT;
};
export type UIPlatformBuilderResult = { status: "planned"|"blocked"; plan: UIPlatformBuilderPlan; issues: UIPlatformBuilderIssue[]; risks: UIPlatformBuilderRisk[] };
export const UI_PLATFORM_BUILDER_CAVEAT = "Platform builder planning is deterministic dry-run planning and does not build, package, upload, publish, open emulators, call platform APIs, create marketplace pages, or prove runtime/platform approval." as const;
