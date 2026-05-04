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
];

export function getBlueprintById(id: string): Blueprint | undefined {
  return blueprintRegistry.find((b) => b.id === id);
}

export function matchBlueprintFromText(text: string): Blueprint {
  const lower = text.toLowerCase();
  const candidates = blueprintRegistry.map((b) => {
    const score = [b.id, b.name, b.category, b.description].join(" ").toLowerCase().split(/\s+/).reduce((acc, token) => {
      if (!token || token.length < 3) return acc;
      return lower.includes(token) ? acc + 1 : acc;
    }, 0);
    return { b, score };
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.b || saasDashboard;
}
