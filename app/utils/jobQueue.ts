import { QueuedJob } from '../types/jobQueue';

// Re-export for backward compatibility
export type { QueuedJob };

class JobQueue {
  private jobs: QueuedJob[] = [];
  private isProcessing = false;
  private subscribers = new Set<(jobs: QueuedJob[]) => void>();
  private executionToJobMap = new Map<string, string>(); // Maps executionId to jobId
  private userQueues = new Map<string, QueuedJob[]>(); // User-specific job queues

  addJob(formData: any, userId: string = 'anonymous'): QueuedJob {
    const job: QueuedJob = {
      id: this.generateId(),
      formData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId // Add userId to job
    };

    // Add to global jobs list (for backward compatibility)
    this.jobs.push(job);
    
    // Add to user-specific queue
    if (!this.userQueues.has(userId)) {
      this.userQueues.set(userId, []);
    }
    this.userQueues.get(userId)!.push(job);
    
    this.notifySubscribers();
    
    console.log(`Added job ${job.id} to queue for user ${userId}. Current queue status:`, {
      total: this.jobs.length,
      userJobs: this.userQueues.get(userId)?.length || 0,
      pending: this.jobs.filter(j => j.status === 'pending' && j.userId === userId).length,
      running: this.jobs.filter(j => j.status === 'running' && j.userId === userId).length,
      completed: this.jobs.filter(j => j.status === 'completed' && j.userId === userId).length,
      failed: this.jobs.filter(j => j.status === 'failed' && j.userId === userId).length
    });
    
    // Start processing if not already running for this user
    if (!this.isProcessing) {
      this.processQueue();
    }

    return job;
  }

  getJobs(): QueuedJob[] {
    return [...this.jobs];
  }

  // Get jobs for a specific user
  getJobsForUser(userId: string): QueuedJob[] {
    return this.jobs.filter(job => job.userId === userId);
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

  // Remove completed jobs for a specific user
  removeCompletedJobsForUser(userId: string) {
    this.jobs = this.jobs.filter(job => {
      if (job.userId === userId) {
        return job.status !== 'completed' && job.status !== 'failed';
      }
      return true; // Keep jobs from other users
    });
    
    // Update user-specific queue
    if (this.userQueues.has(userId)) {
      this.userQueues.set(userId, 
        this.userQueues.get(userId)!.filter(job => 
          job.status !== 'completed' && job.status !== 'failed'
        )
      );
    }
    
    this.notifySubscribers();
  }

  removeJob(id: string) {
    const jobToRemove = this.jobs.find(job => job.id === id);
    this.jobs = this.jobs.filter(job => job.id !== id);
    
    // Remove from user-specific queue if applicable
    if (jobToRemove?.userId && this.userQueues.has(jobToRemove.userId)) {
      this.userQueues.set(jobToRemove.userId,
        this.userQueues.get(jobToRemove.userId)!.filter(job => job.id !== id)
      );
    }
    
    this.notifySubscribers();
  }

  rerunJob(id: string): QueuedJob | null {
    const existingJob = this.jobs.find(job => job.id === id);
    if (!existingJob) return null;

    // Create a new job with the same form data and userId
    const newJob: QueuedJob = {
      id: this.generateId(),
      formData: existingJob.formData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId: existingJob.userId // Preserve the original user ID
    };

    this.jobs.push(newJob);
    
    // Add to user-specific queue if userId exists
    if (existingJob.userId && this.userQueues.has(existingJob.userId)) {
      this.userQueues.get(existingJob.userId)!.push(newJob);
    }
    
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

  // Get currently running job for a specific user
  getCurrentlyRunningJobForUser(userId: string): QueuedJob | null {
    return this.jobs.find(job => job.status === 'running' && job.userId === userId) || null;
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
      const result = await startAutomation(job.formData);

      if (result.success) {
        // Update job with session information immediately
        this.updateJob(job.id, {
          sessionUrl: result.sessionUrl,
          sessionId: result.sessionId, // Store the actual session ID
          executionId: result.executionId
        });
        
        console.log(`Job ${job.id} started successfully with session:`, {
          sessionId: result.sessionId,
          sessionUrl: result.sessionUrl
        });
        
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

// Singleton instance
export const jobQueue = new JobQueue();
