import { NextRequest, NextResponse } from "next/server";
import { FormData } from "../../script/automationScript";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData: FormData = await request.json();
    
    console.log("Starting automation with form data:", {
      companyCode: formData.companyCode,
      username: formData.username,
      caseNumber: formData.caseNumber,
      // Don't log sensitive data like password
    });
    
    // Generate a unique ID for this execution
    const executionId = Math.random().toString(36).substring(2, 15);
    
    // Get user's timezone for optimal region selection
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log("Creating session with timezone:", timezone);
    
    // Create a browser session using our session API
    const sessionResponse = await fetch(`${request.nextUrl.origin}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timezone: timezone,
      }),
    });

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json();
      console.error("Failed to create session:", errorData);
      throw new Error(`Failed to create session: ${errorData.error || 'Unknown error'}`);
    }

    const sessionData = await sessionResponse.json();
    console.log("Session created successfully:", {
      sessionId: sessionData.sessionId,
      contextId: sessionData.contextId,
    });

    // Return the session information so the frontend can start showing the browser
    return NextResponse.json({
      success: true,
      executionId,
      sessionId: sessionData.sessionId,
      sessionUrl: sessionData.sessionUrl,
      contextId: sessionData.contextId,
      message: "Automation session created successfully"
    });

  } catch (error) {
    console.error("Error starting automation:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to start automation",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
