import { getLocalJobQueue } from './localJobQueue';

interface SSEEvent extends Event {
  data: string;
}

export function setupJobEventListener(executionId: string) {
  if (typeof window === 'undefined') return null;
  
  // Create an EventSource for this specific execution
  const eventSource = new EventSource(`/api/automation/events?executionId=${executionId}`);
  
  // Set up event listeners
  eventSource.addEventListener('progress', (event: SSEEvent) => {
    console.log(`Progress event for execution ${executionId}:`, event.data);
    // No need to update job status for progress events
  });
  
  eventSource.addEventListener('error', (event: SSEEvent) => {
    console.error(`Error event for execution ${executionId}:`, event.data);
    
    // Update job status in local queue
    const localQueue = getLocalJobQueue();
    if (localQueue) {
      localQueue.markJobFailed(executionId, event.data);
    }
    
    // Close the event source
    eventSource.close();
  });
  
  eventSource.addEventListener('completed', (event: SSEEvent) => {
    console.log(`Completion event for execution ${executionId}:`, event.data);
    
    // Update job status in local queue
    const localQueue = getLocalJobQueue();
    if (localQueue) {
      localQueue.markJobCompleted(executionId);
    }
    
    // Close the event source
    eventSource.close();
  });
  
  // Return a function to close the event source
  return () => {
    eventSource.close();
  };
}
