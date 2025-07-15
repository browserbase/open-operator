"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import CaseForm from "./components/CaseForm";
import ExecutionView from "./components/ExecutionView";
import { FormData } from "./script/automationScript";

export default function Home() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);

  const handleFormSubmit = async (formData: FormData) => {
    setIsLoading(true);
    
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
        setIsExecuting(true);
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
  };

  return (
    <AnimatePresence mode="wait">
      {!isExecuting ? (
        <CaseForm 
          onSubmit={handleFormSubmit} 
          isLoading={isLoading}
        />
      ) : (
        <ExecutionView 
          onClose={handleClose}
          sessionUrl={sessionUrl || undefined}
        />
      )}
    </AnimatePresence>
  );
}
