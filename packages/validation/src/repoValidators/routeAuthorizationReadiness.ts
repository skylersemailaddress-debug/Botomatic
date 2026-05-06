import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";
import { ROUTE_AUTHORIZATION_POLICIES, type RouteHttpMethod, type RoutePolicyName } from "../../../../apps/orchestrator-api/src/security/routePolicies";

type LiveRoute = {
  method: RouteHttpMethod;
  path: string;
  file: string;
  line: number;
};

const ROUTE_SOURCE_ROOT = "apps/orchestrator-api/src";
const MATRIX_PATH = "docs/security/ROUTE_AUTHORIZATION_MATRIX.md";
const POLICY_CONFIG_PATH = "apps/orchestrator-api/src/security/routePolicies.ts";
const MUTATING_METHODS = new Set<RouteHttpMethod>(["POST", "PUT", "PATCH", "DELETE"]);
const NON_PUBLIC_POLICIES = new Set<RoutePolicyName>(["authenticated", "project_owner", "operator", "admin", "system_only"]);
const PROJECT_AUTH_POLICIES = new Set<RoutePolicyName>(["project_owner", "operator", "admin", "system_only"]);

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-RouteAuthorizationMatrix",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function listTsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listTsFiles(full));
    if (entry.isFile() && entry.name.endsWith(".ts")) files.push(full);
  }
  return files;
}

function discoverLiveRoutes(root: string): LiveRoute[] {
  const sourceRoot = path.join(root, ROUTE_SOURCE_ROOT);
  const routeRegex = /\b(?:app|router)\.(get|post|put|patch|delete)\(\s*["`]([^"`]+)["`]/g;
  return listTsFiles(sourceRoot).flatMap((filePath) => {
    const text = fs.readFileSync(filePath, "utf8");
    const routes: LiveRoute[] = [];
    for (const match of text.matchAll(routeRegex)) {
      routes.push({
        method: match[1].toUpperCase() as RouteHttpMethod,
        path: match[2],
        file: path.relative(root, filePath),
        line: text.slice(0, match.index).split("\n").length,
      });
    }
    return routes;
  });
}

function key(method: string, routePath: string): string {
  return `${method} ${routePath}`;
}

function hasMatrixRow(matrix: string, routeKey: string, policy: RoutePolicyName): boolean {
  return matrix.includes(`| ${routeKey} |`) && matrix.includes(`| ${routeKey} | ${policy} |`);
}

export function validateRouteAuthorizationReadiness(root: string): RepoValidatorResult {
  const checks = [
    POLICY_CONFIG_PATH,
    MATRIX_PATH,
    "apps/orchestrator-api/src/server_app.ts",
    "apps/orchestrator-api/src/server.ts",
    "apps/orchestrator-api/src/capabilitiesStandalone.ts",
  ];

  const missingFiles = checks.filter((rel) => !fs.existsSync(path.join(root, rel)));
  if (missingFiles.length > 0) {
    return result(false, `Missing route authorization files: ${missingFiles.join(", ")}.`, checks);
  }

  const liveRoutes = discoverLiveRoutes(root);
  const policyByKey = new Map(ROUTE_AUTHORIZATION_POLICIES.map((policy) => [key(policy.method, policy.path), policy]));
  const liveKeys = new Set(liveRoutes.map((route) => key(route.method, route.path)));
  const matrix = read(root, MATRIX_PATH);
  const serverApp = read(root, "apps/orchestrator-api/src/server_app.ts");

  const errors: string[] = [];
  const missingPolicies = liveRoutes.filter((route) => !policyByKey.has(key(route.method, route.path)));
  for (const route of missingPolicies) {
    errors.push(`Missing policy for live route ${key(route.method, route.path)} (${route.file}:${route.line}).`);
  }

  for (const policy of ROUTE_AUTHORIZATION_POLICIES) {
    const routeKey = key(policy.method, policy.path);
    if (!liveKeys.has(routeKey)) {
      errors.push(`Policy exists for non-live route ${routeKey}.`);
    }
    if (!hasMatrixRow(matrix, routeKey, policy.policy)) {
      errors.push(`Matrix row missing or policy mismatch for ${routeKey}.`);
    }
    if (policy.sensitive && policy.policy === "public") {
      errors.push(`Sensitive route ${routeKey} is marked public.`);
    }
    if (MUTATING_METHODS.has(policy.method) && !NON_PUBLIC_POLICIES.has(policy.policy)) {
      errors.push(`Mutating route ${routeKey} does not require authentication.`);
    }
    if (policy.mutates && !NON_PUBLIC_POLICIES.has(policy.policy)) {
      errors.push(`Mutating policy flag for ${routeKey} does not require authentication.`);
    }
    if (policy.projectScoped && !PROJECT_AUTH_POLICIES.has(policy.policy)) {
      errors.push(`Project-scoped route ${routeKey} does not require project authorization.`);
    }
  }

  if (!serverApp.includes("createRoutePolicyMiddleware") || !serverApp.includes("recordAuthFailure")) {
    errors.push("server_app.ts does not install the shared route policy middleware.");
  }

  return result(
    errors.length === 0,
    errors.length === 0
      ? `Route authorization matrix covers ${liveRoutes.length} live routes with explicit non-public policies for all sensitive and mutating routes.`
      : errors.slice(0, 12).join(" "),
    checks
  );
}

if (require.main === module) {
  const validation = validateRouteAuthorizationReadiness(path.resolve(process.cwd()));
  const status = validation.status === "passed" ? "PASS" : "FAIL";
  console.log(`${status} — ${validation.name}`);
  console.log(`  ${validation.summary}`);
  if (validation.status === "failed") process.exit(1);
}
