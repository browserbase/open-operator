"use client";

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  className = ""
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isClient, setIsClient] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Ensure this only runs on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          // Focus next option
          break;
        case 'ArrowUp':
          event.preventDefault();
          // Focus previous option
          break;
        case 'Enter':
          event.preventDefault();
          // Select focused option
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : "";

  // Dropdown portal component
  const DropdownPortal = () => {
    if (!isClient || !isOpen) return null;

    return createPortal(
      <div 
        id="custom-select-dropdown"
        className="fixed z-[9999] bg-background-primary/80 backdrop-blur-md border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          marginTop: '4px'
        }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`w-full px-3 py-2 text-left text-text-primary hover:bg-background-secondary focus:bg-background-secondary focus:outline-none ${
              option.value === value ? 'bg-background-secondary' : ''
            }`}
            onClick={() => handleOptionClick(option.value)}
          >
            <div className="font-medium">{option.label}</div>
          </button>
        ))}
      </div>,
      document.body
    );
  };

  const baseSelectClassName = `input-underline cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
  const combinedClassName = className ? `${baseSelectClassName} ${className}` : baseSelectClassName;

  return (
    <div className="input-group" ref={selectRef}>
      <div className="relative">
        <div
          className={combinedClassName}
          onClick={handleToggle}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="custom-select-dropdown"
          tabIndex={disabled ? -1 : 0}
        >
          {displayValue || " "}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg 
              className={`w-4 h-4 text-text-secondary transform transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <label className="input-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>
      <DropdownPortal />
    </div>
  );
}
