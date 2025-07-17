"use client";

import { useState, useEffect } from "react";
import AddressAutocomplete from "./AddressAutocomplete";
import { saveAutoSetDataToFirebase, getAutoSetDataFromFirebase, AutoSetData } from "./firebaseAutoSetService";

interface AutoSetProps {
  isLoggedIn: boolean;
  userId?: string;
}

export default function AutoSet({ isLoggedIn, userId }: AutoSetProps) {
  const [autoSetData, setAutoSetData] = useState<AutoSetData>({
    homeAddress: "",
    officeAddress: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Load auto-set data from Firebase when user logs in
  useEffect(() => {
    const loadAutoSetData = async () => {
      if (isLoggedIn && userId) {
        try {
          const data = await getAutoSetDataFromFirebase(userId);
          if (data) {
            setAutoSetData(data);
          }
        } catch (error) {
          console.error('Failed to load auto set data:', error);
        }
      } else {
        // Reset data when user logs out
        setAutoSetData({ homeAddress: "", officeAddress: "" });
      }
    };

    loadAutoSetData();
  }, [isLoggedIn, userId]);

  const handleAddressChange = (field: keyof AutoSetData, value: string) => {
    setAutoSetData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveData = async () => {
    if (!isLoggedIn || !userId) {
      setSaveMessage("Please log in to save auto-set data");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    setIsSaving(true);
    try {
      await saveAutoSetDataToFirebase(autoSetData, userId);
      setSaveMessage("Auto-set addresses saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error('Error saving auto-set data:', error);
      setSaveMessage("Error saving addresses. Please try again.");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Auto-Set Addresses
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Save your home and office addresses to automatically populate the mileage start address when you enable mileage tracking.
              </p>
              {!isLoggedIn && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> You must be logged in to save and access auto-set addresses. Please log in to use this feature.
                  </p>
                </div>
              )}
            </div>

            {saveMessage && (
              <div className={`mb-6 p-4 rounded-md ${
                saveMessage.includes('Error') 
                  ? 'bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                  : 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
              }`}>
                {saveMessage}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <AddressAutocomplete
                  value={autoSetData.homeAddress}
                  onChange={(value) => handleAddressChange("homeAddress", value)}
                  label="Home Address"
                  placeholder="Enter your home address"
                  required={false}
                />
              </div>

              <div>
                <AddressAutocomplete
                  value={autoSetData.officeAddress}
                  onChange={(value) => handleAddressChange("officeAddress", value)}
                  label="Office Address"
                  placeholder="Enter your office address"
                  required={false}
                />
              </div>

              <div className="flex justify-end pt-6 border-t">
                <button
                  onClick={saveData}
                  disabled={isSaving || (!autoSetData.homeAddress && !autoSetData.officeAddress)}
                  className="px-8 py-3 bg-[#FF3B00] text-white rounded-md hover:bg-[#E63400] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isSaving ? "Saving..." : "Save Addresses"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { type AutoSetData };
