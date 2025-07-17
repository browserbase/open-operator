import { NextRequest, NextResponse } from "next/server";
import { jobQueue, QueuedJob } from "../../utils/jobQueue";
import { getUserIdFromRequest } from "../../utils/auth";

export async function GET(request: NextRequest) {
  try {
    // Get user ID for user-specific job filtering
    const userId = await getUserIdFromRequest(request);
    const jobs = jobQueue.getJobsForUser(userId);
    return NextResponse.json({ success: true, jobs, userId });
  } catch (error) {
    console.error('Error getting queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get queue' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobId } = body;
    
    // Get user ID for user-specific operations
    const userId = await getUserIdFromRequest(request);

    switch (action) {
      case 'add': {
        const { formData } = body;
        if (!formData) {
          return NextResponse.json(
            { success: false, error: 'Missing formData' },
            { status: 400 }
          );
        }

        const job = jobQueue.addJob(formData, userId);
        return NextResponse.json({ success: true, job });
      }

      case 'remove': {
        if (!jobId) {
          return NextResponse.json(
            { success: false, error: 'Missing jobId' },
            { status: 400 }
          );
        }

        // Verify user owns the job before removing
        const job = jobQueue.getJob(jobId);
        if (!job) {
          return NextResponse.json(
            { success: false, error: 'Job not found' },
            { status: 404 }
          );
        }
        
        if (job.userId !== userId) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized - cannot remove job owned by another user' },
            { status: 403 }
          );
        }

        jobQueue.removeJob(jobId);
        return NextResponse.json({ success: true });
      }

      case 'rerun': {
        if (!jobId) {
          return NextResponse.json(
            { success: false, error: 'Missing jobId' },
            { status: 400 }
          );
        }

        // Verify user owns the job before rerunning
        const existingJob = jobQueue.getJob(jobId);
        if (!existingJob) {
          return NextResponse.json(
            { success: false, error: 'Job not found' },
            { status: 404 }
          );
        }
        
        if (existingJob.userId !== userId) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized - cannot rerun job owned by another user' },
            { status: 403 }
          );
        }

        const newJob = jobQueue.rerunJob(jobId);
        if (!newJob) {
          return NextResponse.json(
            { success: false, error: 'Failed to rerun job' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, job: newJob });
      }

      case 'clear-completed': {
        jobQueue.removeCompletedJobsForUser(userId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error managing queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage queue' },
      { status: 500 }
    );
  }
}
