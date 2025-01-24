import { NextResponse } from 'next/server';
import Browserbase from "@browserbasehq/sdk";

async function createSession() {
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
    keepAlive: true,
  });
  return session;
}

async function getDebugUrl(sessionId: string) {
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY!,
  });
  const session = await bb.sessions.debug(sessionId);
  return session.debuggerFullscreenUrl;
}


export async function POST() {
  try {
    const session = await createSession();
    const liveUrl = await getDebugUrl(session.id);
    return NextResponse.json({ 
      success: true,
      sessionId: session.id,
      sessionUrl: liveUrl
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    );
  }
} 