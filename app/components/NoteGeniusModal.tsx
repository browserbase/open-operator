import { useState, useEffect } from 'react';
import ThemedModal from './ThemedModal';

interface NoteGeniusModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAccept: (optimizedText: string) => void;
  originalText: string;
}

export default function NoteGeniusModal({
  isVisible,
  onClose,
  onAccept,
  originalText
}: NoteGeniusModalProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [error, setError] = useState('');

  const handleOptimize = async () => {
    if (!originalText.trim()) {
      setError('Please enter some text to optimize');
      return;
    }

    setIsStreaming(true);
    setStreamedContent('');
    setError('');

    try {
      const response = await fetch('/api/generateNote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: originalText }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate note');
      }

      const { streamUrl } = await response.json();
      
      // Connect to the SSE endpoint
      const eventSource = new EventSource(streamUrl);
      
      eventSource.onmessage = (event) => {
        setStreamedContent(prev => prev + event.data);
      };

      eventSource.addEventListener('end', () => {
        eventSource.close();
        setIsStreaming(false);
      });

      eventSource.onerror = () => {
        eventSource.close();
        setIsStreaming(false);
        setError('Error occurred during streaming');
      };

    } catch (error) {
      console.error('Error optimizing note:', error);
      setError('Failed to optimize note. Please try again.');
      setIsStreaming(false);
    }
  };

  const handleAccept = () => {
    onAccept(streamedContent);
    handleClose();
  };

  const handleClose = () => {
    setStreamedContent('');
    setError('');
    setIsStreaming(false);
    onClose();
  };

  // Start optimization when modal opens
  useEffect(() => {
    if (isVisible && originalText.trim()) {
      handleOptimize();
    }
  }, [isVisible]);

  return (
    <ThemedModal
      isVisible={isVisible}
      onClose={handleClose}
      title="Note Genius - AI Optimization"
      subtitle="Optimizing your note with professional formatting and structure"
      type="info"
      size="lg"
      confirmText={streamedContent ? "Accept & Replace" : undefined}
      cancelText="Cancel"
      onConfirm={streamedContent ? handleAccept : undefined}
    >
      <div className="space-y-4">
        {/* Original Text Preview */}
        <div>
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Original Text:
          </h4>
          <div 
            className="p-3 rounded-md text-sm max-h-32 overflow-y-auto"
            style={{ 
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border)',
              border: '1px solid'
            }}
          >
            {originalText}
          </div>
        </div>

        {/* Optimized Text */}
        <div>
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Optimized Note:
          </h4>
          <div 
            className="p-3 rounded-md text-sm min-h-64 max-h-96 overflow-y-auto"
            style={{ 
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border)',
              border: '1px solid'
            }}
          >
            {isStreaming && (
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span style={{ color: 'var(--text-secondary)' }}>Generating optimized note...</span>
              </div>
            )}
            
            {error && (
              <div 
                className="p-2 rounded text-sm"
                style={{ 
                  backgroundColor: 'var(--error-bg)',
                  color: 'var(--error)'
                }}
              >
                {error}
              </div>
            )}
            
            {streamedContent && (
              <div className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                {streamedContent}
              </div>
            )}
            
            {!isStreaming && !streamedContent && !error && (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                Click optimize to generate an improved version of your note
              </div>
            )}
          </div>
        </div>

        {/* Character count info */}
        {streamedContent && (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Optimized note: {streamedContent.length} characters
          </div>
        )}
      </div>
    </ThemedModal>
  );
}
