import { Blueprint } from "./types";
import { marketingWebsite } from "./blueprints/marketingWebsite";
import { landingPage } from "./blueprints/landingPage";
import { saasDashboard } from "./blueprints/saasDashboard";
import { crm } from "./blueprints/crm";
import { booking } from "./blueprints/booking";
import { marketplace } from "./blueprints/marketplace";
import { ecommerce } from "./blueprints/ecommerce";
import { membershipCommunity } from "./blueprints/membershipCommunity";
import { lms } from "./blueprints/lms";
import { jobBoard } from "./blueprints/jobBoard";
import { directory } from "./blueprints/directory";
import { customerPortal } from "./blueprints/customerPortal";
import { internalAdminTool } from "./blueprints/internalAdminTool";
import { workflowSystem } from "./blueprints/workflowSystem";
import { analyticsReporting } from "./blueprints/analyticsReporting";
import { eventPlatform } from "./blueprints/eventPlatform";
import { contentMediaSite } from "./blueprints/contentMediaSite";
import { aiChatbotApp } from "./blueprints/aiChatbotApp";
import { aiAgentWorkflowApp } from "./blueprints/aiAgentWorkflowApp";
import { documentProcessing } from "./blueprints/documentProcessing";
import { inventoryOrderManagement } from "./blueprints/inventoryOrderManagement";
import { supportHelpdesk } from "./blueprints/supportHelpdesk";
import { realEstateListings } from "./blueprints/realEstateListings";
import { fieldService } from "./blueprints/fieldService";
import { nonprofitVolunteerOps } from "./blueprints/nonprofitVolunteerOps";
import { campaignOps } from "./blueprints/campaignOps";
import { robloxGame } from "./blueprints/robloxGame";
import { steamUnityGame } from "./blueprints/steamUnityGame";
import { godotGame } from "./blueprints/godotGame";
import { reactNativeApp } from "./blueprints/reactNativeApp";
import { flutterApp } from "./blueprints/flutterApp";
import { electronApp } from "./blueprints/electronApp";
import { tauriApp } from "./blueprints/tauriApp";
import { iosSwiftApp } from "./blueprints/iosSwiftApp";
import { androidKotlinApp } from "./blueprints/androidKotlinApp";
import { dotnetMauiApp } from "./blueprints/dotnetMauiApp";

// ── Runtime-synthesized blueprints ────────────────────────────────────────────
// Populated at startup from synthesized_capabilities.json and extended at
// runtime whenever the capability synthesizer creates a new blueprint.
// Never sorted into the static array — kept separate for auditability.
const synthesizedBlueprints: Blueprint[] = [];

export const blueprintRegistry: Blueprint[] = [
  marketingWebsite,
  landingPage,
  saasDashboard,
  crm,
  booking,
  marketplace,
  ecommerce,
  membershipCommunity,
  lms,
  jobBoard,
  directory,
  customerPortal,
  internalAdminTool,
  workflowSystem,
  analyticsReporting,
  eventPlatform,
  contentMediaSite,
  aiChatbotApp,
  aiAgentWorkflowApp,
  documentProcessing,
  inventoryOrderManagement,
  supportHelpdesk,
  realEstateListings,
  fieldService,
  nonprofitVolunteerOps,
  campaignOps,
  robloxGame,
  steamUnityGame,
  godotGame,
  reactNativeApp,
  flutterApp,
  electronApp,
  tauriApp,
  iosSwiftApp,
  androidKotlinApp,
  dotnetMauiApp,
];

export function getBlueprintById(id: string): Blueprint | undefined {
  return [...blueprintRegistry, ...synthesizedBlueprints].find((b) => b.id === id);
}

export type BlueprintMatch = { blueprint: Blueprint; score: number; isSynthesized: boolean };

export function matchBlueprintFromText(text: string): Blueprint {
  return matchBlueprintWithScore(text).blueprint;
}

export function matchBlueprintWithScore(text: string): BlueprintMatch {
  const lower = text.toLowerCase();
  const all = [...blueprintRegistry, ...synthesizedBlueprints];

  const candidates = all.map((b) => {
    const score = [b.id, b.name, b.category, b.description].join(" ")
      .toLowerCase().split(/\s+/)
      .reduce((acc, token) => (!token || token.length < 3 ? acc : lower.includes(token) ? acc + 1 : acc), 0);
    return { b, score };
  });

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return {
    blueprint: best?.b || saasDashboard,
    score: best?.score ?? 0,
    isSynthesized: synthesizedBlueprints.includes(best?.b),
  };
}

// Register a runtime-synthesized blueprint (in-memory, no file write here)
export function registerSynthesizedBlueprint(blueprint: Blueprint): void {
  const idx = synthesizedBlueprints.findIndex((b) => b.id === blueprint.id);
  if (idx >= 0) synthesizedBlueprints[idx] = blueprint;
  else synthesizedBlueprints.push(blueprint);
}

export function listSynthesizedBlueprints(): Blueprint[] {
  return [...synthesizedBlueprints];
}
