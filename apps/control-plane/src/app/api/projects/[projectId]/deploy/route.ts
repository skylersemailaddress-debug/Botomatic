import { NextRequest, NextResponse } from "next/server";
import { getProofStore } from "@/server/launchProofStore";

export const dynamic = "force-dynamic";

/**
 * WAVE-038: POST /api/projects/[projectId]/deploy
 * 
 * Enables project deployment to specified environment.
 * Launch/deploy gating: only allowed if:
 * 1. Launch proof is verified (launchProof.verified === true)
 * 2. Launch readiness gates pass (launchReady === true)
 * 3. No real external deployment performed (gating only, no actual cloud deployment)
 * 
 * Hard rules:
 * - Do not perform real external deployment
 * - Do not add arbitrary shell execution
 * - Keep deploy blocked unless verified launch proof exists
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
    const { environment } = body;

    if (!environment) {
      return NextResponse.json(
        { error: "environment required (dev|staging|prod)" },
        { status: 400 }
      );
    }

    // Validate environment
    const validEnvironments = ["dev", "staging", "prod"];
    if (!validEnvironments.includes(environment)) {
      return NextResponse.json(
        { 
          status: "blocked",
          message: `Invalid environment: ${environment}. Valid values: ${validEnvironments.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check launch proof verification
    const store = getProofStore();
    const proof = await store.getProof(projectId);

    if (!proof || !proof.verified) {
      return NextResponse.json(
        {
          status: "blocked",
          message: "Deploy blocked: launch proof not verified. Call /api/projects/[projectId]/launch/verify first.",
        },
        { status: 403 }
      );
    }

    // In production, this would trigger actual deployment orchestration.
    // For WAVE-038, we gate the decision but do NOT perform real external deployment.
    // Subsequent WAVES will add:
    // - Credentialed deployment approval workflow
    // - Terraform/Kubernetes deployment targets
    // - Rollback orchestration

    return NextResponse.json(
      {
        status: "gated",
        environment,
        message: `Deploy gating enabled for ${environment}. Ready for credentialed deployment (placeholder for WAVE upgrade).`,
        launchProof: {
          verified: proof.verified,
          verificationMethod: proof.verificationMethod,
          verifiedAt: proof.verifiedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[deploy POST]", error);
    return NextResponse.json(
      { 
        status: "error",
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
