"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FormData } from "../script/automationScript";
import AddressAutocomplete from "./AddressAutocomplete";
import CustomDatePicker from "./CustomDatePicker";
import CustomSelect from "./CustomSelect";
import CustomTimeInput from "./CustomTimeInput";
import { saveTemplateToFirebase, getTemplatesFromFirebase, deleteTemplateFromFirebase } from "./firebaseTemplateService";
import { getAutoSetDataFromFirebase, AutoSetData } from "./firebaseAutoSetService";
import { dropdownOptions } from "../constants/dropdownOptions";
import { db } from "../firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import MileageWarningModal from "./MileageWarningModal";
import NoteGeniusModal from "./NoteGeniusModal";
import ThemedModal from "./ThemedModal";

// Utility function to format time from 24-hour to 12-hour format with AM/PM
const formatTimeToAMPM = (time24: string): string => {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minutes} ${ampm}`;
};

// Utility function to parse date as local date to avoid timezone issues
const parseLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  // Split the date string and create a date using local timezone
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  
  // Fallback to regular Date constructor
  return new Date(dateString);
};

interface CaseFormProps {
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
  readOnly?: boolean;
  initialFormData?: FormData;
  isLoggedIn?: boolean;
  userId?: string;
  onLoginRequested?: () => void;
  isExecuting?: boolean;
  onStopAutomation?: () => void;
  toast?: {
    showError: (message: string) => void;
    showSuccess: (message: string) => void;
  };
}

interface SavedCredentials {
  companyCode: string;
  username: string;
  password: string;
}

interface MileageHistoryEntry {
  capturedAt: string;
  dateOfService: string;
  endMileage?: string; // Make optional since not all notes will have mileage
  endTime: string;
  executionId: string;
  savedAt: string;
  startTime: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  createdAt: string;
  formData: Omit<FormData, 'companyCode' | 'username' | 'password' | 'dateOfService'> & { 
    dateOfService?: string;
  };
  showMileage?: boolean; // Only at root level
}

export default function CaseForm({ onSubmit, isLoading, readOnly = false, initialFormData, isLoggedIn = false, userId, onLoginRequested, isExecuting = false, onStopAutomation, toast }: CaseFormProps) {
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<FormTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showLoadTemplates, setShowLoadTemplates] = useState(false);
  const [overwriteMode, setOverwriteMode] = useState(false);
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);
  const [timeValidationError, setTimeValidationError] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    companyCode: "",
    username: "",
    password: "",
    caseNumber: "",
    dateOfService: "",
    startTime: "",
    endTime: "",
    serviceTypeIdentifier: "56a",
    personServed: "",
    mileageStartAddress: "",
    mileageStartMileage: "",
    observationNotes56a: {
      pickUpAddress: "",
      locationAddress: "",
      purposeOfTransportation: "",
      delaysDescription: "",
      interactionsWithParentGuardian: "",
      interactionsWithClient: "",
      clientDressedAppropriately: "",
      concerns: "",
    },
    endAddresses: [""],
    additionalDropdownValues: [""],
    noteSummary47e: "",
  });

  const [showMileage, setShowMileage] = useState(false);
  const [autoSetData, setAutoSetData] = useState<AutoSetData>({ homeAddress: "", officeAddress: "" });
  const [showAddressSelection, setShowAddressSelection] = useState(false);
  const [expandedStops, setExpandedStops] = useState<{ [key: number]: boolean }>({});
  const [lastProcessedMileage, setLastProcessedMileage] = useState<string | null>(null);
  const [showMileageWarning, setShowMileageWarning] = useState(false);
  const [showMileageConfirmation, setShowMileageConfirmation] = useState(false);
  const [showOverlapWarning, setShowOverlapWarning] = useState(false);
  const [overlapWarningData, setOverlapWarningData] = useState<{
    conflictingEntry?: MileageHistoryEntry;
    currentDateTime?: Date;
  }>({});
  const [showNoteGeniusModal, setShowNoteGeniusModal] = useState(false);
  const [isLoadingMileage, setIsLoadingMileage] = useState(false);
  const [mileageHistory, setMileageHistory] = useState<MileageHistoryEntry[]>([]);
  const [isLoadingMileageHistory, setIsLoadingMileageHistory] = useState(false);

  // Function to fetch last processed mileage from Firebase
  const fetchLastProcessedMileage = useCallback(async () => {
    if (!isLoggedIn || !userId) return;
    
    setIsLoadingMileage(true);
    try {
      const userDoc = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userDoc);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        if (userData.lastProcessedMileage) {
          setLastProcessedMileage(userData.lastProcessedMileage);
        }
      }
    } catch (error) {
      console.error('Error fetching last processed mileage:', error);
    } finally {
      setIsLoadingMileage(false);
    }
  }, [isLoggedIn, userId]);

  // Function to set current mileage from last processed
  const setCurrentMileage = useCallback(() => {
    if (lastProcessedMileage) {
      setFormData(prev => ({
        ...prev,
        mileageStartMileage: lastProcessedMileage
      }));
    }
  }, [lastProcessedMileage]);

  // Function to fetch mileage history from Firebase
  const fetchMileageHistory = useCallback(async () => {
    if (!isLoggedIn || !userId) return;
    
    setIsLoadingMileageHistory(true);
    try {
      const userDoc = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userDoc);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        if (userData.mileageHistory && Array.isArray(userData.mileageHistory)) {
          // Sort by savedAt timestamp descending (newest first) and take the last 5
          const sortedHistory = userData.mileageHistory
            .sort((a: MileageHistoryEntry, b: MileageHistoryEntry) => 
              new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
            )
            .slice(0, 5);
          setMileageHistory(sortedHistory);
        }
      }
    } catch (error) {
      console.error('Error fetching mileage history:', error);
    } finally {
      setIsLoadingMileageHistory(false);
    }
  }, [isLoggedIn, userId]);

  // Function to check for overlapping entries
  const checkForOverlappingEntries = useCallback((dateOfService: string, startTime: string, endTime: string) => {
    if (!dateOfService || !startTime || !endTime || mileageHistory.length === 0) {
      return null;
    }

    // Parse the current form data into a date/time
    const currentDate = parseLocalDate(dateOfService);
    const currentStartTime = parseTimeString(startTime);
    const currentEndTime = parseTimeString(endTime);
    
    // Create datetime objects for comparison
    const currentStartDateTime = new Date(currentDate);
    currentStartDateTime.setHours(currentStartTime.hours, currentStartTime.minutes, 0, 0);
    
    const currentEndDateTime = new Date(currentDate);
    currentEndDateTime.setHours(currentEndTime.hours, currentEndTime.minutes, 0, 0);
    
    // Check against recent entries (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const entry of mileageHistory) {
      const entryDate = parseLocalDate(entry.dateOfService);
      const entryStartTime = parseTimeString(entry.startTime);
      const entryEndTime = parseTimeString(entry.endTime);
      
      // Skip entries older than 30 days
      if (entryDate < thirtyDaysAgo) continue;
      
      // Create datetime objects for the history entry
      const entryStartDateTime = new Date(entryDate);
      entryStartDateTime.setHours(entryStartTime.hours, entryStartTime.minutes, 0, 0);
      
      const entryEndDateTime = new Date(entryDate);
      entryEndDateTime.setHours(entryEndTime.hours, entryEndTime.minutes, 0, 0);
      
      // Check if current entry overlaps with or is before this history entry
      const isOverlapping = (
        (currentStartDateTime < entryEndDateTime && currentEndDateTime > entryStartDateTime) ||
        (currentStartDateTime < entryStartDateTime)
      );
      
      if (isOverlapping) {
        return {
          conflictingEntry: entry,
          currentDateTime: currentStartDateTime
        };
      }
    }
    
    return null;
  }, [mileageHistory]);

  // Helper function to parse time string into hours and minutes
  const parseTimeString = (timeStr: string): { hours: number; minutes: number } => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) {
      return { hours: 0, minutes: 0 };
    }
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return { hours, minutes };
  };

  // Function to check for mileage warning
  const checkMileageWarning = useCallback(() => {
    if (showMileage && lastProcessedMileage && formData.mileageStartMileage) {
      const lastMileage = parseInt(lastProcessedMileage.replace(/,/g, ''));
      const currentStartMileage = parseInt(formData.mileageStartMileage.replace(/,/g, ''));
      
      if (!isNaN(lastMileage) && !isNaN(currentStartMileage) && currentStartMileage < lastMileage) {
        setShowMileageWarning(true);
      } else {
        setShowMileageWarning(false);
      }
    } else {
      setShowMileageWarning(false);
    }
  }, [showMileage, lastProcessedMileage, formData.mileageStartMileage]);

  // Load saved credentials and templates on component mount
  useEffect(() => {
    // If initialFormData is provided, use it (read-only mode)
    if (initialFormData) {
      setFormData(initialFormData);
      // Only enable mileage in read-only mode if it was explicitly enabled
      // For read-only mode, show mileage if there's mileage data AND it's meaningful
      // Don't auto-enable mileage for empty mileage fields
      const hasMeaningfulMileageData = Boolean(
        (initialFormData.mileageStartAddress && initialFormData.mileageStartAddress.trim()) ||
        (initialFormData.mileageStartMileage && initialFormData.mileageStartMileage.trim())
      );
      setShowMileage(hasMeaningfulMileageData);
      return;
    }

    const savedCredentials = localStorage.getItem('caseFormCredentials');
    if (savedCredentials) {
      const credentials: SavedCredentials = JSON.parse(savedCredentials);
      setFormData(prev => ({
        ...prev,
        companyCode: credentials.companyCode,
        username: credentials.username,
        password: credentials.password,
      }));
      setSaveCredentials(true);
    }
  }, [initialFormData]);

  // Load Firebase templates when user logs in
  useEffect(() => {
    const loadFirebaseTemplates = async () => {
      if (isLoggedIn && userId) {
        try {
          const firebaseTemplates = await getTemplatesFromFirebase(userId);
          setSavedTemplates(firebaseTemplates);
        } catch (error) {
          console.error('Failed to load templates from Firebase:', error);
        }
      } else {
        // Clear templates when user logs out
        setSavedTemplates([]);
      }
    };

    loadFirebaseTemplates();
  }, [isLoggedIn, userId]);

  // Fetch last processed mileage when user logs in and set up real-time listener
  useEffect(() => {
    if (isLoggedIn && userId) {
      fetchLastProcessedMileage();
      fetchMileageHistory();
      
      // Set up real-time listener for mileage updates
      const userDoc = doc(db, 'users', userId);
      const unsubscribe = onSnapshot(userDoc, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          if (userData.lastProcessedMileage && userData.lastProcessedMileage !== lastProcessedMileage) {
            setLastProcessedMileage(userData.lastProcessedMileage);
            console.log('Mileage updated in real-time:', userData.lastProcessedMileage);
          }
          // Update mileage history in real-time
          if (userData.mileageHistory && Array.isArray(userData.mileageHistory)) {
            const sortedHistory = userData.mileageHistory
              .sort((a: MileageHistoryEntry, b: MileageHistoryEntry) => 
                new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
              )
              .slice(0, 5);
            setMileageHistory(sortedHistory);
          }
        }
      }, (error) => {
        console.error('Error listening to mileage updates:', error);
      });

      return () => unsubscribe();
    }
  }, [isLoggedIn, userId, lastProcessedMileage, fetchLastProcessedMileage, fetchMileageHistory]);

  // Check for mileage warning when start mileage changes
  useEffect(() => {
    checkMileageWarning();
  }, [formData.mileageStartMileage, lastProcessedMileage, showMileage, checkMileageWarning]);

  // Load auto-set data from Firebase when user logs in
  useEffect(() => {
    const loadAutoSetData = async () => {
      if (isLoggedIn && userId) {
        try {
          const data = await getAutoSetDataFromFirebase(userId);
          if (data) {
            setAutoSetData(data);
          }
        } catch (error) {
          console.error('Failed to load auto set data:', error);
        }
      } else {
        // Clear auto set data when user logs out
        setAutoSetData({ homeAddress: "", officeAddress: "" });
      }
    };

    loadAutoSetData();
  }, [isLoggedIn, userId]);

  // Handle mileage checkbox with address selection
  const handleMileageToggle = (enabled: boolean) => {
    if (enabled) {
      // Set End Address 1 to pickup address if it exists
      const pickupAddress = formData.observationNotes56a?.pickUpAddress;
      if (pickupAddress && formData.endAddresses[0] === "") {
        const newEndAddresses = [...formData.endAddresses];
        newEndAddresses[0] = pickupAddress;
        setFormData(prev => ({
          ...prev,
          endAddresses: newEndAddresses
        }));
      }
      
      if (autoSetData.homeAddress || autoSetData.officeAddress) {
        setShowAddressSelection(true);
      } else {
        setShowMileage(enabled);
      }
    } else {
      setShowMileage(enabled);
      // Clear mileage warning when mileage is disabled
      setShowMileageWarning(false);
      // Clear all mileage-related data and reset addresses when mileage is disabled
      setFormData(prev => ({
        ...prev,
        mileageStartAddress: "",
        mileageStartMileage: "",
        endAddresses: [""],
        additionalDropdownValues: [""]
      }));
      // Reset expanded stops state
      setExpandedStops({ 0: true });
    }
  };

  const selectStartAddress = (address: string) => {
    setFormData(prev => ({
      ...prev,
      mileageStartAddress: address
    }));
    setShowMileage(true);
    setShowAddressSelection(false);
  };

  // Save credentials to localStorage when saveCredentials changes
  useEffect(() => {
    if (saveCredentials && formData.companyCode && formData.username && formData.password) {
      const credentials: SavedCredentials = {
        companyCode: formData.companyCode,
        username: formData.username,
        password: formData.password,
      };
      localStorage.setItem('caseFormCredentials', JSON.stringify(credentials));
    } else if (!saveCredentials) {
      localStorage.removeItem('caseFormCredentials');
    }
  }, [saveCredentials, formData.companyCode, formData.username, formData.password]);

  // Function to validate time inputs
  const validateTimeInputs = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;
    
    // Convert time strings to comparable values
    const startTimeMinutes = timeToMinutes(startTime);
    const endTimeMinutes = timeToMinutes(endTime);
    
    return startTimeMinutes >= endTimeMinutes;
  };

  // Helper function to convert time string to minutes since midnight
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [field]: value
      };
      
      // Check time validation when startTime or endTime changes
      if (field === 'startTime' || field === 'endTime') {
        const startTime = field === 'startTime' ? value as string : prev.startTime;
        const endTime = field === 'endTime' ? value as string : prev.endTime;
        
        setTimeValidationError(validateTimeInputs(startTime, endTime));
      }
      
      return newFormData;
    });
  };

  const handleObservationNotesChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      observationNotes56a: {
        ...prev.observationNotes56a,
        [field]: value
      }
    }));
  };

  const handleEndAddressChange = (index: number, value: string) => {
    const newAddresses = [...formData.endAddresses];
    newAddresses[index] = value;
    setFormData(prev => ({
      ...prev,
      endAddresses: newAddresses
    }));
  };

  const handleDropdownValueChange = (index: number, value: string) => {
    const newValues = [...formData.additionalDropdownValues];
    newValues[index] = value;
    setFormData(prev => ({
      ...prev,
      additionalDropdownValues: newValues
    }));
  };

  const addEndAddress = () => {
    const newIndex = formData.endAddresses.length;
    setFormData(prev => ({
      ...prev,
      endAddresses: [...prev.endAddresses, ""],
      additionalDropdownValues: [...prev.additionalDropdownValues, ""]
    }));
    // Collapse all previous stops and expand only the newly added stop
    setExpandedStops({ [newIndex]: true });
  };

  const removeEndAddress = (index: number) => {
    if (formData.endAddresses.length > 1) {
      setFormData(prev => ({
        ...prev,
        endAddresses: prev.endAddresses.filter((_, i) => i !== index),
        additionalDropdownValues: prev.additionalDropdownValues.filter((_, i) => i !== index)
      }));
      // Remove the stop from expanded state and adjust indices
      setExpandedStops(prev => {
        const newExpanded = { ...prev };
        delete newExpanded[index];
        // Adjust indices for stops after the removed one
        Object.keys(newExpanded).forEach(key => {
          const stopIndex = parseInt(key);
          if (stopIndex > index) {
            newExpanded[stopIndex - 1] = newExpanded[stopIndex];
            delete newExpanded[stopIndex];
          }
        });
        return newExpanded;
      });
    }
  };

  const toggleStopExpansion = (index: number) => {
    setExpandedStops(prev => {
      const hasExpandedStops = Object.keys(prev).length > 0;
      const currentlyExpanded = hasExpandedStops ? (prev[index] ?? false) : (index === 0);
      
      return {
        ...prev,
        [index]: !currentlyExpanded
      };
    });
  };

  const isStopExpanded = (index: number) => {
    // If expandedStops has any keys, use only those; otherwise default first stop to expanded
    const hasExpandedStops = Object.keys(expandedStops).length > 0;
    return hasExpandedStops ? (expandedStops[index] ?? false) : (index === 0);
  };

  const [requiredError, setRequiredError] = useState("");

  // Handlers for mileage confirmation modal
  const handleMileageConfirm = () => {
    setShowMileageConfirmation(false);
    // Continue with form submission with cleaned data
    const cleanedFormData = { ...formData };
    if (!showMileage) {
      // Remove mileage-related data when mileage is disabled
      cleanedFormData.mileageStartAddress = "";
      cleanedFormData.mileageStartMileage = "";
      // Reset addresses to just one empty address when mileage is disabled
      cleanedFormData.endAddresses = [""];
      cleanedFormData.additionalDropdownValues = [""];
    }
    onSubmit(cleanedFormData);
  };

  const handleMileageCancel = () => {
    setShowMileageConfirmation(false);
  };

  const handleSetCurrentMileage = () => {
    setShowMileageConfirmation(false);
    
    // Set the current mileage to the last processed mileage and proceed with submission
    if (lastProcessedMileage) {
      const updatedFormData = {
        ...formData,
        mileageStartMileage: lastProcessedMileage
      };
      
      // Update the form data
      setFormData(updatedFormData);
      
      // Proceed with form submission using the updated data
      proceedWithFormSubmissionWithData(updatedFormData);
    } else {
      // If no last processed mileage, just proceed with current data
      proceedWithFormSubmission();
    }
  };

  // Helper function to proceed with form submission using specific form data
  const proceedWithFormSubmissionWithData = (formDataToSubmit: FormData) => {
    // Clean up form data before submission based on mileage checkbox state
    const cleanedFormData = { ...formDataToSubmit };
    if (!showMileage) {
      // Remove mileage-related data when mileage is disabled
      cleanedFormData.mileageStartAddress = "";
      cleanedFormData.mileageStartMileage = "";
      // Reset addresses to just one empty address when mileage is disabled
      cleanedFormData.endAddresses = [""];
      cleanedFormData.additionalDropdownValues = [""];
    }

    onSubmit(cleanedFormData);
  };

  // Handlers for overlap warning modal
  const handleOverlapConfirm = () => {
    setShowOverlapWarning(false);
    // Continue with the normal submission flow (check mileage warnings next)
    proceedWithFormSubmission();
  };

  const handleOverlapCancel = () => {
    setShowOverlapWarning(false);
  };

  // Function to proceed with form submission after overlap check
  const proceedWithFormSubmission = () => {
    // Check for mileage warning and confirm with user
    if (showMileageWarning) {
      setShowMileageConfirmation(true);
      return;
    }

    // Clean up form data before submission based on mileage checkbox state
    const cleanedFormData = { ...formData };
    if (!showMileage) {
      // Remove mileage-related data when mileage is disabled
      cleanedFormData.mileageStartAddress = "";
      cleanedFormData.mileageStartMileage = "";
      // Reset addresses to just one empty address when mileage is disabled
      cleanedFormData.endAddresses = [""];
      cleanedFormData.additionalDropdownValues = [""];
    }

    onSubmit(cleanedFormData);
  };

  // Handler for Note Genius modal
  const handleNoteGeniusAccept = (optimizedText: string) => {
    setFormData(prev => ({
      ...prev,
      noteSummary47e: optimizedText
    }));
    setShowNoteGeniusModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission if there's a time validation error
    if (timeValidationError) {
      return;
    }

    // Validate required fields for each service type
  const missingFields: string[] = [];
    if (formData.serviceTypeIdentifier === "56a") {
      if (!formData.caseNumber) missingFields.push("Case Number");
      if (!formData.dateOfService) missingFields.push("Date of Service");
      if (!formData.startTime) missingFields.push("Start Time");
      if (!formData.endTime) missingFields.push("End Time");
      if (!formData.personServed) missingFields.push("Person Served");
      if (!formData.observationNotes56a?.pickUpAddress) missingFields.push("Pick Up Address");
      if (!formData.observationNotes56a?.locationAddress) missingFields.push("Location Address");
      if (!formData.observationNotes56a?.purposeOfTransportation) missingFields.push("Purpose of Transportation");
      if (!formData.observationNotes56a?.delaysDescription) missingFields.push("Delays Description");
      if (!formData.observationNotes56a?.interactionsWithParentGuardian) missingFields.push("Interactions With Parent/Guardian");
      if (!formData.observationNotes56a?.interactionsWithClient) missingFields.push("Interactions With Client");
      if (!formData.observationNotes56a?.clientDressedAppropriately) missingFields.push("Client Dressed Appropriately");
      if (!formData.observationNotes56a?.concerns) missingFields.push("Concerns");
      
      // Only validate mileage-related fields if mileage is enabled
      if (showMileage) {
        if (!formData.mileageStartAddress) missingFields.push("Start Address");
        if (!formData.mileageStartMileage) missingFields.push("Start Mileage");
        formData.endAddresses.forEach((addr, i) => {
          if (!addr) missingFields.push(`Stop ${i + 1} Address`);
        });
        formData.additionalDropdownValues.forEach((val, i) => {
          if (!val) missingFields.push(`Purpose for Stop ${i + 1}`);
        });
      }
    } else if (formData.serviceTypeIdentifier === "47e") {
      if (!formData.caseNumber) missingFields.push("Case Number");
      if (!formData.dateOfService) missingFields.push("Date of Service");
      if (!formData.startTime) missingFields.push("Start Time");
      if (!formData.endTime) missingFields.push("End Time");
      if (!formData.personServed) missingFields.push("Person Served");
      if (!formData.noteSummary47e) missingFields.push("Note Summary (47e)");
      
      // Only validate mileage-related fields if mileage is enabled
      if (showMileage) {
        if (!formData.mileageStartAddress) missingFields.push("Start Address");
        if (!formData.mileageStartMileage) missingFields.push("Start Mileage");
        formData.endAddresses.forEach((addr, i) => {
          if (!addr) missingFields.push(`Stop ${i + 1} Address`);
        });
        formData.additionalDropdownValues.forEach((val, i) => {
          if (!val) missingFields.push(`Purpose for Stop ${i + 1}`);
        });
      }
    }

    if (missingFields.length > 0) {
      setRequiredError(`Please fill out all required fields: ${missingFields.join(", ")}`);
      return;
    } else {
      setRequiredError("");
    }

    // Check for overlapping entries first
    const overlapCheck = checkForOverlappingEntries(formData.dateOfService, formData.startTime, formData.endTime);
    if (overlapCheck) {
      setOverlapWarningData(overlapCheck);
      setShowOverlapWarning(true);
      return;
    }

    // If no overlap, proceed with normal submission flow
    proceedWithFormSubmission();
  };

  const clearSavedCredentials = () => {
    localStorage.removeItem('caseFormCredentials');
    setSaveCredentials(false);
    setFormData(prev => ({
      ...prev,
      companyCode: "",
      username: "",
      password: "",
    }));
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;

    if (!isLoggedIn || !userId) {
      alert('Please log in to save templates');
      return;
    }

    // Check if a template with this name already exists
    const existingTemplate = savedTemplates.find(t => t.name.toLowerCase() === templateName.trim().toLowerCase());
    
    if (existingTemplate && !overwriteMode) {
      // If template exists and we're not in overwrite mode, prompt for overwrite
      setOverwriteMode(true);
      setExistingTemplateId(existingTemplate.id);
      return;
    }

    const template: FormTemplate = {
      id: overwriteMode && existingTemplateId ? existingTemplateId : Math.random().toString(36).substring(2, 15),
      name: templateName.trim(),
      createdAt: overwriteMode ? existingTemplate?.createdAt || new Date().toISOString() : new Date().toISOString(),
      showMileage: showMileage, // Save the mileage checkbox state at root level
      formData: {
        caseNumber: formData.caseNumber,
        startTime: formData.startTime,
        endTime: formData.endTime,
        serviceTypeIdentifier: formData.serviceTypeIdentifier,
        personServed: formData.personServed,
        mileageStartAddress: formData.mileageStartAddress,
        mileageStartMileage: formData.mileageStartMileage,
        observationNotes56a: formData.observationNotes56a,
        endAddresses: formData.endAddresses,
        additionalDropdownValues: formData.additionalDropdownValues,
        noteSummary47e: formData.noteSummary47e,
        // Don't save showMileage in formData to avoid confusion
      }
    };

    let updatedTemplates: FormTemplate[];
    
    if (overwriteMode && existingTemplateId) {
      // Replace the existing template
      updatedTemplates = savedTemplates.map(t => t.id === existingTemplateId ? template : t);
    } else {
      // Add as new template
      updatedTemplates = [...savedTemplates, template];
    }

    setSavedTemplates(updatedTemplates);

    // Save to Firebase
    try {
      await saveTemplateToFirebase(template, userId);
      console.log('Template saved to Firebase successfully');
    } catch (error) {
      console.error('Failed to save template to Firebase:', error);
      alert('Failed to save template. Please try again.');
      return;
    }

    // Reset states
    setTemplateName("");
    setShowTemplateModal(false);
    setOverwriteMode(false);
    setExistingTemplateId(null);
  };

  const cancelOverwrite = () => {
    setOverwriteMode(false);
    setExistingTemplateId(null);
    // Keep the modal open and template name so user can change the name
  };

  const loadTemplate = (template: FormTemplate) => {
    if (!template.formData) {
      console.error('Template formData is undefined:', template);
      return;
    }
    
    console.log('Loading template:', template.name);
    
    // Use functional update to get current credentials at the time of execution
    setFormData(currentFormData => {
      // Preserve existing credentials when loading template
      const currentCredentials = {
        companyCode: currentFormData.companyCode,
        username: currentFormData.username,
        password: currentFormData.password
      };
      
      // Return completely new form data with template data and preserved credentials
      return {
        ...template.formData,
        ...currentCredentials,
        // Ensure required fields have default values
        dateOfService: template.formData.dateOfService || ''
      };
    });
    

    if (template.showMileage !== undefined) {
      console.log('Using root level showMileage:', template.showMileage);
      setShowMileage(template.showMileage);
    } else {
      console.log('No showMileage found, using fallback logic');
      // For backward compatibility with old templates that don't have showMileage field
      // Check if template has meaningful mileage data to determine if mileage should be shown
      const hasMeaningfulMileageData = Boolean(
        template.formData.mileageStartAddress || 
        template.formData.mileageStartMileage ||
        (template.formData.endAddresses && template.formData.endAddresses.length > 0)
      );
      console.log('Fallback logic result:', hasMeaningfulMileageData);
      setShowMileage(hasMeaningfulMileageData);
    }
    
    setShowLoadTemplates(false);
  };

  const deleteTemplate = async (templateId: string) => {
    if (!isLoggedIn || !userId) {
      alert('Please log in to delete templates');
      return;
    }

    const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updatedTemplates);

    // Delete from Firebase
    try {
      await deleteTemplateFromFirebase(templateId, userId);
      console.log('Template deleted from Firebase successfully');
    } catch (error) {
      console.error('Failed to delete template from Firebase:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  // Helper for input styling with readonly support
  const inputClassName = `input-underline ${readOnly ? 'read-only' : ''}`;
  const textareaClassName = `textarea-underline ${readOnly ? 'read-only' : ''}`;
  const timeInputClassName = `time-input-underline ${readOnly ? 'read-only' : ''}`;
  
  return (
    <div className="h-full overflow-y-auto">
      {requiredError && (
        <div className="mb-4 p-3 bg-error-bg border border-error-border rounded-md">
          <p className="text-sm text-error">{requiredError}</p>
        </div>
      )}
      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8"
          >
            <div className="mb-8">
              <h1 className="text-3xl font-ppneue text-text-primary mb-2">
                {readOnly ? "Submitted Case Data" : "Case Note Form"}
              </h1>
              <p className="text-text-secondary font-ppsupply">
                {readOnly 
                  ? "Review the data that was submitted for automation." 
                  : "Fill out the form below to automatically create and populate case notes."
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Template Management - hide in read-only mode */}
              {!readOnly && (
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-text-primary">Form Templates</h3>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => isLoggedIn ? setShowLoadTemplates(true) : onLoginRequested?.()}
                        disabled={!isLoggedIn && savedTemplates.length === 0}
                        className="px-4 py-2 text-sm bg-background-secondary text-text-secondary rounded-md hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Load Template ({savedTemplates.length}){!isLoggedIn && ' (Login Required)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => isLoggedIn ? setShowTemplateModal(true) : onLoginRequested?.()}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Save as Template {!isLoggedIn && '(Login Required)'}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Save your form data as templates for quick reuse. Templates do not include login credentials.
                    {isLoggedIn ? ' Templates are saved to your Firebase account.' : ' Login required to save and load templates.'}
                  </p>
                </div>
              )}
              {/* Login Credentials */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-text-primary">Ecasenote Login Credentials</h3>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={saveCredentials}
                        onChange={(e) => setSaveCredentials(e.target.checked)}
                        className="mr-2 h-4 w-4 text-primary-color focus:ring-primary border-border bg-background-secondary rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Save credentials locally</span>
                    </label>
                    {saveCredentials && (
                      <button
                        type="button"
                        onClick={clearSavedCredentials}
                        className="text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Clear saved
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="input-group">
                    <input
                      type="text"
                      required
                      value={formData.companyCode}
                      onChange={(e) => handleInputChange("companyCode", e.target.value)}
                      readOnly={readOnly}
                      className={inputClassName}
                      placeholder=" "
                    />
                    <label className="input-label">
                      Company Code <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <div className="input-group">
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                      readOnly={readOnly}
                      className={inputClassName}
                      placeholder=" "
                    />
                    <label className="input-label">
                      Username <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <div className="input-group">
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      readOnly={readOnly}
                      className={inputClassName}
                      placeholder=" "
                    />
                    <label className="input-label">
                      Password <span className="text-red-500">*</span>
                    </label>
                  </div>
                </div>
                {saveCredentials && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Credentials will be saved locally in your browser. This data is not stored on any external servers.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Case Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="input-group">
                  <input
                    type="text"
                    required
                    value={formData.caseNumber}
                    onChange={(e) => handleInputChange("caseNumber", e.target.value)}
                    readOnly={readOnly}
                    className={inputClassName}
                    placeholder=" "
                  />
                  <label className="input-label">
                    Case Number <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="input-group">
                  <label className="input-label-reg">
                    Date of Service <span className="text-red-500">*</span>
                  </label>
                  <CustomDatePicker
                    value={formData.dateOfService}
                    onChange={(value) => handleInputChange("dateOfService", value)}
                    readOnly={readOnly}
                    className={inputClassName}
                  />
                  
                  {/* Mileage History Display */}
                  {isLoggedIn && mileageHistory.length > 0 && (
                    <div className="mt-3 p-3 bg-background-secondary border border-border rounded-md">
                      <h4 className="text-sm font-medium text-text-primary mb-2">
                        Recent E-Automate Note History
                      </h4>
                      <div className="space-y-2">
                        {mileageHistory.map((entry, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-text-secondary">
                              {parseLocalDate(entry.dateOfService).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })} - {formatTimeToAMPM(entry.startTime)} to {formatTimeToAMPM(entry.endTime)}
                            </span>
                            <span className="text-accent font-mono text-xs">
                              {entry.endMileage ? `End: ${entry.endMileage}` : 'No mileage'}
                            </span>
                          </div>
                        ))}
                      </div>
                      {isLoadingMileageHistory && (
                        <div className="flex items-center mt-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-accent"></div>
                          <span className="ml-2 text-xs text-accent">Loading...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Time Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CustomTimeInput
                  value={formData.startTime}
                  onChange={(value) => handleInputChange("startTime", value)}
                  label="Start Time"
                  required={true}
                  readOnly={readOnly}
                  error={timeValidationError}
                />
                <CustomTimeInput
                  value={formData.endTime}
                  onChange={(value) => handleInputChange("endTime", value)}
                  label="End Time"
                  required={true}
                  readOnly={readOnly}
                  error={timeValidationError}
                />
                <CustomSelect
                  options={[
                    { value: "56a", label: "56a" },
                    { value: "47e", label: "47e" }
                  ]}
                  value={formData.serviceTypeIdentifier}
                  onChange={(value) => handleInputChange("serviceTypeIdentifier", value)}
                  label="Service Type"
                  required={true}
                  disabled={readOnly}
                />
              </div>

              {/* Time Validation Error Message */}
              {timeValidationError && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Start time cannot be greater than or equal to end time. Please ensure end time is after start time.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Person Served */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Person Served <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.personServed}
                  onChange={(e) => handleInputChange("personServed", e.target.value)}
                  readOnly={readOnly}
                  className={inputClassName}
                  placeholder="Enter person served"
                />
              </div>

              {/* Observation Notes for 56a */}
              {formData.serviceTypeIdentifier === "56a" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-text-primary">Observation Notes (56a)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pick Up Address with Autocomplete */}
                    <div>
                      <AddressAutocomplete
                        value={formData.observationNotes56a?.pickUpAddress || ""}
                        onChange={(value) => handleObservationNotesChange("pickUpAddress", value)}
                        label="Pick Up Address"
                        placeholder="Enter pickup address"
                        readOnly={readOnly}
                        required={true}
                      />
                    </div>

                    {/* Location Address with Autocomplete */}
                    <div>
                      <AddressAutocomplete
                        value={formData.observationNotes56a?.locationAddress || ""}
                        onChange={(value) => handleObservationNotesChange("locationAddress", value)}
                        label="Location Address"
                        placeholder="Enter location address"
                        readOnly={readOnly}
                        required={true}
                      />
                    </div>

                    {/* Purpose of Transportation as text input */}
                    <div className="input-group">
                      <input
                        type="text"
                        value={formData.observationNotes56a?.purposeOfTransportation || ''}
                        onChange={e => handleObservationNotesChange('purposeOfTransportation', e.target.value)}
                        className={inputClassName}
                        placeholder=" "
                        disabled={readOnly}
                        required
                      />
                      <label className="input-label">
                        Purpose of Transportation <span className="text-red-500">*</span>
                      </label>
                    </div>

                    {/* Other observation note fields except purposeOfTransportation, pickUpAddress, locationAddress */}
                    {Object.entries(formData.observationNotes56a || {})
                      .filter(([key]) => key !== 'pickUpAddress' && key !== 'locationAddress' && key !== 'purposeOfTransportation')
                      .map(([key, value]) => (
                        <div key={key} className="input-group">
                          <textarea
                            value={value}
                            onChange={(e) => handleObservationNotesChange(key, e.target.value)}
                            readOnly={readOnly}
                            rows={3}
                            placeholder=" "
                            className={textareaClassName}
                          />
                          <label className="input-label">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} <span className="text-red-500">*</span>
                          </label>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Note Summary for 47e */}
              {formData.serviceTypeIdentifier === "47e" && (
                <div className="input-group">
                  <div className="relative">
                    <textarea
                      value={formData.noteSummary47e}
                      onChange={(e) => handleInputChange("noteSummary47e", e.target.value)}
                      rows={6}
                      minLength={400}
                      className={`${textareaClassName} pb-8`}
                      placeholder=" "
                      readOnly={readOnly}
                    />
                    <label className="input-label">
                      Note Summary (47e) <span className="text-red-500">*</span>
                    </label>
                    {/* Character Counter */}
                    <div className={`absolute bottom-2 right-2 text-xs ${
                      (formData.noteSummary47e || '').length > 380 
                        ? 'text-red-500' 
                        : (formData.noteSummary47e || '').length > 350
                        ? 'text-yellow-600'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {(formData.noteSummary47e || '').length}/400
                    </div>
                  </div>
                  
                  {/* Note Genius Button */}
                  {!readOnly && (
                    <div className="mt-3 flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setShowNoteGeniusModal(true)}
                        disabled={!(formData.noteSummary47e || '').trim()}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-md hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Optimize with Note Genius
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange("noteSummary47e", "")}
                        disabled={!(formData.noteSummary47e || '').trim()}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-text-secondary bg-background-secondary border border-border rounded-md hover:bg-background-tertiary focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear
                      </button>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          AI will format and optimize your note with professional structure
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mileage Section */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-text-primary">Mileage Information</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showMileage}
                      onChange={(e) => handleMileageToggle(e.target.checked)}
                      disabled={readOnly}
                      className="mr-2 h-4 w-4 text-primary-color focus:ring-primary border-border bg-background-secondary rounded disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include Mileage</span>
                  </label>
                </div>

                {showMileage && (
                  <div className="space-y-6">
                    <div className="mb-4 p-3 bg-background-secondary border border-border rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-accent" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-text-secondary">
                            <strong>Note:</strong> Mileage will be calculated automatically by Ecasenotes based on the addresses provided. You only need to enter the starting mileage reading from your vehicle.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <AddressAutocomplete
                          value={formData.mileageStartAddress || ""}
                          onChange={(value) => handleInputChange("mileageStartAddress", value)}
                          label="Start Address"
                          placeholder="Enter start address"
                          readOnly={readOnly}
                          required={true}
                        />
                      </div>
                      <div className="input-group">
                        <input
                          type="text"
                          value={formData.mileageStartMileage}
                          onChange={(e) => handleInputChange("mileageStartMileage", e.target.value)}
                          readOnly={readOnly}
                          className={inputClassName}
                          placeholder=" "
                        />
                        <label className="input-label">
                          Start Mileage <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          {isLoggedIn && lastProcessedMileage && !readOnly && (
                            <button
                              type="button"
                              onClick={setCurrentMileage}
                              disabled={isLoadingMileage}
                              className="flex items-center px-3 py-1 text-xs bg-background-secondary text-text-secondary border border-border rounded-md hover:bg-background-tertiary transition-colors disabled:opacity-50"
                            >
                              {isLoadingMileage ? (
                                <span>Loading...</span>
                              ) : (
                                <>
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                  Set Current Mileage ({lastProcessedMileage})
                                </>
                              )}
                            </button>
                          )}
                          {showMileageWarning && (
                            <div className="flex items-start p-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md">
                              <svg className="w-4 h-4 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                                <strong>Warning:</strong> Start mileage ({formData.mileageStartMileage}) is lower than your last processed mileage ({lastProcessedMileage}). Please verify this is correct.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stops */}
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-text-primary">
                          Stops <span className="text-red-500">*</span>
                        </label>
                      </div>
                      {formData.endAddresses.map((address, index) => {
                        const isExpanded = isStopExpanded(index);
                        const purpose = formData.additionalDropdownValues[index];
                        const purposeLabel = dropdownOptions.find(opt => opt.value === purpose)?.label || purpose || 'No purpose selected';
                        
                        return (
                          <div key={index} className="border border-border rounded-lg mb-4">
                            {/* Accordion Header */}
                            <div 
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-background-secondary transition-colors"
                              onClick={() => toggleStopExpansion(index)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-text-primary">
                                    Stop {index + 1}
                                  </span>
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="truncate max-w-48">
                                      {address || 'No address entered'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <span className="truncate max-w-32">
                                      {purposeLabel}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!readOnly && formData.endAddresses.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeEndAddress(index);
                                    }}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Remove Stop"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                >
                                  <svg 
                                    className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            {/* Accordion Content */}
                            <div 
                              className={` transition-all duration-300 ease-in-out ${
                                isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                              }`}
                            >
                              <div className="px-4 pb-4 space-y-4">
                                {/* Address Fields Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="input-group">
                                    <input
                                      type="text"
                                      value={index === 0 ? (formData.mileageStartAddress || "") : (formData.endAddresses[index - 1] || "")}
                                      readOnly={true}
                                      className="input-underline bg-background-secondary text-text-secondary cursor-not-allowed"
                                      placeholder=" "
                                    />
                                    <label className="input-label">
                                      Stop {index + 1} Start Address
                                    </label>
                                  </div>
                                  <div>
                                    <AddressAutocomplete
                                      value={address}
                                      onChange={(value) => handleEndAddressChange(index, value)}
                                      label={`Stop ${index + 1} End Address`}
                                      placeholder={`Enter stop ${index + 1} end address`}
                                      readOnly={readOnly}
                                      required={true}
                                    />
                                    {!readOnly && (autoSetData.homeAddress || autoSetData.officeAddress) && (
                                      <div className="flex gap-2 mt-2">
                                        {autoSetData.homeAddress && (
                                          <button
                                            type="button"
                                            onClick={() => handleEndAddressChange(index, autoSetData.homeAddress)}
                                            className="px-2 py-1 text-xs bg-background-secondary text-text-secondary rounded hover:bg-background-tertiary transition-colors"
                                          >
                                            Set Home
                                          </button>
                                        )}
                                        {autoSetData.officeAddress && (
                                          <button
                                            type="button"
                                            onClick={() => handleEndAddressChange(index, autoSetData.officeAddress)}
                                            className="px-2 py-1 text-xs bg-background-secondary text-text-secondary rounded hover:bg-background-tertiary transition-colors"
                                          >
                                            Set Office
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Purpose Field */}
                                <div className="grid grid-cols-1 gap-4">
                                  <CustomSelect
                                    options={[
                                      { value: "", label: "Select purpose" },
                                      ...dropdownOptions.map(option => ({ value: option.value, label: option.label }))
                                    ]}
                                    value={formData.additionalDropdownValues[index]}
                                    onChange={(value) => handleDropdownValueChange(index, value)}
                                    label="Purpose"
                                    required={true}
                                    disabled={readOnly}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Add Stop Button - hide in read-only mode */}
                      {!readOnly && (
                        <div className="flex justify-center mt-4">
                          <button
                            type="button"
                            onClick={addEndAddress}
                            className="px-4 py-2 text-sm bg-primary text-white rounded-md transition-colors"
                          >
                            Add Stop
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button - hide in read-only mode */}
              {!readOnly && (
                <div className="flex justify-end pt-6">
                  <button
                    type="submit"
                    disabled={isLoading || timeValidationError}
                    className="invisible px-8 py-3 bg-primary text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isLoading ? "Processing..." : "Start Automation"}
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      </div>

      {/* Address Selection Modal */}
      {showAddressSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-overlay)' }}>
          <div className="rounded-lg shadow-xl border p-8 w-full max-w-md" style={{ backgroundColor: 'var(--bg-modal)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Select Start Address</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Choose which saved address to use as your mileage start address:
            </p>
            <div className="space-y-3">
              {autoSetData.homeAddress && (
                <button
                  onClick={() => selectStartAddress(autoSetData.homeAddress)}
                  className="w-full p-3 text-left border rounded-md transition-colors"
                  style={{ 
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Home Address</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{autoSetData.homeAddress}</div>
                </button>
              )}
              {autoSetData.officeAddress && (
                <button
                  onClick={() => selectStartAddress(autoSetData.officeAddress)}
                  className="w-full p-3 text-left border rounded-md transition-colors"
                  style={{ 
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Office Address</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{autoSetData.officeAddress}</div>
                </button>
              )}
              <button
                onClick={() => {
                  setShowMileage(true);
                  setShowAddressSelection(false);
                }}
                className="w-full p-3 text-left border rounded-md transition-colors"
                style={{ 
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--bg-secondary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Manual Entry</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enter address manually</div>
              </button>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAddressSelection(false)}
                className="px-4 py-2 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-overlay)' }}>
          <div className="rounded-lg p-6 w-full max-w-md mx-4" style={{ backgroundColor: 'var(--bg-modal)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
              {overwriteMode ? "Template Already Exists" : "Save Template"}
            </h3>
            
            {overwriteMode ? (
              <div className="mb-4">
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  A template with the name &ldquo;{templateName}&rdquo; already exists. Do you want to overwrite it?
                </p>
                <div className="border rounded-md p-3" style={{ backgroundColor: 'var(--warning-bg)', borderColor: 'var(--warning-border)' }}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--warning)' }}>
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm" style={{ color: 'var(--warning)' }}>
                        This will replace the existing template with the current form data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ 
                    backgroundColor: 'var(--bg-modal)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border)',
                    '--tw-ring-color': 'var(--primary)'
                  } as React.CSSProperties}
                  placeholder="Enter template name"
                  autoFocus
                />
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              {overwriteMode ? (
                <>
                  <button
                    type="button"
                    onClick={cancelOverwrite}
                    className="px-4 py-2 border rounded-md transition-colors"
                    style={{ 
                      color: 'var(--text-secondary)',
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--button-secondary)'
                    }}
                  >
                    Change Name
                  </button>
                  <button
                    type="button"
                    onClick={saveTemplate}
                    className="px-4 py-2 rounded-md transition-colors"
                    style={{ 
                      backgroundColor: 'var(--warning)',
                      color: 'var(--text-inverse)'
                    }}
                  >
                    Overwrite Template
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateModal(false);
                      setTemplateName("");
                      setOverwriteMode(false);
                      setExistingTemplateId(null);
                    }}
                    className="px-4 py-2 border rounded-md transition-colors"
                    style={{ 
                      color: 'var(--text-secondary)',
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--button-secondary)'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveTemplate}
                    disabled={!templateName.trim()}
                    className="px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ 
                      backgroundColor: 'var(--primary)',
                      color: 'var(--text-inverse)'
                    }}
                  >
                    Save Template
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Load Templates Modal */}
      {showLoadTemplates && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-overlay)' }}>
          <div className="rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-modal)', boxShadow: 'var(--shadow-xl)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Load Template</h3>
              <button
                onClick={() => setShowLoadTemplates(false)}
                className="transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {savedTemplates.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                <p>No templates saved yet.</p>
                <p className="text-sm mt-1">Fill out the form and save it as a template to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedTemplates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 transition-colors" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{template.name}</h4>
                        </div>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          Created: {new Date(template.createdAt).toLocaleDateString()} at {new Date(template.createdAt).toLocaleTimeString()}
                        </p>
                        <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span className="inline-block px-2 py-1 rounded mr-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            Service: {template.formData?.serviceTypeIdentifier || 'Unknown'}
                          </span>
                          {template.formData?.personServed && (
                            <span className="inline-block px-2 py-1 rounded mr-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                              Person: {template.formData.personServed}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadTemplate(template)}
                            className="px-3 py-1 text-sm rounded transition-colors"
                            style={{ 
                              backgroundColor: 'var(--primary)',
                              color: 'white'
                            }}
                          >
                            Load
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="px-3 py-1 text-sm rounded transition-colors"
                            style={{ 
                              backgroundColor: 'var(--error)',
                              color: 'white'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {/* Add to Queue Button - shown when automation is running */}
        {isExecuting && (
          <button
            type="button"
            onClick={() => {
              // Trigger form submission programmatically to add to queue
              const form = document.querySelector('form');
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={isLoading || timeValidationError}
            className="px-6 py-3 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
              />
            </svg>
            Add to Queue
          </button>
        )}
        
        {/* Main Run/Stop Button */}
        <button
          type="button"
          onClick={() => {
            if (isExecuting && onStopAutomation) {
              onStopAutomation();
            } else {
              // Trigger form submission programmatically
              const form = document.querySelector('form');
              if (form) {
                form.requestSubmit();
              }
            }
          }}
          disabled={!isExecuting && (isLoading || timeValidationError)}
          className={`px-6 py-3 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            isExecuting 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-primary'
          }`}
        >
          {isLoading ? (
            <>
              <svg 
                viewBox="25 25 50 50" 
                className="w-5 h-5"
                style={{
                  transformOrigin: 'center',
                  animation: 'rotate4 2s linear infinite',
                }}
              >
                <circle 
                  cx={50} 
                  cy={50} 
                  r={20} 
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={5}
                  strokeDasharray="2, 200"
                  strokeDashoffset={0}
                  strokeLinecap="round"
                  style={{
                    animation: 'dash4 1.5s ease-in-out infinite',
                  }}
                />
              </svg>
              <span>Processing...</span>
              <style jsx>{`
                @keyframes rotate4 {
                  100% {
                    transform: rotate(360deg);
                  }
                }
                @keyframes dash4 {
                  0% {
                    stroke-dasharray: 1, 200;
                    stroke-dashoffset: 0;
                  }
                  50% {
                    stroke-dasharray: 90, 200;
                    stroke-dashoffset: -35px;
                  }
                  100% {
                    stroke-dashoffset: -125px;
                  }
                }
              `}</style>
            </>
          ) : (
            <>
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isExecuting ? (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 6h12v12H6z" 
                  />
                ) : (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 10V3L4 14h7v7l9-11h-7z" 
                  />
                )}
              </svg>
              {isExecuting ? "Stop Automation" : "Run Automation"}
            </>
          )}
        </button>
      </div>

      {/* Mileage Warning Confirmation Modal */}
      <MileageWarningModal
        isVisible={showMileageConfirmation}
        onClose={handleMileageCancel}
        onConfirm={handleMileageConfirm}
        onSetCurrentMileage={handleSetCurrentMileage}
        currentMileage={formData.mileageStartMileage ? parseInt(formData.mileageStartMileage.replace(/,/g, '')) : undefined}
        lastMileage={lastProcessedMileage ? parseInt(lastProcessedMileage.replace(/,/g, '')) : undefined}
      />

      {/* Overlap Warning Modal */}
      {showOverlapWarning && (
        <ThemedModal
          isVisible={showOverlapWarning}
          onClose={handleOverlapCancel}
          title="Potential Overlap Detected"
          type="warning"
          showCancel={false}
          showConfirm={false}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This case appears to overlap with an existing entry:
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="font-medium text-black">Existing Entry:</p>
              <p className="text-sm text-black">
                <strong>Date:</strong> {overlapWarningData?.conflictingEntry?.dateOfService}
              </p>
              <p className="text-sm text-black">
                <strong>Time:</strong> {overlapWarningData?.conflictingEntry?.startTime} - {overlapWarningData?.conflictingEntry?.endTime}
              </p>
              <p className="text-sm text-black">
                <strong>Execution ID:</strong> {overlapWarningData?.conflictingEntry?.executionId}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-medium text-black">New Entry:</p>
              <p className="text-sm text-black">
                <strong>Date:</strong> {formData.dateOfService}
              </p>
              <p className="text-sm text-black">
                <strong>Time:</strong> {formData.startTime} - {formData.endTime}
              </p>
              <p className="text-sm text-black">
                <strong>Addresses:</strong> {formData.endAddresses.filter(addr => addr.trim()).join(', ')}
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Do you want to continue with this potentially overlapping entry?
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handleOverlapCancel}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleOverlapConfirm}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </ThemedModal>
      )}

      {/* Note Genius Modal */}
      <NoteGeniusModal
        isVisible={showNoteGeniusModal}
        onClose={() => setShowNoteGeniusModal(false)}
        onAccept={handleNoteGeniusAccept}
        originalText={formData.noteSummary47e || ''}
      />
    </div>
  );
}
