"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface ExecutionViewProps {
  onClose: () => void;
  sessionUrl?: string;
}

interface ProgressUpdate {
  type: "progress" | "success" | "error" | "screenshot" | "finished";
  message: string;
  data?: {
    mimeType?: string;
    data?: string;
  };
}

export default function ExecutionView({ onClose, sessionUrl }: ExecutionViewProps) {
  const [progress, setProgress] = useState<ProgressUpdate[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);

  // Simulate progress updates for now
  useEffect(() => {
    const progressSteps = [
      { type: "progress", message: "Connecting to browser session..." },
      { type: "progress", message: "Navigating to ECaseNotes portal..." },
      { type: "success", message: "Successfully reached ECaseNotes" },
      { type: "progress", message: "Signing in with credentials..." },
      { type: "success", message: "Login successful!" },
      { type: "progress", message: "Fetching Notes..." },
      { type: "progress", message: "Searching for case..." },
      { type: "progress", message: "Creating new note..." },
      { type: "success", message: "Note created successfully!" },
      { type: "progress", message: "Populating observation notes..." },
      { type: "progress", message: "Processing mileage information..." },
      { type: "success", message: "Mileage saved successfully!" },
      { type: "finished", message: "Process completed successfully!" },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setProgress(prev => [...prev, progressSteps[currentStep] as ProgressUpdate]);
        if (progressSteps[currentStep].type === "finished") {
          setIsComplete(true);
          clearInterval(interval);
        }
        currentStep++;
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStepIcon = (type: string) => {
    switch (type) {
      case "progress":
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      case "success":
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
      case "finished":
        return (
          <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case "progress":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "finished":
        return "text-purple-600 font-semibold";
      default:
        return "text-gray-600";
    }
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
      <main className="flex-1 flex">
        {/* Browser Session View */}
        <div className="flex-1 p-6 border-r border-gray-200">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
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
          </div>
        </div>

        {/* Progress Sidebar */}
        <div className="w-96 p-6 bg-white">
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
                {progress.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    {getStepIcon(step.type)}
                    <div className="flex-1">
                      <p className={`text-sm ${getStepColor(step.type)}`}>
                        {step.message}
                      </p>
                      {step.data?.data && (
                        <div className="mt-2">
                          <img
                            src={`data:${step.data.mimeType};base64,${step.data.data}`}
                            alt="Screenshot"
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
