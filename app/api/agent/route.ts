import { NextResponse } from "next/server";
import { CoreMessage, generateObject, UserContent } from "ai";
import { z } from "zod";
import { ObserveResult, Page, Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig, { LLMClient } from "@/stagehand.config";

type Step = {
  text: string;
  reasoning: string;
  tool: "GOTO" | "ACT" | "EXTRACT" | "OBSERVE" | "CLOSE" | "WAIT" | "NAVBACK";
  instruction: string;
};

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
  const stagehand = new Stagehand({
    ...StagehandConfig,
    browserbaseSessionID: sessionID,
  });
  await stagehand.init();

  const page = stagehand.page;

  try {
    switch (method) {
      case "GOTO":
        await page.goto(instruction!, {
          waitUntil: "commit",
          timeout: 60000,
        });
        break;

      case "ACT":
        await page.act(instruction!);
        break;

      case "EXTRACT": {
        const { extraction } = await page.extract(instruction!);
        return extraction;
      }

      case "OBSERVE":
        return await page.observe({
          instruction,
          useAccessibilityTree: true,
        });

      case "CLOSE":
        await stagehand.close();
        break;

      case "SCREENSHOT": {
        const cdpSession = await page.context().newCDPSession(page);
        const { data } = await cdpSession.send("Page.captureScreenshot");
        return data;
      }

      case "WAIT":
        await new Promise((resolve) =>
          setTimeout(resolve, Number(instruction))
        );
        break;

      case "NAVBACK":
        await page.goBack();
        break;
    }
  } catch (error) {
    await stagehand.close();
    throw error;
  }
}

async function getSuggestions({
  page,
  goal,
  stepInstruction,
  previousSteps,
}: {
  page: Page;
  goal?: string;
  stepInstruction?: string;
  previousSteps: {
    method: string;
    description: string;
    result?: string;
  }[];
}) {
  const suggestions = await page.observe(
    `
	  ${goal ? `You are trying to achieve the following goal: "${goal}"` : ""}
	  ${
      stepInstruction
        ? `THE USER'S SPECIFIC STEP INSTRUCTION IS AS FOLLOWS: "${stepInstruction}"`
        : ""
    }
	  ${
      previousSteps.length > 0
        ? `THE PREVIOUS STEPS ARE AS FOLLOWS: ${previousSteps
            .map(
              (step, i) =>
                `[${i + 1}] ${step.method.toUpperCase()}: ${step.description}`
            )
            .join("\n")}`
        : ""
    }
	  If there is data on the page, get the top 5 things that a user would want to do (take action) or read on this page, with the most likely first. Limit the suggestions to 5.   
			If the user is requesting text (NON-INTERACTABLE) information from the page, and you see the information in the current page, set the method to 'EXTRACT' and include the data 
				in the description. Make sure to select an element id pointing to the element to extract from, or its parent.
			If the user wants to interact with an element on the page, or the page in general, such as clicking a button, filling a form, or typing into a search bar, DO NOT USE EXTRACT.
			If the method is 'EXTRACT', set a description (think of it as an instruction) of the data to extract as the first argument. For the second argument, provide a JSON schema that matches the structure of the data to be extracted. The schema should be a valid JSON schema object with proper types and structure. THE JSON SCHEMA MUST BE A STRING. For example:
		'{
		  "type": "object",
		  "properties": {
			"title": { "type": "string" },
			"description": { "type": "string" },
			"items": {
			  "type": "array",
			  "items": { "type": "string" }
			}
		  },
		  "required": ["title"]
		}'
		Do NOT include the result values in the argument, instead describe what the result should look like. Put the actual extracted values in the description.
		Without a specific instruction, MAKE SURE to combine / alternate extract and non-extract suggestions such as click, fill, type, etc. DON'T PROVIDE ONLY ACT CALLS, COMBINE WITH EXTRACT. ON EXTRACT CALLS PROVIDE BOTH ARGUMENTS LIKE IN THE TEMPLATE: STICK TO ZOD SCHEMA AS A STRING. THE ZOD SCHEMA SHOULD BE AN OBJECT AT THE ROOT LEVEL, FOR EXAMPLE: '{"type": "object", "properties": {"example": {"type": "string"}}}. The first part of a zod schema should always be the object'`
  );
  return suggestions;
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
    const stagehand = new Stagehand({
      ...StagehandConfig,
      browserbaseSessionID: sessionID,
    });
    await stagehand.init();
    currentUrl = await stagehand.page.url();
    await stagehand.close();
  } catch (error) {
    console.error("Error getting page info:", error);
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
    model: LLMClient,
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
    model: LLMClient,
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
    const body = await request.json();
    const { goal, sessionId, previousSteps = [], action } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId in request body" },
        { status: 400 }
      );
    }

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

        console.log("STARTING STAGEHAND");
        const startTime = performance.now();
        const stagehand = new Stagehand({
          ...StagehandConfig,
          browserbaseSessionID: sessionId,
        });
        await stagehand.init();
        const suggestions = await getSuggestions({
          page: stagehand.page,
          goal,
          previousSteps: previousSteps.map((step: Step) => ({
            method: step.tool,
            description: step.text,
          })),
          // previousExtraction: previousSteps.find(step => step.tool === "EXTRACT")?.result,
        });
        await stagehand.close();
        const endTime = performance.now();
        console.log(`Time taken: ${endTime - startTime}ms`);
        console.log("SUGGESTIONS", suggestions);

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
