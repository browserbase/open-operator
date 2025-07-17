import { useState, useEffect } from 'react';
import { QueuedJob } from '../types/jobQueue';

interface QueueManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onRerunJob?: (formData: any) => void;
}

export default function QueueManager({ isVisible, onClose, onRerunJob }: QueueManagerProps) {
  const [jobs, setJobs] = useState<QueuedJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchJobs();
      // Set up polling to update job status
      const interval = setInterval(fetchJobs, 2000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/queue');
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const clearCompleted = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-completed' })
      });
      
      if (response.ok) {
        await fetchJobs();
      }
    } catch (error) {
      console.error('Error clearing completed jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeJob = async (jobId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', jobId })
      });
      
      if (response.ok) {
        await fetchJobs();
      }
    } catch (error) {
      console.error('Error removing job:', error);
    } finally {
      setLoading(false);
    }
  };

  const rerunJob = async (jobId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rerun', jobId })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          await fetchJobs();
          // Optionally call the callback to update form
          if (onRerunJob && result.job) {
            onRerunJob(result.job.formData);
          }
        }
      }
    } catch (error) {
      console.error('Error rerunning job:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadJobToForm = (job: QueuedJob) => {
    if (onRerunJob) {
      onRerunJob(job.formData);
      onClose(); // Close the modal after loading to form
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'running':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'running':
        return 'text-blue-600 dark:text-blue-400';
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Job Queue ({jobs.length} jobs)
          </h2>
          <div className="flex gap-2">
            {jobs.some(job => job.status === 'completed' || job.status === 'failed') && (
              <button
                onClick={clearCompleted}
                disabled={loading}
                className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded disabled:opacity-50"
              >
                Clear Completed
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {jobs.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No jobs in queue
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`border rounded-lg p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    job.status === 'running' 
                      ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900' 
                      : job.status === 'completed'
                      ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900'
                      : job.status === 'failed'
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                  }`}
                  onClick={() => loadJobToForm(job)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getStatusIcon(job.status)}</span>
                        <span className={`font-medium ${getStatusColor(job.status)}`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          {job.status === 'running' && ' (Current)'}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          #{job.id.slice(-8)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Case:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {job.formData.caseNumber || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Service Type:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {job.formData.serviceTypeIdentifier || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Pickup:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {job.formData.observationNotes56a?.pickUpAddress || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Destination:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {job.formData.observationNotes56a?.locationAddress || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                          <p className="text-gray-600 dark:text-gray-400">
                            {new Date(job.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {job.completedAt && (
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {job.status === 'completed' ? 'Completed:' : 'Failed:'}
                            </span>
                            <p className="text-gray-600 dark:text-gray-400">
                              {new Date(job.completedAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {job.error && (
                        <div className="mb-3 p-2 bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded">
                          <span className="text-sm text-red-700 dark:text-red-300">
                            Error: {job.error}
                          </span>
                        </div>
                      )}

                      {job.sessionUrl && (
                        <div className="mb-3 p-2 bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded">
                          <a 
                            href={job.sessionUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-700 dark:text-blue-300 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Browser Session →
                          </a>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
                        Click to load this job's data to the form
                      </div>
                    </div>
                    
                    <div className="ml-4 flex flex-col gap-2">
                      {(job.status === 'completed' || job.status === 'failed') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            rerunJob(job.id);
                          }}
                          disabled={loading}
                          className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
                        >
                          Rerun
                        </button>
                      )}
                      {job.status !== 'running' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeJob(job.id);
                          }}
                          disabled={loading}
                          className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
