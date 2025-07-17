import { NextRequest, NextResponse } from 'next/server';

// Extend global type
declare global {
  var streamPrompts: Map<string, string> | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const prompt = `
input: "${text}"
Instructions: Do not use the word I instead use the word Provider and speak in third person.
If no client name is found use "client"
Do not add any information to the response that was not included in the user input.
Format the response as a detailed service note including all "-" and "**" formatting:

**Observations of the Session:**
-- [Details of the session] 

-- **Behavioral Observations:**
-- **Behavior 1:** [Details]
-- **Behavior 2:** [Details]

-- **Support and Intervention:**
-- **Strategy 1:** [Provider's verbal intervention details]
-- **Strategy 2:** [Provider's verbal intervention details]

-- **Goals for Future Sessions:**
-- **Goal 1:** [Details on coping skills or behavior strategies]
-- **Goal 2:** [Details on coping skills or behavior strategies]

-- **Summary:**
-- [Summary of the session]
`;

    // Log the prompt to the console
    console.log("Generated Prompt:\n", prompt);

    // Generate a unique stream endpoint
    const streamId = Date.now().toString();
    const sseEndpoint = `/api/stream/${streamId}`;
    
    // Store the prompt for the stream endpoint
    globalThis.streamPrompts = globalThis.streamPrompts || new Map();
    globalThis.streamPrompts.set(streamId, prompt);

    return NextResponse.json({ streamUrl: sseEndpoint });
  } catch (error) {
    console.error('Error in generateNote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
