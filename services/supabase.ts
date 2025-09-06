
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfkqnhpwrjhdgnojlwzl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRma3FuaHB3cmpoZGdub2psd3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjQ0NTcsImV4cCI6MjA3MjY0MDQ1N30.edN1XvDsbHmtbbr2RNS9yuMdMyGwr77XGPI3N2s3BVA';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anon key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
