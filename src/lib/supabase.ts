import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lidszakjqqaccyfqiaoj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'missing-key'
);

if (!supabaseAnonKey) {
  console.error('SUPABASE_CONFIG_ERROR: Missing environment variable VITE_SUPABASE_ANON_KEY');
}
