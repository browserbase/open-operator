/**
 * 🤘 Welcome to Stagehand!
 *
 * You probably DON'T NEED TO BE IN THIS FILE
 *
 * You're probably instead looking for the main() function in main.ts
 *
 * This is run when you do npm run start; it just calls main()
 *
 */

import chalk from "chalk";
import { sendPrompt } from "./llm.js";
import { announce } from "./utils.js";
import { createSession } from "./bb.js";
import { runStagehand } from "./execute.js";
import { CoreMessage } from "ai";
import { ObserveResult } from "@browserbasehq/stagehand";

// ALEX: this is the main loop, which is called by the client
async function agentLoop(
  sessionID: string,
  goal: string,
  previousSteps: any[] = [],
  previousExtraction?: string | ObserveResult[]
) {
  const { result, previousSteps: newPreviousSteps } = await sendPrompt({
    goal,
    sessionID,
    previousSteps,
    previousExtraction,
  });

  console.log("SHOW IN UI:", {
    TEXT: result.text,
    REASONING: result.reasoning,
    TOOL: result.tool,
    STEP_NUMBER: previousSteps.length + 1,
  });

  previousExtraction = await runStagehand({
    sessionID,
    method: result.tool,
    instruction: result.instruction,
  });

  if (previousExtraction) {
    console.log("EXTRACTION RESULT:", previousExtraction);
  }

  if (result.tool !== "CLOSE") {
    return await agentLoop(sessionID, goal, previousSteps, previousExtraction);
  }
  return {
    result,
    steps: newPreviousSteps,
  };
}

// Make this like entry point for a prompt
async function run(prompt: string) {
  // ALEX: Run createSession server-side
  //   Save session to a react state
  const session = await createSession();
  console.log("SESSION", session);

  // ALEX: Display session in UI
  announce(
    `View this session live in the Browserbase dashboard: ${chalk.blue(
      `https://www.browserbase.com/sessions/${session.id}`
    )}`
  );

  // ALEX: Run agentLoop client-side
  await agentLoop(session.id, prompt);
}

run(
  "find stagehand by browserbase on github and tell me who the top contributor is defined by line of code added"
);
