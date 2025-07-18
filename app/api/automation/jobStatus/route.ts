import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { executionId, status, error } = await request.json();
    
    // Return a success response with the execution details
    // The client will handle updating the local job queue
    return NextResponse.json({
      success: true,
      executionId,
      status,
      error
    });
  } catch (error) {
    console.error("Error in job status update API route:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to update job status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
