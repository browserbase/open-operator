import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateObject, UserContent } from "ai";
import { z } from "zod";
import { runStagehand } from "./execute.js";
import { ObserveResult } from "@browserbasehq/stagehand";

const LLMClient = openai("gpt-4o");

type Step = {
  text: string;
  reasoning: string;
  tool: "GOTO" | "ACT" | "EXTRACT" | "OBSERVE" | "CLOSE";
  instruction: string;
};

export async function sendPrompt({
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
  const content: UserContent = [
    {
      type: "text",
      text: `Consider the following screenshot of a web page, with the goal being "${goal}".
${
  previousSteps.length > 0
    ? `
Previous steps taken:
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
If the goal has been achieved, return "close".`,
    },
  ];

  // only include screenshot if it navigated to a page previously
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
      text: z
        .string()
        .describe(
          "The text to display. If the goal has been achieved and has an output, share it here. Otherwise use this to provide details about your observations. If you used an extraction, share what that extraction was here."
        ),
      reasoning: z
        .string()
        .describe(
          "The reasoning behind the tool call. If the tool is 'CLOSE', this should explain how and why the goal has been achieved."
        ),
      tool: z.enum([
        "GOTO",
        "ACT",
        "EXTRACT",
        "OBSERVE",
        "CLOSE",
        "WAIT",
        "NAVBACK",
      ]).describe(`Tool guidelines:
GOTO: Navigate to a new URL only if not accessible from current page or if you need to navigate to a page to start off
ACT: Perform a single action on the page
EXTRACT: Extract data from the page (don't rely on screenshots for text, use the EXTRACT tool and you'll be provided with the result)
OBSERVE: List available actions when unsure what to do next
WAIT: Wait for a number of milliseconds
NAVBACK: Navigate to the previously visited URL
CLOSE: Close browser when goal is achieved`),
      instruction: z
        .string()
        .describe(
          "The instruction to display, i.e. the url to navigate to, the action to perform, the data to extract, the observation to make, etc. If the tool is 'CLOSE', this should be an empty string. If the tool is 'WAIT', this should be the number of milliseconds to wait."
        ),
    }),
    messages: [message],
  });

  return {
    result: result.object,
    previousSteps: [...previousSteps, result.object],
  };
}