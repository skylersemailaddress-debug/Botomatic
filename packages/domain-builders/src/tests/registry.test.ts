import { domainBuilderRegistry } from "../registry";

const required = [
  "web_apps",
  "websites",
  "saas_platforms",
  "mobile_apps",
  "desktop_apps",
  "browser_extensions",
  "apis",
  "bots",
  "ai_agents",
  "automations",
  "steam_pc_games",
  "roblox_games",
  "unity_games",
  "unreal_games",
  "godot_games",
  "minecraft_mods",
  "cli_tools",
  "libraries_sdks",
  "data_pipelines",
];

for (const id of required) {
  if (!domainBuilderRegistry.some((builder) => builder.id === id)) {
    throw new Error(`Missing required domain builder: ${id}`);
  }
}

console.log("domainBuilder.registry.test.ts passed");
