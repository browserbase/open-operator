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
    {
      type: "image",
      image: (await runStagehand({
        sessionID,
        method: "SCREENSHOT",
      })) as string,
    },
  ];

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
      tool: z.enum(["GOTO", "ACT", "EXTRACT", "OBSERVE", "CLOSE"])
        .describe(`Use the following guidelines to pick which tool to use:
          GOTO: Navigate to a URL. Only use this if you need to navigate to a new page that is not accessible from the current one. Do not try to skip a step by navigating directly to a new page, use \`act\` for that. If you are querying a website, do not try to enter the search query into the URL and navigate to it. Use \`act\` instead.
          ACT: Perform an action on the page. Keep the instruction as precise and granular as possible. Use this to perform a step, not an entire action.
          EXTRACT: Extract data from the page. Use this when you need to extract information from the page, don't solely rely on a screenshot to read text from a page. If you choose this tool you will be provided with the result of the extraction.
          OBSERVE: Observe the potential actions on the page. Only use this if you are unsure what to do next. If you choose this tool you will be provided with a list of actions.
          CLOSE: Close the browser once the goal has been achieved.`),
      instruction: z
        .string()
        .describe(
          "The instruction to display, i.e. the url to navigate to, the action to perform, the data to extract, the observation to make, etc. If the tool is 'CLOSE', this should be an empty string."
        ),
    }),
    messages: [message],
  });

  return {
    result: result.object,
    previousSteps: [...previousSteps, result.object],
  };
}
