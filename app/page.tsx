"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import CaseForm from "./components/CaseForm";
import ThemeToggle from "./components/ThemeToggle";
import AutoSet from "./components/AutoSet";
import { FormData as CaseFormData } from "./script/automationScript";
import { signInUser, signUpUser, logoutUser, onAuthChange } from "./components/firebaseAuth";
import { User } from "firebase/auth";

export default function Home() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [submittedFormData, setSubmittedFormData] = useState<CaseFormData | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'browser' | 'autoset'>('form');
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    
    const result = await signInUser(loginEmail, loginPassword);
    if (result.success) {
      setShowLoginModal(false);
      setLoginEmail("");
      setLoginPassword("");
    } else {
      setAuthError(result.error || "Login failed");
    }
    setAuthLoading(false);
  };

  const handleSignup = async () => {
    setAuthLoading(true);
    setAuthError("");
    
    if (signupPassword !== confirmPassword) {
      setAuthError("Passwords do not match");
      setAuthLoading(false);
      return;
    }
    
    const result = await signUpUser(signupEmail, signupPassword);
    if (result.success) {
      setShowSignupModal(false);
      setSignupEmail("");
      setSignupPassword("");
      setConfirmPassword("");
    } else {
      setAuthError(result.error || "Signup failed");
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await logoutUser();
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Top Navigation */}
      <nav className="flex justify-between items-center px-8 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Image
            src="/favicon.svg"
            alt="Open Operator"
            className="w-8 h-8"
            width={32}
            height={32}
          />
          <span className="font-ppsupply text-gray-900 dark:text-gray-100">
            {isExecuting ? "Automation in Progress" : "ECaseNote Automation"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {!user && (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-4 py-2 bg-[#FF3B00] text-white rounded-md hover:bg-[#E63400] transition-colors font-medium"
            >
              Login
            </button>
          )}
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-green-600 font-medium">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
          {isExecuting && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </nav>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Login</h2>
            {authError && <div className="mb-2 text-red-600">{authError}</div>}
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              className="w-full mb-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              className="w-full mb-4 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            
            {/* Notification about BAWebTools account */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                Please sign in with your BAWebTools account credentials
              </p>
            </div>

            <div className="flex justify-between items-center gap-2 mb-4">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setShowSignupModal(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Sign Up
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    setAuthError("");
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogin}
                  disabled={authLoading}
                  className="px-4 py-2 bg-[#FF3B00] text-white rounded-md hover:bg-[#E63400] font-medium disabled:opacity-50"
                >
                  {authLoading ? "Signing in..." : "Login"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Create Account</h2>
            {authError && <div className="mb-2 text-red-600">{authError}</div>}
            <input
              type="email"
              placeholder="Email"
              value={signupEmail}
              onChange={e => setSignupEmail(e.target.value)}
              className="w-full mb-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <input
              type="password"
              placeholder="Password"
              value={signupPassword}
              onChange={e => setSignupPassword(e.target.value)}
              className="w-full mb-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full mb-4 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            
            <div className="flex justify-between items-center gap-2 mb-4">
              <button
                onClick={() => window.open('https://bawebtools.com', '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Visit BAWebTools
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowSignupModal(false);
                    setAuthError("");
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignup}
                  disabled={authLoading}
                  className="px-4 py-2 bg-[#FF3B00] text-white rounded-md hover:bg-[#E63400] font-medium disabled:opacity-50"
                >
                  {authLoading ? "Creating..." : "Sign Up"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Content Area with Tabs */}
        <div className="flex-1 p-6 border-r border-gray-200 dark:border-gray-700">
          {/* Tab Navigation */}
          <div className="mb-4">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('form')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'form'
                      ? 'border-[#FF3B00] text-[#FF3B00]'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {isExecuting ? 'Form Data' : 'Case Form'}
                </button>
                {user && (
                  <button
                    onClick={() => setActiveTab('autoset')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'autoset'
                        ? 'border-[#FF3B00] text-[#FF3B00]'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Auto-Set
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('browser')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'browser'
                      ? 'border-[#FF3B00] text-[#FF3B00]'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  Browser Session
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full">
            {/* Form Tab Content - Always render to preserve state */}
            <div className={`h-full ${activeTab === 'form' ? 'block' : 'hidden'}`}>
              <div className="h-full overflow-y-auto">
                <CaseForm 
                  onSubmit={handleFormSubmit} 
                  isLoading={isLoading}
                  readOnly={isExecuting}
                  isLoggedIn={!!user}
                  userId={user?.uid}
                  onLoginRequested={() => setShowLoginModal(true)}
                />
              </div>
            </div>

            {/* Auto-Set Tab Content */}
            {user && (
              <div className={`h-full ${activeTab === 'autoset' ? 'block' : 'hidden'}`}>
                <AutoSet 
                  isLoggedIn={!!user}
                  userId={user?.uid}
                />
              </div>
            )}

            {/* Browser Tab Content */}
            <div className={`h-full ${activeTab === 'browser' ? 'block' : 'hidden'}`}>
              {isExecuting ? (
                <>
                  <div className="w-full h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                      Browser Session
                    </div>
                  </div>
                  <div className="p-4 h-full">
                    {sessionUrl ? (
                      <iframe
                        src={sessionUrl}
                        className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
                        sandbox="allow-same-origin allow-scripts allow-forms"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        title="Browser Session"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                          <p>Initializing browser session...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p>Browser session will appear here when automation starts</p>
                  </div>
                </div>
              )}
            </div>
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Case Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Case Number</label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100">
              {formData.caseNumber || 'Not provided'}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Service Type</label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100">
              {formData.serviceTypeIdentifier || 'Not provided'}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Person Served</label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100">
              {formData.personServed || 'Not provided'}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Service</label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100">
              {formData.dateOfService || 'Not provided'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100">
              {formData.startTime || 'Not provided'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100">
              {formData.endTime || 'Not provided'}
            </div>
          </div>
        </div>
      </div>

      {formData.noteSummary47e && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Summary</label>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100 min-h-[120px] whitespace-pre-wrap">
            {formData.noteSummary47e}
          </div>
        </div>
      )}

      {formData.observationNotes56a && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Observation Notes</label>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100 space-y-2">
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Addresses</label>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100">
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
  // Track actual progress messages instead of predefined steps
  const [progressMessages, setProgressMessages] = useState<Array<{
    message: string;
    type: 'progress' | 'success' | 'error';
    timestamp: number;
  }>>([]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/automation/events?executionId=${executionId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        console.log('Received event:', eventData);

        // Update progress messages based on events
        if (eventData.type === 'progress') {
          setProgressMessages(prev => [...prev, {
            message: eventData.message || eventData.data || 'Processing...',
            type: 'progress',
            timestamp: Date.now()
          }]);
        } else if (eventData.type === 'success') {
          setProgressMessages(prev => [...prev, {
            message: eventData.message || eventData.data || 'Success',
            type: 'success',
            timestamp: Date.now()
          }]);
        } else if (eventData.type === 'error') {
          setProgressMessages(prev => [...prev, {
            message: eventData.message || eventData.data || 'Error occurred',
            type: 'error',
            timestamp: Date.now()
          }]);
        } else if (eventData.type === 'connected') {
          console.log('Connected to automation events');
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
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Progress</h3>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {progressMessages.map((progressMessage, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {progressMessage.type === 'success' ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : progressMessage.type === 'progress' ? (
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                ) : progressMessage.type === 'error' ? (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm block ${
                  progressMessage.type === 'success' ? 'text-green-700 dark:text-green-400' : 
                  progressMessage.type === 'progress' ? 'text-blue-600 dark:text-blue-400' :
                  progressMessage.type === 'error' ? 'text-red-600 dark:text-red-400' : 
                  'text-gray-500 dark:text-gray-400'
                }`}>
                  {progressMessage.message}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(progressMessage.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {progressMessages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p>Waiting for automation to start...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
