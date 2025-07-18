import { useState, useEffect, useCallback } from 'react';
import { QueuedJob } from '../types/jobQueue';
import { User } from 'firebase/auth';
import { getUserId } from '../utils/apiClient';
import { getLocalJobQueue } from '../utils/localJobQueue';
import { FormData as CaseFormData } from '../script/automationScript';

interface QueueManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onRerunJob?: (formData: CaseFormData) => void;
  user?: User | null; // Add user prop for authentication
}

export default function QueueManager({ isVisible, onClose, onRerunJob, user }: QueueManagerProps) {
  const [jobs, setJobs] = useState<QueuedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const userId = getUserId(user || null);
  
  const fetchJobs = useCallback(() => {
    const localQueue = getLocalJobQueue();
    if (localQueue) {
      const userJobs = localQueue.getJobs(userId);
      setJobs(userJobs);
    }
  }, [userId]);

  useEffect(() => {
    if (isVisible) {
      // Initial fetch
      fetchJobs();
      
      // Subscribe to job queue changes
      const localQueue = getLocalJobQueue();
      const unsubscribe = localQueue?.subscribe((allJobs) => {
        const userJobs = allJobs.filter(job => job.userId === userId);
        setJobs(userJobs);
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isVisible, userId, fetchJobs]);

  const clearCompleted = () => {
    setLoading(true);
    try {
      const localQueue = getLocalJobQueue();
      if (localQueue) {
        localQueue.removeCompletedJobsForUser(userId);
        fetchJobs();
      }
    } catch (error) {
      console.error('Error clearing completed jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeJob = (jobId: string) => {
    setLoading(true);
    try {
      const localQueue = getLocalJobQueue();
      if (localQueue) {
        localQueue.removeJob(jobId);
        fetchJobs();
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
      const localQueue = getLocalJobQueue();
      if (localQueue) {
        const newJob = await localQueue.rerunJob(jobId, user);
        if (newJob) {
          fetchJobs();
          
          // Optionally call the callback to update form
          if (onRerunJob) {
            onRerunJob(newJob.formData);
          }
        } else {
          alert('Cannot rerun job: You already have 3 active jobs in the queue. Please wait for some jobs to complete or remove some jobs first.');
        }
      }
    } catch (error) {
      console.error('Error rerunning job:', error);
      alert('Error rerunning job. Please try again.');
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
        return { color: 'var(--warning)' };
      case 'running':
        return { color: 'var(--primary)' };
      case 'completed':
        return { color: 'var(--success)' };
      case 'failed':
        return { color: 'var(--error)' };
      default:
        return { color: 'var(--text-secondary)' };
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" style={{ backgroundColor: 'var(--bg-overlay)' }}>
      <div className="rounded-lg shadow-2xl border max-w-4xl w-full max-h-[80vh] overflow-hidden" style={{ backgroundColor: 'var(--bg-modal)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-xl)' }}>
        <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Job Queue ({jobs.length} total)
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Active jobs: {jobs.filter(job => job.status === 'pending' || job.status === 'running').length}/3 
              (limit: 3 active jobs at a time)
            </p>
          </div>
          <div className="flex gap-2">
            {jobs.some(job => job.status === 'completed' || job.status === 'failed') && (
              <button
                onClick={clearCompleted}
                disabled={loading}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 transition-colors"
                style={{
                  backgroundColor: 'var(--button-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border)'
                }}
              >
                Clear Completed
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded transition-opacity hover:opacity-70"
              style={{
              backgroundColor: 'var(--primary)',
              color: 'white'
              }}
            >
              Close
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]" >
          {jobs.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              No jobs in queue
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => {
                const getJobStyle = () => {
                  switch (job.status) {
                    case 'running':
                      return {
                        borderColor: 'var(--primary)',
                        backgroundColor: 'var(--bg-secondary)',
                        boxShadow: 'var(--shadow-md)'
                      };
                    case 'completed':
                      return {
                        borderColor: 'var(--success)',
                        backgroundColor: 'var(--bg-secondary)',
                        boxShadow: 'var(--shadow-md)'
                      };
                    case 'failed':
                      return {
                        borderColor: 'var(--error)',
                        backgroundColor: 'var(--bg-secondary)',
                        boxShadow: 'var(--shadow-md)'
                      };
                    default:
                      return {
                        borderColor: 'var(--border)',
                        backgroundColor: 'var(--bg-secondary)',
                        boxShadow: 'var(--shadow-sm)'
                      };
                  }
                };
                
                return (
                  <div
                    key={job.id}
                    className="border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md"
                    style={getJobStyle()}
                    onClick={() => loadJobToForm(job)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getStatusIcon(job.status)}</span>
                        <span className="font-medium" style={getStatusColor(job.status)}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          {job.status === 'running' && ' (Current)'}
                        </span>                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            #{job.id.slice(-8)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Case:</span>
                            <p style={{ color: 'var(--text-secondary)' }}>
                              {job.formData.caseNumber || 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Service Type:</span>
                            <p style={{ color: 'var(--text-secondary)' }}>
                              {job.formData.serviceTypeIdentifier || 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Pickup:</span>
                            <p style={{ color: 'var(--text-secondary)' }}>
                              {job.formData.observationNotes56a?.pickUpAddress || 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Destination:</span>
                            <p style={{ color: 'var(--text-secondary)' }}>
                              {job.formData.observationNotes56a?.locationAddress || 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Created:</span>
                            <p style={{ color: 'var(--text-secondary)' }}>
                              {new Date(job.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {job.completedAt && (
                            <div>
                              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {job.status === 'completed' ? 'Completed:' : 'Failed:'}
                              </span>
                              <p style={{ color: 'var(--text-secondary)' }}>
                                {new Date(job.completedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {job.error && (
                          <div className="mb-3 p-2 border rounded" style={{ backgroundColor: 'var(--error-bg)', borderColor: 'var(--error-border)' }}>
                            <span className="text-sm" style={{ color: 'var(--error)' }}>
                              Error: {job.error}
                            </span>
                          </div>
                        )}

                        {job.sessionUrl && (
                          <div className="mb-3 p-2 border rounded" style={{ backgroundColor: 'var(--info-bg)', borderColor: 'var(--info-border)' }}>
                            <a 
                              href={job.sessionUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm hover:underline"
                              style={{ color: 'var(--info)' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Browser Session →
                            </a>
                          </div>
                        )}
                        
                        <div className="text-xs border-t pt-2" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                          Click to load this job&apos;s data to the form
                        </div>
                    </div>                        <div className="ml-4 flex flex-col gap-2">
                          {(job.status === 'completed' || job.status === 'failed') && (
                            <button
                              onClick={(e) => {
                              e.stopPropagation();
                              rerunJob(job.id);
                              }}
                              disabled={loading || jobs.filter(j => j.status === 'pending' || j.status === 'running').length >= 3}
                              className="px-3 py-1 text-sm rounded disabled:opacity-50 transition-colors hover:opacity-70"
                              style={{
                              backgroundColor: 'var(--primary)',
                              color: 'white'
                              }}
                              title={jobs.filter(j => j.status === 'pending' || j.status === 'running').length >= 3 ? 'Queue is full (3 active jobs maximum)' : 'Rerun this job'}
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
                              className="px-3 py-1 text-sm rounded disabled:opacity-50 transition-colors hover:opacity-70"
                              style={{
                                backgroundColor: 'var(--error)',
                                color: 'white'
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
