import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          light: "var(--primary-light)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          light: "var(--accent-light)",
        },
        secondary: {
          DEFAULT: "var(--bg-secondary)",
          light: "var(--bg-tertiary)",
        },
        modal: "var(--bg-modal)",
        overlay: "var(--bg-overlay)",
        border: {
          DEFAULT: "var(--border)",
          light: "var(--border-light)",
          focus: "var(--border-focus)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        input: {
          bg: "var(--input-bg)",
          border: "var(--input-border)",
        },
        button: {
          secondary: "var(--button-secondary)",
          "secondary-hover": "var(--button-secondary-hover)",
        },
      },
      boxShadow: {
        'theme-sm': 'var(--shadow-sm)',
        'theme-md': 'var(--shadow-md)',
        'theme-lg': 'var(--shadow-lg)',
        'theme-xl': 'var(--shadow-xl)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        ppneue: ['var(--font-pp-neue)', 'system-ui', 'sans-serif'],
        ppsupply: ['var(--font-pp-supply)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
