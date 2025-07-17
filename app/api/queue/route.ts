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

        const newJob = jobQueue.rerunJob(jobId);
        if (!newJob) {
          return NextResponse.json(
            { success: false, error: 'Job not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true, job: newJob });
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
