import type express from "express";
import type { RuntimeConfig } from "../config";
import type { AuthContext } from "../auth/roles";

export type RoutePolicyName = "public" | "authenticated" | "project_owner" | "operator" | "admin" | "system_only";
export type RouteHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RoutePolicy = {
  method: RouteHttpMethod;
  path: string;
  policy: RoutePolicyName;
  projectScoped: boolean;
  mutates: boolean;
  sensitive: boolean;
  rationale: string;
};

const project = (method: RouteHttpMethod, path: string, policy: RoutePolicyName, mutates: boolean, rationale: string): RoutePolicy => ({
  method,
  path,
  policy,
  projectScoped: true,
  mutates,
  sensitive: true,
  rationale,
});

const global = (method: RouteHttpMethod, path: string, policy: RoutePolicyName, mutates: boolean, sensitive: boolean, rationale: string): RoutePolicy => ({
  method,
  path,
  policy,
  projectScoped: false,
  mutates,
  sensitive,
  rationale,
});

export const ROUTE_AUTHORIZATION_POLICIES: readonly RoutePolicy[] = [
  global("GET", "/health", "public", false, false, "Runtime health check exposes only service metadata and auth status."),
  global("GET", "/api/health", "public", false, false, "API health check exposes only service metadata and auth status."),
  global("GET", "/ready", "public", false, false, "Runtime readiness check exposes only service metadata and auth status."),
  global("GET", "/api/ready", "public", false, false, "API readiness check exposes only service metadata and auth status."),
  global("GET", "/registry/capabilities", "authenticated", false, true, "Capability inventory is beta surface metadata and should not be anonymously enumerable."),
  global("GET", "/api/registry/capabilities", "authenticated", false, true, "Capability inventory is beta surface metadata and should not be anonymously enumerable."),
  global("GET", "/api/ops/metrics", "operator", false, true, "Operational metrics can reveal tenant activity and runtime health."),
  global("GET", "/ops/metrics", "operator", false, true, "Operational metrics can reveal tenant activity and runtime health."),
  global("GET", "/api/ops/errors", "operator", false, true, "Operational errors can contain route, actor, and failure metadata."),
  global("GET", "/api/ops/queue", "operator", false, true, "Queue state can reveal project workload and worker details."),
  global("GET", "/admin/projects/:projectId/state", "operator", false, true, "Support operators can inspect full project state for incident response."),
  global("GET", "/admin/build-runs/:buildRunId", "operator", false, true, "Support operators can inspect build run execution details."),
  global("GET", "/admin/job-queue", "operator", false, true, "Support operators can inspect queue health and job backlog."),
  global("GET", "/admin/readiness/:projectId", "operator", false, true, "Support operators can inspect readiness decisions."),
  global("POST", "/admin/jobs/:jobId/replay", "operator", true, true, "Support operators can safely replay idempotent jobs."),
  global("POST", "/admin/build-runs/:buildRunId/cancel", "operator", true, true, "Support operators can cancel stuck builds."),
  global("GET", "/admin/projects/:projectId/evidence-bundle", "operator", false, true, "Support operators can export evidence bundles for incident diagnosis."),
  global("POST", "/api/projects/intake", "authenticated", true, true, "Creates a tenant-owned project and therefore requires an authenticated actor."),

  project("GET", "/api/projects/:projectId/intake/sources", "project_owner", false, "Lists uploaded and linked project source material."),
  project("GET", "/api/projects/:projectId/intake/sources/:sourceId", "project_owner", false, "Reads project source metadata and extracted context."),
  project("POST", "/api/projects/:projectId/intake/source", "project_owner", true, "Adds source metadata to a project."),
  project("POST", "/api/projects/:projectId/intake/pasted-text", "project_owner", true, "Adds pasted source text to a project."),
  project("POST", "/api/projects/:projectId/intake/github", "project_owner", true, "Imports repository source material into a project."),
  project("POST", "/api/projects/:projectId/intake/cloud-link", "project_owner", true, "Registers cloud source material for a project."),
  project("POST", "/api/projects/:projectId/intake/local-manifest", "project_owner", true, "Registers local source manifest metadata for a project."),
  project("POST", "/api/projects/:projectId/intake/file", "project_owner", true, "Uploads project source files."),
  project("POST", "/api/projects/:projectId/spec/analyze", "project_owner", true, "Generates and stores project specification analysis."),
  project("POST", "/api/projects/:projectId/spec/clarify", "project_owner", true, "Updates project specification clarifications."),
  project("POST", "/api/projects/:projectId/spec/assumptions/accept", "project_owner", true, "Accepts project specification assumptions."),
  project("POST", "/api/projects/:projectId/spec/recommendations/apply", "project_owner", true, "Applies project specification recommendations."),
  project("POST", "/api/projects/:projectId/spec/build-contract", "project_owner", true, "Generates a project build contract."),
  project("POST", "/api/projects/:projectId/spec/approve", "operator", true, "Approves a project specification and advances gated build state."),
  project("GET", "/api/projects/:projectId/spec/status", "project_owner", false, "Reads project specification state."),
  project("GET", "/api/projects/:projectId/readiness", "project_owner", false, "Reads commercial build readiness state and blocking decisions."),
  project("POST", "/api/projects/:projectId/clarifications", "project_owner", true, "Persists user answers to pre-build decision questions."),
  project("POST", "/api/projects/:projectId/self-upgrade/spec", "operator", true, "Plans self-upgrade work with repository-level implications."),
  project("GET", "/api/projects/:projectId/self-upgrade/status", "operator", false, "Reads self-upgrade state and drift signals."),
  project("POST", "/api/projects/:projectId/repo/completion-contract", "operator", true, "Generates repository completion and repair planning state."),
  project("GET", "/api/projects/:projectId/repo/status", "operator", false, "Reads repository audit and completion status."),
  project("POST", "/api/projects/:projectId/universal/capability-pipeline", "operator", true, "Runs universal capability pipeline planning."),
  project("GET", "/api/projects/:projectId/universal/capability-pipeline", "operator", false, "Reads universal capability pipeline artifacts."),
  project("POST", "/api/projects/:projectId/build/start", "project_owner", true, "Public build entry point with readiness gate; enforced at Express layer for Railway deployments."),
  project("POST", "/api/projects/:projectId/autonomous-build/start", "operator", true, "Starts autonomous build execution."),
  project("GET", "/api/projects/:projectId/autonomous-build/status", "operator", false, "Reads autonomous build execution state."),
  project("POST", "/api/projects/:projectId/autonomous-build/resume", "operator", true, "Resumes autonomous build execution."),
  project("POST", "/api/projects/:projectId/autonomous-build/approve-blocker", "operator", true, "Approves a blocker in autonomous build execution."),
  project("POST", "/api/projects/:projectId/operator/send", "project_owner", true, "Sends an operator instruction into the project orchestration loop."),
  project("POST", "/api/projects/:projectId/compile", "project_owner", true, "Compiles project master truth artifacts."),
  project("POST", "/api/projects/:projectId/plan", "project_owner", true, "Generates project execution packets."),
  project("POST", "/api/projects/:projectId/git/result", "operator", true, "Records external git operation results for a project."),
  project("POST", "/api/projects/:projectId/dispatch/execute-next", "operator", true, "Dispatches project execution work."),
  project("POST", "/api/projects/:projectId/repair/replay", "admin", true, "Replays repair execution and can modify generated workspace state."),
  project("GET", "/api/projects/:projectId/status", "project_owner", false, "Reads project summary status."),
  project("GET", "/api/projects/:projectId/state", "project_owner", false, "Reads full project orchestration state."),
  project("GET", "/api/projects/:projectId/resume", "project_owner", false, "Reads project resume and next-action guidance."),
  project("GET", "/api/projects/:projectId/runtime", "project_owner", false, "Reads project runtime state."),
  project("GET", "/api/projects/:projectId/execution", "project_owner", false, "Reads project execution run list."),
  project("GET", "/api/projects/:projectId/execution/:runId", "project_owner", false, "Reads a project execution run."),
  project("GET", "/api/projects/:projectId/ui/overview", "project_owner", false, "Reads project UI overview data."),
  project("GET", "/api/projects/:projectId/ui/packets", "project_owner", false, "Reads project packet UI data."),
  project("GET", "/api/projects/:projectId/ui/artifacts", "operator", false, "Reads generated artifacts and evidence."),
  project("GET", "/api/projects/:projectId/ui/gate", "operator", false, "Reads governance gate state."),
  project("GET", "/api/projects/:projectId/ui/proof-status", "operator", false, "Reads proof and validation status."),
  project("GET", "/api/projects/:projectId/ui/security-center", "operator", false, "Reads security audit data."),
  project("POST", "/api/projects/:projectId/security-center/dependency-scan", "operator", true, "Runs a dependency/security scan for project artifacts."),
  project("POST", "/api/projects/:projectId/governance/approval", "admin", true, "Approves or rejects governance release gates."),
  project("POST", "/api/projects/:projectId/deploy/promote", "admin", true, "Promotes a project deployment."),
  project("POST", "/api/projects/:projectId/deploy/rollback", "admin", true, "Rolls back a project deployment."),
  project("GET", "/api/projects/:projectId/ui/deployments", "operator", false, "Reads project deployment history."),
  project("GET", "/api/projects/:projectId/ui/audit", "operator", false, "Reads project audit events."),
] as const;

