import { matchBlueprintWithScore } from "../../blueprints/src/registry";
import type { CapabilityGapReport } from "./types";

// Score thresholds — calibrated against the 37-blueprint registry
const SCORE_NONE   = 0;
const SCORE_LOW    = 2;   // 1-2 weak token hits → probably a gap
const SCORE_MEDIUM = 5;   // 3-5 hits → partial match, monitor

// Infer a short domain label from the request text
function inferDomainLabel(text: string): string {
  const t = text.toLowerCase();
  if (/webassembl|wasm/.test(t))                       return "WebAssembly module";
  if (/blockchain|solidity|smart.?contract|web3|nft/.test(t)) return "Web3 / blockchain dApp";
  if (/cli.?tool|command.?line|terminal.?app/.test(t)) return "CLI tool";
  if (/chrome.?extension|firefox.?addon|browser.?extension/.test(t)) return "browser extension";
  if (/vscode.?extension|jetbrains.?plugin|ide.?plugin/.test(t)) return "IDE plugin";
  if (/wordpress.?plugin|wp.?plugin/.test(t))           return "WordPress plugin";
  if (/shopify.?app|shopify.?theme/.test(t))            return "Shopify app";
  if (/discord.?bot|telegram.?bot|slack.?bot/.test(t)) return "chat / messaging bot";
  if (/raspberry.?pi|arduino|micropython|embedded/.test(t)) return "embedded / IoT firmware";
  if (/ml.?model|machine.?learning|pytorch|tensorflow|training.?pipeline/.test(t)) return "ML training pipeline";
  if (/data.?pipeline|etl|airflow|spark|kafka/.test(t)) return "data engineering pipeline";
  if (/devops|terraform|helm|kubernetes|k8s/.test(t))   return "DevOps / infrastructure as code";
  if (/figma.?plugin/.test(t))                          return "Figma plugin";
  if (/scripting|automation.?script|batch/.test(t))     return "automation script";
  if (/saas|dashboard|web.?app|api/.test(t))            return "SaaS web application";
  return "unknown domain application";
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function detectCapabilityGap(requestText: string): CapabilityGapReport {
  const { score } = matchBlueprintWithScore(requestText);
  const domain = inferDomainLabel(requestText);

  let confidence: CapabilityGapReport["confidence"];
  let hasGap: boolean;

  if (score <= SCORE_NONE) {
    confidence = "none";
    hasGap = true;
  } else if (score <= SCORE_LOW) {
    confidence = "low";
    hasGap = true;
  } else if (score <= SCORE_MEDIUM) {
    confidence = "medium";
    hasGap = false; // borderline — use existing blueprint but flag
  } else {
    confidence = "high";
    hasGap = false;
  }

  return {
    hasGap,
    matchScore: score,
    domain,
    confidence,
    suggestedCapabilityId: `synth_${slugify(domain)}`,
  };
}
