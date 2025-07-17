import { QueuedJob } from '../types/jobQueue';

// Re-export for backward compatibility
export type { QueuedJob };

class JobQueue {
  private jobs: QueuedJob[] = [];
  private isProcessing = false;
  private subscribers = new Set<(jobs: QueuedJob[]) => void>();

  addJob(formData: any): QueuedJob {
    const job: QueuedJob = {
      id: this.generateId(),
      formData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.jobs.push(job);
    this.notifySubscribers();
    
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
      createdAt: new Date().toISOString()
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
    
    this.isProcessing = true;

    while (true) {
      const nextJob = this.jobs.find(job => job.status === 'pending');
      if (!nextJob) break;

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
    
    this.updateJob(job.id, {
      status: 'running',
      startedAt: new Date().toISOString()
    });

    try {
      // Call the automation function directly instead of making HTTP requests
      const { startAutomation } = await import('./automation');
      const result = await startAutomation(job.formData);

      if (result.success) {
        this.updateJob(job.id, {
          status: 'completed',
          sessionUrl: result.sessionUrl,
          executionId: result.executionId,
          completedAt: new Date().toISOString()
        });
        console.log(`Job ${job.id} completed successfully`);
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

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance
export const jobQueue = new JobQueue();
