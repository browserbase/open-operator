import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  const { streamId } = params;

  // Get the prompt from the global store
  const prompt = globalThis.streamPrompts?.get(streamId);
  
  if (!prompt) {
    return new Response('Stream not found', { status: 404 });
  }

  // Clean up the prompt from memory
  globalThis.streamPrompts?.delete(streamId);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          stream: true,
          max_tokens: 1500,
          temperature: 0.01,
          top_p: 0.9,
        });

        let fullResponse = '';

        for await (const chunk of aiStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            controller.enqueue(encoder.encode(`data: ${content}\n\n`));
          }
        }

        // Log the complete response
        console.log("AI Response:\n", fullResponse);
        
        // Send end event
        controller.enqueue(encoder.encode('event: end\n\n'));
        controller.close();
        
      } catch (error) {
        console.error('Streaming error:', error);
        controller.enqueue(encoder.encode('data: Error occurred during streaming.\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
