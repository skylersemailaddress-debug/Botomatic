import { DomainBuilder } from "./types";

function baseBuilder(id: string, name: string, architecture: string): DomainBuilder {
  return {
    id,
    name,
    requiredSpecs: ["target users", "core workflows", "auth/security", "data model", "launch criteria"],
    supportedStacks: ["typescript"],
    defaultArchitecture: architecture,
    riskyDecisions: ["auth/security", "payments", "permissions", "data retention", "external API costs"],
    requiredClarifyingQuestions: [
      "What are the primary user roles and permission boundaries?",
      "Which workflows are launch-critical?",
      "What compliance or legal constraints apply?",
    ],
    buildCommands: ["npm run build"],
    testCommands: ["npm test"],
    validationCommands: ["npm run -s validate:all"],
    deploymentOrExportPath: "defined-by-domain",
    commercialReadinessRubric: ["buildable", "domain validators pass", "no placeholders", "documented launch path"],
    noPlaceholderRules: ["no TODO/FIXME", "no fake integrations", "no not-implemented production paths"],
    repairStrategy: ["classify failure", "retrieve similar fix", "patch", "rerun targeted validators", "rerun full validators"],
  };
}

export const domainBuilderRegistry: DomainBuilder[] = [
  { ...baseBuilder("web_apps", "Web Apps", "frontend+api+data"), supportedStacks: ["next.js", "react", "node"], deploymentOrExportPath: "web deploy" },
  { ...baseBuilder("websites", "Websites", "content+frontend"), supportedStacks: ["next.js", "astro", "static"], deploymentOrExportPath: "static/web deploy" },
  { ...baseBuilder("saas_platforms", "SaaS Platforms", "multi-tenant app"), supportedStacks: ["next.js", "node", "postgres"], deploymentOrExportPath: "cloud deploy" },
  { ...baseBuilder("mobile_apps", "Mobile Apps", "mobile client + backend"), supportedStacks: ["react-native", "flutter"], deploymentOrExportPath: "app store package" },
  { ...baseBuilder("desktop_apps", "Desktop Apps", "desktop client + backend"), supportedStacks: ["electron", "tauri"], deploymentOrExportPath: "desktop installer" },
  { ...baseBuilder("browser_extensions", "Browser Extensions", "extension + service backend"), supportedStacks: ["manifest-v3", "typescript"], deploymentOrExportPath: "extension package" },
  { ...baseBuilder("apis", "APIs", "service API"), supportedStacks: ["node", "go", "python"], deploymentOrExportPath: "api deployment" },
  { ...baseBuilder("bots", "Bots", "bot runtime + adapters"), supportedStacks: ["node", "python"], deploymentOrExportPath: "bot runtime deploy" },
  { ...baseBuilder("ai_agents", "AI Agents", "agent orchestration"), supportedStacks: ["node", "python"], deploymentOrExportPath: "agent runtime deploy" },
  { ...baseBuilder("automations", "Automations", "event workflows"), supportedStacks: ["trigger.dev", "temporal"], deploymentOrExportPath: "workflow runtime" },
  { ...baseBuilder("steam_pc_games", "Steam/PC Games", "game runtime"), supportedStacks: ["unity", "unreal", "godot"], deploymentOrExportPath: "steam build" },
  { ...baseBuilder("roblox_games", "Roblox Games", "roblox experience"), supportedStacks: ["roblox-lua"], deploymentOrExportPath: "roblox publish" },
  { ...baseBuilder("unity_games", "Unity Games", "unity project"), supportedStacks: ["unity"], deploymentOrExportPath: "unity build export" },
  { ...baseBuilder("unreal_games", "Unreal Games", "unreal project"), supportedStacks: ["unreal"], deploymentOrExportPath: "unreal package" },
  { ...baseBuilder("godot_games", "Godot Games", "godot project"), supportedStacks: ["godot"], deploymentOrExportPath: "godot export" },
  { ...baseBuilder("minecraft_mods", "Minecraft Mods", "mod/plugin"), supportedStacks: ["java", "fabric", "forge"], deploymentOrExportPath: "jar mod artifact" },
  { ...baseBuilder("cli_tools", "CLI Tools", "cli binary"), supportedStacks: ["node", "go", "rust"], deploymentOrExportPath: "binary/npm package" },
  { ...baseBuilder("libraries_sdks", "Libraries/SDKs", "library package"), supportedStacks: ["typescript", "python", "go"], deploymentOrExportPath: "package registry publish" },
  { ...baseBuilder("data_pipelines", "Data Pipelines", "data workflow"), supportedStacks: ["python", "spark", "dbt"], deploymentOrExportPath: "pipeline runtime" },
];

export function getDomainBuilder(id: string): DomainBuilder | undefined {
  return domainBuilderRegistry.find((builder) => builder.id === id);
}
