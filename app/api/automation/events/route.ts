import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "../../../utils/auth";

export const runtime = "nodejs";

// Store active event streams with user context
const eventStreams = new Map<string, { controller: ReadableStreamDefaultController; userId?: string }>();

// Helper function to create stream key
function createStreamKey(userId: string, executionId: string): string {
  return `${userId}:${executionId}`;
}

// Helper function to send event to a specific stream
function sendEventToStream(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  try {
    const eventData = `data: ${JSON.stringify({
      type: event,
      message: typeof data === 'string' ? data : JSON.stringify(data),
      data: data
    })}\n\n`;
    console.log(`Sending event data:`, eventData);
    controller.enqueue(new TextEncoder().encode(eventData));
    console.log(`Successfully sent event '${event}'`);
  } catch (error) {
    console.error(`Failed to send event:`, error);
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const executionId = url.searchParams.get('executionId');
  const token = url.searchParams.get('token');
  
  if (!executionId) {
    return new Response('Missing executionId parameter', { status: 400 });
  }

  // Get user ID from token or default to anonymous
  let userId = 'anonymous';
  let userInfo: { uid: string; email: string | null; userId: string } = { uid: 'anonymous', email: null, userId: 'anonymous' };
  
  if (token) {
    try {
      // Create a mock request with the token for getUserIdFromRequest
      const mockRequest = new Request('http://localhost', {
        headers: { 'Authorization': `Bearer ${decodeURIComponent(token)}` }
      });
      
      // Get full user info for debugging
      userInfo = await getUserInfoFromRequest(mockRequest as NextRequest);
      userId = userInfo.userId;
      
      console.log('SSE Auth Debug:', {
        tokenProvided: !!token,
        tokenLength: token.length,
        userInfo: userInfo,
        finalUserId: userId
      });
      
    } catch (error) {
      console.error('Failed to verify token for SSE:', error);
      // Continue with anonymous user
    }
  } else {
    console.log('No token provided for SSE connection');
  }

  const streamKey = createStreamKey(userId, executionId);
  console.log(`Creating SSE connection for user: ${userId} (email: ${userInfo.email}), execution: ${executionId}, key: ${streamKey}`);

  const stream = new ReadableStream({
    async start(controller) {
      console.log(`SSE stream started for execution: ${executionId}`);
      
      // Get user ID from request for authentication context
      const userId = await getUserIdFromRequest(request);
      console.log(`User ID for execution ${executionId}: ${userId}`);
      
      // Store the controller with user context so we can send events to it
      eventStreams.set(executionId, { controller, userId });
      
      // Send initial connection event
      const data = `data: ${JSON.stringify({
        type: 'connected',
        message: 'Connected to automation events'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    },
    cancel() {
      console.log(`SSE stream cancelled for user: ${userId}, execution: ${executionId}`);
      eventStreams.delete(streamKey);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Function to send events to a specific execution
export function sendEventToExecution(executionId: string, event: string, data: unknown, userId?: string) {
  console.log(`sendEventToExecution called - ExecutionId: ${executionId}, Event: ${event}, UserId: ${userId}, Data:`, data);
  console.log(`Available streams:`, Array.from(eventStreams.keys()));
  
  // Get the stream context (controller + userId)
  const streamContext = eventStreams.get(executionId);
  
  // Handle job completion events
  if (event === 'finished') {
    // Import and notify job queue that automation completed
    import('../../../utils/jobQueue').then((module) => {
      if (userId && module.jobQueueManager) {
        const userQueue = module.jobQueueManager.getUserQueue(userId);
        if (userQueue) {
          userQueue.markJobCompleted(executionId);
        }
      }
    }).catch(console.error);
  } else if (event === 'error') {
    // Import and notify job queue that automation failed
    import('../../../utils/jobQueue').then((module) => {
      if (userId && module.jobQueueManager) {
        const userQueue = module.jobQueueManager.getUserQueue(userId);
        if (userQueue) {
          userQueue.markJobFailed(executionId, typeof data === 'string' ? data : JSON.stringify(data));
        }
      }
    }).catch(console.error);
  }
  
  const controller = streamContext?.controller;
  if (controller) {
    try {
      const eventData = `data: ${JSON.stringify({
        type: event,
        message: typeof data === 'string' ? data : JSON.stringify(data),
        data: data
      })}\n\n`;
      console.log(`Sending event data:`, eventData);
      controller.enqueue(new TextEncoder().encode(eventData));
      console.log(`Successfully sent event '${event}' to execution ${executionId}`);
    } catch (error) {
      console.error(`Failed to send event to execution ${executionId}:`, error);
      eventStreams.delete(executionId);
    }
  } else {
    console.warn(`No userId provided for execution: ${executionId} - cannot send event to ensure user isolation`);
  }
  
  console.log(`Event not delivered for executionId: ${executionId}`);
}
