import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Diagnostic log: check raw env variable value
console.log('DEBUG: process.env.OPENROUTER_EMBEDDING_MODEL (raw):', process.env.OPENROUTER_EMBEDDING_MODEL);

const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free',
    embeddingModel: process.env.OPENROUTER_EMBEDDING_MODEL || 'qwen/qwen3-embedding-0.6b',
    freeEmbeddingModel: process.env.OPENROUTER_FREE_EMBEDDING_MODEL || 'allenai/molmo-2-8b:free', // Free model for testing, dimension might vary
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
  },
  app: {
    env: process.env.APP_ENV || 'development',
    port: process.env.PORT || 3000,
  },
};

// Simple validation to ensure critical variables are defined
if (!config.supabase.url || !config.supabase.anonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in .env file');
}

if (!config.openRouter.apiKey) {
  throw new Error('OpenRouter API Key must be defined in .env file');
}

export default config;
