import { NextRequest, NextResponse } from "next/server";
import { getProofStore } from "@/server/launchProofStore";

export const dynamic = "force-dynamic";

/**
 * WAVE-038: GET /api/projects/[projectId]/launch-proof
 * 
 * Returns the current launch proof status for a project.
 * Hard rule: verified must be explicitly set via verification route,
 * never derived from preview URLs or runtime state.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId required" },
        { status: 400 }
      );
    }

    const store = getProofStore();
    const proof = await store.getProof(projectId);

    if (!proof) {
      return NextResponse.json(
        {
          projectId,
          verified: false,
          lastUpdated: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(proof, { status: 200 });
  } catch (error) {
    console.error("[launch-proof GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * WAVE-038: POST /api/projects/[projectId]/launch-proof
 * 
 * Submits launch proof evidence. This should only be called after
 * verified proof exists (benchmark pass, runtime proof, commercial readiness check).
 * 
 * Hard rules:
 * - Do not fake proof
 * - Do not accept preview URL as proof
 * - Verify via external benchmark/runtime/commercial readiness checks
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { verificationMethod, buildStatus, commercialReadinessScore } = body;

    if (!verificationMethod) {
      return NextResponse.json(
        { error: "verificationMethod required" },
        { status: 400 }
      );
    }

    // Validate verificationMethod
    const validMethods = ["benchmark", "runtime", "commercial_readiness", "manual"];
    if (!validMethods.includes(verificationMethod)) {
      return NextResponse.json(
        { error: `invalid verificationMethod: ${verificationMethod}` },
        { status: 400 }
      );
    }

    const store = getProofStore();
    const proof = await store.setProof(projectId, {
      verified: true,
      verificationMethod,
      buildStatus,
      commercialReadinessScore,
      verifiedAt: new Date().toISOString(),
    });

    return NextResponse.json(proof, { status: 200 });
  } catch (error) {
    console.error("[launch-proof POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
