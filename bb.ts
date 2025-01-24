import Browserbase from "@browserbasehq/sdk";

export async function createSession() {
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY!,
  });
  const browserSettings: any = {};
  if (process.env.BROWSERBASE_CONTEXT_ID) {
    browserSettings.context = {
      id: process.env.BROWSERBASE_CONTEXT_ID,
    };
  }
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings,
  });
  return session;
}
