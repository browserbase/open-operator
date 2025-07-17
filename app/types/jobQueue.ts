// Type definitions for job queue - safe for client-side imports
export interface QueuedJob {
  id: string;
  formData: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  sessionUrl?: string;
  sessionId?: string; // Add sessionId to track the actual Browserbase session ID
  executionId?: string;
  userId?: string; // Add userId to track job ownership
}
