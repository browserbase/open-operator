"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

// Declare the custom element for TypeScript
declare module "react" {
  interface IntrinsicElements {
    'gmp-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      options?: string;
      placeholder?: string;
      value?: string;
      required?: boolean;
    };
  }
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  readOnly?: boolean;
  className?: string;
  required?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  label,
  readOnly = false,
  className = "",
  required = false
}: AddressAutocompleteProps) {
  const autocompleteElementRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync internal input value with external value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const initializeAutocomplete = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setError('Google Maps API key not configured');
          return;
        }
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places']
        });
        await loader.load();
        
        // Initialize the autocomplete service
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        
        // Create a dummy div for PlacesService (required)
        const dummyDiv = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
        
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load address autocomplete');
      }
    };
    initializeAutocomplete();
  }, []);

  // Handle input changes and search for suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    if (newValue.length > 2 && autocompleteServiceRef.current) {
      // Get autocomplete predictions
      autocompleteServiceRef.current.getPlacePredictions({
        input: newValue,
        types: ['address'],
        componentRestrictions: { country: 'us' }
      }, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setShowSuggestions(false);
    
    // Focus the input after selection
    if (autocompleteElementRef.current) {
      autocompleteElementRef.current.focus();
    }
  };

  const handleInputFocus = () => {
    // Show suggestions when input is focused if there's text
    if (inputValue.length > 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Hide suggestions after a brief delay to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  const baseInputClassName = `w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent ${readOnly ? 'read-only:bg-gray-50 read-only:dark:bg-gray-800 read-only:cursor-default' : ''}`;

  const combinedClassName = className ? `${baseInputClassName} ${className}` : baseInputClassName;

  if (error) {
    // Fallback to regular input if Google Maps fails to load
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          readOnly={readOnly}
          className={combinedClassName}
          placeholder={placeholder}
        />
        <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
          Address autocomplete unavailable - using text input
        </p>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={autocompleteElementRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          readOnly={readOnly}
          className={combinedClassName}
          placeholder={placeholder || `Enter ${label?.toLowerCase() || 'address'}`}
        />
        {!isLoaded && !readOnly && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-[#FF3B00] rounded-full animate-spin"></div>
          </div>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                type="button"
                className="w-full px-3 py-2 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="font-medium">{suggestion.structured_formatting.main_text}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{suggestion.structured_formatting.secondary_text}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
