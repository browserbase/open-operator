import { QueuedJob } from '../types/jobQueue';
import { User } from 'firebase/auth';
import { makeAuthenticatedRequest } from './apiClient';

const LOCAL_STORAGE_KEY = 'open-operator-job-queue';

class LocalJobQueue {
  private jobs: QueuedJob[] = [];
  private isProcessing = false;
  private subscribers = new Set<(jobs: QueuedJob[]) => void>();
  private executionToJobMap = new Map<string, string>(); // Maps executionId to jobId

  constructor() {
    this.loadFromStorage();
    
    // Set up automatic storage sync
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });
  }

  // Load jobs from localStorage
  private loadFromStorage() {
    try {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        this.jobs = parsedData.jobs || [];
        this.executionToJobMap = new Map(parsedData.executionToJobMap || []);
      }
    } catch (error) {
      console.error('Error loading job queue from storage:', error);
    }
  }

  // Save jobs to localStorage
  private saveToStorage() {
    try {
      const dataToStore = {
        jobs: this.jobs,
        executionToJobMap: Array.from(this.executionToJobMap.entries())
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Error saving job queue to storage:', error);
    }
  }

  // Get jobs for the current user
  getJobs(userId: string): QueuedJob[] {
    return this.jobs.filter(job => job.userId === userId);
  }

  // Get all jobs (for admin purposes)
  getAllJobs(): QueuedJob[] {
    return [...this.jobs];
  }

  // Get count of active jobs (pending + running) for a specific user
  getActiveJobsForUser(userId: string): number {
    return this.jobs.filter(job => 
      job.userId === userId && 
      (job.status === 'pending' || job.status === 'running')
    ).length;
  }

  // Add a new job to the queue
  async addJob(formData: any, userId: string, user: User | null = null): Promise<QueuedJob | null> {
    // Check if user already has 3 or more active jobs (pending + running)
    const activeJobs = this.getActiveJobsForUser(userId);
    if (activeJobs >= 3) {
      console.log(`User ${userId} already has ${activeJobs} active jobs. Cannot add more.`);
      return null;
    }

    // Create a local job
    const job: QueuedJob = {
      id: this.generateId(),
      formData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId
    };

    // Add to jobs list
    this.jobs.push(job);
    this.saveToStorage();
    this.notifySubscribers();

    // Try to start the job on the server
    try {
      const response = await makeAuthenticatedRequest('/api/automation', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          jobId: job.id // Include the job ID for tracking
        })
      }, user);

      const result = await response.json();
      
      if (result.success) {
        // Update job with session information
        this.updateJob(job.id, {
          sessionUrl: result.sessionUrl,
          sessionId: result.sessionId,
          executionId: result.executionId
        });
        
        // Store the mapping between executionId and jobId for completion tracking
        if (result.executionId) {
          this.executionToJobMap.set(result.executionId, job.id);
          this.saveToStorage();
        }
      } else {
        // Mark as failed if automation couldn't start
        this.updateJob(job.id, {
          status: 'failed',
          error: result.error || result.details || 'Failed to start automation',
          completedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      // Mark as failed if server request failed
      this.updateJob(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to start automation',
        completedAt: new Date().toISOString()
      });
    }

    return job;
  }

  // Update an existing job
  updateJob(id: string, updates: Partial<QueuedJob>) {
    const jobIndex = this.jobs.findIndex(job => job.id === id);
    if (jobIndex !== -1) {
      this.jobs[jobIndex] = { ...this.jobs[jobIndex], ...updates };
      this.saveToStorage();
      this.notifySubscribers();
    }
  }

  // Get a specific job by ID
  getJob(id: string): QueuedJob | undefined {
    return this.jobs.find(job => job.id === id);
  }

  // Remove a job by ID
  removeJob(id: string) {
    const jobToRemove = this.jobs.find(job => job.id === id);
    this.jobs = this.jobs.filter(job => job.id !== id);
    this.saveToStorage();
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
    this.saveToStorage();
    this.notifySubscribers();
  }

  // Rerun a previously completed or failed job
  async rerunJob(jobId: string, user: User | null = null): Promise<QueuedJob | null> {
    const existingJob = this.jobs.find(job => job.id === jobId);
    if (!existingJob) return null;

    // Check if user already has 3 or more active jobs (pending + running)
    const userId = existingJob.userId || 'anonymous';
    const activeJobs = this.getActiveJobsForUser(userId);
    if (activeJobs >= 3) {
      console.log(`User ${userId} already has ${activeJobs} active jobs. Cannot rerun job.`);
      return null;
    }

    // Create a new job with the same form data and userId
    const newJob: QueuedJob = {
      id: this.generateId(),
      formData: existingJob.formData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId: existingJob.userId
    };

    this.jobs.push(newJob);
    this.saveToStorage();
    this.notifySubscribers();

    // Try to start the job on the server
    try {
      const response = await makeAuthenticatedRequest('/api/automation', {
        method: 'POST',
        body: JSON.stringify({
          ...newJob.formData,
          jobId: newJob.id // Include the job ID for tracking
        })
      }, user);

      const result = await response.json();
      
      if (result.success) {
        // Update job with session information
        this.updateJob(newJob.id, {
          sessionUrl: result.sessionUrl,
          sessionId: result.sessionId,
          executionId: result.executionId
        });
        
        // Store the mapping between executionId and jobId for completion tracking
        if (result.executionId) {
          this.executionToJobMap.set(result.executionId, newJob.id);
          this.saveToStorage();
        }
      } else {
        // Mark as failed if automation couldn't start
        this.updateJob(newJob.id, {
          status: 'failed',
          error: result.error || result.details || 'Failed to start automation',
          completedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      // Mark as failed if server request failed
      this.updateJob(newJob.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to start automation',
        completedAt: new Date().toISOString()
      });
    }

    return newJob;
  }

  // Mark a job as completed (called when automation finishes)
  markJobCompleted(executionId: string) {
    const jobId = this.executionToJobMap.get(executionId);
    if (jobId) {
      this.updateJob(jobId, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      this.executionToJobMap.delete(executionId);
      this.saveToStorage();
    }
  }

  // Mark a job as failed (called when automation fails)
  markJobFailed(executionId: string, error: string) {
    const jobId = this.executionToJobMap.get(executionId);
    if (jobId) {
      this.updateJob(jobId, {
        status: 'failed',
        error: error,
        completedAt: new Date().toISOString()
      });
      this.executionToJobMap.delete(executionId);
      this.saveToStorage();
    }
  }

  // Subscribe to queue changes
  subscribe(callback: (jobs: QueuedJob[]) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify subscribers of queue changes
  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.jobs));
  }

  // Generate a unique ID for jobs
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Create a singleton instance
export const localJobQueue = typeof window !== 'undefined' ? new LocalJobQueue() : null;

// Helper function to get the local job queue (safe for SSR)
export function getLocalJobQueue(): LocalJobQueue | null {
  return localJobQueue;
}
