import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../.env') });
dotenv.config({ path: path.resolve(here, '../../.env') });

function optional(name: string): string {
  return process.env[name]?.trim() ?? '';
}

const clientOrigin = optional('CLIENT_ORIGIN') || 'http://localhost:5173,http://127.0.0.1:5173';
const nativeAppOrigins = ['https://localhost'];

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigins: [...new Set([...clientOrigin.split(',').map((origin) => origin.trim()).filter(Boolean), ...nativeAppOrigins])],
  supabaseUrl: optional('SUPABASE_URL'),
  supabaseAnonKey: optional('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),
  giphyApiKey: optional('GIPHY_API_KEY'),
  nodeEnv: process.env.NODE_ENV || 'development',
};

export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}
