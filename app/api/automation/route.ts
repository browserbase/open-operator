import { NextRequest, NextResponse } from "next/server";
import { FormData } from "../../script/automationScript";
import { Browserbase } from "@browserbasehq/sdk";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData: FormData = await request.json();
    
    // Generate a unique ID for this execution
    const executionId = Math.random().toString(36).substring(2, 15);
    
    // Create a browser session first
    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY!,
    });

    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      browserSettings: {
        viewport: {
          width: 1920,
          height: 1080,
        },
      },
      keepAlive: true,
    });

    // Return the session URL immediately so the frontend can start showing the browser
    return NextResponse.json({
      success: true,
      executionId,
      sessionId: session.id,
      sessionUrl: session.connectUrl,
      message: "Automation started successfully"
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
