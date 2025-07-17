import { NextRequest } from "next/server";
import { adminDb } from "../../../firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { getUserIdFromRequest, getUserInfoFromRequest } from "../../../utils/auth";

export const runtime = "nodejs";

// TODO: Implement Firebase Authentication
// The current Firebase Firestore rules require authentication for write operations.
// To enable Firebase writes, you need to:
// 1. Set up Firebase Authentication in your app
// 2. Authenticate users before making Firestore writes
// 3. Or update Firestore rules to allow writes for specific conditions
// For now, Firebase writes will fail gracefully and data will be logged locally.

// Interface for mileage data
interface MileageData {
  dateOfService: string;
  startTime: string;
  endTime: string;
  endMileage: string;
  capturedAt: string;
}

// Store active event streams by user and execution
const eventStreams = new Map<string, ReadableStreamDefaultController>();

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
    start(controller) {
      console.log(`SSE stream started for user: ${userId}, execution: ${executionId}`);
      
      // Store the controller so we can send events to it
      eventStreams.set(streamKey, controller);
      
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

// Function to save mileage data to Firebase
async function saveMileageToFirebase(executionId: string, mileageData: MileageData, userId?: string) {
  try {
    // Note: This requires Firebase Authentication to be set up
    // Since we don't have auth implemented yet, we'll gracefully handle the error
    console.log('Attempting to save mileage data to Firebase...');
    
    // If no userId provided, we'll store it with executionId for now
    // In a real app, you'd want to get the userId from the session/auth
    const docId = userId || executionId;
    
    const mileageDocRef = adminDb.collection('users').doc(docId).collection('mileageHistory').doc(executionId);
    await mileageDocRef.set({
      ...mileageData,
      executionId,
      savedAt: FieldValue.serverTimestamp(),
      lastProcessedMileage: mileageData.endMileage
    });
    
    // Also update the user's lastProcessedMileage in their profile
    const userDocRef = adminDb.collection('users').doc(docId);
    await userDocRef.set({
      lastProcessedMileage: mileageData.endMileage,
      lastMileageUpdate: FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('Mileage data saved to Firebase successfully');
  } catch (error) {
    console.log('Firebase write failed (this is expected without authentication):', error instanceof Error ? error.message : error);
    
    // Store mileage data locally in memory for this session as a fallback
    console.log('Storing mileage data in memory as fallback:', {
      executionId,
      ...mileageData,
      savedAt: new Date().toISOString()
    });
    
    // You could also store this in a local database, file, or other storage mechanism
    // For now, we'll just log it and continue execution
  }
}

// Function to send events to a specific execution
export function sendEventToExecution(executionId: string, event: string, data: unknown, userId?: string) {
  console.log(`sendEventToExecution called - ExecutionId: ${executionId}, Event: ${event}, UserId: ${userId}, Data:`, data);
  console.log(`Available streams:`, Array.from(eventStreams.keys()));
  
  // Handle mileage data specially
  if (event === 'miles' && typeof data === 'object' && data !== null) {
    // Type guard to check if data has the required MileageData properties
    if ('dateOfService' in data && 'startTime' in data && 'endTime' in data && 'endMileage' in data && 'capturedAt' in data) {
      saveMileageToFirebase(executionId, data as MileageData);
    }
  }
  
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
  
  // ONLY send to user-specific stream - no fallbacks to prevent cross-user contamination
  if (userId) {
    const userStreamKey = createStreamKey(userId, executionId);
    const userStream = eventStreams.get(userStreamKey);
    if (userStream) {
      console.log(`Found user-specific stream for key: ${userStreamKey}`);
      sendEventToStream(userStream, event, data);
      return;
    } else {
      console.log(`No user-specific stream found for user: ${userId}, execution: ${executionId} (key: ${userStreamKey})`);
    }
  } else {
    console.warn(`No userId provided for execution: ${executionId} - cannot send event to ensure user isolation`);
  }
  
  console.log(`Event not delivered for executionId: ${executionId}`);
}
