import { FormData } from "../script/automationScript";

export interface AutomationResult {
  success: boolean;
  executionId?: string;
  sessionId?: string;
  sessionUrl?: string;
  contextId?: string;
  message?: string;
  error?: string;
  details?: string;
}

export async function startAutomation(formData: FormData, baseUrl?: string, userId?: string): Promise<AutomationResult> {
  try {
    console.log("Starting automation with form data:", {
      companyCode: formData.companyCode,
      username: formData.username,
      caseNumber: formData.caseNumber,
      // Don't log sensitive data like password
    });
    
    // Generate a unique ID for this execution
    const executionId = Math.random().toString(36).substring(2, 15);
    
    // Get user's timezone for optimal region selection
    const timezone = 'America/New_York'; // Default timezone for server-side
    console.log("Creating session with timezone:", timezone);
    
    // For server-side execution, we need to create the session directly
    let sessionData;
    if (baseUrl) {
      // Client-side or API route - use fetch
      const sessionResponse = await fetch(`${baseUrl}/api/session`, {
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

      sessionData = await sessionResponse.json();
    } else {
      // Server-side execution - call session POST function directly
      const { POST } = await import('../api/session/route');
      const mockRequest = {
        json: async () => ({ timezone }),
      } as any;
      
      const response = await POST(mockRequest);
      sessionData = await response.json();
      
      if (!sessionData.sessionId) {
        throw new Error('Failed to create session directly');
      }
    }

    console.log("Session created successfully:", {
      sessionId: sessionData.sessionId,
      contextId: sessionData.contextId,
    });

    // Import and run the puppeteer script with the session ID
    const { runPuppeteerScript } = await import("../script/puppeteerScript");
    const { sendEventToExecution } = await import("../api/automation/events/route");
    
    // Run the script in the background
    console.log("Starting Puppeteer script with session:", sessionData.sessionId);
    console.log("ExecutionId for events:", executionId);
    
    // Send initial status
    sendEventToExecution(executionId, 'progress', 'Starting automation...', userId);
    
    runPuppeteerScript(formData, executionId, sessionData.sessionId, (uid, event, data) => {
      console.log(`Event callback - UID: ${uid}, Event: ${event}, Data:`, data);
      console.log(`Sending event to executionId: ${uid}`);
      // Send real-time updates to the frontend via SSE
      sendEventToExecution(uid, event, data, userId);
    }).catch((error) => {
      console.error("Puppeteer script failed:", error);
      sendEventToExecution(executionId, 'error', `Script failed: ${error.message}`, userId);
    });

    // Return the session information
    return {
      success: true,
      executionId,
      sessionId: sessionData.sessionId,
      sessionUrl: sessionData.sessionUrl,
      contextId: sessionData.contextId,
      message: "Automation session created successfully"
    };

  } catch (error) {
    console.error("Error starting automation:", error);
    return {
      success: false,
      error: "Failed to start automation",
      details: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
