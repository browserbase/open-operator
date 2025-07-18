import ThemedModal from './ThemedModal';

interface MileageWarningModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSetCurrentMileage?: () => void;
  currentMileage?: number;
  lastMileage?: number;
  warningMessage?: string;
}

export default function MileageWarningModal({
  isVisible,
  onClose,
  onConfirm,
  onSetCurrentMileage,
  currentMileage,
  lastMileage,
  warningMessage
}: MileageWarningModalProps) {
  
  return (
    <ThemedModal
      isVisible={isVisible}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Mileage Warning"
      subtitle="Please review the mileage information"
      type="warning"
      confirmText="Continue Anyway"
      cancelText="Cancel"
      size="md"
      showCancel={false}
      showConfirm={false}
    >
      <div 
        className="p-4 rounded-lg mb-4"
        style={{
          backgroundColor: 'var(--warning-bg)',
          borderColor: 'var(--warning-border)',
          border: '1px solid'
        }}
      >
        <p 
          className="text-sm font-medium mb-2"
          style={{ color: 'var(--warning)' }}
        >
          {warningMessage || "Mileage discrepancy detected"}
        </p>
        
        {(currentMileage !== undefined || lastMileage !== undefined) && (
          <div className="space-y-2 text-sm">
            {lastMileage !== undefined && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>
                  Last recorded mileage:
                </span>
                <span 
                  className="font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {lastMileage.toLocaleString()} miles
                </span>
              </div>
            )}
            {currentMileage !== undefined && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>
                  Current mileage:
                </span>
                <span 
                  className="font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {currentMileage.toLocaleString()} miles
                </span>
              </div>
            )}
            {currentMileage !== undefined && lastMileage !== undefined && (
              <div className="flex justify-between pt-1 border-t" style={{ borderColor: 'var(--warning-border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Difference:
                </span>
                <span 
                  className="font-medium"
                  style={{ color: currentMileage < lastMileage ? 'var(--error)' : 'var(--text-primary)' }}
                >
                  {currentMileage < lastMileage ? '-' : '+'}{Math.abs(currentMileage - lastMileage).toLocaleString()} miles
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <p 
        className="text-sm mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        Would you like to continue with the automation anyway? This will update the recorded mileage.
      </p>

      {/* Custom footer with three buttons */}
      <div className="flex gap-3 justify-end pt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors hover:opacity-80"
          style={{ 
            backgroundColor: 'var(--background-secondary)', 
            color: 'var(--text-primary)',
            border: '1px solid var(--border)'
          }}
        >
          Cancel
        </button>
        
        {onSetCurrentMileage && lastMileage !== undefined && (
          <button
            onClick={onSetCurrentMileage}
            className="px-4 py-2 text-sm font-medium rounded-md transition-colors hover:opacity-90"
            style={{ 
              backgroundColor: 'var(--primary)', 
              color: 'white'
            }}
          >
            Set Current Mileage ({lastMileage.toLocaleString()})
          </button>
        )}
        
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors hover:opacity-90"
          style={{ 
            backgroundColor: 'var(--warning)', 
            color: 'white'
          }}
        >
          Continue Anyway
        </button>
      </div>
    </ThemedModal>
  );
}
