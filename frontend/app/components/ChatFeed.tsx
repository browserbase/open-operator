"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useWindowSize } from "usehooks-ts";

interface ChatFeedProps {
  initialMessage?: string;
  onClose: () => void;
  url?: string;
}

export interface BrowserStep {
  text: string;
  reasoning: string;
  tool: "GOTO" | "ACT" | "EXTRACT" | "OBSERVE" | "CLOSE" | "WAIT" | "NAVBACK";
  instruction: string;
  stepNumber?: number;
}

interface AgentState {
  sessionId: string | null;
  sessionUrl: string | null;
  steps: BrowserStep[];
  isLoading: boolean;
}

export default function ChatFeed({ initialMessage, onClose }: ChatFeedProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { width } = useWindowSize();
  const isMobile = width ? width < 768 : false;
  const initializationRef = useRef(false);
  
  const agentStateRef = useRef<AgentState>({
    sessionId: null,
    sessionUrl: null,
    steps: [],
    isLoading: false
  });

  const [uiState, setUiState] = useState<{
    sessionId: string | null;
    sessionUrl: string | null;
    steps: BrowserStep[];
  }>({
    sessionId: null,
    sessionUrl: null,
    steps: []
  });

  const startAgentLoop = useCallback(async (goal: string) => {
    setIsLoading(true);
    
    try {
      // Start the agent loop with initial URL selection
      const startResponse = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal,
          sessionId: agentStateRef.current.sessionId,
          action: 'START'
        }),
      });

      const startData = await startResponse.json();
      
      if (startData.success) {
        const newStep = {
          ...startData.result,
          stepNumber: agentStateRef.current.steps.length + 1
        };

        agentStateRef.current = {
          ...agentStateRef.current,
          steps: [...agentStateRef.current.steps, newStep]
        };

        setUiState({
          sessionId: agentStateRef.current.sessionId,
          sessionUrl: agentStateRef.current.sessionUrl,
          steps: agentStateRef.current.steps
        });

        // Continue with subsequent steps
        while (true) {
          // Get next step from LLM
          const nextStepResponse = await fetch('/api/agent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              goal,
              sessionId: agentStateRef.current.sessionId,
              previousSteps: agentStateRef.current.steps,
              action: 'GET_NEXT_STEP'
            }),
          });

          const nextStepData = await nextStepResponse.json();
          
          if (!nextStepData.success) {
            throw new Error('Failed to get next step');
          }

          if (nextStepData.done) {
            break;
          }

          // Execute the step
          const executeResponse = await fetch('/api/agent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: agentStateRef.current.sessionId,
              step: nextStepData.result,
              action: 'EXECUTE_STEP'
            }),
          });

          const executeData = await executeResponse.json();
          
          if (!executeData.success) {
            throw new Error('Failed to execute step');
          }

          const newStep = {
            ...nextStepData.result,
            stepNumber: agentStateRef.current.steps.length + 1
          };

          agentStateRef.current = {
            ...agentStateRef.current,
            steps: [...agentStateRef.current.steps, newStep]
          };

          setUiState({
            sessionId: agentStateRef.current.sessionId,
            sessionUrl: agentStateRef.current.sessionUrl,
            steps: agentStateRef.current.steps
          });

          if (executeData.done) {
            break;
          }
        }
      }
    } catch (error) {
      console.error('Agent error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("useEffect called");
    const initializeSession = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;

      if (initialMessage && !agentStateRef.current.sessionId) {
        setIsLoading(true);
        try {
          const sessionResponse = await fetch('/api/session', {
            method: 'POST',
          });
          const sessionData = await sessionResponse.json();
          
          if (!sessionData.success) {
            throw new Error(sessionData.error || 'Failed to create session');
          }

          agentStateRef.current = {
            ...agentStateRef.current,
            sessionId: sessionData.sessionId,
            sessionUrl: sessionData.sessionUrl.replace(
              "https://www.browserbase.com/devtools-fullscreen/inspector.html",
              "https://www.browserbase.com/devtools-internal-compiled/index.html"
            ),
          };

          setUiState({
            sessionId: sessionData.sessionId,
            sessionUrl: sessionData.sessionUrl.replace(
              "https://www.browserbase.com/devtools-fullscreen/inspector.html",
              "https://www.browserbase.com/devtools-internal-compiled/index.html"
            ),
            steps: []
          });

          const response = await fetch('/api/agent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              goal: initialMessage,
              sessionId: sessionData.sessionId,
              previousSteps: [],
            }),
          });

          const data = await response.json();
          
          if (data.success) {
            const newStep = {
              text: data.result.text,
              reasoning: data.result.reasoning,
              tool: data.result.tool,
              instruction: data.result.instruction,
              stepNumber: 1
            };

            agentStateRef.current = {
              ...agentStateRef.current,
              steps: [newStep]
            };

            setUiState(prev => ({
              ...prev,
              steps: [newStep]
            }));

            if (data.result.tool !== 'CLOSE') {
              await startAgentLoop(initialMessage);
            }
          }
        } catch (error) {
          console.error('Session initialization error:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeSession();
  }, [initialMessage, startAgentLoop]);

  // Spring configuration for smoother animations
  const springConfig = {
    type: "spring",
    stiffness: 350,
    damping: 30,
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        ...springConfig,
        staggerChildren: 0.1,
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <motion.div 
      className="min-h-screen bg-gray-50 flex flex-col"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.nav 
        className="flex justify-between items-center px-8 py-4 bg-white border-b border-gray-200 shadow-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <span className="font-ppneue text-xl text-gray-900">Browserbase</span>
        </div>
        <motion.button
          onClick={onClose}
          className="px-4 py-2 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors rounded-md font-ppsupply flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Close
          {!isMobile && (
            <kbd className="px-2 py-1 text-xs bg-gray-100 rounded-md">ESC</kbd>
          )}
        </motion.button>
      </motion.nav>
      <main className="flex-1 flex flex-col items-center p-6">
        <motion.div 
          className="w-full max-w-[640px] bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-full h-12 bg-white border-b border-gray-200 flex items-center px-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
          </div>

          {(() => {
            console.log('Session URL:', uiState.sessionUrl);
            return null;
          })()}
          
          {uiState.sessionUrl && (
            <div className="p-6 space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-full aspect-video border-b border-gray-200"
            >
              <iframe
                src={uiState.sessionUrl}
                className="w-full h-full"
                sandbox="allow-same-origin allow-scripts allow-forms"
                loading="lazy"
                referrerPolicy="no-referrer"
                title="Browser Session"
              />
            </motion.div>
            </div>
          )}

          <div className="p-6 space-y-4">
            {initialMessage && (
              <motion.div
                variants={messageVariants}
                className="p-4 bg-blue-50 rounded-lg font-ppsupply"
              >
                <p className="font-semibold">Goal:</p>
                <p>{initialMessage}</p>
              </motion.div>
            )}
            {uiState.sessionId && (
              <motion.div
                variants={messageVariants}
                className="p-4 bg-gray-50 rounded-lg font-ppsupply"
              >
                <p className="font-semibold">View session:</p>
                <a 
                  href={`https://www.browserbase.com/sessions/${uiState.sessionId}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {`https://www.browserbase.com/sessions/${uiState.sessionId}`}
                </a>
              </motion.div>
            )}

            {uiState.steps.map((step, index) => (
              <motion.div
                key={index}
                variants={messageVariants}
                className="p-4 bg-white border border-gray-200 rounded-lg font-ppsupply space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Step {step.stepNumber}</span>
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">{step.tool}</span>
                </div>
                <p className="font-medium">{step.text}</p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Reasoning: </span>
                  {step.reasoning}
                </p>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                variants={messageVariants}
                className="p-4 bg-gray-50 rounded-lg font-ppsupply animate-pulse"
              >
                Processing...
              </motion.div>
            )}
          </div>
        </motion.div>
      </main>
    </motion.div>
  );
}