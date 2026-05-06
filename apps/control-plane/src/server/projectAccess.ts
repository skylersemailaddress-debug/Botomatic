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
  const actor = getControlPlaneActor(request);
  if (!actor) {
    return NextResponse.json({ error: "Authenticated actor required" }, { status: 401 });
  }
  if (roleRank[actor.role] < roleRank[requiredRole]) {
    return NextResponse.json({ error: "Forbidden", requiredRole, actualRole: actor.role }, { status: 403 });
  }
  const ownerUserId = getProjectOwner(projectId);
  if (!ownerUserId || ownerUserId !== actor.actorId) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return null;
}
