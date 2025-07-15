import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateObject, LanguageModelV1, UserContent } from "ai";
import { z } from "zod";
import { ObserveResult, Stagehand } from "@browserbasehq/stagehand";

const LLMClient = openai("gpt-4o");

type Step = {
  text: string;
  reasoning: string;
  tool: "GOTO" | "ACT" | "EXTRACT" | "OBSERVE" | "CLOSE" | "WAIT" | "NAVBACK";
  instruction: string;
};

// Global map to store Stagehand instances per session
const stagelandInstances = new Map<string, Stagehand>();

async function getStagehandInstance(sessionID: string): Promise<Stagehand> {
  let stagehand = stagelandInstances.get(sessionID);
  
  if (!stagehand) {
    console.log(`Creating new Stagehand instance for session: ${sessionID}`);
    
    stagehand = new Stagehand({
      browserbaseSessionID: sessionID,
      env: "BROWSERBASE",
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      modelName: "openai/gpt-4o",
      modelClientOptions: {
        apiKey: process.env.OPENAI_API_KEY,
      },
      disablePino: true,
      enableCaching: false,
      verbose: 2,
      domSettleTimeoutMs: 30000,
    });
    
    try {
      console.log(`Initializing Stagehand for session: ${sessionID}`);
      console.log(`Using Browserbase API Key: ${process.env.BROWSERBASE_API_KEY ? 'Set' : 'Not Set'}`);
      console.log(`Using Browserbase Project ID: ${process.env.BROWSERBASE_PROJECT_ID ? 'Set' : 'Not Set'}`);
      console.log(`Using OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not Set'}`);
      
      // Add a longer delay to ensure the Browserbase session is fully ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await stagehand.init();
      console.log(`Successfully initialized Stagehand for session: ${sessionID}`);
      
      // Verify the page is accessible
      if (!stagehand.page) {
        throw new Error("Page object is not available after initialization");
      }
      
      // Test the page connectivity with retry logic
      let pageReady = false;
      let retries = 3;
      
      while (!pageReady && retries > 0) {
        try {
          await stagehand.page.url();
          console.log(`Page is accessible for session: ${sessionID}`);
          
          // Additional check - try to get page context
          const context = stagehand.page.context();
          if (context) {
            console.log(`Browser context is available for session: ${sessionID}`);
            pageReady = true;
          } else {
            throw new Error("Browser context not available");
          }
        } catch (pageError) {
          console.error(`Page accessibility attempt ${4 - retries}:`, pageError);
          if (retries > 1) {
            console.log(`Retrying in 3 seconds... (${retries - 1} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          retries--;
        }
      }
      
      if (!pageReady) {
        throw new Error("Page is not accessible after multiple attempts");
      }
      
      stagelandInstances.set(sessionID, stagehand);
    } catch (error) {
      console.error(`Failed to initialize Stagehand for session ${sessionID}:`, error);
      console.error(`Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        sessionID,
        env: 'BROWSERBASE'
      });
      
      // Clean up failed instance
      try {
        await stagehand.close();
      } catch (closeError) {
        console.error("Error closing failed stagehand instance:", closeError);
      }
      
      // Provide more specific error message
      let errorMessage = 'Failed to initialize browser session';
      if (error instanceof Error) {
        if (error.message.includes('500')) {
          errorMessage = `Browserbase session '${sessionID}' not found or invalid. Please create a new session using /api/session first.`;
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'Invalid Browserbase API credentials. Please check your BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID.';
        } else {
          errorMessage = `Failed to initialize browser session: ${error.message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  } else {
    // Verify existing instance is still valid
    try {
      if (!stagehand.page) {
        console.log(`Invalid existing instance for session ${sessionID}, creating new one`);
        stagelandInstances.delete(sessionID);
        return getStagehandInstance(sessionID); // Recursive call to create new instance
      }
    } catch {
      console.log(`Existing instance for session ${sessionID} is invalid, creating new one`);
      stagelandInstances.delete(sessionID);
      return getStagehandInstance(sessionID); // Recursive call to create new instance
    }
  }
  
  return stagehand;
}

async function cleanupStagehandInstance(sessionID: string) {
  const stagehand = stagelandInstances.get(sessionID);
  if (stagehand) {
    try {
      await stagehand.close();
    } catch (error) {
      console.error("Error closing stagehand instance:", error);
    }
    stagelandInstances.delete(sessionID);
  }
}

async function runStagehand({
  sessionID,
  method,
  instruction,
}: {
  sessionID: string;
  method:
    | "GOTO"
    | "ACT"
    | "EXTRACT"
    | "CLOSE"
    | "SCREENSHOT"
    | "OBSERVE"
    | "WAIT"
    | "NAVBACK";
  instruction?: string;
}) {
  try {
    console.log(`Running ${method} for session: ${sessionID}`);
    
    let stagehand = await getStagehandInstance(sessionID);
    let page = stagehand.page;

    if (!page) {
      throw new Error("Page object is not available");
    }

    switch (method) {
      case "GOTO":
        console.log(`Navigating to: ${instruction}`);
        
        // First, verify the stagehand instance is still connected
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            // Check if page is still accessible
            if (!page) {
              throw new Error("Page object is not available");
            }
            
            // Try to get the current URL to test connectivity
            try {
              await page.url();
              console.log(`Page connectivity verified for session: ${sessionID}`);
            } catch (connectivityError) {
              console.log(`Page connectivity lost, attempting to reinitialize...`);
              throw connectivityError;
            }
            
            // Attempt navigation with minimal options first
            console.log(`Attempting navigation to: ${instruction}`);
            await page.goto(instruction!, {
              timeout: 60000,  // Increased timeout for Browserbase
            });
            
            console.log(`Successfully navigated to: ${instruction}`);
            break;  // Exit retry loop on success
            
          } catch (navigationError) {
            retryCount++;
            console.error(`Navigation attempt ${retryCount} failed:`, navigationError);
            
            if (retryCount >= maxRetries) {
              console.error(`Navigation failed after ${maxRetries} attempts`);
              throw navigationError;
            }
            
            // If this is a connection error, try to reinitialize
            if ((navigationError instanceof Error && 
                 (navigationError.message.includes('context') || 
                  navigationError.message.includes('CDP') ||
                  navigationError.message.includes('undefined'))) ||
                String(navigationError).includes('context')) {
              console.log(`Detected connection issue, cleaning up and reinitializing...`);
              
              // Clean up the current instance
              stagelandInstances.delete(sessionID);
              
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 5000));
              
              // Get a fresh instance (this will trigger reinitialize)
              const freshStagehand = await getStagehandInstance(sessionID);
              stagehand = freshStagehand;
              page = freshStagehand.page;
              console.log(`Reinitialized Stagehand instance for session: ${sessionID}`);
              
            } else {
              // For other errors, just wait before retrying
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          }
        }
        break;

      case "ACT":
        console.log(`Performing action: ${instruction}`);
        await page.act(instruction!);
        console.log(`Successfully performed action: ${instruction}`);
        break;

      case "EXTRACT": {
        console.log(`Extracting: ${instruction}`);
        const { extraction } = await page.extract(instruction!);
        console.log(`Successfully extracted data`);
        return extraction;
      }

      case "OBSERVE":
        console.log(`Observing: ${instruction}`);
        const observation = await page.observe(instruction!);
        console.log(`Successfully observed page`);
        return observation;

      case "CLOSE":
        console.log(`Closing session: ${sessionID}`);
        await cleanupStagehandInstance(sessionID);
        console.log(`Successfully closed session: ${sessionID}`);
        break;

      case "SCREENSHOT": {
        console.log(`Taking screenshot for session: ${sessionID}`);
        const cdpSession = await page.context().newCDPSession(page);
        const { data } = await cdpSession.send("Page.captureScreenshot");
        console.log(`Successfully took screenshot`);
        return data;
      }

      case "WAIT":
        const waitTime = Number(instruction);
        console.log(`Waiting for ${waitTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        console.log(`Successfully waited for ${waitTime}ms`);
        break;

      case "NAVBACK":
        console.log(`Navigating back for session: ${sessionID}`);
        await page.goBack();
        console.log(`Successfully navigated back`);
        break;
    }
  } catch (error) {
    console.error(`Error in runStagehand (${method}):`, error);
    
    // Check for specific error types that indicate session issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConnectionError = errorMessage.includes("Target closed") || 
                            errorMessage.includes("Connection closed") || 
                            errorMessage.includes("browser context is undefined") ||
                            errorMessage.includes("CDP connection");
    
    if (isConnectionError) {
      console.log(`Connection error detected for session ${sessionID}, cleaning up instance`);
      await cleanupStagehandInstance(sessionID);
    }
    
    throw error;
  }
}

async function sendPrompt({
  goal,
  sessionID,
  previousSteps = [],
  previousExtraction,
}: {
  goal: string;
  sessionID: string;
  previousSteps?: Step[];
  previousExtraction?: string | ObserveResult[];
}) {
  let currentUrl = "";

  try {
    const stagehand = await getStagehandInstance(sessionID);
    currentUrl = await stagehand.page.url();
  } catch (error) {
    console.error("Error getting page info:", error);
    // Continue without current URL if there's an issue
  }

  const content: UserContent = [
    {
      type: "text",
      text: `Consider the following screenshot of a web page${
        currentUrl ? ` (URL: ${currentUrl})` : ""
      }, with the goal being "${goal}".
${
  previousSteps.length > 0
    ? `Previous steps taken:
${previousSteps
  .map(
    (step, index) => `
Step ${index + 1}:
- Action: ${step.text}
- Reasoning: ${step.reasoning}
- Tool Used: ${step.tool}
- Instruction: ${step.instruction}
`
  )
  .join("\n")}`
    : ""
}
Determine the immediate next step to take to achieve the goal. 

Important guidelines:
1. Break down complex actions into individual atomic steps
2. For ACT commands, use only one action at a time, such as:
   - Single click on a specific element
   - Type into a single input field
   - Select a single option
3. Avoid combining multiple actions in one instruction
4. If multiple actions are needed, they should be separate steps

If the goal has been achieved, return "close".`,
    },
  ];

  // Add screenshot if navigated to a page previously
  if (
    previousSteps.length > 0 &&
    previousSteps.some((step) => step.tool === "GOTO")
  ) {
    content.push({
      type: "image",
      image: (await runStagehand({
        sessionID,
        method: "SCREENSHOT",
      })) as string,
    });
  }

  if (previousExtraction) {
    content.push({
      type: "text",
      text: `The result of the previous ${
        Array.isArray(previousExtraction) ? "observation" : "extraction"
      } is: ${previousExtraction}.`,
    });
  }

  const message: CoreMessage = {
    role: "user",
    content,
  };

  const result = await generateObject({
    model: LLMClient as LanguageModelV1,
    schema: z.object({
      text: z.string(),
      reasoning: z.string(),
      tool: z.enum([
        "GOTO",
        "ACT",
        "EXTRACT",
        "OBSERVE",
        "CLOSE",
        "WAIT",
        "NAVBACK",
      ]),
      instruction: z.string(),
    }),
    messages: [message],
  });

  return {
    result: result.object,
    previousSteps: [...previousSteps, result.object],
  };
}

async function selectStartingUrl(goal: string) {
  const message: CoreMessage = {
    role: "user",
    content: [
      {
        type: "text",
        text: `Given the goal: "${goal}", determine the best URL to start from.
Choose from:
1. A relevant search engine (Google, Bing, etc.)
2. A direct URL if you're confident about the target website
3. Any other appropriate starting point

Return a URL that would be most effective for achieving this goal.`,
      },
    ],
  };

  const result = await generateObject({
    model: LLMClient as LanguageModelV1,
    schema: z.object({
      url: z.string().url(),
      reasoning: z.string(),
    }),
    messages: [message],
  });

  return result.object;
}

export async function GET() {
  return NextResponse.json({ message: "Agent API endpoint ready" });
}

export async function POST(request: Request) {
  try {
    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY environment variable is required" },
        { status: 500 }
      );
    }

    if (!process.env.BROWSERBASE_API_KEY) {
      return NextResponse.json(
        { error: "BROWSERBASE_API_KEY environment variable is required" },
        { status: 500 }
      );
    }

    if (!process.env.BROWSERBASE_PROJECT_ID) {
      return NextResponse.json(
        { error: "BROWSERBASE_PROJECT_ID environment variable is required" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { goal, sessionId, previousSteps = [], action } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId in request body" },
        { status: 400 }
      );
    }

    console.log(`Processing ${action} for session: ${sessionId}`);

    // Handle different action types
    switch (action) {
      case "START": {
        if (!goal) {
          return NextResponse.json(
            { error: "Missing goal in request body" },
            { status: 400 }
          );
        }

        // Handle first step with URL selection
        const { url, reasoning } = await selectStartingUrl(goal);
        const firstStep = {
          text: `Navigating to ${url}`,
          reasoning,
          tool: "GOTO" as const,
          instruction: url,
        };

        await runStagehand({
          sessionID: sessionId,
          method: "GOTO",
          instruction: url,
        });

        return NextResponse.json({
          success: true,
          result: firstStep,
          steps: [firstStep],
          done: false,
        });
      }

      case "GET_NEXT_STEP": {
        if (!goal) {
          return NextResponse.json(
            { error: "Missing goal in request body" },
            { status: 400 }
          );
        }

        // Get the next step from the LLM
        const { result, previousSteps: newPreviousSteps } = await sendPrompt({
          goal,
          sessionID: sessionId,
          previousSteps,
        });

        return NextResponse.json({
          success: true,
          result,
          steps: newPreviousSteps,
          done: result.tool === "CLOSE",
        });
      }

      case "EXECUTE_STEP": {
        const { step } = body;
        if (!step) {
          return NextResponse.json(
            { error: "Missing step in request body" },
            { status: 400 }
          );
        }

        // Execute the step using Stagehand
        const extraction = await runStagehand({
          sessionID: sessionId,
          method: step.tool,
          instruction: step.instruction,
        });

        return NextResponse.json({
          success: true,
          extraction,
          done: step.tool === "CLOSE",
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in agent endpoint:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
