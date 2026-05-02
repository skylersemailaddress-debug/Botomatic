import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * WAVE-038: GET /api/projects/[projectId]/deployments
 * 
 * Returns current deployment status for all environments.
 * This is informational only and does not perform any operations.
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

    // Return empty deployments for now.
    // Subsequent WAVES will populate this with actual deployment history.
    return NextResponse.json(
      {
        deployments: {
          dev: null,
          staging: null,
          prod: null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[deployments GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
