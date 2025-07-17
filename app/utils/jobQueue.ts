import { QueuedJob } from '../types/jobQueue';

// Re-export for backward compatibility
export type { QueuedJob };

class JobQueue {
  private jobs: QueuedJob[] = [];
  private isProcessing = false;
  private subscribers = new Set<(jobs: QueuedJob[]) => void>();
  private executionToJobMap = new Map<string, string>(); // Maps executionId to jobId
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  addJob(formData: any): QueuedJob {
    const job: QueuedJob = {
      id: this.generateId(),
      formData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId: this.userId
    };

    this.jobs.push(job);
    this.notifySubscribers();
    
    console.log(`Added job ${job.id} to queue for user ${this.userId}. Current queue status:`, {
      total: this.jobs.length,
      pending: this.jobs.filter(j => j.status === 'pending').length,
      running: this.jobs.filter(j => j.status === 'running').length,
      completed: this.jobs.filter(j => j.status === 'completed').length,
      failed: this.jobs.filter(j => j.status === 'failed').length
    });
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return job;
  }

  getJobs(): QueuedJob[] {
    return [...this.jobs];
  }

  getJob(id: string): QueuedJob | undefined {
    return this.jobs.find(job => job.id === id);
  }

  updateJob(id: string, updates: Partial<QueuedJob>) {
    const jobIndex = this.jobs.findIndex(job => job.id === id);
    if (jobIndex !== -1) {
      this.jobs[jobIndex] = { ...this.jobs[jobIndex], ...updates };
      this.notifySubscribers();
    }
  }

  removeCompletedJobs() {
    this.jobs = this.jobs.filter(job => job.status !== 'completed' && job.status !== 'failed');
    this.notifySubscribers();
  }

  removeJob(id: string) {
    this.jobs = this.jobs.filter(job => job.id !== id);
    this.notifySubscribers();
  }

  rerunJob(id: string): QueuedJob | null {
    const existingJob = this.jobs.find(job => job.id === id);
    if (!existingJob) return null;

    // Create a new job with the same form data
    const newJob: QueuedJob = {
      id: this.generateId(),
      formData: existingJob.formData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId: this.userId
    };

    this.jobs.push(newJob);
    this.notifySubscribers();
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return newJob;
  }

  getCurrentlyRunningJob(): QueuedJob | null {
    return this.jobs.find(job => job.status === 'running') || null;
  }

  isQueueActive(): boolean {
    return this.isProcessing || this.jobs.some(job => job.status === 'running' || job.status === 'pending');
  }

  subscribe(callback: (jobs: QueuedJob[]) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.getJobs()));
  }

  private async processQueue() {
    if (this.isProcessing) return;
    
    // Check if there's already a running job
    const runningJob = this.jobs.find(job => job.status === 'running');
    if (runningJob) {
      console.log(`Job ${runningJob.id} is already running, not processing queue`);
      return;
    }
    
    this.isProcessing = true;

    // Only process one job at a time
    const nextJob = this.jobs.find(job => job.status === 'pending');
    if (nextJob) {
      try {
        await this.processJob(nextJob);
      } catch (error) {
        console.error('Error processing job:', error);
        this.updateJob(nextJob.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date().toISOString()
        });
      }
    }

    this.isProcessing = false;
  }

  private async processJob(job: QueuedJob) {
    console.log(`Starting job ${job.id}`);
    
    // Double-check that no other job is running
    const runningJobs = this.jobs.filter(j => j.status === 'running');
    if (runningJobs.length > 0) {
      console.log(`Cannot start job ${job.id} - other jobs are already running:`, runningJobs.map(j => j.id));
      return;
    }
    
    this.updateJob(job.id, {
      status: 'running',
      startedAt: new Date().toISOString()
    });

    try {
      // Call the automation function directly instead of making HTTP requests
      const { startAutomation } = await import('./automation');
      const result = await startAutomation(job.formData, undefined, job.userId);

      if (result.success) {
        // Update job with session information immediately
        this.updateJob(job.id, {
          sessionUrl: result.sessionUrl,
          executionId: result.executionId
        });
        
        console.log(`Job ${job.id} started successfully with session:`, result.sessionUrl);
        
        // Store the mapping between executionId and jobId for completion tracking
        this.executionToJobMap.set(result.executionId!, job.id);
        
      } else {
        throw new Error(result.error || result.details || 'Automation failed');
      }
    } catch (error) {
      this.updateJob(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date().toISOString()
      });
      console.error(`Job ${job.id} failed:`, error);
    }
  }

  // Method to be called when automation completes
  public markJobCompleted(executionId: string) {
    const jobId = this.executionToJobMap.get(executionId);
    if (jobId) {
      this.updateJob(jobId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      this.executionToJobMap.delete(executionId);
      console.log(`Job ${jobId} marked as completed for execution ${executionId}`);
      
      // Process the next job in the queue
      this.processQueue();
    }
  }

  // Method to be called when automation fails
  public markJobFailed(executionId: string, error: string) {
    const jobId = this.executionToJobMap.get(executionId);
    if (jobId) {
      this.updateJob(jobId, {
        status: 'failed',
        error: error,
        completedAt: new Date().toISOString()
      });
      this.executionToJobMap.delete(executionId);
      console.log(`Job ${jobId} marked as failed for execution ${executionId}`);
      
      // Process the next job in the queue
      this.processQueue();
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// User-specific job queue manager
class JobQueueManager {
  private static instance: JobQueueManager;
  private userQueues = new Map<string, JobQueue>();

  static getInstance(): JobQueueManager {
    if (!JobQueueManager.instance) {
      JobQueueManager.instance = new JobQueueManager();
    }
    return JobQueueManager.instance;
  }

  getOrCreateQueue(userId: string): JobQueue {
    if (!this.userQueues.has(userId)) {
      this.userQueues.set(userId, new JobQueue(userId));
    }
    return this.userQueues.get(userId)!;
  }

  getUserQueue(userId: string): JobQueue | undefined {
    return this.userQueues.get(userId);
  }

  removeUserQueue(userId: string): void {
    this.userQueues.delete(userId);
  }
}

// Export the manager instance
export const jobQueueManager = JobQueueManager.getInstance();

// Legacy compatibility - default to anonymous user for backwards compatibility
export const jobQueue = jobQueueManager.getOrCreateQueue('anonymous');
