import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export type ControlPlaneRole = "operator" | "reviewer" | "admin";

const roleRank: Record<ControlPlaneRole, number> = { operator: 1, reviewer: 2, admin: 3 };
const ownerRegistryPath = path.join(process.cwd(), "data", "tenant-project-owners.json");

function readOwners(): Record<string, string> {
  if (!fs.existsSync(ownerRegistryPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(ownerRegistryPath, "utf8"));
  } catch {
    return {};
  }
}

function writeOwners(owners: Record<string, string>) {
  fs.mkdirSync(path.dirname(ownerRegistryPath), { recursive: true });
  fs.writeFileSync(ownerRegistryPath, JSON.stringify(owners, null, 2));
}

export function recordProjectOwner(projectId: string, ownerUserId: string) {
  const owners = readOwners();
  owners[projectId] = ownerUserId;
  writeOwners(owners);
}

export function getProjectOwner(projectId: string): string | null {
  return readOwners()[projectId] || null;
}

export function getControlPlaneActor(request: NextRequest): { actorId: string; role: ControlPlaneRole } | null {
  // Server-side beta admin bypass for local UI → hosted Railway development sessions.
  // When BOTOMATIC_BETA_AUTH_TOKEN is set in the Next.js server process (by
  // launchBeta*.ps1) and is a valid JWT (starts with eyJ), ALL requests arriving
  // at local Next.js route handlers are treated as the beta admin actor.
  //
  // The bypass is unconditional — it does NOT inspect the incoming request's
  // Authorization header. Reason: browsers make requests with no auth header;
  // gating on the request header causes every browser-originated request to fail
  // when the header is absent or set to something else.
  //
  // Security: BOTOMATIC_BETA_AUTH_TOKEN has no NEXT_PUBLIC_ prefix, so it is
  // never exposed to client-side bundle code. Only the server process that starts
  // Next.js (i.e., the launcher) can configure this bypass.
  const betaToken = (process.env.BOTOMATIC_BETA_AUTH_TOKEN || "").trim();
  if (betaToken && betaToken.startsWith("eyJ")) {
    return {
      actorId: (process.env.BOTOMATIC_BETA_USER_ID || "beta-smoke-admin").trim(),
      role: "admin",
    };
  }

  const actorId = request.headers.get("x-user-id") || request.headers.get("x-botomatic-user-id") || "";
  const rawRole = request.headers.get("x-role") || "operator";
  const role = rawRole === "admin" || rawRole === "reviewer" ? rawRole : "operator";
  if (!actorId || actorId === "anonymous") return null;
  return { actorId, role };
}

export function requireControlPlaneProjectAccess(
  request: NextRequest,
  projectId: string,
  requiredRole: ControlPlaneRole = "operator"
): NextResponse | null {
  const betaToken = (process.env.BOTOMATIC_BETA_AUTH_TOKEN || "").trim();
  const tokenConfigured = !!betaToken;
  const tokenLooksLikeJwt = tokenConfigured && betaToken.startsWith("eyJ");

  const actor = getControlPlaneActor(request);
  if (!actor) {
    return NextResponse.json(
      {
        error: "Authenticated actor required",
        route: request.nextUrl.pathname,
        tokenConfigured,
        tokenLooksLikeJwt,
        actorResolved: false,
        actorRole: null,
        actorIdSource: null,
        hint: tokenConfigured && !tokenLooksLikeJwt
          ? "BOTOMATIC_BETA_AUTH_TOKEN is set but does not start with eyJ. Re-run the launcher to refresh the token."
          : !tokenConfigured
          ? "BOTOMATIC_BETA_AUTH_TOKEN is not set. Start the UI with npm run launch:beta:full."
          : "Unexpected: token is valid but actor did not resolve. Check route handler.",
      },
      { status: 401 },
    );
  }

  if (roleRank[actor.role] < roleRank[requiredRole]) {
    return NextResponse.json(
      {
        error: "Forbidden",
        requiredRole,
        actualRole: actor.role,
        route: request.nextUrl.pathname,
        tokenConfigured,
        tokenLooksLikeJwt,
        actorResolved: true,
        actorRole: actor.role,
        actorIdSource: tokenConfigured ? "BOTOMATIC_BETA_AUTH_TOKEN bypass" : "x-user-id header",
      },
      { status: 403 },
    );
  }

  // Admin actors have global access and bypass per-project owner checks.
  // This is necessary for Railway-created projects that are not registered
  // in the local owner registry.
  if (actor.role === "admin") return null;

  const ownerUserId = getProjectOwner(projectId);
  if (!ownerUserId || ownerUserId !== actor.actorId) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return null;
}
