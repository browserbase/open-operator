"use client";

import { useTheme } from "./ThemeProvider";
import { motion } from "framer-motion";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light", label: "Light", icon: "" },
    { value: "dark", label: "Dark", icon: "" },
  
  ] as const;

  return (
    <div className="relative">
      <div className="flex items-center bg-background-secondary rounded-lg p-1 space-x-1">
        {themes.map((themeOption) => (
          <button
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={`relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              theme === themeOption.value
                ? "text-white"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {theme === themeOption.value && (
              <motion.div
                layoutId="theme-toggle-bg"
                className="absolute inset-0 bg-primary rounded-md"
                transition={{ type: "spring", duration: 0.5 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <span className="text-xs">{themeOption.icon}</span>
              <span className="hidden sm:inline">{themeOption.label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
