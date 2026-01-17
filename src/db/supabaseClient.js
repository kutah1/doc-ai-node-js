import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;


// IMPORTANT: For server-side operations like JWT validation, the service_role key is required.
// The user of this application must provide the SUPABASE_SERVICE_ROLE_KEY in their .env file.
export const supabase = createClient(supabaseUrl, config.supabase.serviceRoleKey || supabaseAnonKey);
console.log('Supabase client initialized successfully.');
