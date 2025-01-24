import { z } from "zod";
import { CoreMessage, generateObject } from "ai";
//import { anthropic } from "@ai-sdk/anthropic";
import { anthropic } from "@ai-sdk/anthropic";
import { runStagehand } from "./execute.js";

const LLMClient = anthropic("claude-3-5-sonnet-latest");

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
}: {
  goal: string;
  sessionID: string;
  previousSteps?: Step[];
}) {
  const message: CoreMessage = {
    role: "user",
    content: [
      {
        type: "text",
        text: `Consider the following screenshot of a web page, with the goal being "${goal}".
${previousSteps.length > 0 ? `
Previous steps taken:
${previousSteps.map((step, index) => `
Step ${index + 1}:
- Action: ${step.text}
- Reasoning: ${step.reasoning}
- Tool Used: ${step.tool}
- Instruction: ${step.instruction}
`).join('\n')}` : ''}
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
    ],
  };

  const result = await generateObject({
    model: LLMClient,
    schema: z.object({
      text: z.string().describe("The text to display"),
      reasoning: z.string().describe("The reasoning to display"),
      tool: z.enum(["GOTO", "ACT", "EXTRACT", "OBSERVE", "CLOSE"]),
      instruction: z
        .string()
        .describe(
          "The instruction to display, i.e. the url to navigate to, the action to perform, the data to extract, the observation to make, etc. If the tool is 'CLOSE', this should be an empty string."
        ),
    }),
    messages: [message],
  });

  console.log("RESULT", result);
  
  return {
    result: result.object,
    previousSteps: [...previousSteps, result.object],
  };
}
