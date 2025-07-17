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
Transform the following text into a professional case note with proper formatting and structure. 

Original text: "${text}"

Requirements:
- Use "Provider" instead of "I" (third person perspective)
- Use "client" if no specific client name is mentioned
- Do not add information not present in the original text
- Each section must be separated by a blank line
- Use the exact formatting structure shown below
- Maintain professional tone throughout

IMPORTANT: Format exactly as shown with section headers and content, ensuring proper line breaks:

**Observations of the Session:**
-- Detailed observations about what occurred during the session

**Behavioral Observations:**
-- **Behavior 1:** Specific behavioral observation with clear details
-- **Behavior 2:** Additional behavioral observation if applicable

**Support and Intervention:**
-- **Strategy 1:** Specific Provider intervention or support provided
-- **Strategy 2:** Additional strategy implemented if applicable

**Goals for Future Sessions:**
-- **Goal 1:** Specific goal for upcoming sessions
-- **Goal 2:** Additional goal if applicable

**Summary:**
-- Comprehensive summary of the entire session and outcomes

CRITICAL: Each major section (starting with **) should have blank lines before and after it. Use line breaks to separate different points within sections.
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