const rank: Record<AuthContext["role"], number> = { operator: 1, reviewer: 2, admin: 3 };
const requiredRuntimeRole: Partial<Record<RoutePolicyName, AuthContext["role"]>> = {
  operator: "operator",
  admin: "admin",
};

type VerifiedAuth = AuthContext & { issuer?: string };

type RoutePolicyMiddlewareOptions = {
  config: RuntimeConfig;
  getVerifiedAuth: (req: express.Request, config: RuntimeConfig) => Promise<VerifiedAuth>;
  recordAuthFailure?: (message: string, metadata: Record<string, unknown>) => void;
};

type CompiledPolicy = RoutePolicy & { pattern: RegExp };

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compilePolicy(policy: RoutePolicy): CompiledPolicy {
  const pattern = new RegExp(`^${policy.path.split("/").map((part) => part.startsWith(":") ? "[^/]+" : escapeRegExp(part)).join("/")}$`);
  return { ...policy, pattern };
}

const COMPILED_POLICIES = ROUTE_AUTHORIZATION_POLICIES.map(compilePolicy);

export function findRoutePolicy(method: string, requestPath: string): RoutePolicy | undefined {
  const normalizedMethod = method.toUpperCase();
  return COMPILED_POLICIES.find((policy) => policy.method === normalizedMethod && policy.pattern.test(requestPath));
}

