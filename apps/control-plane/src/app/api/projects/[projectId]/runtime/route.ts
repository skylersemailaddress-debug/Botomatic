import { NextRequest, NextResponse } from "next/server";
import { requireControlPlaneProjectAccess } from "@/server/projectAccess";
import { loadRuntime, sanitizeRuntimeUrl } from "@/server/runtimeStore";
import { sanitizeProjectId } from "@/server/executionStore";

export const dynamic = "force-dynamic";

function getBackendBase(): string {
  const raw = (
    process.env.BOTOMATIC_API_PROXY_BASE_URL ||
    process.env.BOTOMATIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://127.0.0.1:3001"
  ).trim();
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export async function GET(request: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const accessDenied = requireControlPlaneProjectAccess(request, projectId);
  if (accessDenied) return accessDenied;

  const local = loadRuntime(projectId);
  if (local) {
    return NextResponse.json({
      ...local,
      verifiedPreviewUrl: sanitizeRuntimeUrl(local.verifiedPreviewUrl),
      derivedPreviewUrl: sanitizeRuntimeUrl(local.derivedPreviewUrl),
    });
  }

  // In beta mode, projects are created on Railway (not the local store).
  // Forward to Railway so the UI sees the real build/runtime status.
  const betaToken = (process.env.BOTOMATIC_BETA_AUTH_TOKEN || "").trim();
  if (betaToken) {
    try {
      const upstreamUrl = `${getBackendBase()}/api/projects/${projectId}/runtime`;
      const resp = await fetch(upstreamUrl, {
        headers: {
          "authorization": `Bearer ${betaToken}`,
          "x-role": "admin",
          "x-user-id": (process.env.BOTOMATIC_BETA_USER_ID || "beta-smoke-admin").trim(),
          "x-tenant-id": (process.env.BOTOMATIC_BETA_TENANT_ID || "beta-smoke-tenant").trim(),
        },
      });
      if (resp.ok) {
        return NextResponse.json(await resp.json());
      }
    } catch {
      // Fall through to stopped response
    }
  }

  return NextResponse.json({
    projectId,
    status: "stopped",
    state: "stopped",
    previewUrl: null,
    verifiedPreviewUrl: null,
    derivedPreviewUrl: null,
  });
}
