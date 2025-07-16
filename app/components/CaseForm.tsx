"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FormData } from "../script/automationScript";
import AddressAutocomplete from "./AddressAutocomplete";
import { saveTemplateToFirebase, getTemplatesFromFirebase, deleteTemplateFromFirebase } from "./firebaseTemplateService";
import { AutoSetData } from "./AutoSet";
import { dropdownOptions } from "../constants/dropdownOptions";

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
}

interface SavedCredentials {
  companyCode: string;
  username: string;
  password: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  createdAt: string;
  isAutoLoad?: boolean;
  formData: Omit<FormData, 'companyCode' | 'username' | 'password' | 'dateOfService'> & { dateOfService?: string };
}

export default function CaseForm({ onSubmit, isLoading, readOnly = false, initialFormData, isLoggedIn = false, userId, onLoginRequested, isExecuting = false, onStopAutomation }: CaseFormProps) {
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
  const hasAutoLoaded = useRef(false);

  // Load saved credentials and templates on component mount
  useEffect(() => {
    // If initialFormData is provided, use it (read-only mode)
    if (initialFormData) {
      setFormData(initialFormData);
      setShowMileage(Boolean(initialFormData.mileageStartAddress || initialFormData.mileageStartMileage));
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

    // Load saved templates from localStorage
    const savedTemplatesData = localStorage.getItem('caseFormTemplates');
    if (savedTemplatesData) {
      const templates = JSON.parse(savedTemplatesData);
      setSavedTemplates(templates);
      
      // Auto-load template if one is marked for auto-loading
      const autoLoadTemplate = templates.find((template: FormTemplate) => template.isAutoLoad);
      if (autoLoadTemplate && autoLoadTemplate.formData && !hasAutoLoaded.current) {
        setFormData(prev => ({
          ...prev,
          ...autoLoadTemplate.formData
        }));
        setShowMileage(Boolean(autoLoadTemplate.formData.mileageStartAddress || autoLoadTemplate.formData.mileageStartMileage));
        hasAutoLoaded.current = true;
      }
    }
  }, [initialFormData]);

  // Load Firebase templates when user logs in
  useEffect(() => {
    const loadFirebaseTemplates = async () => {
      if (isLoggedIn && userId) {
        try {
          const firebaseTemplates = await getTemplatesFromFirebase(userId);
          // Convert Firebase templates to local format and merge with local templates
          const localTemplates = JSON.parse(localStorage.getItem('caseFormTemplates') || '[]');
          const allTemplates = [...localTemplates, ...firebaseTemplates];
          // Remove duplicates based on template name and creation time
          const uniqueTemplates = allTemplates.filter((template, index, self) => 
            index === self.findIndex(t => t.name === template.name && t.createdAt === template.createdAt)
          );
          setSavedTemplates(uniqueTemplates);
          
          // Auto-load template if one is marked for auto-loading (only once)
          if (!hasAutoLoaded.current) {
            const autoLoadTemplate = uniqueTemplates.find((template: FormTemplate) => template.isAutoLoad);
            if (autoLoadTemplate && autoLoadTemplate.formData) {
              setFormData(prev => ({
                ...prev,
                ...autoLoadTemplate.formData
              }));
              setShowMileage(Boolean(autoLoadTemplate.formData.mileageStartAddress || autoLoadTemplate.formData.mileageStartMileage));
              hasAutoLoaded.current = true;
            }
          }
        } catch (error) {
          console.error('Failed to load templates from Firebase:', error);
        }
      }
    };

    loadFirebaseTemplates();
  }, [isLoggedIn, userId]);

  // Load auto-set data
  useEffect(() => {
    const savedAutoSetData = localStorage.getItem('autoSetData');
    if (savedAutoSetData) {
      setAutoSetData(JSON.parse(savedAutoSetData));
    }
  }, []);

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
      formData.endAddresses.forEach((addr, i) => {
        if (!addr) missingFields.push(`Stop ${i + 1} Address`);
      });
      formData.additionalDropdownValues.forEach((val, i) => {
        if (!val) missingFields.push(`Purpose for Stop ${i + 1}`);
      });
      // Check mileage fields if mileage is enabled
      if (showMileage) {
        if (!formData.mileageStartMileage) missingFields.push("Start Mileage");
      }
    } else if (formData.serviceTypeIdentifier === "47e") {
      if (!formData.caseNumber) missingFields.push("Case Number");
      if (!formData.dateOfService) missingFields.push("Date of Service");
      if (!formData.startTime) missingFields.push("Start Time");
      if (!formData.endTime) missingFields.push("End Time");
      if (!formData.personServed) missingFields.push("Person Served");
      if (!formData.noteSummary47e) missingFields.push("Note Summary (47e)");
      formData.endAddresses.forEach((addr, i) => {
        if (!addr) missingFields.push(`Stop ${i + 1} Address`);
      });
      formData.additionalDropdownValues.forEach((val, i) => {
        if (!val) missingFields.push(`Purpose for Stop ${i + 1}`);
      });
      // Check mileage fields if mileage is enabled
      if (showMileage) {
        if (!formData.mileageStartMileage) missingFields.push("Start Mileage");
      }
    }

    if (missingFields.length > 0) {
      setRequiredError(`Please fill out all required fields: ${missingFields.join(", ")}`);
      return;
    } else {
      setRequiredError("");
    }

    onSubmit(formData);
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
    localStorage.setItem('caseFormTemplates', JSON.stringify(updatedTemplates));

    // Save to Firebase if logged in
    if (isLoggedIn && userId) {
      try {
        await saveTemplateToFirebase(template, userId);
        console.log('Template saved to Firebase successfully');
      } catch (error) {
        console.error('Failed to save template to Firebase:', error);
        // Template is still saved locally even if Firebase fails
      }
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
    
    setFormData(prev => ({
      ...prev,
      ...template.formData
    }));
    // Update mileage visibility based on template data
    setShowMileage(Boolean(template.formData.mileageStartAddress || template.formData.mileageStartMileage));
    setShowLoadTemplates(false);
  };

  const deleteTemplate = async (templateId: string) => {
    const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updatedTemplates);
    localStorage.setItem('caseFormTemplates', JSON.stringify(updatedTemplates));

    // Delete from Firebase if logged in
    if (isLoggedIn && userId) {
      try {
        await deleteTemplateFromFirebase(templateId, userId);
        console.log('Template deleted from Firebase successfully');
      } catch (error) {
        console.error('Failed to delete template from Firebase:', error);
        // Template is still deleted locally even if Firebase fails
      }
    }
  };

  const setAutoLoadTemplate = async (templateId: string) => {
    const updatedTemplates = savedTemplates.map(template => ({
      ...template,
      isAutoLoad: template.id === templateId
    }));
    
    setSavedTemplates(updatedTemplates);
    localStorage.setItem('caseFormTemplates', JSON.stringify(updatedTemplates));

    // Update Firebase if logged in
    if (isLoggedIn && userId) {
      try {
        // Update all templates in Firebase to reflect auto-load changes
        for (const template of updatedTemplates) {
          await saveTemplateToFirebase(template, userId);
        }
        console.log('Auto-load template setting updated in Firebase successfully');
      } catch (error) {
        console.error('Failed to update auto-load setting in Firebase:', error);
      }
    }
  };

  // Helper for input styling with readonly support
  const inputClassName = `w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent ${readOnly ? 'read-only:bg-gray-50 read-only:dark:bg-gray-800 read-only:cursor-default' : ''}`;
  
  return (
    <div className="h-full overflow-y-auto">
      {requiredError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-300">{requiredError}</p>
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
              <h1 className="text-3xl font-ppneue text-gray-900 dark:text-gray-100 mb-2">
                {readOnly ? "Submitted Case Data" : "Case Note Form"}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 font-ppsupply">
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Form Templates</h3>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowLoadTemplates(true)}
                        disabled={savedTemplates.length === 0}
                        className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Load Template ({savedTemplates.length})
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
                    {isLoggedIn ? ' Templates will be saved to both local storage and Firebase.' : ' Login required to save templates to Firebase.'}
                    {savedTemplates.some(t => t.isAutoLoad) && (
                      <span className="block mt-1 text-green-600 dark:text-green-400">
                        Auto-load template: <strong>{savedTemplates.find(t => t.isAutoLoad)?.name}</strong> will load automatically when you visit this page.
                      </span>
                    )}
                  </p>
                </div>
              )}
              {/* Login Credentials */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Ecasenote Login Credentials</h3>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={saveCredentials}
                        onChange={(e) => setSaveCredentials(e.target.checked)}
                        className="mr-2 h-4 w-4 text-[#FF3B00] focus:ring-[#FF3B00] border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyCode}
                      onChange={(e) => handleInputChange("companyCode", e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName}`}
                      placeholder="Enter company code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName}`}
                      placeholder="Enter Username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName}`}
                      placeholder="Enter password"
                    />
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Case Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.caseNumber}
                    onChange={(e) => handleInputChange("caseNumber", e.target.value)}
                    readOnly={readOnly}
                    className={inputClassName}
                    placeholder="Enter case number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Service <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfService}
                    onChange={(e) => handleInputChange("dateOfService", e.target.value)}
                    readOnly={readOnly}
                    className={inputClassName}
                  />
                </div>
              </div>

              {/* Time Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => handleInputChange("startTime", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent ${
                      timeValidationError 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => handleInputChange("endTime", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent ${
                      timeValidationError 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.serviceTypeIdentifier}
                    onChange={(e) => handleInputChange("serviceTypeIdentifier", e.target.value)}
                    disabled={readOnly}
                    className={inputClassName}
                  >
                    <option value="56a">56a</option>
                    <option value="47e">47e</option>
                  </select>
                </div>
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
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Observation Notes (56a)</h3>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Purpose of Transportation <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.observationNotes56a?.purposeOfTransportation || ''}
                        onChange={e => handleObservationNotesChange('purposeOfTransportation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Enter purpose of transportation"
                        disabled={readOnly}
                        required
                      />
                    </div>

                    {/* Other observation note fields except purposeOfTransportation, pickUpAddress, locationAddress */}
                    {Object.entries(formData.observationNotes56a || {})
                      .filter(([key]) => key !== 'pickUpAddress' && key !== 'locationAddress' && key !== 'purposeOfTransportation')
                      .map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={value}
                            onChange={(e) => handleObservationNotesChange(key, e.target.value)}
                            readOnly={readOnly}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent read-only:bg-gray-50 read-only:dark:bg-gray-800"
                            placeholder={`Enter ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Note Summary for 47e */}
              {formData.serviceTypeIdentifier === "47e" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Note Summary (47e) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.noteSummary47e}
                    onChange={(e) => handleInputChange("noteSummary47e", e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                    placeholder="Enter note summary for 47e service type"
                  />
                </div>
              )}

              {/* Mileage Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Mileage Information</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showMileage}
                      onChange={(e) => handleMileageToggle(e.target.checked)}
                      disabled={readOnly}
                      className="mr-2 h-4 w-4 text-[#FF3B00] focus:ring-[#FF3B00] border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include Mileage</span>
                  </label>
                </div>

                {showMileage && (
                  <div className="space-y-6">
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
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
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Mileage <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.mileageStartMileage}
                          onChange={(e) => handleInputChange("mileageStartMileage", e.target.value)}
                          readOnly={readOnly}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent read-only:bg-gray-50 read-only:dark:bg-gray-800"
                          placeholder="Enter start mileage"
                        />
                      </div>
                    </div>

                    {/* Stops */}
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Stops <span className="text-red-500">*</span>
                        </label>
                      </div>
                      {formData.endAddresses.map((address, index) => {
                        const isExpanded = isStopExpanded(index);
                        const purpose = formData.additionalDropdownValues[index];
                        const purposeLabel = dropdownOptions.find(opt => opt.value === purpose)?.label || purpose || 'No purpose selected';
                        
                        return (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
                            {/* Accordion Header */}
                            <div 
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => toggleStopExpansion(index)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
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
                              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                              }`}
                            >
                              <div className="px-4 pb-4 space-y-4">
                                {/* Address Fields Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Stop {index + 1} Start Address
                                    </label>
                                    <input
                                      type="text"
                                      value={index === 0 ? (formData.mileageStartAddress || "") : (formData.endAddresses[index - 1] || "")}
                                      readOnly={true}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                                      placeholder={index === 0 ? "Mileage start address" : "Previous stop address"}
                                    />
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
                                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                          >
                                            Set Home
                                          </button>
                                        )}
                                        {autoSetData.officeAddress && (
                                          <button
                                            type="button"
                                            onClick={() => handleEndAddressChange(index, autoSetData.officeAddress)}
                                            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
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
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Purpose <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      value={formData.additionalDropdownValues[index]}
                                      onChange={(e) => handleDropdownValueChange(index, e.target.value)}
                                      disabled={readOnly}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent disabled:bg-gray-50 disabled:dark:bg-gray-800"
                                    >
                                      <option value="">Select purpose</option>
                                      {dropdownOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Add Stop Button */}
                      {!readOnly && (
                        <div className="flex justify-center mt-4">
                          <button
                            type="button"
                            onClick={addEndAddress}
                            className="px-4 py-2 text-sm bg-[#FF3B00] text-white rounded-md hover:bg-[#E63400] transition-colors"
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
                <div className="flex justify-end pt-6 border-t">
                  <button
                    type="submit"
                    disabled={isLoading || timeValidationError}
                    className="invisible px-8 py-3 bg-[#FF3B00] text-white rounded-md hover:bg-[#E63400] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Select Start Address</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Choose which saved address to use as your mileage start address:
            </p>
            <div className="space-y-3">
              {autoSetData.homeAddress && (
                <button
                  onClick={() => selectStartAddress(autoSetData.homeAddress)}
                  className="w-full p-3 text-left border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">Home Address</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{autoSetData.homeAddress}</div>
                </button>
              )}
              {autoSetData.officeAddress && (
                <button
                  onClick={() => selectStartAddress(autoSetData.officeAddress)}
                  className="w-full p-3 text-left border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">Office Address</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{autoSetData.officeAddress}</div>
                </button>
              )}
              <button
                onClick={() => {
                  setShowMileage(true);
                  setShowAddressSelection(false);
                }}
                className="w-full p-3 text-left border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">Manual Entry</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Enter address manually</div>
              </button>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAddressSelection(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              {overwriteMode ? "Template Already Exists" : "Save Template"}
            </h3>
            
            {overwriteMode ? (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  A template with the name &ldquo;{templateName}&rdquo; already exists. Do you want to overwrite it?
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        This will replace the existing template with the current form data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Change Name
                  </button>
                  <button
                    type="button"
                    onClick={saveTemplate}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
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
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveTemplate}
                    disabled={!templateName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Load Template</h3>
              <button
                onClick={() => setShowLoadTemplates(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {savedTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No templates saved yet.</p>
                <p className="text-sm mt-1">Fill out the form and save it as a template to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedTemplates.map((template) => (
                  <div key={template.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{template.name}</h4>
                          {template.isAutoLoad && (
                            <span className="inline-block bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs font-medium">
                              Auto-Load
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Created: {new Date(template.createdAt).toLocaleDateString()} at {new Date(template.createdAt).toLocaleTimeString()}
                        </p>
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="inline-block bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded mr-2">
                            Service: {template.formData?.serviceTypeIdentifier || 'Unknown'}
                          </span>
                          {template.formData?.personServed && (
                            <span className="inline-block bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded mr-2">
                              Person: {template.formData.personServed}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadTemplate(template)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                        <button
                          onClick={() => setAutoLoadTemplate(template.id)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            template.isAutoLoad 
                              ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          disabled={template.isAutoLoad}
                        >
                          {template.isAutoLoad ? 'Auto-Loading' : 'Set Auto-Load'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Run/Stop Automation Button */}
      <div className="fixed bottom-6 right-6 z-40">
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
              : 'bg-[#FF3B00] hover:bg-[#E63400]'
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
    </div>
  );
}
