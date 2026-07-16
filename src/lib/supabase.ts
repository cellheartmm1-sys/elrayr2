import { createClient } from '@supabase/supabase-js';

// Direct connection via pg for server-side use
const supabaseUrl = 'https://gnfsmtammkivxlecvefp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database connection string for direct queries
export const DB_URL = process.env.DATABASE_URL;
