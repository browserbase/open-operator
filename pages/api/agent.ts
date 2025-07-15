import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateObject, LanguageModelV1, UserContent } from "ai";
import { z } from "zod";
import puppeteer, { Browser } from "puppeteer-core";
import Browserbase from "@browserbasehq/sdk";
import type { NextApiRequest, NextApiResponse } from "next";

const LLMClient = openai("gpt-4o");

type Step = {
  text: string;
  reasoning: string;
  tool: "GOTO" | "ACT" | "EXTRACT" | "OBSERVE" | "CLOSE" | "WAIT" | "NAVBACK";
  instruction: string;
};

const stagelandInstances = new Map<string, Stagehand>();

async function getStagehandInstance(sessionID: string): Promise<Stagehand> {
  let stagehand = stagelandInstances.get(sessionID);
  if (!stagehand) {
    stagehand = new Stagehand({
      env: "BROWSERBASE",
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserbaseSessionID: sessionID,
      modelName: "gpt-4o",
      modelClientOptions: {
        apiKey: process.env.OPENAI_API_KEY,
      },
      verbose: 2,
      domSettleTimeoutMs: 30000,
    });
    try {
      await stagehand.init();
      if (!stagehand.page) throw new Error("Page object is not available after initialization");
      await stagehand.page.url();
      stagelandInstances.set(sessionID, stagehand);
    } catch (error) {
      try { await stagehand.close(); } catch {}
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
    try {
      if (!stagehand.page) {
        stagelandInstances.delete(sessionID);
        return getStagehandInstance(sessionID);
      }
      await stagehand.page.url();
    } catch {
      stagelandInstances.delete(sessionID);
      return getStagehandInstance(sessionID);
    }
  }
  return stagehand;
}

async function cleanupStagehandInstance(sessionID: string) {
  const stagehand = stagelandInstances.get(sessionID);
  if (stagehand) {
    try { await stagehand.close(); } catch {}
    stagelandInstances.delete(sessionID);
  }
}

async function runStagehand({ sessionID, method, instruction }: { sessionID: string; method: Step["tool"] | "SCREENSHOT"; instruction?: string; }) {
  try {
    let stagehand = await getStagehandInstance(sessionID);
    if (!stagehand.page) {
      stagelandInstances.delete(sessionID);
      stagehand = await getStagehandInstance(sessionID);
    }
    let page = stagehand.page;
    if (!page) throw new Error("Page object is not available after initialization");
    switch (method) {
      case "GOTO":
        try {
          await page.goto(instruction!, { timeout: 60000, waitUntil: 'domcontentloaded' });
        } catch (navigationError) {
          const errorMessage = navigationError instanceof Error ? navigationError.message : String(navigationError);
          if (errorMessage.includes('uninitialized') || errorMessage.includes('StagehandServerError') || errorMessage.includes('StagehandResponseParseError') || errorMessage.includes('context') || errorMessage.includes('CDP')) {
            stagelandInstances.delete(sessionID);
            stagehand = await getStagehandInstance(sessionID);
            page = stagehand.page;
            await page.goto(instruction!, { timeout: 60000, waitUntil: 'domcontentloaded' });
          } else {
            throw navigationError;
          }
        }
        break;
      case "ACT":
        await page.act(instruction!);
        break;
      case "EXTRACT": {
        const { extraction } = await page.extract(instruction!);
        return extraction;
      }
      case "OBSERVE": {
        const observation = await page.observe(instruction!);
        return observation;
      }
      case "CLOSE":
        await cleanupStagehandInstance(sessionID);
        break;
      case "SCREENSHOT": {
        const cdpSession = await page.context().newCDPSession(page);
        const { data } = await cdpSession.send("Page.captureScreenshot");
        return data;
      }
      case "WAIT":
        await new Promise((resolve) => setTimeout(resolve, Number(instruction)));
        break;
      case "NAVBACK":
        await page.goBack();
        break;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConnectionError = errorMessage.includes("Target closed") || errorMessage.includes("Connection closed") || errorMessage.includes("browser context is undefined") || errorMessage.includes("CDP connection") || errorMessage.includes("uninitialized") || errorMessage.includes("StagehandServerError") || errorMessage.includes("StagehandResponseParseError");
    if (isConnectionError) {
      await cleanupStagehandInstance(sessionID);
    }
    throw error;
  }
}

async function sendPrompt({ goal, sessionID, previousSteps = [], previousExtraction }: { goal: string; sessionID: string; previousSteps?: Step[]; previousExtraction?: string | ObserveResult[]; }) {
  let currentUrl = "";
  try {
    const stagehand = await getStagehandInstance(sessionID);
    currentUrl = await stagehand.page.url();
  } catch {}
  const content: UserContent = [
    {
      type: "text",
      text: `Consider the following screenshot of a web page${currentUrl ? ` (URL: ${currentUrl})` : ""}, with the goal being "${goal}".
${previousSteps.length > 0 ? `Previous steps taken:
${previousSteps.map((step, index) => `\nStep ${index + 1}:\n- Action: ${step.text}\n- Reasoning: ${step.reasoning}\n- Tool Used: ${step.tool}\n- Instruction: ${step.instruction}\n`).join("\n")}` : ""}
Determine the immediate next step to take to achieve the goal. \n\nImportant guidelines:\n1. Break down complex actions into individual atomic steps\n2. For ACT commands, use only one action at a time, such as:\n   - Single click on a specific element\n   - Type into a single input field\n   - Select a single option\n3. Avoid combining multiple actions in one instruction\n4. If multiple actions are needed, they should be separate steps\n\nIf the goal has been achieved, return "close".`,
    },
  ];
  if (previousSteps.length > 0 && previousSteps.some((step) => step.tool === "GOTO")) {
    content.push({
      type: "image",
      image: (await runStagehand({ sessionID, method: "SCREENSHOT" })) as string,
    });
  }
  if (previousExtraction) {
    content.push({
      type: "text",
      text: `The result of the previous ${Array.isArray(previousExtraction) ? "observation" : "extraction"} is: ${previousExtraction}.`,
    });
  }
  const message: CoreMessage = { role: "user", content };
  const result = await generateObject({
    model: LLMClient as LanguageModelV1,
    schema: z.object({
      text: z.string(),
      reasoning: z.string(),
      tool: z.enum(["GOTO", "ACT", "EXTRACT", "OBSERVE", "CLOSE", "WAIT", "NAVBACK"]),
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
        text: `Given the goal: "${goal}", determine the best URL to start from.\nChoose from:\n1. A relevant search engine (Google, Bing, etc.)\n2. A direct URL if you're confident about the target website\n3. Any other appropriate starting point\n\nReturn a URL that would be most effective for achieving this goal.`,
      },
    ],
  };
  const result = await generateObject({
    model: LLMClient as LanguageModelV1,
    schema: z.object({ url: z.string().url(), reasoning: z.string() }),
    messages: [message],
  });
  return result.object;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    res.status(200).json({ message: "Agent API endpoint ready" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "OPENAI_API_KEY environment variable is required" });
      return;
    }
    if (!process.env.BROWSERBASE_API_KEY) {
      res.status(500).json({ error: "BROWSERBASE_API_KEY environment variable is required" });
      return;
    }
    if (!process.env.BROWSERBASE_PROJECT_ID) {
      res.status(500).json({ error: "BROWSERBASE_PROJECT_ID environment variable is required" });
      return;
    }
    const body = req.body && typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { goal, sessionId, previousSteps = [], action, step } = body;
    if (!sessionId) {
      res.status(400).json({ error: "Missing sessionId in request body" });
      return;
    }
    switch (action) {
      case "START": {
        if (!goal) {
          res.status(400).json({ error: "Missing goal in request body" });
          return;
        }
        const { url, reasoning } = await selectStartingUrl(goal);
        const firstStep = { text: `Navigating to ${url}`, reasoning, tool: "GOTO" as const, instruction: url };
        await runStagehand({ sessionID: sessionId, method: "GOTO", instruction: url });
        res.status(200).json({ success: true, result: firstStep, steps: [firstStep], done: false });
        return;
      }
      case "GET_NEXT_STEP": {
        if (!goal) {
          res.status(400).json({ error: "Missing goal in request body" });
          return;
        }
        const { result, previousSteps: newPreviousSteps } = await sendPrompt({ goal, sessionID: sessionId, previousSteps });
        res.status(200).json({ success: true, result, steps: newPreviousSteps, done: result.tool === "CLOSE" });
        return;
      }
      case "EXECUTE_STEP": {
        if (!step) {
          res.status(400).json({ error: "Missing step in request body" });
          return;
        }
        const extraction = await runStagehand({ sessionID: sessionId, method: step.tool, instruction: step.instruction });
        res.status(200).json({ success: true, extraction, done: step.tool === "CLOSE" });
        return;
      }
      default:
        res.status(400).json({ error: "Invalid action type" });
        return;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errorMessage });
  }
}
