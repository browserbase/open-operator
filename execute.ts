import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";

export async function runStagehand({
  sessionID,
  method,
  instruction,
}: {
  sessionID: string;
  method: "GOTO" | "ACT" | "EXTRACT" | "CLOSE" | "SCREENSHOT" | "OBSERVE";
  instruction?: string;
}) {
  const stagehand = new Stagehand({
    ...StagehandConfig,
    browserbaseSessionID: sessionID,
  });
  await stagehand.init();

  const page = stagehand.page;
  const context = stagehand.context;

  if (method === "GOTO") {
    await page.goto(instruction!, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }
  if (method === "ACT") {
    await page.act(instruction!);
  }
  if (method === "EXTRACT") {
    const { extraction } = await page.extract(instruction!);
    return extraction;
  }
  if (method === "OBSERVE") {
    return await page.observe({
      instruction,
      useAccessibilityTree: true,
    });
  }
  if (method === "CLOSE") {
    await stagehand.close();
  }

  if (method === "SCREENSHOT") {
    const cdpSession = await page.context().newCDPSession(page);
    const { data } = await cdpSession.send("Page.captureScreenshot");
    return data;
  }
}
