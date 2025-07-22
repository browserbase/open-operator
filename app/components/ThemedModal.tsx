import { useState, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '../utils/useResponsive';

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
  sm: 'w-full max-w-xs sm:max-w-sm',
  md: 'w-full max-w-sm sm:max-w-md md:max-w-lg',
  lg: 'w-full max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl',
  xl: 'w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl'
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
  const [mounted, setMounted] = useState(false);
  const typeStyle = typeStyles[type];
  const { isMobile } = useResponsive();

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  const modalContent = (
    <AnimatePresence>
      {(isVisible || isClosing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
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
          
          {/* Modal Container with proper viewport constraints */}
          <motion.div
            className={`relative ${sizeClasses[size]} mx-auto`}
            style={{
              maxHeight: isMobile ? '95vh' : '90vh', // Ensure it fits in viewport
              maxWidth: isMobile ? 'calc(100vw - 16px)' : 'calc(100vw - 32px)', // Prevent horizontal overflow
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden' // Prevent content from breaking out
            }}
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
              className="rounded-lg overflow-hidden border flex flex-col"
              style={{
                ...typeStyle.containerStyle,
                height: '100%',
                maxHeight: 'inherit',
                width: '100%',
                minWidth: 0 // Allow shrinking
              }}
            >
              {/* Header - Fixed */}
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 lg:p-6 flex-shrink-0 min-w-0">
                <div 
                  className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12'} rounded-full flex items-center justify-center flex-shrink-0`}
                  style={{
                    backgroundColor: `var(${typeStyle.bgVar})`,
                    borderColor: `var(${typeStyle.borderVar})`,
                    border: '1px solid',
                    color: `var(${typeStyle.colorVar})`
                  }}
                >
                  <div className={isMobile ? 'scale-75' : ''}>
                    {typeStyle.icon}
                  </div>
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h3 
                    className={`${isMobile ? 'text-sm' : 'text-base sm:text-lg'} font-semibold truncate`}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {title}
                  </h3>
                  {subtitle && (
                    <p 
                      className={`${isMobile ? 'text-xs' : 'text-xs sm:text-sm'} line-clamp-2 break-words`}
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Content - Scrollable */}
              <div 
                className="px-3 sm:px-4 lg:px-6 flex-1 overflow-y-auto overflow-x-hidden"
                style={{
                  minHeight: 0, // Important for flex child to be scrollable
                  maxHeight: '100%',
                  minWidth: 0 // Allow content to shrink
                }}
              >
                {children}
              </div>

              {/* Actions - Fixed */}
              {(showCancel || showConfirm) && (
                <div 
                  className={`flex gap-2 sm:gap-3 p-3 sm:p-4 border-t flex-shrink-0 ${
                    isMobile ? 'flex-col-reverse' : 'flex-row'
                  }`}
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border)'
                  }}
                >
                  {showCancel && (
                    <button
                      onClick={handleClose}
                      className={`${isMobile ? 'w-full' : 'flex-1'} px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200`}
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
                      className={`${isMobile ? 'w-full' : 'flex-1'} px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all duration-200 ${
                        confirmDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'var(--text-inverse)'
                      }}
                    >
                      {confirmDisabled && (
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent"></div>
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

  // Use portal if mounted and available, otherwise render normally
  if (mounted && typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
