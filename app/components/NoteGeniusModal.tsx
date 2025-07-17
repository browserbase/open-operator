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
  const [streamCompleted, setStreamCompleted] = useState(false);

  // Function to clean formatting for display
  const cleanFormatting = (text: string) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
      .replace(/--\s*/g, '') // Remove bullet dashes
      .replace(/\*/g, '') // Remove any remaining asterisks
      // Add proper line breaks before section headers
      .replace(/(Observations of the Session:|Behavioral Observations:|Support and Intervention:|Goals for Future Sessions:|Summary:)/g, '\n\n$1\n')
      // Add line breaks for strategy/goal headers (Strategy 1:, Goal 1:, etc.)
      .replace(/\b(Strategy|Goal|Intervention|Activity|Objective|Behavior)\s+(\d+):/g, '\n\n$1 $2:\n')
      // Add line breaks after content blocks
      .replace(/\.(Behavioral|Support|Goals|Summary)/g, '.\n\n$1')
      // Clean up multiple line breaks
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const handleOptimize = async () => {
    if (!originalText.trim()) {
      setError('Please enter some text to optimize');
      return;
    }

    setIsStreaming(true);
    setStreamedContent('');
    setError('');
    setStreamCompleted(false);

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
        setStreamCompleted(true);
      });

      eventSource.onerror = (error) => {
        // Only show error if stream hasn't completed successfully
        if (!streamCompleted && eventSource.readyState === EventSource.CLOSED && !streamedContent) {
          setError(`Connection lost. Please try again. ${error}`);
        }
        eventSource.close();
        setIsStreaming(false);
      };

    } catch (error) {
      console.error('Error optimizing note:', error);
      setError('Failed to optimize note. Please try again.');
      setIsStreaming(false);
    }
  };

  const handleAccept = () => {
    // Format the content for better textarea display by removing special characters
    let formattedContent = streamedContent;
    
    // Remove markdown formatting and clean up the text
    formattedContent = formattedContent
      // Remove bold markers (**text**) and keep just the text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      // Remove bullet point dashes (-- ) and replace with clean format
      .replace(/--\s*/g, '')
      // Clean up any remaining asterisks
      .replace(/\*/g, '')
      // Add proper line breaks before section headers
      .replace(/(Observations of the Session:|Behavioral Observations:|Support and Intervention:|Goals for Future Sessions:|Summary:)/g, '\n\n$1\n')
      // Add line breaks for strategy/goal headers (Strategy 1:, Goal 1:, etc.)
      .replace(/\b(Strategy|Goal|Intervention|Activity|Objective|Behavior)\s+(\d+):/g, '\n\n$1 $2:\n')
      // Add line breaks after content blocks that run together
      .replace(/\.(Behavioral|Support|Goals|Summary)/g, '.\n\n$1')
      // Fix specific patterns where text runs together
      .replace(/session\.(Behavioral|Support|Goals)/g, 'session.\n\n$1')
      .replace(/activities\.(Support|Goals)/g, 'activities.\n\n$1')
      .replace(/questions\.(Strategy|Goals)/g, 'questions.\n\n$1')
      .replace(/participation\.(Goals|Summary)/g, 'participation.\n\n$1')
      .replace(/exercises\.(Summary)/g, 'exercises.\n\n$1')
      // Normalize multiple line breaks to max 2
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace
      .trim();
    
    onAccept(formattedContent);
    handleClose();
  };

  const handleClose = () => {
    setStreamedContent('');
    setError('');
    setIsStreaming(false);
    setStreamCompleted(false);
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
      confirmText={
        isStreaming 
          ? "Generating..." 
          : streamedContent 
            ? "Accept & Replace" 
            : undefined
      }
      cancelText="Cancel"
      onConfirm={streamedContent && !isStreaming ? handleAccept : undefined}
      confirmDisabled={isStreaming}
      showConfirm={isStreaming || !!streamedContent}
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
              <div className="whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                {cleanFormatting(streamedContent)}
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
            Optimized note: {cleanFormatting(streamedContent).length} characters (formatted)
          </div>
        )}
      </div>
    </ThemedModal>
  );
}
