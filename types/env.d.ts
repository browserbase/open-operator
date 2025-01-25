declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MODEL_PROVIDER: 'openai' | 'groq';
      OPENAI_API_KEY?: string;
      GROQ_API_KEY?: string;
      BROWSERBASE_API_KEY: string;
      BROWSERBASE_PROJECT_ID: string;
    }
  }
}

export {}; 