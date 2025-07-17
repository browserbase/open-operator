import { useState, useEffect, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ModalType = 'info' | 'warning' | 'error' | 'success';

interface ThemedModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  showConfirm?: boolean;
  confirmDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const typeStyles = {
  info: {
    bgVar: '--info-bg',
    borderVar: '--info-border',
    colorVar: '--info',
    backdropClass: 'backdrop-blur-sm',
    backdropStyle: {
      backgroundColor: 'var(--bg-overlay)'
    },
    containerStyle: {
      backgroundColor: 'var(--bg-modal)',
      borderColor: 'var(--border)',
      boxShadow: 'var(--shadow-xl)'
    },
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  warning: {
    bgVar: '--warning-bg',
    borderVar: '--warning-border',
    colorVar: '--warning',
    backdropClass: 'backdrop-blur-md',
    backdropStyle: {
      backgroundColor: 'var(--bg-overlay)'
    },
    containerStyle: {
      backgroundColor: 'var(--bg-modal)',
      borderColor: 'var(--warning-border)',
      boxShadow: 'var(--shadow-xl)'
    },
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    )
  },
  error: {
    bgVar: '--error-bg',
    borderVar: '--error-border',
    colorVar: '--error',
    backdropClass: 'backdrop-blur-md',
    backdropStyle: {
      backgroundColor: 'var(--bg-overlay)'
    },
    containerStyle: {
      backgroundColor: 'var(--bg-modal)',
      borderColor: 'var(--error-border)',
      boxShadow: 'var(--shadow-xl)'
    },
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  success: {
    bgVar: '--success-bg',
    borderVar: '--success-border',
    colorVar: '--success',
    backdropClass: 'backdrop-blur-md',
    backdropStyle: {
      backgroundColor: 'var(--bg-overlay)'
    },
    containerStyle: {
      backgroundColor: 'var(--bg-modal)',
      borderColor: 'var(--success-border)',
      boxShadow: 'var(--shadow-xl)'
    },
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
};

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl'
};

export default function ThemedModal({
  isVisible,
  onClose,
  onConfirm,
  title,
  subtitle,
  children,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showCancel = true,
  showConfirm = true,
  confirmDisabled = false,
  size = 'md'
}: ThemedModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const typeStyle = typeStyles[type];

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onConfirm?.();
    }, 150);
  }, [onConfirm]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isVisible, handleClose]);

  if (!isVisible && !isClosing) return null;

  return (
    <AnimatePresence>
      {(isVisible || isClosing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className={`fixed inset-0 ${typeStyle.backdropClass}`}
            style={typeStyle.backdropStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: isClosing ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            className={`relative w-full ${sizeClasses[size]} mx-4`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ 
              opacity: isClosing ? 0 : 1, 
              scale: isClosing ? 0.95 : 1, 
              y: isClosing ? 20 : 0 
            }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              duration: 0.15,
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
          >
            <div 
              className="rounded-lg overflow-hidden border"
              style={typeStyle.containerStyle}
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-6 pb-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `var(${typeStyle.bgVar})`,
                    borderColor: `var(${typeStyle.borderVar})`,
                    border: '1px solid',
                    color: `var(${typeStyle.colorVar})`
                  }}
                >
                  {typeStyle.icon}
                </div>
                <div>
                  <h3 
                    className="text-lg font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {title}
                  </h3>
                  {subtitle && (
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-4">
                {children}
              </div>

              {/* Actions */}
              {(showCancel || showConfirm) && (
                <div 
                  className="flex gap-3 px-6 py-4 border-t"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border)'
                  }}
                >
                  {showCancel && (
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-2 text-sm font-medium rounded-md btn-secondary"
                      style={{
                        backgroundColor: 'var(--button-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border)',
                        border: '1px solid'
                      }}
                    >
                      {cancelText}
                    </button>
                  )}
                  {showConfirm && (
                    <button
                      onClick={confirmDisabled ? undefined : handleConfirm}
                      disabled={confirmDisabled}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md btn-primary flex items-center justify-center gap-2 ${
                        confirmDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'var(--text-inverse)'
                      }}
                    >
                      {confirmDisabled && (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      )}
                      {confirmText}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
