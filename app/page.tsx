"use client";

import AnimatedCubeIcon from "./components/AnimatedCubeIcon";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import CaseForm from "./components/CaseForm";
import ThemeToggle from "./components/ThemeToggle";
import AutoSet from "./components/AutoSet";
import LottieLoading from "./components/LottieLoading";
import AnimatedCheckmark from "./components/AnimatedCheckmark";
import QueueManager from "./components/QueueManager";
import MileageWarningModal from "./components/MileageWarningModal";
import { ToastContainer, useToast } from "./components/Toast";
import { FormData as CaseFormData } from "./script/automationScript";
import { signInUser, signUpUser, logoutUser, onAuthChange } from "./components/firebaseAuth";
import { User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { makeAuthenticatedRequest } from "./utils/apiClient";
import { checkSubscriptionStatus, hasActiveSubscription, SubscriptionStatus } from "./utils/subscription";

export default function Home() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [submittedFormData, setSubmittedFormData] = useState<CaseFormData | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'browser' | 'autoset'>('form');
  const [user, setUser] = useState<User | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const toast = useToast();
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(true); // Start with true to show loading while checking auth
  const [showQueueManager, setShowQueueManager] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [showMileageWarning, setShowMileageWarning] = useState(false);
  const [mileageData, setMileageData] = useState<{
    current?: number;
    last?: number;
    message?: string;
  }>({});

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false); // Stop loading once we get the auth state
      if (currentUser) {
        // Check subscription status when user logs in
        checkUserSubscription(currentUser);
      } else {
        // Clear subscription status when user logs out
        setSubscriptionStatus(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const checkUserSubscription = async (currentUser: User) => {
    setSubscriptionLoading(true);
    try {
      const status = await checkSubscriptionStatus(currentUser);
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionStatus({ status: 'no_active_subscription' });
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Listen for job queue updates via polling
  useEffect(() => {
    const pollJobQueue = async () => {
      try {
        const response = await makeAuthenticatedRequest('/api/queue', {}, user);
        if (response.ok) {
          const data = await response.json();
          const jobs = data.jobs || []; // Extract jobs array from response
          setJobs(jobs); // Update jobs state for count badge
          const runningJob = jobs.find((job: any) => job.status === 'running');
          
          if (runningJob) {
            // If there's a running job and we're not already executing, sync the state
            if (!isExecuting) {
              console.log('Found running job, switching to execution mode:', runningJob);
              setExecutionId(runningJob.executionId || runningJob.id);
              setIsExecuting(true);
              setActiveTab('browser');
              
              // Set session URL and ID if available
              if (runningJob.sessionUrl) {
                setSessionUrl(runningJob.sessionUrl);
              }
              if (runningJob.sessionId) {
                setSessionId(runningJob.sessionId);
              }
            } else if (isExecuting) {
              // If we're already executing, check if this is a different job
              const currentRunningExecutionId = runningJob.executionId || runningJob.id;
              if (currentRunningExecutionId !== executionId) {
                console.log('New job started, updating execution context:', {
                  old: executionId,
                  new: currentRunningExecutionId,
                  job: runningJob
                });
                setExecutionId(currentRunningExecutionId);
                
                // Update session URL and ID if available
                if (runningJob.sessionUrl) {
                  setSessionUrl(runningJob.sessionUrl);
                }
                if (runningJob.sessionId) {
                  setSessionId(runningJob.sessionId);
                }
              } else if (runningJob.sessionUrl && !sessionUrl) {
                // If we're already executing the same job but didn't have session URL, update it
                console.log('Updating session URL for running job:', runningJob.sessionUrl);
                setSessionUrl(runningJob.sessionUrl);
                if (runningJob.sessionId && !sessionId) {
                  setSessionId(runningJob.sessionId);
                }
              }
            }
          } else if (isExecuting) {
            // If no running job but we think we're executing, check if the last job completed/failed
            const lastJob = jobs.length > 0 ? jobs[jobs.length - 1] : null;
            if (lastJob && (lastJob.status === 'completed' || lastJob.status === 'failed')) {
              // Only stop executing if the session matches or if no sessionId is set
              const lastJobSessionId = lastJob.sessionId;
              if (!sessionId || lastJobSessionId === sessionId) {
                console.log('Job completed/failed, stopping execution mode');
                setIsExecuting(false);
                setSessionUrl(null);
                setSessionId(null);
                setExecutionId(null);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error polling job queue:', error);
      }
    };

    // Poll every 2 seconds when component is mounted
    const interval = setInterval(pollJobQueue, 2000);
    
    // Initial poll
    pollJobQueue();

    return () => clearInterval(interval);
  }, [isExecuting, sessionId, user]); // Add user dependency

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    
    const result = await signInUser(loginEmail, loginPassword);
    if (result.success) {
      setLoginEmail("");
      setLoginPassword("");
      setAuthError("");
      // Subscription check will be triggered by the auth state change
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
      setAuthError("");
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
      // Always add jobs to the queue for consistent tracking
      const response = await makeAuthenticatedRequest("/api/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: 'add', formData }),
      }, user);

      const result = await response.json();

      if (result.success) {
        // Check if this is the first job (will start immediately)
        const queueResponse = await makeAuthenticatedRequest("/api/queue", {}, user);
        const queueData = await queueResponse.json();
        const runningJobs = queueData.success ? queueData.jobs.filter((job: any) => job.status === 'running') : [];

        if (runningJobs.length > 0) {
          // If a job is already running, show success message
          toast.showSuccess(`Job queued successfully! Job ID: ${result.job.id.slice(-8)}`);
        } else {
          // If this is the first job, it will start running soon
          toast.showSuccess(`Job added to queue! Job ID: ${result.job.id.slice(-8)}`);
        }
      } else {
        throw new Error(result.error || "Failed to queue job");
      }
    } catch (error) {
      console.error("Error submitting job:", error);
      toast.showError("Failed to submit job: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobRerun = (formData: CaseFormData) => {
    setSubmittedFormData(formData);
    setActiveTab('form'); // Switch to form tab to show the loaded data
  };

  const handleClose = async () => {
    // End the Browserbase session if one exists
    if (sessionId) {
      try {
        console.log('Ending session:', sessionId);
        const response = await makeAuthenticatedRequest("/api/session", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        }, user);
        
        const result = await response.json();
        if (result.success) {
          console.log("Session ended successfully");
        } else {
          console.warn("Session end warning:", result.warning || result.error);
        }
      } catch (error) {
        console.error("Error ending session:", error);
        // Don't block the UI if session ending fails
      }
    }
    
    setIsExecuting(false);
    setSessionUrl(null);
    setSessionId(null);
    setExecutionId(null);
    setSubmittedFormData(null);
    setActiveTab('form'); // Reset to form tab
  };

  return (
    <div className="min-h-screen background-transparent flex flex-col">
      {/* Top Navigation */}
      <nav className="flex justify-between items-center px-8 py-4 bg-background-form border-b border-border">
        <div className="flex items-center gap-3">
          {/* Animated Cube Icon */}
          <AnimatedCubeIcon size={32} />
          <span className="font-ppsupply text-foreground">
            {isExecuting ? "E-Automate" : "E-Automate"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user && subscriptionStatus && hasActiveSubscription(subscriptionStatus) && (
            <button
              onClick={() => setShowQueueManager(true)}
              className="relative px-3 py-2 text-sm bg-secondary text-text-secondary rounded-md hover:bg-secondary/80 transition-colors font-medium"
            >
              Queue
              {jobs.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                  {jobs.filter(job => job.status === 'running' || job.status === 'queued').length}
                </span>
              )}
            </button>
          )}
          <ThemeToggle />
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-green-600 font-medium">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Logout
              </button>
            </div>
          )}
          {isExecuting && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </nav>

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
          <div className="bg-modal rounded-lg shadow-theme-lg p-8 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4 text-text-primary">Create Account</h2>
            {authError && <div className="mb-2 text-red-600">{authError}</div>}
            <input
              type="email"
              placeholder="Email"
              value={signupEmail}
              onChange={e => setSignupEmail(e.target.value)}
              className="w-full mb-3 input-underline"
            />
            <input
              type="password"
              placeholder="Password"
              value={signupPassword}
              onChange={e => setSignupPassword(e.target.value)}
              className="w-full mb-3 input-underline"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full mb-4 input-underline"
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
                  className="px-4 py-2 bg-background-secondary text-text-primary rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignup}
                  disabled={authLoading}
                  className="px-4 py-2 bg-primary text-white rounded-md font-medium disabled:opacity-50"
                >
                  {authLoading ? "Creating..." : "Sign Up"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Main Content */}
      <main className="flex-1 flex relative">
        {authLoading ? (
          /* Loading authentication state */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <LottieLoading size={64} className="mx-auto mb-4" />
              <p className="text-text-secondary">Loading...</p>
            </div>
          </div>
        ) : !user ? (
          /* Login Card - displayed when user is not logged in */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
              <div className="bg-modal rounded-lg shadow-theme-lg p-8 border border-border">
                <div className="text-center mb-6">
                  <AnimatedCubeIcon size={48} />
                  <h1 className="text-2xl font-bold text-text-primary mt-4 mb-2">Welcome to E-Automate</h1>
                  <p className="text-text-secondary">Please sign in to access your automation tools</p>
                </div>
                
                <div className="space-y-4">
                  {authError && <div className="text-red-600 text-sm text-center">{authError}</div>}
                  
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="Email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className="w-full input-underline"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !authLoading) {
                          handleLogin();
                        }
                      }}
                      className="w-full input-underline"
                    />
                  </div>
                  
                  {/* Notification about BAWebTools account */}
                  <div className="p-3 bg-info-bg  border-info-border rounded-md">
                    <p className="text-sm text-info text-center">
                      Please sign in with your BAWebTools account credentials
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleLogin}
                      disabled={authLoading}
                      className="w-full px-4 py-2 bg-primary text-white rounded-md font-medium disabled:opacity-50 hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                    >
                      {authLoading ? (
                        <>
                          <LottieLoading size={20} color="#ffffff" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </button>
                    
                    <div className="flex gap-2">          
                      <button
                        onClick={() => window.open('https://bawebtools.com', '_blank')}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        Visit BAWebTools
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : subscriptionLoading ? (
          /* Loading subscription status */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <LottieLoading size={64} className="mx-auto mb-4" />
              <p className="text-text-secondary">Checking subscription status...</p>
            </div>
          </div>
        ) : !subscriptionStatus || !hasActiveSubscription(subscriptionStatus) ? (
          /* Subscription required card */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
              <div className="bg-modal rounded-lg shadow-theme-lg p-8 border border-border">
                <div className="text-center mb-6">
                  <AnimatedCubeIcon size={48} />
                  <h1 className="text-2xl font-bold text-text-primary mt-4 mb-2">Subscription Required</h1>
                  <p className="text-text-secondary mb-4">
                    Hello {user.email}! To access E-Automate features, you need an active subscription.
                  </p>
                  
                  {subscriptionStatus?.status === 'past_due' && (
                    <div className="p-3 bg-warning-bg border border-warning-border rounded-md mb-4">
                      <p className="text-sm text-warning text-center">
                        Your subscription is past due. Please update your payment method.
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => window.open('https://bawebtools.com', '_blank')}
                      className="w-full px-4 py-2 bg-primary text-white rounded-md font-medium hover:bg-primary-hover transition-colors"
                    >
                      Get Subscription at BAWebTools
                    </button>
                    
                    <p className="text-sm text-text-muted text-center">
                      Login to BAWebTools.com {'>'} Menu {'>'} My Plan
                    </p>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => checkUserSubscription(user)}
                        disabled={subscriptionLoading}
                        className="flex-1 px-4 py-2 bg-secondary text-text-primary rounded-md hover:bg-secondary/80 transition-colors font-medium disabled:opacity-50"
                      >
                        {subscriptionLoading ? "Checking..." : "Refresh Status"}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Content Area with Tabs - displayed when user is logged in with active subscription */
          <div className={`flex-1 p-6 transition-all duration-300 ease-out ${isExecuting ? 'pr-[336px]' : ''}`}>
            {/* Tab Navigation */}
            <div className="mb-4">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('form')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'form'
                        ? 'border-primary text-primary-color'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {isExecuting ? 'Form Data' : 'Case Form'}
                  </button>
                  <button
                    onClick={() => setActiveTab('autoset')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'autoset'
                        ? 'border-primary text-primary-color'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Auto-Set
                  </button>
                  <button
                    onClick={() => setActiveTab('browser')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'browser'
                        ? 'border-primary text-primary-color'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Browser Session
                  </button>
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-background-form rounded-lg shadow-theme-sm border border-border h-[calc(100vh-200px)]">
              {/* Form Tab Content - Always render to preserve state */}
              <div className={`h-full ${activeTab === 'form' ? 'block' : 'hidden'}`}>
                <div className="h-full overflow-y-auto">
                  <CaseForm 
                    onSubmit={handleFormSubmit} 
                    isLoading={isLoading}
                    readOnly={false}
                    initialFormData={submittedFormData || undefined}
                    isLoggedIn={!!user}
                    userId={user?.uid}
                    isExecuting={isExecuting}
                    onStopAutomation={handleClose}
                  />
                </div>
              </div>

              {/* Auto-Set Tab Content */}
              <div className={`h-full ${activeTab === 'autoset' ? 'block' : 'hidden'}`}>
                <AutoSet 
                  isLoggedIn={!!user}
                  userId={user?.uid}
                />
              </div>

              {/* Browser Tab Content */}
              <div className={`h-full ${activeTab === 'browser' ? 'block' : 'hidden'}`}>
                {isExecuting ? (
                  <>
                    <div className="flex-shrink-0 w-full h-12 bg-background border-b border-border flex items-center px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <div className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                        Browser Session
                      </div>
                    </div>
                    <div className="flex-1 h-full min-h-[100px]">
                      {sessionUrl ? (
                        <iframe
                          src={sessionUrl}
                          className="w-full h-full border-0"
                          sandbox="allow-same-origin allow-scripts allow-forms"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          title="Browser Session"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <div className="text-center">
                            <LottieLoading size={64} className="mx-auto mb-4" />
                            <p>Initializing browser session...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-background-secondary rounded-full flex items-center justify-center mx-auto mb-4">
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
        )}

        {/* Progress Sidebar - only show when executing */}
        <AnimatePresence>
          {isExecuting && (
            <motion.div 
              className="fixed top-[73px] right-0 w-80 h-[calc(100vh-73px)] bg-background border-l border-border flex flex-col z-30 shadow-theme-lg"
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.3
              }}
            >
              <ExecutionProgressSidebar 
                executionId={executionId || ''}
                onStop={handleClose}
                user={user}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Queue Manager Modal */}
      <QueueManager 
        isVisible={showQueueManager}
        onClose={() => setShowQueueManager(false)}
        onRerunJob={handleJobRerun}
        user={user}
      />

      {/* Mileage Warning Modal */}
      <MileageWarningModal
        isVisible={showMileageWarning}
        onClose={() => setShowMileageWarning(false)}
        onConfirm={() => {
          setShowMileageWarning(false);
          // Continue with automation here
          console.log('User confirmed to continue with mileage warning');
        }}
        currentMileage={mileageData.current}
        lastMileage={mileageData.last}
        warningMessage={mileageData.message}
      />
      
      {/* Toast Container */}
      <ToastContainer messages={toast.messages} onClose={toast.removeToast} />
    </div>
  );
}

// Function to save mileage data to Firebase
// Function to save processed note data to Firebase (with or without mileage)
async function saveProcessedNoteDataToFirebase(noteData: any, user: User | null) {
  if (!user || !user.uid) {
    console.log('No authenticated user found, cannot save note data to Firebase');
    return;
  }

  try {
    const userDoc = doc(db, 'users', user.uid);
    
    // Prepare the history entry - always include basic note data
    const historyEntry: {
      executionId: string;
      dateOfService: string;
      startTime: string;
      endTime: string;
      capturedAt: string;
      savedAt: string;
      endMileage?: string;
    } = {
      executionId: noteData.executionId || 'unknown',
      dateOfService: noteData.dateOfService,
      startTime: noteData.startTime,
      endTime: noteData.endTime,
      capturedAt: noteData.capturedAt,
      savedAt: new Date().toISOString()
    };
    
    // Add endMileage only if it exists (when mileage was processed)
    if (noteData.endMileage) {
      historyEntry.endMileage = noteData.endMileage;
    }
    
    // Prepare the document update
    const updateData: {
      mileageHistory: typeof historyEntry[];
      lastProcessedMileage?: string;
      lastMileageUpdate?: Date;
    } = {
      mileageHistory: [historyEntry]
    };
    
    // Only update lastProcessedMileage if endMileage exists
    if (noteData.endMileage) {
      updateData.lastProcessedMileage = noteData.endMileage;
      updateData.lastMileageUpdate = new Date();
    }
    
    await setDoc(userDoc, updateData, { merge: true });
    
    console.log('Note data saved to Firebase successfully:', noteData);
  } catch (error) {
    console.error('Failed to save note data to Firebase:', error);
  }
}

// ExecutionProgressSidebar component to show progress in the sidebar
interface ExecutionProgressSidebarProps {
  executionId: string;
  onStop: () => void;
  user: User | null;
}

function ExecutionProgressSidebar({ executionId, onStop, user }: ExecutionProgressSidebarProps) {
  // Track actual progress messages instead of predefined steps
  const [progressMessages, setProgressMessages] = useState<Array<{
    message: string;
    type: 'progress' | 'success' | 'error';
    timestamp: number;
  }>>([{
    message: 'Initializing automation...',
    type: 'progress',
    timestamp: Date.now()
  }]);

  useEffect(() => {
    console.log('Setting up EventSource for executionId:', executionId);
    const eventSource = new EventSource(`/api/automation/events?executionId=${executionId}`);
    
    eventSource.onopen = () => {
      console.log('EventSource connection opened');
    };
    
    eventSource.onmessage = (event) => {
      console.log('Raw event received:', event);
      try {
        const eventData = JSON.parse(event.data);
        console.log('Parsed event data:', eventData);

        // Update progress messages based on events
        if (eventData.type === 'progress') {
          console.log('Adding progress message:', eventData.message || eventData.data);
          // On new progress, keep previous success/error messages but clear old progress messages
          setProgressMessages(prev => [
            ...prev.filter(msg => msg.type !== 'progress'),
            {
              message: eventData.message || eventData.data || 'Processing...',
              type: 'progress',
              timestamp: Date.now()
            }
          ]);
        } else if (eventData.type === 'miles') {
          // Handle note data - save to Firebase if user is logged in
          console.log('Received note data:', eventData.data);
          if (eventData.data && typeof eventData.data === 'object') {
            saveProcessedNoteDataToFirebase(eventData.data, user);
            if (eventData.data.endMileage) {
              setProgressMessages(prev => [
                ...prev.filter(msg => msg.type !== 'progress'),
                {
                  message: `Note processed with mileage: ${eventData.data.endMileage} miles`,
                  type: 'success',
                  timestamp: Date.now()
                }
              ]);
            } else {
              setProgressMessages(prev => [
                ...prev.filter(msg => msg.type !== 'progress'),
                {
                  message: `Note processed successfully`,
                  type: 'success',
                  timestamp: Date.now()
                }
              ]);
            }
          }
        } else if (eventData.type === 'success') {
          // On success, keep previous success/error messages but clear progress messages
          setProgressMessages(prev => [
            ...prev.filter(msg => msg.type !== 'progress'),
            {
              message: eventData.message || eventData.data || 'Success',
              type: 'success',
              timestamp: Date.now()
            }
          ]);
        } else if (eventData.type === 'error') {
          setProgressMessages(prev => [...prev, {
            message: eventData.message || eventData.data || 'Error occurred',
            type: 'error',
            timestamp: Date.now()
          }]);
        } else if (eventData.type === 'connected') {
          console.log('Connected to automation events');
          setProgressMessages([{
            message: 'Connected to automation',
            type: 'success',
            timestamp: Date.now()
          }]);
        }
      } catch (e) {
        console.error('Error parsing event data:', e, 'Raw data:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource failed:', error);
      console.log('EventSource readyState:', eventSource.readyState);
      setProgressMessages(prev => [...prev, {
        message: 'Connection error - retrying...',
        type: 'error',
        timestamp: Date.now()
      }]);
    };

    return () => {
      console.log('Closing EventSource connection');
      eventSource.close();
    };
  }, [executionId]);

  return (
    <>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-text-primary">Progress</h3>
          <button
            onClick={onStop}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Stop
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {progressMessages.map((progressMessage, index) => (
            <motion.div 
              key={index} 
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ 
                delay: progressMessage.type === 'success' ? 0.2 : 0,
                duration: progressMessage.type === 'success' ? 0.5 : 0.3,
                type: "spring",
                stiffness: progressMessage.type === 'success' ? 200 : 300,
                damping: progressMessage.type === 'success' ? 20 : 25
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {progressMessage.type === 'success' ? (
                  <div className="w-5 h-5 text-green-500 flex items-center justify-center">
                    <AnimatedCheckmark size={20} strokeWidth={2} />
                  </div>
                ) : progressMessage.type === 'progress' ? (
                  <div className="w-5 h-5 flex items-center justify-center">
                    <LottieLoading size={16} />
                  </div>
                ) : progressMessage.type === 'error' ? (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-border" />
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
            </motion.div>
          ))}
          {progressMessages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p>Waiting for automation to start...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

