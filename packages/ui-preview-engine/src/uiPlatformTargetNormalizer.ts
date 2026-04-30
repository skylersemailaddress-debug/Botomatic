import type { UIPlatformBuilderKind, UIPlatformFramework, UIPlatformTarget } from "./uiPlatformBuilderModel";

const TARGET: Record<string, UIPlatformTarget> = { iphone:"ios", ipad:"ios", "ios-app":"ios", "android-app":"android", "play-store":"android", mobile:"mobile-web", "mobile-web-app":"mobile-web", web:"desktop-web", browser:"desktop-web", "desktop-web-app":"desktop-web", "roblox-game":"roblox", "roblox-experience":"roblox", "steam-game":"steam", "pc-game":"steam", "canvas-game":"web-game", "html5-game":"web-game" };
const BUILDER: Record<string, UIPlatformBuilderKind> = { rn:"react-native", "expo-go":"expo", cap:"capacitor", "progressive-web-app":"pwa", roblox:"roblox-studio", steam:"steamworks", "html5-canvas":"web-canvas" };
const FRAMEWORK: Record<string, UIPlatformFramework> = { nextjs:"next", vite:"vite-react", rn:"react-native", robloxts:"roblox-ts" };
const norm = (v: string) => v.trim().toLowerCase();
export const normalizeUIPlatformTarget = (v: string): UIPlatformTarget => TARGET[norm(v)] ?? ((["ios","android","mobile-web","desktop-web","roblox","steam","web-game"] as UIPlatformTarget[]).includes(norm(v) as UIPlatformTarget) ? norm(v) as UIPlatformTarget : "unknown");
export const normalizeUIPlatformBuilderKind = (v: string): UIPlatformBuilderKind => BUILDER[norm(v)] ?? ((["react-native","expo","capacitor","pwa","unity","godot","roblox-studio","steamworks","web-canvas"] as UIPlatformBuilderKind[]).includes(norm(v) as UIPlatformBuilderKind) ? norm(v) as UIPlatformBuilderKind : "unknown");
export const normalizeUIPlatformFramework = (v: string): UIPlatformFramework => FRAMEWORK[norm(v)] ?? ((["next","vite-react","react-native","expo","unity","godot","roblox-ts","lua","node-api"] as UIPlatformFramework[]).includes(norm(v) as UIPlatformFramework) ? norm(v) as UIPlatformFramework : "unknown");
export const normalizeUIPlatformProjectSlug = (v: string): string => {
  const slug = v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug || "untitled-platform-project";
};
