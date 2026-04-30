import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const name = "Validate-Botomatic-LocalCrossPlatformLaunchReadiness";
const checks = ["scripts/startLocal.ts", "scripts/startLan.ts", "package.json", "docs/local-launch.md"];

const banned = ["production token", "live deployment", "publish", "upload to provider", "app store", "play store", "steam", "roblox api", "xcodebuild", "gradle", "eas build"];

const has = (r:string,p:string)=>fs.existsSync(path.join(r,p));
const read = (r:string,p:string)=>fs.readFileSync(path.join(r,p),"utf8").toLowerCase();

export function validateLocalCrossPlatformLaunchReadiness(root: string): RepoValidatorResult {
  if (!checks.every((c)=>has(root,c))) return { name, status:"failed", summary:"Missing required local launch files.", checks };
  const local = read(root,"scripts/startLocal.ts");
  const lan = read(root,"scripts/startLan.ts");
  const pkg = read(root,"package.json");
  const docs = read(root,"docs/local-launch.md");
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
    docs.includes("windows"), docs.includes("linux"), docs.includes("chromebook"), docs.includes("android"), docs.includes("same wi-fi"), docs.includes("firewall"), docs.includes("localhost") && docs.includes("phone")
  ];

  const ok = required.every(Boolean) && !banned.some((t)=>src.includes(t));
  return { name, status: ok?"passed":"failed", summary: ok?"Cross-platform and LAN local launch readiness is wired.":"Cross-platform and LAN local launch readiness requirements are incomplete.", checks };
}
