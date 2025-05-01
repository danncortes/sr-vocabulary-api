import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Use ANON_KEY or SERVICE_KEY depending on needs
const dbSchema = process.env.DB_SCHEMA || 'public'; // Read schema from env, default to 'public'

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key must be provided in environment variables');
}

export const createSBClient = (token: string = '') => {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    db: {
      schema: dbSchema, // Specify the schema here
    },
  });
}


