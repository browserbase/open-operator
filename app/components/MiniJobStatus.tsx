"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'firebase/auth';

interface MiniJobStatusProps {
  isVisible: boolean;
  executionId: string;
  onExpand: () => void;
  onStop: () => void;
  user: User | null;
}

interface JobStatus {
  id: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  startTime: Date;
}

export default function MiniJobStatus({ 
  isVisible, 
  executionId, 
  onExpand, 
  onStop, 
  user 
}: MiniJobStatusProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isVisible || !executionId) return;

    // Connect to real-time job status updates
    const eventSource = new EventSource(`/api/automation/events?executionId=${executionId}`);
    
    // Initialize job status
    setJobStatus({
      id: executionId,
      status: 'running',
      progress: 0,
      currentStep: 'Initializing...',
      startTime: new Date()
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        setJobStatus(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            currentStep: data.message || prev.currentStep,
            progress: data.type === 'progress' ? Math.min(prev.progress + 10, 90) : prev.progress
          };
        });

        // Handle completion
        if (data.type === 'finished') {
          setJobStatus(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);
          // Auto-hide after 3 seconds
          setTimeout(() => setJobStatus(null), 3000);
        } else if (data.type === 'error') {
          setJobStatus(prev => prev ? { ...prev, status: 'failed' } : null);
        }
      } catch (error) {
        console.error('Error parsing job status event:', error);
      }
    };

    eventSource.onerror = () => {
      console.error('Job status event source error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isVisible, executionId]);

  const getStatusColor = () => {
    switch (jobStatus?.status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (jobStatus?.status) {
      case 'running':
        return (
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
        );
      case 'completed':
        return (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (!isVisible || !jobStatus) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 left-6 z-50"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -100, opacity: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 30 
        }}
      >
        <motion.div
          className={`${getStatusColor()} rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer`}
          style={{ backgroundColor: 'var(--bg-modal)' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onExpand}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="p-3 flex items-center space-x-3">
            {/* Status indicator */}
            <div className={`flex items-center justify-center w-6 h-6 rounded-full ${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
            
            {/* Job info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-text-primary truncate">
                  Job #{executionId.slice(-6)}
                </span>
                <span className="text-xs text-text-secondary">
                  {formatDuration(jobStatus.startTime)}
                </span>
              </div>
              
              <div className="text-xs text-text-secondary truncate mt-1">
                {jobStatus.currentStep}
              </div>
              
              {/* Progress bar */}
              {jobStatus.status === 'running' && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand();
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Expand"
              >
                <svg className="w-4 h-4 text-text-secondary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
              
              {jobStatus.status === 'running' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStop();
                  }}
                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                  title="Stop Job"
                >
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
