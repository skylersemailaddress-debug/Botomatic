import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const name = "Validate-Botomatic-LocalCrossPlatformLaunchReadiness";
const checks = ["scripts/startLocal.ts", "scripts/startLan.ts", "scripts/launchBetaFull.mjs", "package.json", "docs/local-launch.md"];

const banned = ["production token", "live deployment", "publish", "upload to provider", "app store", "play store", "steam", "roblox api", "xcodebuild", "gradle", "eas build"];

const has = (r:string,p:string)=>fs.existsSync(path.join(r,p));
const read = (r:string,p:string)=>fs.readFileSync(path.join(r,p),"utf8").toLowerCase();

export function validateLocalCrossPlatformLaunchReadiness(root: string): RepoValidatorResult {
  if (!checks.every((c)=>has(root,c))) return { name, status:"failed", summary:"Missing required local launch files.", checks };
  const local = read(root,"scripts/startLocal.ts");
  const lan = read(root,"scripts/startLan.ts");
  const launcher = read(root,"scripts/launchBetaFull.mjs");
  const pkg = read(root,"package.json");
  const docs = read(root,"docs/local-launch.md");
  const parsedPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  const scripts = parsedPackage.scripts || {};
  const src = `${local}\n${lan}`;

  const required = [
    pkg.includes('"dev": "tsx scripts/startlocal.ts"'),
    pkg.includes('"start:local": "tsx scripts/startlocal.ts"'),
    pkg.includes('"dev:lan": "tsx scripts/startlan.ts"'),
    pkg.includes('"start:phone": "tsx scripts/startlan.ts"'),
    src.includes("api_auth_token"), src.includes("next_public_botomatic_api_token"),
    src.includes(".env.local"), src.includes("apps/control-plane/.env.local"),
    src.includes("3001"), src.includes("3000"), src.includes("spawn("), src.includes("env"),
    src.includes("npm.cmd"), src.includes("networkinterfaces"), src.includes("android phone url"),
    docs.includes("windows"), docs.includes("linux"), docs.includes("chromebook"), docs.includes("android"), docs.includes("same wi-fi"), docs.includes("firewall"), docs.includes("localhost") && docs.includes("phone"),
    scripts["launch:beta:full"] === "node scripts/launchBetaFull.mjs",
    scripts["launch:beta:full:check"] === "node scripts/launchBetaFull.mjs --check-only",
    scripts["launch:beta:full:ps"] === "powershell -ExecutionPolicy Bypass -File scripts/launchBetaFull.ps1",
    !String(scripts["launch:beta:full"]).includes("powershell") && !String(scripts["launch:beta:full:check"]).includes("powershell"),
    launcher.includes("botomatic-local-secrets") && launcher.includes("beta-launch.env"),
    launcher.includes("client_credentials") && launcher.includes("/oauth/token"),
    launcher.includes("botomatic_beta_auth_token") && launcher.includes("botomatic_beta_base_url"),
    launcher.includes("botomatic_beta_user_id") && launcher.includes("beta-smoke-admin"),
    launcher.includes("botomatic_beta_tenant_id") && launcher.includes("beta-smoke-tenant"),
    launcher.includes("next_public_api_base_url") && launcher.includes("botomatic_api_base_url") && launcher.includes("api_base_url"),
    launcher.includes('route: "/health"') && launcher.includes('route: "/ready"') && launcher.includes('route: "/api/ops/metrics"'),
    launcher.includes("authorization") && launcher.includes("x-role") && launcher.includes("x-user-id") && launcher.includes("x-tenant-id"),
    launcher.includes("botomatic_beta_project_id") && launcher.includes("/api/projects/${projectid}/runtime"),
    launcher.includes("--check-only") && launcher.includes("go: beta preflight passed") && launcher.includes("no-go"),
    launcher.includes("ports_to_clear = [3000, 3001, 4000]") && launcher.includes("fuser") && launcher.includes("taskkill"),
    launcher.includes("apps") && launcher.includes("control-plane") && launcher.includes(".next"),
    launcher.includes("xdg-open") && launcher.includes("npmcommand") && launcher.includes("ui:dev"),
    !/[a-z0-9_-]{48,}/.test(launcher),
    ["your_", "paste_", "replace_", "changeme", "placeholder"].every((token) => launcher.includes(token))
  ];

  const packageText = fs.readFileSync(path.join(root, "package.json"), "utf8");
  const legacyOnly = (packageText.match(/launch:beta:full:ps/g) || []).length === 1 && !scripts["launch:beta:full"].includes("ps1") && !scripts["launch:beta:full:check"].includes("ps1");
  const ok = required.every(Boolean) && legacyOnly && !banned.some((t)=>src.includes(t));
  return { name, status: ok?"passed":"failed", summary: ok?"Cross-platform, LAN, and beta Node launch readiness is wired.":"Cross-platform, LAN, or beta Node launch readiness requirements are incomplete.", checks };
}
