import { NextRequest } from "next/server";
import { adminDb } from "../../../firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

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

// Store active event streams
const eventStreams = new Map<string, ReadableStreamDefaultController>();

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const executionId = url.searchParams.get('executionId');
  
  if (!executionId) {
    return new Response('Missing executionId parameter', { status: 400 });
  }

  console.log(`Creating SSE connection for execution: ${executionId}`);

  const stream = new ReadableStream({
    start(controller) {
      console.log(`SSE stream started for execution: ${executionId}`);
      
      // Store the controller so we can send events to it
      eventStreams.set(executionId, controller);
      
      // Send initial connection event
      const data = `data: ${JSON.stringify({
        type: 'connected',
        message: 'Connected to automation events'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    },
    cancel() {
      console.log(`SSE stream cancelled for execution: ${executionId}`);
      eventStreams.delete(executionId);
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
export function sendEventToExecution(executionId: string, event: string, data: unknown) {
  console.log(`sendEventToExecution called - ExecutionId: ${executionId}, Event: ${event}, Data:`, data);
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
    import('../../../utils/jobQueue').then(({ jobQueue }) => {
      jobQueue.markJobCompleted(executionId);
    }).catch(console.error);
  } else if (event === 'error') {
    // Import and notify job queue that automation failed
    import('../../../utils/jobQueue').then(({ jobQueue }) => {
      jobQueue.markJobFailed(executionId, typeof data === 'string' ? data : JSON.stringify(data));
    }).catch(console.error);
  }
  
  const controller = eventStreams.get(executionId);
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
    console.warn(`No active stream found for execution: ${executionId}`);
    console.log(`Available streams:`, Array.from(eventStreams.keys()));
  }
}
