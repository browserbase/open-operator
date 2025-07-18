import React, { useState, useEffect, useRef } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingTimeRef = useRef<number>(message.duration || 5000);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    const startTimer = () => {
      const updateInterval = 50; // Update every 50ms
      const totalDuration = message.duration || 5000;
      
      timerRef.current = setInterval(() => {
        if (!isPaused) {
          remainingTimeRef.current -= updateInterval;
          const newProgress = (remainingTimeRef.current / totalDuration) * 100;
          setProgress(Math.max(0, newProgress));
          
          if (remainingTimeRef.current <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Start exit animation
            setIsExiting(true);
            setTimeout(() => {
              onClose(message.id);
            }, 300); // Wait for exit animation
          }
        }
      }, updateInterval);
    };

    startTimer();

    return () => {
      clearTimeout(showTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [message.id, message.duration, onClose]);

  // Handle pause state changes
  useEffect(() => {
    // Timer logic is handled in the main useEffect above
    // isPaused state is checked in the interval callback
  }, [isPaused]);

  const getToastStyles = () => {
    const baseStyles = "max-w-sm w-full border-l-4 p-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform relative overflow-hidden";
    const animationStyles = isVisible 
      ? (isExiting ? "translate-x-[-120%] opacity-0" : "translate-x-0 opacity-100") 
      : "translate-x-[-120%] opacity-0";
    
    let colorStyles = "";
    switch (message.type) {
      case 'success':
        colorStyles = "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-200";
        break;
      case 'error':
        colorStyles = "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200";
        break;
      case 'warning':
        colorStyles = "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-800 dark:text-yellow-200";
        break;
      case 'info':
      default:
        colorStyles = "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-200";
        break;
    }
    
    return `${baseStyles} ${animationStyles} ${colorStyles}`;
  };

  const getIconStyles = () => {
    switch (message.type) {
      case 'success':
        return "text-green-500";
      case 'error':
        return "text-red-500";
      case 'warning':
        return "text-yellow-500";
      case 'info':
      default:
        return "text-blue-500";
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(message.id);
    }, 300);
  };

  const getProgressBarColor = () => {
    switch (message.type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div 
      className={getToastStyles()}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${getIconStyles()}`}>
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message.message}</p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={handleClose}
            className="inline-flex text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none focus:text-gray-500 dark:focus:text-gray-400 transition-colors duration-150"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
        <div 
          className={`h-full transition-all duration-75 ease-linear ${getProgressBarColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

interface ToastContainerProps {
  messages: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ messages, onClose }) => {
  return (
    <div className="fixed top-4 left-4 z-50 space-y-2 bg-modal w-96 max-w-[calc(100vw-2rem)]">
      {messages.map((message, index) => (
        <div 
          key={message.id} 
          style={{ 
            animationDelay: `${index * 100}ms`,
            zIndex: 1000 - index
          }}
        >
          <Toast message={message} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

// Hook for managing toast messages
export const useToast = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastMessage['type'] = 'info', duration?: number) => {
    const id = Math.random().toString(36).substring(2, 15);
    const newMessage: ToastMessage = { id, message, type, duration };
    
    setMessages((prev) => {
      // Add a slight delay for staggered animations
      const newMessages = [...prev, newMessage];
      return newMessages;
    });
  };

  const removeToast = (id: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== id));
  };

  // Clear all toasts
  const clearAll = () => {
    setMessages([]);
  };

  return {
    messages,
    addToast,
    removeToast,
    clearAll,
    showSuccess: (message: string, duration?: number) => addToast(message, 'success', duration),
    showError: (message: string, duration?: number) => addToast(message, 'error', duration),
    showWarning: (message: string, duration?: number) => addToast(message, 'warning', duration),
    showInfo: (message: string, duration?: number) => addToast(message, 'info', duration),
  };
};

export default Toast;
