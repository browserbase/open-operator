"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { FormData } from "../script/automationScript";

interface ExecutionViewProps {
  onClose: () => void;
  sessionUrl?: string;
  executionId?: string;
  formData?: FormData;
}

interface ProgressUpdate {
  type: "progress" | "success" | "error" | "screenshot" | "finished";
  message: string;
  data?: {
    mimeType?: string;
    data?: string;
  };
}

interface ProgressStep {
  id: string;
  message: string;
  status: "loading" | "completed" | "error";
  timestamp: number;
}

export default function ExecutionView({ onClose, sessionUrl, executionId, formData }: ExecutionViewProps) {
  const [progress, setProgress] = useState<ProgressUpdate[]>([]);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'browser' | 'form'>('browser');

  // Connect to real-time events via Server-Sent Events
  useEffect(() => {
    if (!executionId) {
      console.warn("No executionId provided for ExecutionView");
      return;
    }

    console.log("Connecting to automation events for execution:", executionId);
    
    const eventSource = new EventSource(`/api/automation/events?executionId=${executionId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received event:", data);
        
        const progressUpdate: ProgressUpdate = {
          type: data.type as ProgressUpdate['type'],
          message: data.message,
          data: data.data
        };
        
        setProgress(prev => [...prev, progressUpdate]);
        
        // Handle progress steps with proper state management
        if (data.type === 'progress') {
          const stepId = `step-${Date.now()}-${Math.random()}`;
          setProgressSteps(prev => [...prev, {
            id: stepId,
            message: data.message,
            status: "loading" as const,
            timestamp: Date.now()
          }]);
        } else if (data.type === 'success') {
          // Mark the latest loading step as completed
          setProgressSteps(prev => {
            const updated = [...prev];
            // Find the most recent loading step and mark it as completed
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].status === "loading") {
                updated[i].status = "completed" as const;
                break;
              }
            }
            return updated;
          });
        } else if (data.type === 'error') {
          // Mark the latest loading step as error
          setProgressSteps(prev => {
            const updated = [...prev];
            // Find the most recent loading step and mark it as error
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].status === "loading") {
                updated[i].status = "error" as const;
                break;
              }
            }
            return updated;
          });
        }
        
        // Handle screenshots
        if (data.type === 'screenshot' && data.data?.data) {
          setCurrentScreenshot(`data:${data.data.mimeType};base64,${data.data.data}`);
        }
        
        // Handle completion
        if (data.type === 'finished') {
          setIsComplete(true);
          // Mark any remaining loading steps as completed
          setProgressSteps(prev => {
            const updated = prev.map(step => 
              step.status === "loading" ? { ...step, status: "completed" as const } : step
            );
            // Add a final completion step
            updated.push({
              id: `completed-${Date.now()}`,
              message: data.message || "Process Completed!",
              status: "completed" as const,
              timestamp: Date.now()
            });
            return updated;
          });
        }
      } catch (error) {
        console.error("Failed to parse event data:", error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);
    };
    
    // Cleanup on unmount
    return () => {
      console.log("Closing SSE connection for execution:", executionId);
      eventSource.close();
    };
  }, [executionId]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case "loading":
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      case "completed":
        return (
          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case "loading":
        return "text-blue-600";
      case "completed":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // Component to display form data
  const FormDataView = () => {
    if (!formData) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Submitted Form Data</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                No form data available.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Submitted Form Data</h3>
        </div>
        
        {/* Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Authentication</h4>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company Code</label>
              <p className="text-sm text-gray-900">{formData.companyCode}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Username</label>
              <p className="text-sm text-gray-900">{formData.username}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Password</label>
              <p className="text-sm text-gray-900">••••••••</p>
            </div>
          </div>
        </div>

        {/* Case Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Case Information</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Case Number</label>
              <p className="text-sm text-gray-900">{formData.caseNumber}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Person Served</label>
              <p className="text-sm text-gray-900">{formData.personServed}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date of Service</label>
              <p className="text-sm text-gray-900">{formData.dateOfService}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Service Type</label>
              <p className="text-sm text-gray-900">{formData.serviceTypeIdentifier}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Time</label>
              <p className="text-sm text-gray-900">{formData.startTime}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Time</label>
              <p className="text-sm text-gray-900">{formData.endTime}</p>
            </div>
          </div>
        </div>

        {/* Mileage Information */}
        {formData.mileageStartAddress && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Mileage Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Address</label>
                <p className="text-sm text-gray-900">{formData.mileageStartAddress}</p>
              </div>
              {formData.mileageStartMileage && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Mileage</label>
                  <p className="text-sm text-gray-900">{formData.mileageStartMileage}</p>
                </div>
              )}
            </div>
            {formData.endAddresses.length > 0 && (
              <div className="mt-3">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Addresses</label>
                <div className="mt-1 space-y-1">
                  {formData.endAddresses.map((address, index) => (
                    <p key={index} className="text-sm text-gray-900">
                      {index + 1}. {address}
                      {formData.additionalDropdownValues[index] && (
                        <span className="text-gray-500 ml-2">({formData.additionalDropdownValues[index]})</span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Observation Notes for 56a */}
        {formData.serviceTypeIdentifier.toLowerCase() === '56a' && formData.observationNotes56a && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Observation Notes (56a)</h4>
            <div className="space-y-3">
              {Object.entries(formData.observationNotes56a).map(([key, value]) => (
                value && (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                    <p className="text-sm text-gray-900">{value}</p>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Note Summary for 47e */}
        {formData.serviceTypeIdentifier.toLowerCase() === '47e' && formData.noteSummary47e && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Note Summary (47e)</h4>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Summary</label>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{formData.noteSummary47e}</p>
            </div>
          </div>
        )}
        
        {/* Automation Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Automation Progress</h4>
          <div className="space-y-2">
            {progressSteps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {getStepIcon(step.status)}
                <span className={`text-sm ${getStepColor(step.status)}`}>
                  {step.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
          <span className="font-ppsupply text-gray-900">Automation in Progress</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          Close
        </button>
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
                  onClick={() => setActiveTab('browser')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'browser'
                      ? 'border-[#FF3B00] text-[#FF3B00]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Browser Session
                </button>
                <button
                  onClick={() => setActiveTab('form')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'form'
                      ? 'border-[#FF3B00] text-[#FF3B00]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Form Data
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
            {activeTab === 'browser' ? (
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
                  ) : currentScreenshot ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image 
                        src={currentScreenshot} 
                        alt="Browser Screenshot" 
                        width={800}
                        height={600}
                        className="max-w-full max-h-full rounded-lg border border-gray-200 object-contain"
                      />
                    </div>
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
              <>
                <div className="w-full h-12 bg-white border-b border-gray-200 flex items-center px-4">
                  <div className="text-sm text-gray-600">
                    Form Data View
                  </div>
                </div>
                <div className="p-6 h-full overflow-y-auto">
                  <FormDataView />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress Sidebar */}
        <div className="w-full lg:w-96 p-6 bg-white border-t lg:border-t-0 lg:border-l border-gray-200">
          <div className="h-full flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-ppneue text-gray-900 mb-2">
                Automation Progress
              </h2>
              <p className="text-sm text-gray-600">
                Watch as the automation completes your case note
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {progressSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    {getStepIcon(step.status)}
                    <div className="flex-1">
                      <p className={`text-sm ${getStepColor(step.status)}`}>
                        {step.message}
                      </p>
                    </div>
                  </motion.div>
                ))}
                
                {/* Show any screenshots that come in separately */}
                {progress.filter(item => item.type === 'screenshot').map((screenshot, index) => (
                  <motion.div
                    key={`screenshot-${index}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center mt-1">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-600 mb-2">Screenshot captured</p>
                      {screenshot.data?.data && (
                        <div className="mt-2">
                          <Image
                            src={`data:${screenshot.data.mimeType};base64,${screenshot.data.data}`}
                            alt="Screenshot"
                            width={400}
                            height={300}
                            className="w-full rounded border border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {isComplete && (
              <div className="pt-6 border-t">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Automation Complete!
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Your case note has been successfully created and saved.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-[#FF3B00] text-white rounded-md hover:bg-[#E63400] transition-colors"
                  >
                    Close
                  </button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
