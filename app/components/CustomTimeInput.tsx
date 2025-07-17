import React, { useState, useEffect } from 'react';

interface CustomTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  readOnly?: boolean;
  className?: string;
  error?: boolean;
}

const CustomTimeInput: React.FC<CustomTimeInputProps> = ({
  value,
  onChange,
  label,
  required = false,
  readOnly = false,
  className = '',
  error = false
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  // Convert 24-hour format to 12-hour format for display
  useEffect(() => {
    if (value) {
      const [hourStr, minuteStr] = value.split(':');
      const hour24 = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      
      if (hour24 === 0) {
        setDisplayValue(`12:${minuteStr}`);
        setPeriod('AM');
      } else if (hour24 < 12) {
        setDisplayValue(`${hour24}:${minuteStr}`);
        setPeriod('AM');
      } else if (hour24 === 12) {
        setDisplayValue(`12:${minuteStr}`);
        setPeriod('PM');
      } else {
        setDisplayValue(`${hour24 - 12}:${minuteStr}`);
        setPeriod('PM');
      }
    } else {
      setDisplayValue('');
      setPeriod('AM');
    }
  }, [value]);

  // Format time input and handle military time conversion
  const formatTimeInput = (input: string): { formatted: string, period: 'AM' | 'PM' } => {
    if (!input.trim()) return { formatted: '', period: 'AM' };
    
    // Remove all non-digit characters
    const digitsOnly = input.replace(/\D/g, '');
    
    if (digitsOnly.length === 0) return { formatted: '', period: 'AM' };
    
    let hours = 0;
    let minutes = 0;
    let detectedPeriod: 'AM' | 'PM' = 'AM';
    
    // Handle different input lengths
    if (digitsOnly.length === 1 || digitsOnly.length === 2) {
      // Just hours (e.g., "9" or "10")
      hours = parseInt(digitsOnly, 10);
      minutes = 0;
    } else if (digitsOnly.length === 3) {
      // Format like "930" (9:30)
      hours = parseInt(digitsOnly.slice(0, 1), 10);
      minutes = parseInt(digitsOnly.slice(1), 10);
    } else if (digitsOnly.length === 4) {
      // Format like "1230" or "2130" (12:30 or 21:30)
      hours = parseInt(digitsOnly.slice(0, 2), 10);
      minutes = parseInt(digitsOnly.slice(2), 10);
    }
    
    // Handle military time (24-hour format)
    if (hours >= 13 && hours <= 23) {
      // Military time - convert to 12-hour and set PM
      hours = hours - 12;
      detectedPeriod = 'PM';
    } else if (hours === 0) {
      // Midnight - convert to 12 AM
      hours = 12;
      detectedPeriod = 'AM';
    } else if (hours === 12) {
      // Noon - keep as 12 PM
      detectedPeriod = 'PM';
    } else if (hours >= 1 && hours <= 11) {
      // Regular morning/afternoon hours
      detectedPeriod = 'AM';
    }
    
    // Validate and fix ranges
    if (hours < 1 || hours > 12) hours = 12;
    if (minutes < 0 || minutes > 59) minutes = 0;
    
    const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}`;
    
    return { formatted: formattedTime, period: detectedPeriod };
  };

  // Convert display format to 24-hour format
  const convertTo24Hour = (timeStr: string, isPM: boolean): string => {
    if (!timeStr) return '';
    
    let hours = 0;
    let minutes = 0;
    
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    } else {
      hours = parseInt(timeStr, 10) || 0;
      minutes = 0;
    }
    
    // Validate ranges
    if (hours < 1 || hours > 12) hours = 12;
    if (minutes < 0 || minutes > 59) minutes = 0;
    
    // Convert to 24-hour format
    if (isPM && hours !== 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
  };

  const handleBlur = () => {
    const { formatted, period: detectedPeriod } = formatTimeInput(displayValue);
    
    if (formatted) {
      setDisplayValue(formatted);
      setPeriod(detectedPeriod);
      
      // Convert to 24-hour format and update
      const parsed24Hour = convertTo24Hour(formatted, detectedPeriod === 'PM');
      onChange(parsed24Hour);
    }
  };

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    setPeriod(newPeriod);
    
    // Update the value with new period
    const parsed24Hour = convertTo24Hour(displayValue, newPeriod === 'PM');
    onChange(parsed24Hour);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace, delete, tab, escape, enter, and arrow keys
    if ([46, 8, 9, 27, 13, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey) ||
        (e.keyCode === 67 && e.ctrlKey) ||
        (e.keyCode === 86 && e.ctrlKey) ||
        (e.keyCode === 88 && e.ctrlKey)) {
      return;
    }
    
    // Ensure that it's a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
    
    // Prevent typing if already at 4 digits
    const currentDigits = displayValue.replace(/\D/g, '');
    if (currentDigits.length >= 4 && e.keyCode >= 48 && e.keyCode <= 57) {
      e.preventDefault();
    }
  };

  return (
    <div className="input-group">
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`time-input-underline ${readOnly ? 'read-only' : ''} ${className} ${error ? 'border-b-red-500' : ''} pr-16`}
          readOnly={readOnly}
          placeholder={readOnly ? '' : ' '}
        />
        
        {/* AM/PM Switch inside the input */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex">
          <button
            type="button"
            onClick={() => handlePeriodChange('AM')}
            disabled={readOnly}
            className={`px-2 py-1 text-xs rounded-l transition-colors ${
              period === 'AM' 
                ? 'bg-primary text-white' 
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            } ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange('PM')}
            disabled={readOnly}
            className={`px-2 py-1 text-xs rounded-r transition-colors ${
              period === 'PM' 
                ? 'bg-primary text-white' 
                : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
            } ${readOnly ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            PM
          </button>
        </div>
      </div>
      
      <label className="time-input-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
};

export default CustomTimeInput;
