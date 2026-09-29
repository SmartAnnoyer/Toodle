import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, isSupabaseConfigured } from '../config.js';
import { AppError } from './errors.js';

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new AppError(503, 'Toodle is not connected yet. Add your Supabase keys.');
  }
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
