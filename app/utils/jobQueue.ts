export interface QueuedJob {
  id: string;
  formData: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  sessionUrl?: string;
  executionId?: string;
}

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
      // Call the automation API exactly like the original form submission
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/automation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(job.formData),
      });

      const result = await response.json();

      if (result.success) {
        this.updateJob(job.id, {
          status: 'completed',
          sessionUrl: result.sessionUrl,
          executionId: result.executionId,
          completedAt: new Date().toISOString()
        });
        console.log(`Job ${job.id} completed successfully`);
      } else {
        throw new Error(result.error || 'Automation failed');
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
