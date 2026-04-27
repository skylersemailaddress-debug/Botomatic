export function inferDomain(input: { files: string[]; packageName?: string; readmeText?: string }): string {
  const corpus = `${input.packageName || ""}\n${input.readmeText || ""}\n${input.files.join("\n")}`.toLowerCase();
  if (/(roblox|rbxlua)/.test(corpus)) return "roblox_games";
  if (/(unity|unreal|godot|steam)/.test(corpus)) return "pc_games";
  if (/(react-native|flutter|android|ios)/.test(corpus)) return "mobile_apps";
  if (/(api|swagger|openapi)/.test(corpus)) return "apis";
  if (/(dashboard|crm|saas)/.test(corpus)) return "saas_platform";
  return "web_app";
}
