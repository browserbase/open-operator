"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import CaseForm from "./components/CaseForm";
import ExecutionView from "./components/ExecutionView";
import { FormData as CaseFormData } from "./script/automationScript";
import { FormData } from "./script/automationScript";

export default function Home() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [submittedFormData, setSubmittedFormData] = useState<CaseFormData | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'browser'>('form');

  const handleFormSubmit = async (formData: CaseFormData) => {
    setIsLoading(true);
    setSubmittedFormData(formData); // Store the form data
    
    try {
      const response = await fetch("/api/automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSessionUrl(result.sessionUrl);
        setExecutionId(result.executionId);
        setIsExecuting(true);
        setActiveTab('browser'); // Switch to browser tab when automation starts
      } else {
        console.error("Failed to start automation:", result.error);
        alert("Failed to start automation: " + result.error);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Error submitting form. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsExecuting(false);
    setSessionUrl(null);
    setExecutionId(null);
    setSubmittedFormData(null);
    setActiveTab('form'); // Reset to form tab
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="flex justify-between items-center px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Image
            src="/favicon.svg"
            alt="Open Operator"
            className="w-8 h-8"
            width={32}
            height={32}
          />
          <span className="font-ppsupply text-gray-900">
            {isExecuting ? "Automation in Progress" : "Case Note Automation"}
          </span>
        </div>
        {isExecuting && (
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Close
          </button>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Content Area with Tabs */}
        <div className="flex-1 p-6 border-r border-gray-200">
          {/* Tab Navigation */}
          <div className="mb-4">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('form')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'form'
                      ? 'border-[#FF3B00] text-[#FF3B00]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {isExecuting ? 'Form Data' : 'Case Form'}
                </button>
                <button
                  onClick={() => setActiveTab('browser')}
                  disabled={!isExecuting}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'browser' && isExecuting
                      ? 'border-[#FF3B00] text-[#FF3B00]'
                      : isExecuting
                      ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      : 'border-transparent text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Browser Session
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
            <AnimatePresence mode="wait">
              {activeTab === 'form' ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  {isExecuting && submittedFormData ? (
                    // Show form data when executing
                    <div className="p-6 h-full overflow-y-auto">
                      <FormDataDisplay formData={submittedFormData} />
                    </div>
                  ) : (
                    // Show form when not executing
                    <div className="h-full overflow-y-auto">
                      <CaseForm 
                        onSubmit={handleFormSubmit} 
                        isLoading={isLoading}
                      />
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="browser"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  {isExecuting ? (
                    <>
                      <div className="w-full h-12 bg-white border-b border-gray-200 flex items-center px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <div className="ml-4 text-sm text-gray-600">
                          Browser Session
                        </div>
                      </div>
                      <div className="p-4 h-full">
                        {sessionUrl ? (
                          <iframe
                            src={sessionUrl}
                            className="w-full h-full rounded-lg border border-gray-200"
                            sandbox="allow-same-origin allow-scripts allow-forms"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            title="Browser Session"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <div className="text-center">
                              <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                              <p>Initializing browser session...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p>Browser session will appear here when automation starts</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Progress Sidebar - only show when executing */}
        {isExecuting && (
          <ExecutionProgressSidebar 
            executionId={executionId || ''}
          />
        )}
      </main>
    </div>
  );
}

// FormDataDisplay component to show submitted form data
interface FormDataDisplayProps {
  formData: CaseFormData;
}

function FormDataDisplay({ formData }: FormDataDisplayProps) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Case Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Case Number</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
              {formData.caseNumber || 'Not provided'}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Service Type</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
              {formData.serviceTypeIdentifier || 'Not provided'}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Person Served</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
              {formData.personServed || 'Not provided'}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Service</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
              {formData.dateOfService || 'Not provided'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Start Time</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
              {formData.startTime || 'Not provided'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">End Time</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
              {formData.endTime || 'Not provided'}
            </div>
          </div>
        </div>
      </div>

      {formData.noteSummary47e && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Note Summary</label>
          <div className="p-4 bg-gray-50 rounded-md text-sm text-gray-900 min-h-[120px] whitespace-pre-wrap">
            {formData.noteSummary47e}
          </div>
        </div>
      )}

      {formData.observationNotes56a && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Observation Notes</label>
          <div className="p-4 bg-gray-50 rounded-md text-sm text-gray-900 space-y-2">
            {formData.observationNotes56a.pickUpAddress && (
              <div><strong>Pick-up Address:</strong> {formData.observationNotes56a.pickUpAddress}</div>
            )}
            {formData.observationNotes56a.locationAddress && (
              <div><strong>Location Address:</strong> {formData.observationNotes56a.locationAddress}</div>
            )}
            {formData.observationNotes56a.purposeOfTransportation && (
              <div><strong>Purpose:</strong> {formData.observationNotes56a.purposeOfTransportation}</div>
            )}
            {formData.observationNotes56a.interactionsWithClient && (
              <div><strong>Client Interactions:</strong> {formData.observationNotes56a.interactionsWithClient}</div>
            )}
            {formData.observationNotes56a.concerns && (
              <div><strong>Concerns:</strong> {formData.observationNotes56a.concerns}</div>
            )}
          </div>
        </div>
      )}

      {formData.endAddresses && formData.endAddresses.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Addresses</label>
          <div className="p-4 bg-gray-50 rounded-md text-sm text-gray-900">
            {formData.endAddresses.map((address, index) => (
              <div key={index} className="mb-1">{index + 1}. {address}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ExecutionProgressSidebar component to show progress in the sidebar
interface ExecutionProgressSidebarProps {
  executionId: string;
}

function ExecutionProgressSidebar({ executionId }: ExecutionProgressSidebarProps) {
  const [events, setEvents] = useState<Array<{ type: string; message?: string; data?: any }>>([]);
  const [progressSteps, setProgressSteps] = useState<{ [key: string]: ProgressStep }>({});

  // Define progress steps with proper state management
  const stepOrder = [
    'login',
    'navigation', 
    'search',
    'extract',
    'note-creation',
    'complete'
  ];

  const stepLabels = {
    'login': 'Signing in',
    'navigation': 'Navigating to workspace', 
    'search': 'Searching for case',
    'extract': 'Extracting case data',
    'note-creation': 'Creating case note',
    'complete': 'Automation complete'
  };

  useEffect(() => {
    const eventSource = new EventSource(`/api/automation/events?executionId=${executionId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        setEvents(prev => [...prev, eventData]);

        // Update progress steps based on events
        if (eventData.type === 'progress') {
          const stepKey = eventData.data?.step || eventData.message?.toLowerCase().replace(/[^a-z]/g, '');
          if (stepKey) {
            setProgressSteps(prev => ({
              ...prev,
              [stepKey]: { status: 'loading', timestamp: Date.now() }
            }));
          }
        } else if (eventData.type === 'success') {
          const stepKey = eventData.data?.step || eventData.message?.toLowerCase().replace(/[^a-z]/g, '');
          if (stepKey) {
            setProgressSteps(prev => ({
              ...prev,
              [stepKey]: { status: 'completed', timestamp: Date.now() }
            }));
          }
        } else if (eventData.type === 'error') {
          const stepKey = eventData.data?.step || eventData.message?.toLowerCase().replace(/[^a-z]/g, '');
          if (stepKey) {
            setProgressSteps(prev => ({
              ...prev,
              [stepKey]: { status: 'error', timestamp: Date.now() }
            }));
          }
        }
      } catch (e) {
        console.error('Error parsing event data:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource failed:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [executionId]);

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Progress</h3>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {stepOrder.map((stepKey) => {
            const step = progressSteps[stepKey];
            const label = stepLabels[stepKey as keyof typeof stepLabels];
            
            return (
              <div key={stepKey} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {step?.status === 'completed' ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : step?.status === 'loading' ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  ) : step?.status === 'error' ? (
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                <span className={`text-sm ${
                  step?.status === 'completed' ? 'text-green-700' : 
                  step?.status === 'loading' ? 'text-blue-600' :
                  step?.status === 'error' ? 'text-red-600' : 
                  'text-gray-500'
                }`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface ProgressStep {
  status: 'loading' | 'completed' | 'error';
  timestamp: number;
}
