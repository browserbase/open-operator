"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { FormData } from "../script/automationScript";

interface CaseFormProps {
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
}

interface SavedCredentials {
  companyCode: string;
  Email: string;
  password: string;
}

export default function CaseForm({ onSubmit, isLoading }: CaseFormProps) {
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    companyCode: "",
    Email: "",
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

  // Load saved credentials on component mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem('caseFormCredentials');
    if (savedCredentials) {
      const credentials: SavedCredentials = JSON.parse(savedCredentials);
      setFormData(prev => ({
        ...prev,
        companyCode: credentials.companyCode,
        Email: credentials.Email,
        password: credentials.password,
      }));
      setSaveCredentials(true);
    }
  }, []);

  // Save credentials to localStorage when saveCredentials changes
  useEffect(() => {
    if (saveCredentials && formData.companyCode && formData.Email && formData.password) {
      const credentials: SavedCredentials = {
        companyCode: formData.companyCode,
        Email: formData.Email,
        password: formData.password,
      };
      localStorage.setItem('caseFormCredentials', JSON.stringify(credentials));
    } else if (!saveCredentials) {
      localStorage.removeItem('caseFormCredentials');
    }
  }, [saveCredentials, formData.companyCode, formData.Email, formData.password]);

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
    setFormData(prev => ({
      ...prev,
      endAddresses: [...prev.endAddresses, ""],
      additionalDropdownValues: [...prev.additionalDropdownValues, ""]
    }));
  };

  const removeEndAddress = (index: number) => {
    if (formData.endAddresses.length > 1) {
      setFormData(prev => ({
        ...prev,
        endAddresses: prev.endAddresses.filter((_, i) => i !== index),
        additionalDropdownValues: prev.additionalDropdownValues.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const clearSavedCredentials = () => {
    localStorage.removeItem('caseFormCredentials');
    setSaveCredentials(false);
    setFormData(prev => ({
      ...prev,
      companyCode: "",
      Email: "",
      password: "",
    }));
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
          <span className="font-ppsupply text-gray-900">Case Note Automation</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
          >
            <div className="mb-8">
              <h1 className="text-3xl font-ppneue text-gray-900 mb-2">
                Case Note Form
              </h1>
              <p className="text-gray-600 font-ppsupply">
                Fill out the form below to automatically create and populate case notes.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Login Credentials */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Ecasenote Login Credentials</h3>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={saveCredentials}
                        onChange={(e) => setSaveCredentials(e.target.checked)}
                        className="mr-2 h-4 w-4 text-[#FF3B00] focus:ring-[#FF3B00] border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Save credentials locally</span>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyCode}
                      onChange={(e) => handleInputChange("companyCode", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                      placeholder="Enter company code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.Email}
                      onChange={(e) => handleInputChange("Email", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                      placeholder="Enter Email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                      placeholder="Enter password"
                    />
                  </div>
                </div>
                {saveCredentials && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          Credentials will be saved locally in your browser. This data is not transmitted to any external servers.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Case Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Case Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.caseNumber}
                    onChange={(e) => handleInputChange("caseNumber", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                    placeholder="Enter case number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Service *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfService}
                    onChange={(e) => handleInputChange("dateOfService", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Time Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => handleInputChange("startTime", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => handleInputChange("endTime", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type *
                  </label>
                  <select
                    required
                    value={formData.serviceTypeIdentifier}
                    onChange={(e) => handleInputChange("serviceTypeIdentifier", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                  >
                    <option value="56a">56a</option>
                    <option value="47e">47e</option>
                  </select>
                </div>
              </div>

              {/* Person Served */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Person Served *
                </label>
                <input
                  type="text"
                  required
                  value={formData.personServed}
                  onChange={(e) => handleInputChange("personServed", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                  placeholder="Enter person served"
                />
              </div>

              {/* Observation Notes for 56a */}
              {formData.serviceTypeIdentifier === "56a" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Observation Notes (56a)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(formData.observationNotes56a || {}).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </label>
                        <textarea
                          value={value}
                          onChange={(e) => handleObservationNotesChange(key, e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Summary (47e)
                  </label>
                  <textarea
                    value={formData.noteSummary47e}
                    onChange={(e) => handleInputChange("noteSummary47e", e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                    placeholder="Enter note summary for 47e service type"
                  />
                </div>
              )}

              {/* Mileage Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Mileage Information</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showMileage}
                      onChange={(e) => setShowMileage(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Include Mileage</span>
                  </label>
                </div>

                {showMileage && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Address
                        </label>
                        <input
                          type="text"
                          value={formData.mileageStartAddress}
                          onChange={(e) => handleInputChange("mileageStartAddress", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                          placeholder="Enter start address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Mileage
                        </label>
                        <input
                          type="text"
                          value={formData.mileageStartMileage}
                          onChange={(e) => handleInputChange("mileageStartMileage", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                          placeholder="Enter start mileage"
                        />
                      </div>
                    </div>

                    {/* End Addresses */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-medium text-gray-700">
                          End Addresses
                        </label>
                        <button
                          type="button"
                          onClick={addEndAddress}
                          className="px-3 py-1 text-sm bg-[#FF3B00] text-white rounded-md hover:bg-[#E63400] transition-colors"
                        >
                          Add Address
                        </button>
                      </div>
                      {formData.endAddresses.map((address, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <input
                              type="text"
                              value={address}
                              onChange={(e) => handleEndAddressChange(index, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                              placeholder={`End address ${index + 1}`}
                            />
                          </div>
                          <div>
                            <select
                              value={formData.additionalDropdownValues[index]}
                              onChange={(e) => handleDropdownValueChange(index, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF3B00] focus:border-transparent"
                            >
                              <option value="">Select purpose</option>
                              <option value="transport">Transport</option>
                              <option value="visit">Visit</option>
                              <option value="pickup">Pickup</option>
                              <option value="dropoff">Drop-off</option>
                            </select>
                          </div>
                          <div>
                            {formData.endAddresses.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeEndAddress(index)}
                                className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3 bg-[#FF3B00] text-white rounded-md hover:bg-[#E63400] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? "Processing..." : "Start Automation"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
