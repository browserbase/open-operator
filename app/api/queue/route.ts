import { NextRequest, NextResponse } from "next/server";
import { jobQueue, QueuedJob } from "../../utils/jobQueue";

export async function GET() {
  try {
    const jobs = jobQueue.getJobs();
    return NextResponse.json({ success: true, jobs });
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

    switch (action) {
      case 'add': {
        const { formData } = body;
        if (!formData) {
          return NextResponse.json(
            { success: false, error: 'Missing formData' },
            { status: 400 }
          );
        }

        const job = jobQueue.addJob(formData);
        return NextResponse.json({ success: true, job });
      }

      case 'remove': {
        if (!jobId) {
          return NextResponse.json(
            { success: false, error: 'Missing jobId' },
            { status: 400 }
          );
        }

        // For now, we'll just mark as failed to stop processing
        // In a real implementation, you might want to actually cancel the job
        jobQueue.updateJob(jobId, { status: 'failed', error: 'Cancelled by user' });
        return NextResponse.json({ success: true });
      }

      case 'clear-completed': {
        jobQueue.removeCompletedJobs();
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
