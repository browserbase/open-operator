import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const goal = searchParams.get('goal');

  const response = new NextResponse(
    new ReadableStream({
      start(controller) {
        fetch("http://localhost:3001/agent/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal })
        })
        .then(res => res.json())
        .then(data => {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
          controller.close();
        })
        .catch(error => {
          controller.error(error);
        });
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );

  return response;
} 