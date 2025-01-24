'use client'

import { useState, useEffect, useCallback } from 'react';
import { BrowserStep } from './ChatFeed';

interface StagehandSessionProps {
  initialPrompt: string;
  onClose: () => void;
}

export default function StagehandSession({ initialPrompt, onClose }: StagehandSessionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [steps, setSteps] = useState<BrowserStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAgentLoop = useCallback(async (
    sessionId: string,
    goal: string,
    previousSteps: BrowserStep[]
  ) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          sessionId,
          previousSteps
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSteps(prev => [...prev, {
          text: data.result.text,
          reasoning: data.result.reasoning,
          tool: data.result.tool,
          instruction: data.result.instruction,
          stepNumber: prev.length + 1
        }]);

        if (data.result.tool !== 'CLOSE') {
          // Continue the loop
          await runAgentLoop(sessionId, goal, data.steps);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error in agent loop');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await fetch('/api/session', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
          setSessionId(data.sessionId);
          setSessionUrl(data.sessionUrl);
          // Start agent loop with initial prompt
          runAgentLoop(data.sessionId, initialPrompt, []);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to initialize session');
      }
    };

    initializeSession();
  }, [initialPrompt, runAgentLoop]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="flex justify-between items-center px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="font-ppneue text-xl text-gray-900">Browserbase</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors rounded-md font-ppsupply"
        >
          Close
        </button>
      </nav>

      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {sessionUrl && (
            <div className="mb-4 p-4 bg-white rounded-lg shadow">
              <a 
                href={sessionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View in Browserbase Dashboard
              </a>
            </div>
          )}

          {loading && (
            <div className="mb-4 p-4 bg-white rounded-lg shadow">
              Processing...
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
              Error: {error}
            </div>
          )}

          {steps.map((step, index) => (
            <div 
              key={index}
              className="mb-4 p-4 bg-white rounded-lg shadow"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Step {step.stepNumber}</span>
                <span className="px-2 py-1 bg-gray-100 rounded text-xs">{step.tool}</span>
              </div>
              <p className="font-medium mb-2">{step.text}</p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Reasoning: </span>
                {step.reasoning}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 