export function createRoutePolicyMiddleware(options: RoutePolicyMiddlewareOptions): express.RequestHandler {
  return async (req, res, next) => {
    if (req.method === "OPTIONS") return next();
    const policy = findRoutePolicy(req.method, req.path);
    if (!policy || policy.policy === "public") return next();

    try {
      const auth = await options.getVerifiedAuth(req, options.config);
      const projectId = req.params.projectId || req.path.match(/^\/(?:api\/)?projects\/([^/]+)/)?.[1] || req.path.match(/^\/admin\/projects\/([^/]+)/)?.[1] || req.path.match(/^\/admin\/readiness\/([^/]+)/)?.[1];
      if (!auth.userId || auth.userId === "anonymous") {
        options.recordAuthFailure?.("Route policy authenticated actor required", {
          route: `${req.method} ${req.path}`,
          projectId,
          policy: policy.policy,
        });
        return res.status(401).json({ error: "Authenticated actor required", policy: policy.policy });
      }

      const requiredRole = requiredRuntimeRole[policy.policy];
      if (requiredRole && rank[auth.role] < rank[requiredRole]) {
        options.recordAuthFailure?.("Route policy role check denied", {
          route: `${req.method} ${req.path}`,
          projectId,
          policy: policy.policy,
          requiredRole,
          actualRole: auth.role,
          userId: auth.userId,
        });
        return res.status(403).json({ error: "Forbidden", policy: policy.policy, requiredRole, actualRole: auth.role });
      }

      if (policy.projectScoped) {
        const project = projectId ? await options.config.repository.repo.getProjectForActor(projectId, auth.userId) : null;
        if (!project) {
          options.recordAuthFailure?.("Route policy project access denied", {
            route: `${req.method} ${req.path}`,
            policy: policy.policy,
            projectId,
            actorId: auth.userId,
          });
          return res.status(403).json({ error: "Project access denied", policy: policy.policy });
        }
        (res.locals as any).tenantProject = project;
      }

      return next();
    } catch (error: any) {
      const projectId = req.params.projectId || req.path.match(/^\/(?:api\/)?projects\/([^/]+)/)?.[1] || req.path.match(/^\/admin\/projects\/([^/]+)/)?.[1] || req.path.match(/^\/admin\/readiness\/([^/]+)/)?.[1];
      options.recordAuthFailure?.(String(error?.message || error), { route: `${req.method} ${req.path}`, projectId, policy: policy.policy });
      return res.status(401).json({ error: String(error?.message || error), policy: policy.policy });
    }
  };
}
