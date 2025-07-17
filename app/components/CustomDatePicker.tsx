import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
}

export default function CustomDatePicker({
  value,
  onChange,
  readOnly = false,
  className = '',
  placeholder = 'MM/DD/YYYY'
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Format YYYY-MM-DD to MM/DD/YYYY
  const formatDisplayValue = (dateString: string) => {
    if (!dateString) return '';
    
    // Create date using local timezone to avoid timezone issues
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (isNaN(date.getTime())) return '';
    
    const displayMonth = String(date.getMonth() + 1).padStart(2, '0');
    const displayDay = String(date.getDate()).padStart(2, '0');
    const displayYear = date.getFullYear();
    
    return `${displayMonth}/${displayDay}/${displayYear}`;
  };

  // Format MM/DD/YYYY to YYYY-MM-DD (keeping for potential future use)
  // const formatValueForInput = (displayString: string) => {
  //   if (!displayString) return '';
  //   
  //   const parts = displayString.split('/');
  //   if (parts.length === 3) {
  //     const month = parts[0].padStart(2, '0');
  //     const day = parts[1].padStart(2, '0');
  //     const year = parts[2];
  //     
  //     return `${year}-${month}-${day}`;
  //   }
  //   
  //   return '';
  // };

  useEffect(() => {
    setDisplayValue(formatDisplayValue(value));
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInsideInput = containerRef.current && containerRef.current.contains(target);
      const isClickInsideCalendar = calendarRef.current && calendarRef.current.contains(target);
      
      if (!isClickInsideInput && !isClickInsideCalendar) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const calendarHeight = 350; // Approximate height of calendar
        const calendarWidth = 280; // Approximate width of calendar
        const margin = 10; // Margin from screen edges
        
        let top = rect.bottom + window.scrollY;
        let left = rect.left + window.scrollX;
        
        // Check if calendar would be cut off at the bottom
        if (top + calendarHeight > window.innerHeight + window.scrollY) {
          // Position above the input if there's more room
          if (rect.top - calendarHeight > 0) {
            top = rect.top + window.scrollY - calendarHeight;
          } else {
            // If neither above nor below works, position at the bottom of viewport
            top = window.innerHeight + window.scrollY - calendarHeight - margin;
          }
        }
        
        // Check if calendar would be cut off on the right
        if (left + calendarWidth > window.innerWidth + window.scrollX) {
          left = window.innerWidth + window.scrollX - calendarWidth - margin;
        }
        
        // Check if calendar would be cut off on the left
        if (left < window.scrollX + margin) {
          left = window.scrollX + margin;
        }
        
        setCalendarPosition({ top, left });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const handleDateChange = (selectedDate: string) => {
    onChange(selectedDate);
    setIsOpen(false);
  };

  const handleInputClick = () => {
    if (!readOnly) {
      if (!isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const calendarHeight = 350; // Approximate height of calendar
        const calendarWidth = 280; // Approximate width of calendar
        const margin = 10; // Margin from screen edges
        
        let top = rect.bottom + window.scrollY;
        let left = rect.left + window.scrollX;
        
        // Check if calendar would be cut off at the bottom
        if (top + calendarHeight > window.innerHeight + window.scrollY) {
          // Position above the input if there's more room
          if (rect.top - calendarHeight > 0) {
            top = rect.top + window.scrollY - calendarHeight;
          } else {
            // If neither above nor below works, position at the bottom of viewport
            top = window.innerHeight + window.scrollY - calendarHeight - margin;
          }
        }
        
        // Check if calendar would be cut off on the right
        if (left + calendarWidth > window.innerWidth + window.scrollX) {
          left = window.innerWidth + window.scrollX - calendarWidth - margin;
        }
        
        // Check if calendar would be cut off on the left
        if (left < window.scrollX + margin) {
          left = window.scrollX + margin;
        }
        
        setCalendarPosition({ top, left });
      }
      setIsOpen(!isOpen);
    }
  };

  const generateCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // If there's a selected date, use that month/year, otherwise use current
    let displayMonth = currentMonth;
    let displayYear = currentYear;
    
    if (value) {
      // Create date using local timezone to avoid timezone issues
      const [year, month, day] = value.split('-');
      const selectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (!isNaN(selectedDate.getTime())) {
        displayMonth = selectedDate.getMonth();
        displayYear = selectedDate.getFullYear();
      }
    }

    const firstDay = new Date(displayYear, displayMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // Generate 6 weeks of dates
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const selectedDate = value ? (() => {
      const [year, month, day] = value.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    })() : null;
    
    const isToday = (date: Date) => {
      return date.toDateString() === today.toDateString();
    };
    
    const isSelected = (date: Date) => {
      return selectedDate && date.toDateString() === selectedDate.toDateString();
    };
    
    const isCurrentMonth = (date: Date) => {
      return date.getMonth() === displayMonth;
    };

    const formatDateForInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return (
      <div 
        ref={calendarRef}
        className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 p-3 min-w-[280px]"
        style={{
          top: calendarPosition.top,
          left: calendarPosition.left
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => {
              const newDate = new Date(displayYear, displayMonth - 1, 1);
              const newValue = value || formatDateForInput(today);
              const [year, month, day] = newValue.split('-');
              const currentSelected = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              currentSelected.setMonth(newDate.getMonth());
              currentSelected.setFullYear(newDate.getFullYear());
              handleDateChange(formatDateForInput(currentSelected));
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {monthNames[displayMonth]} {displayYear}
          </h3>
          
          <button
            type="button"
            onClick={() => {
              const newDate = new Date(displayYear, displayMonth + 1, 1);
              const newValue = value || formatDateForInput(today);
              const [year, month, day] = newValue.split('-');
              const currentSelected = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              currentSelected.setMonth(newDate.getMonth());
              currentSelected.setFullYear(newDate.getFullYear());
              handleDateChange(formatDateForInput(currentSelected));
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 p-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleDateChange(formatDateForInput(date))}
              className={`
                text-sm p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                ${isSelected(date) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                ${isToday(date) && !isSelected(date) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}
                ${!isCurrentMonth(date) ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}
              `}
            >
              {date.getDate()}
            </button>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <button
            type="button"
            onClick={() => handleDateChange(formatDateForInput(today))}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          placeholder={placeholder}
          readOnly
          onClick={handleInputClick}
          className={`
            ${className}
            cursor-pointer
            ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        <svg 
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
      
      {isOpen && typeof document !== 'undefined' && createPortal(
        generateCalendar(),
        document.body
      )}
    </div>
  );
}
